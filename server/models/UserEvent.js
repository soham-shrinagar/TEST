const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetModel: { type: String, enum: ['User', 'Campaign', 'StoreDeal'], required: true },
  eventType: {
    type: String,
    enum: [
      'view',
      'save',
      'apply',
      'invite',
      'accept',
      'reject',
      'withdraw',
      'complete',
      'review_positive',
      'review_negative',
      'submit_ontime',
      'submit_late',
    ],
    required: true,
  },
  points: { type: Number, default: 0 },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

userEventSchema.index({ actor: 1, target: 1, eventType: 1 });
userEventSchema.index({ createdAt: 1 });

module.exports = mongoose.model('UserEvent', userEventSchema);
