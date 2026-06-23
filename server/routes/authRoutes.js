const express = require('express');
const passport = require('passport');
const {
  registerUser,
  loginUser,
  getMe,
  getSessions,
  revokeUserSession,
  revokeOtherSessions,
} = require('../controllers/authController');
const { protect, requireAuth, attachUserFromToken } = require('../middleware/authMiddleware');
const { revokeSession } = require('../services/sessionService');

const router = express.Router();

const clientUrl = () => process.env.CLIENT_URL || 'http://127.0.0.1:5173';

const clientPath = (path) => `${clientUrl()}${path}`;

const dashboardPath = (role) => {
  const path = role === 'brand'
    ? '/brand/dashboard'
    : role === 'store'
      ? '/store/dashboard'
      : role === 'creator' || role === 'influencer'
        ? '/creator/dashboard'
        : '/onboarding/role';
  return clientPath(path);
};

const saveIntendedRole = (req, res, next) => {
  const role = req.query.role;
  req.session.intended_role = ['brand', 'creator', 'store'].includes(role) ? role : null;
  next();
};

const requireStrategy = (name) => (req, res, next) => {
  if (!passport._strategy(name)) {
    return res.status(503).json({ message: `${name} OAuth is not configured` });
  }
  return next();
};

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/session', requireAuth, getMe);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:sessionId', protect, revokeUserSession);
router.post('/sessions/revoke-others', protect, revokeOtherSessions);

router.get('/google', requireStrategy('google'), saveIntendedRole, passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback', requireStrategy('google'), passport.authenticate('google', {
  failureRedirect: clientPath('/login'),
}), async (req, res) => {
  try {
    const { createSession } = require('../services/sessionService');
    const { token } = await createSession(req.user._id, req);
    const redirectPath = req.user.onboardingComplete
      ? dashboardPath(req.user.role)
      : clientPath('/onboarding/role');
    return res.redirect(`${redirectPath}?token=${encodeURIComponent(token)}`);
  } catch (error) {
    return res.redirect(clientPath('/login'));
  }
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.redirect(clientPath('/'));
    });
  });
});

router.post('/logout', async (req, res) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const result = await attachUserFromToken(token);
      if (result?.sessionId) {
        await revokeSession(result.sessionId);
      }
    } catch {
      // Ignore invalid tokens during logout.
    }
  }

  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  });
});

module.exports = router;
