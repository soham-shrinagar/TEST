const User = require('../models/User');
const Profile = require('../models/Profile');
const { createSession, listUserSessions, revokeSession, revokeAllUserSessions } = require('../services/sessionService');

const authUserPayload = (user, includeToken = false, token = null) => {
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    display_name: user.display_name,
    profile_pic: user.profile_pic,
    auth_provider: user.auth_provider,
    instagram_handle: user.instagram_handle,
    instagram_profile_pic: user.instagram_profile_pic,
    instagram_verified: user.instagram_verified,
    instagram_last_synced_at: user.instagram_last_synced_at,
    follower_count: user.follower_count,
    following_count: user.following_count,
    media_count: user.media_count,
    engagement_rate: user.engagement_rate,
    avg_like_count: user.avg_like_count,
    avg_comment_count: user.avg_comment_count,
    onboardingComplete: user.onboardingComplete,
    accountStatus: user.accountStatus,
  };

  // Include storeProfile for store users
  if (user.role === 'store') {
    payload.storeProfile = user.storeProfile || {};
  }

  if (includeToken && token) {
    payload.token = token;
  }

  return payload;
};

const issueAuthResponse = async (user, req, res, statusCode = 200) => {
  const { token } = await createSession(user._id, req);
  return res.status(statusCode).json(authUserPayload(user, true, token));
};

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['influencer', 'creator', 'brand', 'store'].includes(role)) {
    return res.status(400).json({ message: 'Role must be influencer, creator, brand, or store' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const userCreateData = {
      name,
      email,
      password,
      role,
      display_name: name,
      auth_provider: 'local',
      emailVerified: true,
      onboardingComplete: role === 'store', // stores skip onboarding
    };

    // Initialize storeProfile for store accounts
    if (role === 'store') {
      const { storeName, storeType, city } = req.body;
      userCreateData.storeProfile = {
        storeName: storeName || name,
        storeType: storeType || '',
        address: { city: city || '' },
      };
    }

    const user = await User.create(userCreateData);

    // Only create Profile documents for non-store accounts
    if (role !== 'store') {
      await Profile.create({ user: user._id, role, displayName: name });
    }

    return issueAuthResponse(user, req, res, 201);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();
    }

    return issueAuthResponse(user, req, res);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => res.json(authUserPayload(req.user));

const getSessions = async (req, res) => {
  try {
    const sessions = await listUserSessions(req.user._id);
    const currentSessionId = req.sessionId?.toString();

    return res.json(sessions.map((session) => ({
      _id: session._id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      current: session._id.toString() === currentSessionId,
    })));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const revokeUserSession = async (req, res) => {
  try {
    const session = await listUserSessions(req.user._id);
    const target = session.find((item) => item._id.toString() === req.params.sessionId);

    if (!target) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await revokeSession(req.params.sessionId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const revokeOtherSessions = async (req, res) => {
  try {
    await revokeAllUserSessions(req.user._id, req.sessionId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getSessions,
  revokeUserSession,
  revokeOtherSessions,
  authUserPayload,
  issueAuthResponse,
};
