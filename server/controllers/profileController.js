const Profile = require('../models/Profile');
const User = require('../models/User');
const recommendationService = require('../services/recommendationService');
const { uploadFile } = require('../services/storageService');
const cache = require('../services/cacheService');

const SHARED_REQUIRED_FIELDS = ['displayName', 'bio', 'location'];
const INFLUENCER_REQUIRED_FIELDS = ['handle', 'platform', 'availability'];
const BRAND_REQUIRED_FIELDS = ['brandCategory', 'targetAudience', 'budgetTier'];

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const validateProfile = (profile) => {
  for (const field of SHARED_REQUIRED_FIELDS) {
    if (!String(profile[field] || '').trim()) {
      return `${field} is required`;
    }
  }

  if (profile.role === 'influencer' || profile.role === 'creator') {
    for (const field of INFLUENCER_REQUIRED_FIELDS) {
      if (!String(profile[field] || '').trim()) {
        return `${field} is required`;
      }
    }

    if (!Array.isArray(profile.interests) || profile.interests.length === 0) {
      return 'At least one interest is required';
    }

    if (typeof profile.followerCount !== 'number' || Number.isNaN(profile.followerCount) || profile.followerCount < 0) {
      return 'followerCount must be a valid non-negative number';
    }

    if (typeof profile.engagementRate !== 'number' || Number.isNaN(profile.engagementRate) || profile.engagementRate < 0) {
      return 'engagementRate must be a valid non-negative number';
    }
  }

  if (profile.role === 'brand') {
    for (const field of BRAND_REQUIRED_FIELDS) {
      if (!String(profile[field] || '').trim()) {
        return `${field} is required`;
      }
    }

    if (!Array.isArray(profile.campaignInterests) || profile.campaignInterests.length === 0) {
      return 'At least one campaign interest is required';
    }

    if (!Array.isArray(profile.campaignTypes) || profile.campaignTypes.length === 0) {
      return 'At least one campaign type is required';
    }

    if (!Array.isArray(profile.activeCampaigns) || profile.activeCampaigns.length === 0) {
      return 'At least one active campaign is required';
    }
  }

  return null;
};

const USER_PROFILE_FIELDS = 'name email role instagram_verified instagram_handle follower_count following_count media_count engagement_rate avg_like_count avg_comment_count instagram_profile_pic instagram_last_synced_at instagram_source instagram_recent_posts biography';

const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).populate('user', USER_PROFILE_FIELDS);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    if (req.user?.role === 'brand' && ['creator', 'influencer'].includes(profile.user?.role)) {
      recommendationService.trackEvent(req.user._id, profile.user._id, 'User', 'view').catch(() => {});
    }
    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const PROTECTED_PROFILE_FIELDS = ['user', '_id', 'role', 'createdAt', 'updatedAt', '__v'];

const updateMyProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    PROTECTED_PROFILE_FIELDS.forEach((field) => {
      delete updates[field];
    });
    const existingProfile = await Profile.findOne({ user: req.user._id });

    if (!existingProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
      updates.avatar = uploaded.url;
    }

    const arrayFields = ['interests', 'pastBrands', 'campaignInterests', 'campaignTypes', 'activeCampaigns'];
    arrayFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updates[field] = normalizeArrayField(updates[field]);
      }
    });

    ['followerCount', 'engagementRate'].forEach((field) => {
      if (typeof updates[field] === 'string' && updates[field] !== '') {
        updates[field] = Number(updates[field]);
      }
    });

    const mergedProfile = {
      ...existingProfile.toObject(),
      ...updates,
    };

    const validationError = validateProfile(mergedProfile);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user', USER_PROFILE_FIELDS);

    await User.findByIdAndUpdate(req.user._id, { onboardingComplete: true });
    await cache.delPattern(`profile:${req.user._id}:*`);
    await cache.delPattern('recommendations:*');

    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', USER_PROFILE_FIELDS);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyProfile, updateMyProfile, getProfileById };
