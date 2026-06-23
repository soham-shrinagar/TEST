const mongoose = require('mongoose');

const campaignApplicationSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['application', 'invitation'],
    default: 'application',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending',
  },
  pitch: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  agreedRates: {
    reels: { type: Number, default: 0 },
    stories: { type: Number, default: 0 },
    staticPosts: { type: Number, default: 0 },
  },
  totalAgreedAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending',
  },
  paymentNote: { type: String, default: '' },
  paidAt: Date,
  creatorStatsSnapshot: {
    followerCount: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    instagramHandle: { type: String, default: '' },
  },
}, {
  timestamps: true,
});

campaignApplicationSchema.index({ campaign: 1, creator: 1 }, { unique: true });
campaignApplicationSchema.index({ creator: 1, status: 1 });

module.exports = mongoose.model('CampaignApplication', campaignApplicationSchema);
