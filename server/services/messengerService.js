const Message = require('../models/Message');

const getUserId = (value) => (value?._id || value)?.toString();

const getReadReceipts = (message) => {
  if (message.readReceipts?.length) {
    return message.readReceipts;
  }

  return (message.readBy || []).map((user) => ({
    user,
    readAt: message.updatedAt || message.createdAt,
  }));
};

const hasReadReceipt = (message, userId) => (
  getReadReceipts(message).some((receipt) => getUserId(receipt.user) === getUserId(userId))
);

const markMessagesAsRead = async (conversationId, readerId) => {
  const now = new Date();
  const candidates = await Message.find({
    conversation: conversationId,
    sender: { $ne: readerId },
  }).select('_id readReceipts readBy updatedAt createdAt');

  const unread = candidates.filter((message) => !hasReadReceipt(message, readerId));
  if (!unread.length) {
    return [];
  }

  const messageIds = unread.map((message) => message._id);
  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $push: { readReceipts: { user: readerId, readAt: now } } }
  );

  return messageIds.map((messageId) => ({
    messageId,
    readerId,
    readAt: now,
  }));
};

const unreadMessageFilter = (conversationId, userId) => ({
  conversation: conversationId,
  sender: { $ne: userId },
  $nor: [
    { 'readReceipts.user': userId },
    { readBy: userId },
  ],
});

module.exports = {
  getReadReceipts,
  hasReadReceipt,
  markMessagesAsRead,
  unreadMessageFilter,
};
