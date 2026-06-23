const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['reel', 'story', 'static_post', 'google_review'],
  },
  postUrl: { type: String, default: '' },
  screenshotUrl: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'live'],
    default: 'pending',
  },
  approvalNote: { type: String, default: '' },
  stats: {
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    estimatedReach: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },
    postedAt: { type: Date },
  },
  submittedAt: { type: Date },
}, { _id: true });

const storeDealApplicationSchema = new mongoose.Schema({
  storeDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreDeal', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'visited', 'completed'],
    default: 'pending',
  },

  // Creator's pitch
  pitch: { type: String, default: '' },

  // Visit booking
  visitSlotBooked: {
    date: { type: Date },
    time: { type: String, default: '' },
  },
  visitConfirmed: { type: Boolean, default: false },
  visitedAt: { type: Date },

  // Post submissions
  submissions: [submissionSchema],

  // Compensation tracking
  compensationType: { type: String, default: '' },
  flatFeeAmount: { type: Number, default: 0 },
  offerDescription: { type: String, default: '' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'na'],
    default: 'pending',
  },

  // Creator stats snapshot at application time
  creatorStatsSnapshot: {
    followerCount: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    instagramHandle: { type: String, default: '' },
  },

  // Creator review of store (submitted when deal is completed)
  review: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 300, default: '' },
    submittedAt: { type: Date },
  },
}, {
  timestamps: true,
});

// One application per creator per deal
storeDealApplicationSchema.index({ storeDeal: 1, creator: 1 }, { unique: true, name: 'deal_creator_unique' });
storeDealApplicationSchema.index({ storeDeal: 1 }, { name: 'storeDeal' });
storeDealApplicationSchema.index({ creator: 1 }, { name: 'creator' });
storeDealApplicationSchema.index({ status: 1 }, { name: 'status' });

module.exports = mongoose.model('StoreDealApplication', storeDealApplicationSchema);
