const express = require('express');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.patch('/role', requireAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['influencer', 'creator', 'brand', 'store'].includes(role)) {
      return res.status(400).json({ message: 'Role must be influencer, creator, brand, or store' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: { role } }, { new: true }).select('-password');

    // Stores don't use the Profile model — skip Profile upsert
    if (role !== 'store') {
      const profileRole = role === 'creator' ? 'creator' : 'brand';
      await Profile.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            role: profileRole,
            displayName: user.display_name || user.name || 'CreatorSync user',
            handle: user.instagram_handle || '',
            avatar: '',
          },
        },
        { upsert: true, new: true }
      );
    }

    return res.json({ success: true, role: user.role });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not update role' });
  }
});

module.exports = router;
