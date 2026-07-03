const express = require('express');
const Campaign = require('../models/Campaign');
const Profile = require('../models/Profile');
const RecommendationCache = require('../models/RecommendationCache');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const recommendationService = require('../services/recommendationService');
const redisCache = require('../services/cacheService');

const router = express.Router();

const creatorRoles = ['creator', 'influencer'];
const allowedEvents = Object.keys(recommendationService.EVENT_POINTS);

router.use(protect);

const limitNumber = (value, fallback = 20, max = 50) => Math.min(Math.max(Number(value) || fallback, 1), max);

const enrichRecommendations = async (recommendations) => {
  const userIds = recommendations
    .filter((item) => item.targetModel === 'User')
    .map((item) => item.targetId);
  const campaignIds = recommendations
    .filter((item) => item.targetModel === 'Campaign')
    .map((item) => item.targetId);
  const storeDealIds = recommendations
    .filter((item) => item.targetModel === 'StoreDeal')
    .map((item) => item.targetId);

  const StoreDeal = require('../models/StoreDeal');
  const User = require('../models/User');

  const [profiles, campaigns, storeDeals] = await Promise.all([
    Profile.find({ user: { $in: userIds } }).populate('user', 'name role profile_pic instagram_profile_pic instagram_handle follower_count engagement_rate instagram_verified'),
    Campaign.find({ _id: { $in: campaignIds } }).populate('brand', 'name profile_pic instagram_profile_pic'),
    StoreDeal.find({ _id: { $in: storeDealIds } }),
  ]);

  // For store deals, fetch the store User info
  const storeIds = storeDeals.map((deal) => deal.store);
  const storeUsers = storeIds.length
    ? await User.find({ _id: { $in: storeIds } }).select('storeProfile name')
    : [];
  const storeUserMap = new Map(storeUsers.map((s) => [s._id.toString(), s]));

  const profileMap = new Map(profiles.map((profile) => [profile.user._id.toString(), profile]));
  const campaignMap = new Map(campaigns.map((campaign) => [campaign._id.toString(), campaign]));
  const storeDealMap = new Map(storeDeals.map((deal) => [deal._id.toString(), deal]));

  return recommendations.map((item) => {
    const object = item.toObject ? item.toObject() : item;
    let target;
    if (object.targetModel === 'User') {
      target = profileMap.get(object.targetId.toString());
    } else if (object.targetModel === 'Campaign') {
      target = campaignMap.get(object.targetId.toString());
    } else if (object.targetModel === 'StoreDeal') {
      const deal = storeDealMap.get(object.targetId.toString());
      if (deal) {
        const storeUser = storeUserMap.get(deal.store.toString());
        target = {
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
        };
      }
    }
    return { ...object, target };
  }).filter((item) => item.target);
};

router.get('/', async (req, res) => {
  try {
    const limit = limitNumber(req.query.limit);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const cacheKey = `recommendations:v2:${req.user._id}:root:${limit}:${offset}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return res.json(cached);
    const result = await recommendationService.getRecommendationsForUser(req.user._id, req.user.role, limit + offset);
    const sliced = result.recommendations.slice(offset, offset + limit);
    const payload = {
      recommendations: await enrichRecommendations(sliced),
      generatedAt: result.generatedAt,
      fromCache: result.fromCache,
    };
    if (payload.recommendations.length) {
      await redisCache.set(cacheKey, payload, 120);
    }
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/discover', async (req, res) => {
  try {
    if (req.user.role !== 'brand') return res.status(403).json({ message: 'Brand access required' });
    const cacheKey = `recommendations:${req.user._id}:discover:${JSON.stringify(req.query)}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return res.json(cached);
    const filter = { role: { $in: creatorRoles } };
    if (req.query.location) filter.location = { $regex: req.query.location, $options: 'i' };
    if (req.query.niche) filter.interests = req.query.niche;
    if (req.query.availability) filter.availability = req.query.availability;
    if (req.query.budgetTier) filter.budgetTier = req.query.budgetTier;
    if (req.query.campaignType) filter.campaignTypes = req.query.campaignType;

    // priority maps to a sort preference on top of the base sort
    const prioritySort = req.query.priority === 'niche'
      ? { interests: -1 }
      : req.query.priority === 'money'
        ? { engagementRate: -1 }
        : req.query.priority === 'requirements'
          ? { followerCount: -1 }
          : null;

    const sort = req.query.sort === 'followers'
      ? { followerCount: -1 }
      : req.query.sort === 'engagement'
        ? { engagementRate: -1 }
        : req.query.sort === 'budget'
          ? { budgetTier: 1 }
          : req.query.sort === 'location'
            ? { location: 1 }
            : req.query.sort === 'recent'
              ? { updatedAt: -1 }
              : prioritySort || { updatedAt: -1 };

    const profiles = await Profile.find(filter)
      .populate('user', 'name role profile_pic instagram_profile_pic instagram_handle follower_count engagement_rate instagram_verified')
      .sort(sort)
      .limit(60);

    await redisCache.set(cacheKey, profiles, 120);
    return res.json(profiles);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/campaign/:campaignId', async (req, res) => {
  try {
    if (req.user.role !== 'brand') return res.status(403).json({ message: 'Brand access required' });
    const limit = limitNumber(req.query.limit, 20);
    const cacheKey = `recommendations:${req.user._id}:campaign:${req.params.campaignId}:${JSON.stringify(req.query)}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return res.json(cached);
    let campaign = null;
    let contextKey = '';

    if (req.params.campaignId !== 'draft') {
      campaign = await Campaign.findOne({ _id: req.params.campaignId, brand: req.user._id });
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      contextKey = `brand_${req.user._id}_campaign_${campaign._id}`;
    } else {
      const requirements = req.query.requirements ? JSON.parse(req.query.requirements) : {};
      const deliverables = req.query.deliverables ? JSON.parse(req.query.deliverables) : {};
      campaign = new Campaign({
        brand: req.user._id,
        title: 'Draft campaign',
        description: 'Draft recommendation context',
        productName: 'Draft',
        status: 'draft',
        requirements,
        deliverables,
        budgetPerCreator: Number(req.query.budgetPerCreator) || 0,
      });
    }

    let recommendations = [];
    if (contextKey) {
      const cache = await RecommendationCache.findOne({ userId: req.user._id, contextKey });
      if (cache && cache.expiresAt > new Date()) {
        recommendations = cache.recommendations.slice(0, limit);
      } else {
        recommendations = (await recommendationService.generateForBrand(req.user._id, campaign, contextKey)).slice(0, limit);
      }
    } else {
      recommendations = (await recommendationService.generateForBrand(req.user._id, campaign, null)).slice(0, limit);
    }

    const payload = {
      recommendations: await enrichRecommendations(recommendations),
      generatedAt: new Date(),
      fromCache: Boolean(contextKey),
    };
    await redisCache.set(cacheKey, payload, 120);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/event', async (req, res) => {
  try {
    const { targetId, targetModel, eventType, metadata } = req.body;
    if (!targetId || !['User', 'Campaign', 'StoreDeal'].includes(targetModel) || !allowedEvents.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid recommendation event' });
    }
    await recommendationService.trackEvent(req.user._id, targetId, targetModel, eventType, metadata || {});
    await redisCache.delPattern(`recommendations:${req.user._id}:*`);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/cache', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    await RecommendationCache.deleteMany({});
    await redisCache.delPattern('recommendations:*');
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
