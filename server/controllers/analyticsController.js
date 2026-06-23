const Match = require('../models/Match');
const Profile = require('../models/Profile');
const UserEvent = require('../models/UserEvent');
const cache = require('../services/cacheService');

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

module.exports = { getDashboardStats };
