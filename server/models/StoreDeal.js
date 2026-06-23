const mongoose = require('mongoose');

const visitSlotSchema = new mongoose.Schema({
  date: { type: Date },
  time: { type: String, default: '' },
  slotsAvailable: { type: Number, default: 1 },
  slotsBooked: { type: Number, default: 0 },
}, { _id: true });

const storeDealSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Deal basics
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },

  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },

  // What the store is offering
  offerType: {
    type: String,
    enum: ['free_meal', 'flat_fee', 'discount_voucher', 'combo'],
    required: true,
  },
  flatFeeAmount: { type: Number, default: 0 },
  offerDescription: { type: String, default: '' },

  // What they want from the creator
  deliverables: {
    reels: { type: Number, default: 0 },
    stories: { type: Number, default: 0 },
    staticPosts: { type: Number, default: 0 },
    googleReview: { type: Boolean, default: false },
    instagramTagRequired: { type: Boolean, default: true },
  },

  // Visit details
  visitRequired: { type: Boolean, default: true },
  visitSlots: [visitSlotSchema],
  bookingDeadline: { type: Date },

  // Creator requirements
  requirements: {
    minFollowers: { type: Number, default: 1000 },
    maxFollowers: { type: Number, default: 0 },
    minEngagementRate: { type: Number, default: 0 },
    preferredNiches: [{ type: String, trim: true }],
    location: { type: String, default: '' },
    maxCreators: { type: Number, default: 5 },
  },

  // Brief & content guidelines
  brief: { type: String, default: '' },
  dos: [{ type: String, trim: true }],
  donts: [{ type: String, trim: true }],
  requiredHashtags: [{ type: String, trim: true }],
  requiredMentions: [{ type: String, trim: true }],

  // Stats
  stats: {
    totalApplications: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
    totalPostsLive: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

storeDealSchema.index({ store: 1, status: 1 });
storeDealSchema.index({ status: 1 });
storeDealSchema.index({ 'requirements.preferredNiches': 1 });
storeDealSchema.index({ 'requirements.location': 1 });
storeDealSchema.index({
  status: 1,
  'requirements.preferredNiches': 1,
  'requirements.location': 1,
}, { name: 'creator_discover_compound' });

module.exports = mongoose.model('StoreDeal', storeDealSchema);
