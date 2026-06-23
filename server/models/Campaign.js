const mongoose = require('mongoose');

const deliverableSchema = new mongoose.Schema({
  count: { type: Number, default: 0, min: 0 },
  ratePerPost: { type: Number, default: 0, min: 0 },
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  productName: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
  },
  deliverables: {
    reels: { type: deliverableSchema, default: () => ({}) },
    stories: { type: deliverableSchema, default: () => ({}) },
    staticPosts: { type: deliverableSchema, default: () => ({}) },
  },
  requirements: {
    minFollowers: { type: Number, default: 0 },
    maxFollowers: { type: Number, default: 0 },
    minEngagementRate: { type: Number, default: 0 },
    niches: [{ type: String, trim: true }],
    locations: [{ type: String, trim: true }],
    audienceGenderPreference: { type: String, default: 'Any' },
    totalCreatorsNeeded: { type: Number, default: 1, min: 1 },
  },
  budgetPerCreator: { type: Number, default: 0, min: 0 },
  totalBudget: { type: Number, default: 0, min: 0 },
  brief: { type: String, default: '' },
  dos: [{ type: String, trim: true }],
  donts: [{ type: String, trim: true }],
  requiredHashtags: [{ type: String, trim: true }],
  requiredMentions: [{ type: String, trim: true }],
  referenceLinks: [{ type: String, trim: true }],
  applicationDeadline: Date,
  contentDeadline: Date,
  approvalMode: {
    type: String,
    enum: ['pre_approval', 'post_approval'],
    default: 'pre_approval',
  },
  stats: {
    totalApplications: { type: Number, default: 0 },
    totalCreatorsAccepted: { type: Number, default: 0 },
    totalPostsLive: { type: Number, default: 0 },
    totalPostsPending: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

campaignSchema.index({ brand: 1, status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, applicationDeadline: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
