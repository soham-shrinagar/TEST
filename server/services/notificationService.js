const Notification = require('../models/Notification');
const { notifyUser } = require('./messengerSocket');
const { notificationsQueue, addJob } = require('../config/queues');
const cache = require('./cacheService');

const createNotification = async (userId, type, title, message, link = '') => {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
  });

  await cache.delPattern(`notifications:${userId}:*`);
  const queued = await addJob(notificationsQueue, 'deliver', { notificationId: notification._id.toString() });
  if (!queued) {
    notifyUser(userId, {
      type: 'notification',
      notification,
    });
  }

  return notification;
};

module.exports = { createNotification };
