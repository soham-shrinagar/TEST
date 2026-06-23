const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const createSession = async (userId, req) => {
  const session = await Session.create({
    user: userId,
    userAgent: req?.headers?.['user-agent'] || '',
    ipAddress: req?.ip || req?.connection?.remoteAddress || '',
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  const token = jwt.sign(
    { id: userId, sid: session._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );

  return { token, session };
};

const validateSession = async (sessionId) => {
  if (!sessionId) return false;

  const session = await Session.findById(sessionId);
  if (!session || session.revokedAt) return false;
  if (session.expiresAt.getTime() < Date.now()) return false;

  return session;
};

const revokeSession = async (sessionId) => Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });

const revokeAllUserSessions = async (userId, exceptSessionId = null) => {
  const filter = { user: userId, revokedAt: null };
  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }
  await Session.updateMany(filter, { revokedAt: new Date() });
};

const listUserSessions = async (userId) => Session.find({
  user: userId,
  revokedAt: null,
  expiresAt: { $gt: new Date() },
}).sort({ updatedAt: -1 }).select('userAgent ipAddress createdAt updatedAt expiresAt');

module.exports = {
  SESSION_TTL_MS,
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  listUserSessions,
};
