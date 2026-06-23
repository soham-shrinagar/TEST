const mongoose = require('mongoose');

const campaignPostSchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignApplication', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliverableType: {
    type: String,
    enum: ['reel', 'story', 'static_post'],
    required: true,
  },
  instagramPostUrl: { type: String, default: '' },
  instagramPostId: { type: String, default: '' },
  screenshotUrl: { type: String, default: '' },
  submittedAt: Date,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  verificationError: { type: String, default: '' },
  stats: {
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    estimatedReach: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },
    caption: { type: String, default: '' },
    postedAt: Date,
    lastFetchedAt: Date,
  },
  approvalStatus: {
    type: String,
    // 'pending' → submitted, awaiting brand review
    // 'live'    → brand approved (goes live immediately)
    // 'rejected'→ brand rejected, creator must resubmit
    enum: ['pending', 'live', 'rejected'],
    default: 'pending',
  },
  approvalNote: { type: String, default: '' },
  approvedAt: Date,
  rejectedAt: Date,
}, {
  timestamps: true,
});

campaignPostSchema.index({ campaign: 1, approvalStatus: 1 });
campaignPostSchema.index({ application: 1, deliverableType: 1 });

module.exports = mongoose.model('CampaignPost', campaignPostSchema);
