const Campaign = require('../models/Campaign');
const CampaignApplication = require('../models/CampaignApplication');
const StoreDeal = require('../models/StoreDeal');
const StoreDealApplication = require('../models/StoreDealApplication');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { calculateContentScoreCreator, scoreStoreDeal } = require('../services/recommendationService');
const cache = require('../services/cacheService');

const creatorRoles = ['creator', 'influencer'];

/**
 * GET /api/feed/discover
 *
 * Unified influencer feed — returns both brand campaigns AND store deals,
 * scored and sorted by relevance for the authenticated creator.
 *
 * Query params:
 *   ?niche=        Filter by niche (campaign requirements.niches OR store deal requirements.preferredNiches)
 *   ?minPay=       Filter by minimum pay (campaign budgetPerCreator OR store deal flatFeeAmount)
 *   ?city=         Filter by city (campaign requirements.locations OR store deal requirements.location)
 *   ?type=         'campaign' | 'store_deal' | omit for both
 *   ?page=         Page number (default 1)
 *   ?limit=        Items per page (default 20, max 50)
 *
 * Response:
 *   {
 *     items: [{ type, data, score, reasons }],
 *     total: number,
 *     page: number,
 *     hasMore: boolean
 *   }
 */
const discoverFeed = async (req, res) => {
  try {
    if (!creatorRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Creator access required' });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const { niche, minPay, city, type: typeFilter } = req.query;

    const cacheKey = `feed:discover:${req.user._id}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const now = new Date();

    // ── Parallel: get what the creator has already applied to ────────────────
    const [appliedCampaignIds, appliedDealIds] = await Promise.all([
      CampaignApplication.find({ creator: req.user._id }).distinct('campaign'),
      StoreDealApplication.find({ creator: req.user._id }).distinct('storeDeal'),
    ]);

    // ── Build filters ─────────────────────────────────────────────────────────
    const campaignFilter = {
      status: 'active',
      applicationDeadline: { $gt: now },
      _id: { $nin: appliedCampaignIds },
    };
    if (niche) campaignFilter['requirements.niches'] = niche;
    if (minPay) campaignFilter.budgetPerCreator = { $gte: Number(minPay) };
    if (city) campaignFilter['requirements.locations'] = new RegExp(city, 'i');

    const dealFilter = {
      status: 'active',
      _id: { $nin: appliedDealIds },
    };
    if (niche) dealFilter['requirements.preferredNiches'] = niche;
    if (minPay) dealFilter.flatFeeAmount = { $gte: Number(minPay) };
    if (city) dealFilter['requirements.location'] = new RegExp(city, 'i');

    // ── Fetch campaigns and deals in parallel ─────────────────────────────────
    const fetchCampaigns = (!typeFilter || typeFilter === 'campaign')
      ? Campaign.find(campaignFilter)
          .populate('brand', 'name profile_pic instagram_profile_pic')
          .limit(100)
      : Promise.resolve([]);

    const fetchDeals = (!typeFilter || typeFilter === 'store_deal')
      ? StoreDeal.find(dealFilter).limit(80)
      : Promise.resolve([]);

    const [campaigns, deals] = await Promise.all([fetchCampaigns, fetchDeals]);

    // ── Fetch creator profile for scoring ─────────────────────────────────────
    const creatorProfile = await Profile.findOne({ user: req.user._id });
    const creator = req.user;

    // ── Fetch brand profiles for campaign enrichment ──────────────────────────
    const brandIds = campaigns.map((c) => c.brand?._id).filter(Boolean);
    const brandProfiles = brandIds.length
      ? await Profile.find({ user: { $in: brandIds } }).select('user displayName avatar brandCategory')
      : [];
    const brandProfileMap = new Map(brandProfiles.map((p) => [p.user.toString(), p]));

    // ── Fetch store info for deal enrichment ──────────────────────────────────
    const storeIds = [...new Set(deals.map((d) => d.store.toString()))];
    const storeUsers = storeIds.length
      ? await User.find({ _id: { $in: storeIds } }).select('storeProfile name')
      : [];
    const storeUserMap = new Map(storeUsers.map((s) => [s._id.toString(), s]));

    const creatorFollowers = creator.follower_count || creatorProfile?.followerCount || 0;
    const profileMap = creatorProfile ? new Map([[creator._id.toString(), creatorProfile]]) : new Map();

    // ── Score campaigns ───────────────────────────────────────────────────────
    const scoredCampaigns = (
      await Promise.all(
        campaigns.map(async (campaign) => {
          const result = await calculateContentScoreCreator(creator, campaign, profileMap);
          if (!result) return null; // creator doesn't meet follower requirement
          return {
            type: 'campaign',
            data: {
              ...campaign.toObject(),
              brandProfile: brandProfileMap.get(campaign.brand?._id?.toString()) || null,
            },
            score: result.score,
            reasons: result.reasons,
          };
        }),
      )
    ).filter(Boolean);

    // ── Score store deals ─────────────────────────────────────────────────────
    const scoredDeals = deals
      .filter((deal) => (deal.requirements?.minFollowers || 0) <= creatorFollowers)
      .map((deal) => {
        const { score, reasons } = scoreStoreDeal(creator, deal, creatorProfile);
        const storeUser = storeUserMap.get(deal.store.toString());
        return {
          type: 'store_deal',
          data: {
            ...deal.toObject(),
            storeInfo: storeUser ? {
              _id: storeUser._id,
              storeName: storeUser.storeProfile?.storeName || storeUser.name,
              storeType: storeUser.storeProfile?.storeType,
              city: storeUser.storeProfile?.address?.city,
              logoImage: storeUser.storeProfile?.logoImage,
              storeVerified: storeUser.storeProfile?.storeVerified,
              averageRating: storeUser.storeProfile?.averageRating,
              totalReviews: storeUser.storeProfile?.totalReviews,
            } : null,
            spotsRemaining: Math.max(
              0,
              (deal.requirements?.maxCreators || 5) - (deal.stats?.totalAccepted || 0),
            ),
          },
          score,
          reasons,
        };
      });

    // ── Merge and sort by score descending ────────────────────────────────────
    const allItems = [...scoredCampaigns, ...scoredDeals].sort((a, b) => b.score - a.score);
    const total = allItems.length;
    const start = (page - 1) * limit;
    const items = allItems.slice(start, start + limit);
    const hasMore = start + limit < total;

    const payload = { items, total, page, hasMore };
    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { discoverFeed };
