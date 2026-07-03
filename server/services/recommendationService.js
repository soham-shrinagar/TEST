const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const CampaignApplication = require('../models/CampaignApplication');
const CampaignPost = require('../models/CampaignPost');
const Profile = require('../models/Profile');
const RecommendationCache = require('../models/RecommendationCache');
const User = require('../models/User');
const UserEvent = require('../models/UserEvent');
const cacheService = require('./cacheService');
const StoreDeal = require('../models/StoreDeal');
const StoreDealApplication = require('../models/StoreDealApplication');

const WEIGHTS = {
  early: { content: 0.6, behaviour: 0.4 },
  mature: { content: 0.4, behaviour: 0.6 },
};

const COLLABORATIVE_BONUS = 15;
const CACHE_TTL_HOURS = 6;
const BATCH_SIZE = 50;

const EVENT_POINTS = {
  view: 2,
  save: 10,
  apply: 20,
  invite: 20,
  accept: 25,
  reject: -10,
  withdraw: -5,
  complete: 30,
  review_positive: 30,
  review_negative: -25,
  submit_ontime: 10,
  submit_late: -10,
};

const creatorRoles = ['creator', 'influencer'];
const toId = (value) => value?._id || value;
const normalize = (value) => String(value || '').trim().toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const number = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null && value !== '');
  return Number(found) || 0;
};

const getProfile = (profileMap, userId) => profileMap.get(userId.toString()) || null;

const creatorStats = (creator, profile) => ({
  followerCount: number(creator.followerCount, creator.follower_count, profile?.followerCount),
  engagementRate: number(creator.engagementRate, creator.engagement_rate, profile?.engagementRate),
  niches: asArray(creator.niches).length ? creator.niches : asArray(profile?.interests),
  location: creator.location || profile?.location || '',
  expectedRate: number(creator.expectedRate, profile?.expectedRate),
  audienceGender: creator.audienceGender || profile?.audienceGender || '',
});

const campaignAverageRate = (campaign) => {
  const rates = [
    campaign.deliverables?.reels?.ratePerPost,
    campaign.deliverables?.stories?.ratePerPost,
    campaign.deliverables?.staticPosts?.ratePerPost,
  ].map(Number).filter((rate) => rate > 0);
  if (rates.length) return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  return number(campaign.budgetPerCreator);
};

const deliverableTypes = (campaign) => {
  const types = [];
  if (campaign.deliverables?.reels?.count > 0) types.push('reel');
  if (campaign.deliverables?.stories?.count > 0) types.push('story');
  if (campaign.deliverables?.staticPosts?.count > 0) types.push('static_post');
  return types;
};

const sameRegionScore = (brandLocation, locations = [], creatorLocation = '') => {
  const preferred = asArray(locations).map(normalize).filter(Boolean);
  const creator = normalize(creatorLocation);
  const brand = normalize(brandLocation);
  if (!preferred.length && !brand) return { points: 15, reason: 'No location restriction' };
  if (preferred.some((location) => creator && (creator.includes(location) || location.includes(creator)))) {
    return { points: 15, reason: 'Location matches' };
  }
  if (brand && creator && (brand.includes(creator) || creator.includes(brand))) {
    return { points: 8, reason: 'Nearby location fit' };
  }
  return { points: 0, reason: '' };
};

const calculateContentScore = async (brand, creator, campaign = null, profileMap = new Map()) => {
  const brandProfile = getProfile(profileMap, brand._id);
  const creatorProfile = getProfile(profileMap, creator._id);
  const stats = creatorStats(creator, creatorProfile);
  const requirements = campaign?.requirements || {};
  const targetNiches = asArray(requirements.niches).length
    ? requirements.niches
    : asArray(brand.targetNiches).length
      ? brand.targetNiches
      : asArray(brandProfile?.campaignInterests);
  const reasons = [];
  let score = 0;

  const creatorNiches = stats.niches;
  const matched = creatorNiches.filter((niche) => targetNiches.map(normalize).includes(normalize(niche)));
  const nicheScore = creatorNiches.length ? (matched.length / Math.max(creatorNiches.length, 1)) * 30 : 0;
  score += nicheScore;
  if (matched.length) reasons.push(`Niche match: ${matched.slice(0, 2).join(', ')}`);

  const minFollowers = number(requirements.minFollowers, campaign?.minFollowers);
  const maxFollowers = number(requirements.maxFollowers, campaign?.maxFollowers);
  const inFollowerRange = stats.followerCount >= minFollowers && (!maxFollowers || stats.followerCount <= maxFollowers);
  if (inFollowerRange) {
    score += 20;
    reasons.push('Follower range fits');
  } else if (
    stats.followerCount >= minFollowers * 0.8
    && (!maxFollowers || stats.followerCount <= maxFollowers * 1.2)
  ) {
    score += 10;
  }

  const minEngagement = number(requirements.minEngagementRate, campaign?.minEngagementRate);
  if (stats.engagementRate >= minEngagement) {
    score += 20;
    reasons.push('Engagement rate fits');
  } else if (stats.engagementRate >= minEngagement - 1) {
    score += 10;
  }

  const location = sameRegionScore(brandProfile?.location, requirements.locations, stats.location);
  score += location.points;
  if (location.reason) reasons.push(location.reason);

  const audiencePreference = requirements.audienceGenderPreference || campaign?.audienceGenderPreference || 'Any';
  if (!audiencePreference || audiencePreference === 'Any' || normalize(audiencePreference) === normalize(stats.audienceGender)) {
    score += 10;
  }

  const completedPosts = await CampaignPost.find({ creator: creator._id }).select('approvalStatus').limit(50);
  if (!completedPosts.length) {
    score += 3;
  } else if (completedPosts.every((post) => post.approvalStatus !== 'rejected')) {
    score += 5;
    reasons.push('Strong past delivery');
  } else {
    score += 2;
  }

  return { score: Math.round(Math.min(100, score)), reasons };
};

const calculateContentScoreCreator = async (creator, campaign, profileMap = new Map()) => {
  const creatorProfile = getProfile(profileMap, creator._id);
  const stats = creatorStats(creator, creatorProfile);
  const requirements = campaign.requirements || {};
  const reasons = [];
  let score = 0;

  const requiredNiches = asArray(requirements.niches);
  const matched = stats.niches.filter((niche) => requiredNiches.map(normalize).includes(normalize(niche)));
  score += requiredNiches.length ? (matched.length / Math.max(requiredNiches.length, 1)) * 35 : 15;
  if (matched.length) reasons.push(`Fits ${matched.slice(0, 2).join(', ')}`);

  const avgCampaignRate = campaignAverageRate(campaign);
  if (!stats.expectedRate || avgCampaignRate >= stats.expectedRate) {
    score += 25;
    reasons.push('Pay fits expectations');
  } else if (avgCampaignRate >= stats.expectedRate * 0.8) {
    score += 12;
  }

  const minFollowers = number(requirements.minFollowers);
  if (stats.followerCount >= minFollowers * 1.1) {
    score += 20;
    reasons.push('Follower requirement cleared');
  } else if (stats.followerCount >= minFollowers) {
    score += 10;
  } else {
    return null;
  }

  const requiredTypes = deliverableTypes(campaign);
  const pastTypes = await CampaignPost.distinct('deliverableType', { creator: creator._id });
  const hasDoneType = requiredTypes.some((type) => pastTypes.includes(type));
  score += hasDoneType ? 20 : 10;
  if (hasDoneType) reasons.push('Relevant content experience');

  return { score: Math.round(Math.min(100, score)), reasons };
};

const calculateBehaviourScore = async (actorId, targetId) => {
  const events = await UserEvent.find({ actor: actorId, target: targetId }).select('points createdAt');
  const sum = events.reduce((total, event) => {
    const daysAgo = (Date.now() - event.createdAt.getTime()) / 86400000;
    if (daysAgo > 90) return total + event.points * 0.5;
    if (daysAgo > 30) return total + event.points * 0.75;
    return total + event.points;
  }, 0);
  return Math.min(100, Math.max(0, Math.round(sum / 2)));
};

const getCollaborativeBonus = async (brandId, creatorId) => {
  const brandCampaigns = await Campaign.find({ brand: brandId }).select('_id');
  const accepted = await CampaignApplication.find({
    campaign: { $in: brandCampaigns.map((campaign) => campaign._id) },
    status: 'accepted',
  }).distinct('creator');

  if (!accepted.length) return 0;

  const similarBrands = await CampaignApplication.aggregate([
    { $match: { creator: { $in: accepted }, status: 'accepted' } },
    { $lookup: { from: 'campaigns', localField: 'campaign', foreignField: '_id', as: 'campaignDoc' } },
    { $unwind: '$campaignDoc' },
    { $group: { _id: '$campaignDoc.brand', shared: { $sum: 1 } } },
    { $match: { _id: { $ne: new mongoose.Types.ObjectId(brandId) }, shared: { $gte: 2 } } },
    { $sort: { shared: -1 } },
    { $limit: 10 },
  ]);

  const campaigns = await Campaign.find({ brand: { $in: similarBrands.map((brand) => brand._id) } }).select('_id');
  const recommendedByPeers = await CampaignApplication.exists({
    campaign: { $in: campaigns.map((campaign) => campaign._id) },
    creator: creatorId,
    status: 'accepted',
  });

  return recommendedByPeers ? COLLABORATIVE_BONUS : 0;
};

const getCreatorCollaborativeBonus = async (creatorId, campaignId) => {
  const appliedCampaigns = await CampaignApplication.find({ creator: creatorId }).distinct('campaign');
  if (!appliedCampaigns.length) return 0;
  const similarCreators = await CampaignApplication.aggregate([
    { $match: { campaign: { $in: appliedCampaigns } } },
    { $group: { _id: '$creator', shared: { $sum: 1 } } },
    { $match: { _id: { $ne: new mongoose.Types.ObjectId(creatorId) }, shared: { $gte: 2 } } },
    { $limit: 20 },
  ]);
  const exists = await CampaignApplication.exists({
    creator: { $in: similarCreators.map((item) => item._id) },
    campaign: campaignId,
  });
  return exists ? COLLABORATIVE_BONUS : 0;
};

const saveCache = async (userId, userType, recommendations, contextKey = '') => {
  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);
  await RecommendationCache.findOneAndUpdate(
    { userId, contextKey },
    { userId, userType, contextKey, recommendations, generatedAt, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { recommendations, generatedAt, expiresAt, fromCache: false };
};

const addRanks = (items) => items
  .sort((a, b) => b.score - a.score)
  .slice(0, 50)
  .map((item, index) => ({ ...item, rank: index + 1 }));

const eventCountFor = (actorId) => UserEvent.countDocuments({ actor: actorId });

const generateForBrand = async (brandId, campaignContext = null, contextKey = '') => {
  const [brand, brandProfile] = await Promise.all([
    User.findById(brandId),
    Profile.findOne({ user: brandId }),
  ]);
  if (!brand) return [];

  const campaign = campaignContext || await Campaign.findOne({
    brand: brandId,
    status: { $in: ['active', 'draft'] },
  }).sort({ status: 1, updatedAt: -1 });

  const brandCampaigns = await Campaign.find({ brand: brandId }).select('_id');
  const excludedCreators = await CampaignApplication.find({
    campaign: { $in: brandCampaigns.map((item) => item._id) },
    status: { $in: ['pending', 'accepted'] },
  }).distinct('creator');

  const creators = await User.find({
    _id: { $nin: excludedCreators },
    role: { $in: creatorRoles },
    $or: [
      { instagram_verified: true },
      { follower_count: { $gt: 0 } },
    ],
  }).select('-password');

  const profiles = await Profile.find({ user: { $in: [brandId, ...creators.map((creator) => creator._id)] } });
  const profileMap = new Map(profiles.map((profile) => [profile.user.toString(), profile]));
  if (brandProfile && !profileMap.has(brandId.toString())) profileMap.set(brandId.toString(), brandProfile);

  const count = await eventCountFor(brandId);
  const weights = count > 20 ? WEIGHTS.mature : WEIGHTS.early;
  const recommendations = [];

  for (let i = 0; i < creators.length; i += BATCH_SIZE) {
    const batch = creators.slice(i, i + BATCH_SIZE);
    const scored = await Promise.all(batch.map(async (creator) => {
      const contentResult = await calculateContentScore(brand, creator, campaign, profileMap);
      if (!contentResult) return null;
      const [behaviourScore, collaborativeBonus] = await Promise.all([
        calculateBehaviourScore(brandId, creator._id),
        getCollaborativeBonus(brandId, creator._id),
      ]);
      const score = Math.min(100, Math.round(
        contentResult.score * weights.content + behaviourScore * weights.behaviour + collaborativeBonus,
      ));
      return {
        targetId: creator._id,
        targetModel: 'User',
        score,
        contentScore: contentResult.score,
        behaviourScore,
        collaborativeBonus,
        reasons: [
          ...contentResult.reasons,
          ...(collaborativeBonus > 0 ? ['Similar brands loved them'] : []),
          ...(behaviourScore > 40 ? ['Based on your activity'] : []),
        ].slice(0, 6),
      };
    }));
    recommendations.push(...scored.filter(Boolean));
  }

  const ranked = addRanks(recommendations);
  if (contextKey !== null) {
    await saveCache(brandId, brand.role, ranked, contextKey);
  }
  return ranked;
};

const generateForCreator = async (creatorId) => {
  const creator = await User.findById(creatorId);
  if (!creator) return [];

  const existing = await CampaignApplication.find({ creator: creatorId }).distinct('campaign');
  const campaigns = await Campaign.find({
    _id: { $nin: existing },
    status: 'active',
    applicationDeadline: { $gt: new Date() },
  }).populate('brand', 'name profile_pic instagram_profile_pic');

  const profiles = await Profile.find({ user: { $in: [creatorId, ...campaigns.map((campaign) => campaign.brand?._id).filter(Boolean)] } });
  const profileMap = new Map(profiles.map((profile) => [profile.user.toString(), profile]));
  const count = await eventCountFor(creatorId);
  const weights = count > 20 ? WEIGHTS.mature : WEIGHTS.early;
  const recommendations = [];

  for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
    const batch = campaigns.slice(i, i + BATCH_SIZE);
    const scored = await Promise.all(batch.map(async (campaign) => {
      const contentResult = await calculateContentScoreCreator(creator, campaign, profileMap);
      if (!contentResult) return null;
      const [behaviourScore, collaborativeBonus] = await Promise.all([
        calculateBehaviourScore(creatorId, campaign.brand?._id || campaign.brand),
        getCreatorCollaborativeBonus(creatorId, campaign._id),
      ]);
      const score = Math.min(100, Math.round(
        contentResult.score * weights.content + behaviourScore * weights.behaviour + collaborativeBonus,
      ));
      return {
        targetId: campaign._id,
        targetModel: 'Campaign',
        score,
        contentScore: contentResult.score,
        behaviourScore,
        collaborativeBonus,
        reasons: [
          ...contentResult.reasons,
          ...(collaborativeBonus > 0 ? ['Creators like you applied'] : []),
          ...(behaviourScore > 40 ? ['Based on your activity'] : []),
        ].slice(0, 6),
      };
    }));
    recommendations.push(...scored.filter(Boolean));
  }

  const ranked = addRanks(recommendations);
  await saveCache(creatorId, creator.role, ranked);
  return ranked;
};

const getRecommendationsForUser = async (userId, userType, limit = 20, contextKey = '') => {
  const cache = await RecommendationCache.findOne({ userId, contextKey });
  if (cache && cache.expiresAt > new Date()) {
    return {
      recommendations: cache.recommendations.slice(0, limit),
      generatedAt: cache.generatedAt,
      fromCache: true,
    };
  }

  RecommendationCache.deleteOne({ userId, contextKey }).catch(() => {});

  if (userType === 'brand') {
    const recommendations = await generateForBrand(userId, null, contextKey);
    return {
      recommendations: recommendations.slice(0, limit),
      generatedAt: new Date(),
      fromCache: false,
    };
  }

  // For creators/influencers: merge campaign recs + store deal recs
  const [campaignRecs, storeRecs] = await Promise.all([
    generateForCreator(userId),
    generateStoreDealsForCreator(userId),
  ]);

  // Merge and re-sort by score descending
  const merged = [...campaignRecs, ...storeRecs].sort((a, b) => b.score - a.score);

  return {
    recommendations: merged.slice(0, limit),
    generatedAt: new Date(),
    fromCache: false,
  };
};

// ─── Store Deal Scoring ───────────────────────────────────────────────────────

/**
 * Score a store deal for a given creator.
 * Max 100 points.
 * - City match:    40 pts
 * - Niche match:   30 pts
 * - Offer value:   20 pts (flat fee scaling)
 * - Follower fit:  10 pts (within range)
 */
const scoreStoreDeal = (creator, deal, creatorProfile) => {
  const reasons = [];
  let score = 0;

  // City match (40 pts)
  const dealCity = normalize(deal.requirements?.location || '');
  const creatorLocation = normalize(creatorProfile?.location || creator.location || '');
  if (dealCity && creatorLocation) {
    if (creatorLocation.includes(dealCity) || dealCity.includes(creatorLocation)) {
      score += 40;
      reasons.push('City match');
    } else {
      score += 5; // near-ish bonus
    }
  } else {
    score += 20; // no location restriction
    reasons.push('Open location');
  }

  // Niche match (30 pts)
  const dealNiches = asArray(deal.requirements?.preferredNiches).map(normalize);
  const creatorNiches = asArray(creatorProfile?.interests).map(normalize);
  if (dealNiches.length && creatorNiches.length) {
    const matched = creatorNiches.filter((n) => dealNiches.includes(n));
    const nicheScore = (matched.length / Math.max(dealNiches.length, 1)) * 30;
    score += nicheScore;
    if (matched.length) reasons.push(`Niche: ${matched.slice(0, 2).join(', ')}`);
  } else {
    score += 15; // no niche restriction
  }

  // Offer value (20 pts) — scale flat fee: 0→0, ≥2000→20
  const fee = number(deal.flatFeeAmount);
  const valueScore = deal.offerType === 'flat_fee'
    ? Math.min(20, (fee / 2000) * 20)
    : deal.offerType === 'combo' ? 15 : 10; // free meals etc.
  score += valueScore;

  // Follower fit (10 pts)
  const creatorFollowers = number(creator.follower_count, creatorProfile?.followerCount);
  const minFollowers = number(deal.requirements?.minFollowers);
  const maxFollowers = number(deal.requirements?.maxFollowers);
  if (creatorFollowers >= minFollowers && (!maxFollowers || creatorFollowers <= maxFollowers)) {
    score += 10;
    reasons.push('Follower range fits');
  }

  return { score: Math.round(Math.min(100, score)), reasons };
};

/**
 * Generate store deal recommendations for a creator.
 * Returns array in the same shape as regular recommendations.
 */
const generateStoreDealsForCreator = async (creatorId) => {
  try {
    const creator = await User.findById(creatorId).select(
      'follower_count engagement_rate location interests role',
    );
    if (!creator || !creatorRoles.includes(creator.role)) return [];

    const creatorProfile = await Profile.findOne({ user: creatorId });

    // Get deals the creator hasn't applied to yet
    const existingApps = await StoreDealApplication.find({ creator: creatorId }).select('storeDeal');
    const appliedDealIds = existingApps.map((a) => a.storeDeal.toString());

    const activeDeals = await StoreDeal.find({
      status: 'active',
      _id: { $nin: appliedDealIds },
    }).limit(80);

    const creatorFollowers = number(creator.follower_count, creatorProfile?.followerCount);

    const scored = activeDeals
      .filter((deal) => (deal.requirements?.minFollowers || 0) <= creatorFollowers)
      .map((deal) => {
        const { score, reasons } = scoreStoreDeal(creator, deal, creatorProfile);
        return {
          targetId: deal._id,
          targetModel: 'StoreDeal',
          score,
          reasons,
          createdAt: new Date(),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return scored;
  } catch {
    return [];
  }
};

const trackEvent = async (actorId, targetId, targetModel, eventType, metadata = {}) => {
  if (!EVENT_POINTS[eventType]) {
    throw new Error('Invalid recommendation event type');
  }
  const event = await UserEvent.create({
    actor: actorId,
    target: targetId,
    targetModel,
    eventType,
    points: EVENT_POINTS[eventType],
    metadata,
  });
  await RecommendationCache.deleteMany({ userId: actorId });
  await cacheService.delPattern(`recommendations:${actorId}:*`);
  return event;
};

module.exports = {
  WEIGHTS,
  COLLABORATIVE_BONUS,
  CACHE_TTL_HOURS,
  EVENT_POINTS,
  calculateContentScore,
  calculateContentScoreCreator,
  calculateBehaviourScore,
  getCollaborativeBonus,
  generateForBrand,
  generateForCreator,
  getRecommendationsForUser,
  trackEvent,
  scoreStoreDeal,
  generateStoreDealsForCreator,
};
