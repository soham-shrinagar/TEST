export const getUserId = (value) => (value?._id || value)?.toString();

export const getReadReceipts = (message) => {
  if (message?.readReceipts?.length) {
    return message.readReceipts;
  }

  return (message?.readBy || []).map((user) => ({
    user,
    readAt: message.updatedAt || message.createdAt,
  }));
};

export const getReadReceiptForUser = (message, userId) => (
  getReadReceipts(message).find((receipt) => getUserId(receipt.user) === getUserId(userId))
);

export const formatMessageTime = (dateString) => (
  new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
);

export const formatReadReceiptTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = formatMessageTime(dateString);
  if (sameDay) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
};

export const isImageAttachment = (attachment) => attachment?.mimetype?.startsWith('image/');
export const isVideoAttachment = (attachment) => attachment?.mimetype?.startsWith('video/');

export const attachmentUrl = (attachment, baseUrl) => (
  attachment?.url?.startsWith?.('http') ? attachment.url : `${baseUrl}${attachment.url}`
);
