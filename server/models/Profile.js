const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  }, 
  role: {
    type: String,
    enum: ['influencer', 'creator', 'brand'],
    required: true,
  },
  displayName: { type: String, required: true, trim: true },
  bio: { type: String, maxlength: 400, default: '' },
  location: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  handle: { type: String, trim: true, default: '' },
  platform: {
    type: String,
    enum: ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'LinkedIn', 'Other', ''],
    default: '',
  },
  followerCount: { type: Number, default: 0 },
  engagementRate: { type: Number, default: 0 },
  interests: [{ type: String }],
  availability: {
    type: String,
    enum: ['Paid only', 'Gifting only', 'Both', ''],
    default: '',
  },
  pastBrands: [{ type: String }],
  brandCategory: { type: String, default: '' },
  targetAudience: { type: String, default: '' },
  campaignInterests: [{ type: String }],
  budgetTier: {
    type: String,
    enum: ['Micro (< ₹10k)', 'Mid (₹10k–₹50k)', 'Premium (₹50k+)', ''],
    default: '',
  },
  campaignTypes: [{ type: String }],
  activeCampaigns: [{ type: String }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Profile', profileSchema);
