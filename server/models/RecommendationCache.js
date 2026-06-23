const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetModel: { type: String, required: true },
  score: { type: Number, default: 0 },
  contentScore: { type: Number, default: 0 },
  behaviourScore: { type: Number, default: 0 },
  collaborativeBonus: { type: Number, default: 0 },
  reasons: [{ type: String }],
  rank: { type: Number, default: 0 },
}, { _id: false });

const recommendationCacheSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userType: { type: String, enum: ['brand', 'creator', 'influencer'], required: true },
  contextKey: { type: String, default: '' },
  recommendations: [recommendationSchema],
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true,
});

recommendationCacheSchema.index({ userId: 1, contextKey: 1 }, { unique: true });
recommendationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RecommendationCache', recommendationCacheSchema);
