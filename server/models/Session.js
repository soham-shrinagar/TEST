const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

sessionSchema.index({ user: 1, revokedAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
