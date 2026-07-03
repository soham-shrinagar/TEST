const Match = require('../models/Match');
const Profile = require('../models/Profile');
const UserEvent = require('../models/UserEvent');
const CampaignApplication = require('../models/CampaignApplication');
const StoreDealApplication = require('../models/StoreDealApplication');
const CampaignPost = require('../models/CampaignPost');
const cache = require('../services/cacheService');

const creatorRoles = ['creator', 'influencer'];

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `analytics:dashboard:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const positiveEvents = ['save', 'apply', 'invite', 'accept'];
    const likesReceived = await UserEvent.countDocuments({ target: userId, eventType: { $in: positiveEvents } });
    const likesSent = await UserEvent.countDocuments({ actor: userId, eventType: { $in: positiveEvents } });
    const passesSent = await UserEvent.countDocuments({ actor: userId, eventType: { $in: ['reject', 'withdraw'] } });
    const totalMatches = await Match.countDocuments({
      $or: [{ user1: userId }, { user2: userId }],
    });

    const recentMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).sort({ createdAt: -1 }).limit(5);

    const enrichedRecent = await Promise.all(
      recentMatches.map(async (match) => {
        const otherId = match.user1.toString() === userId.toString() ? match.user2 : match.user1;
        const profile = await Profile.findOne({ user: otherId }).populate('user', 'name role');
        return { matchId: match._id, matchedAt: match.createdAt, profile };
      })
    );

    const profileViews = await UserEvent.countDocuments({ target: userId, eventType: 'view' });

    const payload = {
      likesReceived,
      likesSent,
      passesSent,
      totalMatches,
      profileViews,
      recentMatches: enrichedRecent.filter((item) => item.profile),
      matchRate: likesSent > 0 ? ((totalMatches / likesSent) * 100).toFixed(1) : 0,
    };
    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Creator / Influencer Dashboard ───────────────────────────────────────────
// Returns real campaign + store visit stats for the logged-in creator.

const getCreatorDashboardStats = async (req, res) => {
  try {
    if (!creatorRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Creator access required' });
    }

    const userId = req.user._id;
    const cacheKey = `analytics:creator-dashboard:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // ── Campaign application counts ──────────────────────────────────────────
    const [
      totalApplications,
      acceptedApplications,
      pendingApplications,
      rejectedApplications,
    ] = await Promise.all([
      CampaignApplication.countDocuments({ creator: userId }),
      CampaignApplication.countDocuments({ creator: userId, status: 'accepted' }),
      CampaignApplication.countDocuments({ creator: userId, status: 'pending' }),
      CampaignApplication.countDocuments({ creator: userId, status: 'rejected' }),
    ]);

    // ── Store visit counts ───────────────────────────────────────────────────
    const [
      totalStoreApplications,
      acceptedStoreVisits,
      completedStoreVisits,
    ] = await Promise.all([
      StoreDealApplication.countDocuments({ creator: userId }),
      StoreDealApplication.countDocuments({ creator: userId, status: { $in: ['accepted', 'visited'] } }),
      StoreDealApplication.countDocuments({ creator: userId, status: 'completed' }),
    ]);

    // ── Posts live ───────────────────────────────────────────────────────────
    const postsLive = await CampaignPost.countDocuments({ creator: userId, approvalStatus: 'live' });

    // ── Total earnings (paid campaign applications) ──────────────────────────
    const paidApplications = await CampaignApplication.find({
      creator: userId,
      paymentStatus: 'paid',
    }).select('totalAgreedAmount');
    const totalEarnings = paidApplications.reduce((sum, app) => sum + (app.totalAgreedAmount || 0), 0);

    // ── Active campaign applications (for "My Work" list) ────────────────────
    const activeCampaigns = await CampaignApplication.find({
      creator: userId,
      status: { $in: ['pending', 'accepted'] },
    })
      .populate({ path: 'campaign', select: 'title brand applicationDeadline contentDeadline status', populate: { path: 'brand', select: 'name' } })
      .sort({ updatedAt: -1 })
      .limit(10);

    // ── Active store visits ──────────────────────────────────────────────────
    const activeStoreVisits = await StoreDealApplication.find({
      creator: userId,
      status: { $in: ['pending', 'accepted', 'visited'] },
    })
      .populate({
        path: 'storeDeal',
        select: 'title offerType flatFeeAmount store',
        populate: { path: 'store', select: 'storeProfile name' },
      })
      .sort({ updatedAt: -1 })
      .limit(10);

    const payload = {
      // Summary stats
      totalApplications,
      acceptedApplications,
      pendingApplications,
      rejectedApplications,
      totalStoreApplications,
      acceptedStoreVisits,
      completedStoreVisits,
      postsLive,
      totalEarnings,
      // Lists for the My Work section
      activeCampaigns: activeCampaigns.filter((app) => app.campaign),
      activeStoreVisits: activeStoreVisits.filter((app) => app.storeDeal),
    };

    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats, getCreatorDashboardStats };

