const Notification = require('../models/Notification');
const cache = require('../services/cacheService');

const listNotifications = async (req, res) => {
  try {
    const cacheKey = `notifications:${req.user._id}:latest`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    await cache.set(cacheKey, notifications, 15);
    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    await cache.delPattern(`notifications:${req.user._id}:*`);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markOneRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await cache.delPattern(`notifications:${req.user._id}:*`);
    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { listNotifications, markAllRead, markOneRead };
