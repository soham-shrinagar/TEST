const Conversation = require('../models/Conversation');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { markMessagesAsRead, unreadMessageFilter } = require('../services/messengerService');
const { emitReadReceipts, notifyParticipants } = require('../services/messengerSocket');
const { uploadFile } = require('../services/storageService');
const cache = require('../services/cacheService');

const creatorRoles = ['influencer', 'creator'];

const buildParticipantsKey = (userIds) => userIds.map((id) => id.toString()).sort().join(':');

const getOtherParticipant = (conversation, userId) => (
  conversation.participants.find((participant) => participant._id.toString() !== userId.toString())
);

const serializeProfile = (profile) => {
  if (!profile) return null;
  return {
    userId: profile.user?._id || profile.user,
    displayName: profile.displayName,
    role: profile.role,
    avatar: profile.avatar,
    handle: profile.handle,
    location: profile.location,
    interests: profile.interests,
    campaignInterests: profile.campaignInterests,
    instagram_profile_pic: profile.user?.instagram_profile_pic || '',
    profile_pic: profile.user?.profile_pic || '',
  };
};

const enrichConversation = async (conversation, userId) => {
  const otherUser = getOtherParticipant(conversation, userId);
  const otherProfile = otherUser ? await Profile.findOne({ user: otherUser._id }) : null;
  const unreadCount = await Message.countDocuments(unreadMessageFilter(conversation._id, userId));

  return {
    _id: conversation._id,
    type: conversation.type,
    createdBy: conversation.createdBy,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount,
    updatedAt: conversation.updatedAt,
    otherUser: otherUser ? {
      _id: otherUser._id,
      name: otherUser.name,
      role: otherUser.role,
      profile_pic: otherUser.profile_pic,
      instagram_profile_pic: otherUser.instagram_profile_pic,
    } : null,
    profile: serializeProfile(otherProfile),
  };
};

const findMatch = (userA, userB) => Match.findOne({
  $or: [
    { user1: userA, user2: userB },
    { user1: userB, user2: userA },
  ],
});

const resolveConversationType = async (requestingUser, otherUser) => {
  const match = await findMatch(requestingUser._id, otherUser._id);
  if (match) return 'matched';

  if (requestingUser.role === 'brand' && creatorRoles.includes(otherUser.role)) {
    return 'outreach';
  }

  return null;
};

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name role profile_pic instagram_profile_pic')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const enriched = await Promise.all(
      conversations.map((conversation) => enrichConversation(conversation, req.user._id))
    );

    return res.json({
      matched: enriched.filter((conversation) => conversation.type === 'matched'),
      outreach: enriched.filter((conversation) => conversation.type === 'outreach'),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' });
    }

    if (participantId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot start a chat with yourself' });
    }

    const otherUser = await User.findById(participantId).select('-password');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (otherUser.role === req.user.role) {
      return res.status(403).json({ message: 'Chats are only available between brands and influencers' });
    }

    const type = await resolveConversationType(req.user, otherUser);
    if (!type) {
      return res.status(403).json({ message: 'Only brands can start outreach chats before a match' });
    }

    const participants = [req.user._id, otherUser._id];
    const participantsKey = buildParticipantsKey(participants);
    const conversation = await Conversation.findOneAndUpdate(
      { participantsKey, type },
      {
        $setOnInsert: {
          participants,
          participantsKey,
          type,
          createdBy: req.user._id,
          lastMessageAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('participants', 'name role profile_pic instagram_profile_pic');

    return res.status(201).json(await enrichConversation(conversation, req.user._id));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const receipts = await markMessagesAsRead(conversation._id, req.user._id);
    if (receipts.length) {
      notifyParticipants(conversation, {
        type: 'read_receipt',
        conversationId: conversation._id,
        receipts,
      });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 })
      .limit(100);

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const receipts = await emitReadReceipts(conversation, req.user._id);
    return res.json({ receipts });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const body = String(req.body.body || '').trim();
    if (!body && !req.file) {
      return res.status(400).json({ message: 'Message or file is required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const uploaded = req.file
      ? await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'attachments')
      : null;

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      body,
      attachment: req.file && uploaded ? {
        filename: uploaded.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: uploaded.url,
      } : undefined,
      readReceipts: [{ user: req.user._id, readAt: new Date() }],
      readBy: [req.user._id],
    });

    conversation.lastMessage = body || `Shared ${req.file.originalname}`;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const populated = await message.populate('sender', 'name role');
    notifyParticipants(conversation, {
      type: 'message',
      conversationId: conversation._id,
      message: populated,
    });
    await cache.delPattern(`messenger:${req.user._id}:*`);
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
};
