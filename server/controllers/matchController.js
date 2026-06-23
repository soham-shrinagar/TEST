const Match = require('../models/Match');
const Profile = require('../models/Profile');

const getMyMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.user1.toString() === userId.toString() ? match.user2 : match.user1;
        const profile = await Profile.findOne({ user: otherUserId }).populate('user', 'name role profile_pic instagram_profile_pic');
        return {
          matchId: match._id,
          matchedAt: match.createdAt,
          profile,
        };
      })
    );

    return res.json(enriched.filter((item) => item.profile));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyMatches };
