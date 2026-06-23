const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  participantsKey: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['matched', 'outreach'],
    required: true,
    default: 'outreach',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastMessage: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

conversationSchema.pre('validate', function setParticipantsKey(next) {
  if (this.participants?.length) {
    this.participantsKey = this.participants
      .map((participant) => participant.toString())
      .sort()
      .join(':');
  }
  next();
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ participantsKey: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
