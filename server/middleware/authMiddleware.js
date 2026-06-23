const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateSession } = require('../services/sessionService');

const attachUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const session = await validateSession(decoded.sid);

  if (!session) {
    return null;
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    return null;
  }

  return { user, sessionId: decoded.sid };
};

const protect = async (req, res, next) => {
  if (req.user) {
    User.updateOne({ _id: req.user._id }, { lastActiveAt: new Date() }).catch(() => {});
    return next();
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const result = await attachUserFromToken(token);

      if (!result) {
        return res.status(401).json({ message: 'Not authorized, session expired or revoked' });
      }

      req.user = result.user;
      req.sessionId = result.sessionId;
      User.updateOne({ _id: req.user._id }, { lastActiveAt: new Date() }).catch(() => {});
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const requireAuth = async (req, res, next) => {
  if (req.user) {
    return next();
  }

  return protect(req, res, next);
};

const requireStore = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user?.role !== 'store') {
    return res.status(403).json({ error: 'store_access_required', message: 'Store account required' });
  }
  if (req.user?.accountStatus && req.user.accountStatus !== 'active') {
    return res.status(403).json({ error: 'account_suspended', message: 'Account is suspended' });
  }
  return next();
};

const requireBrand = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user?.role !== 'brand') {
    return res.status(403).json({ error: 'brand_access_required', message: 'Brand account required' });
  }
  return next();
};

const requireCreator = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (!['creator', 'influencer'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'creator_access_required', message: 'Creator account required' });
  }
  return next();
};

module.exports = {
  protect,
  requireAuth,
  attachUserFromToken,
  requireStore,
  requireBrand,
  requireCreator,
};
