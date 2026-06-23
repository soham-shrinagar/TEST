const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Profile = require('../models/Profile');

const getRole = (req) => {
  const role = req.session?.intended_role;
  return ['brand', 'creator'].includes(role) ? role : null;
};

const publicUser = (user) => user?.select ? user.select('-password') : user;

const ensureProfile = async (user) => {
  if (!user.role) return;

  await Profile.findOneAndUpdate(
    { user: user._id },
    {
      $setOnInsert: {
        user: user._id,
        role: user.role,
        displayName: user.display_name || user.name || 'CreatorSync user',
        avatar: user.profile_pic || '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const configurePassport = () => {
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const profilePic = profile.photos?.[0]?.value || '';
        const displayName = profile.displayName || email || 'Google user';
        const existing = await User.findOne({
          $or: [
            { google_id: profile.id },
            ...(email ? [{ email }] : []),
          ],
        });

        if (existing) {
          const intendedRole = getRole(req);
          if (!existing.google_id) existing.google_id = profile.id;
          if (!existing.profile_pic && profilePic) existing.profile_pic = profilePic;
          if (!existing.display_name) existing.display_name = displayName;
          if (!existing.name) existing.name = displayName;
          if (!existing.role && intendedRole) existing.role = intendedRole;
          if (!existing.auth_provider) existing.auth_provider = 'google';
          if (email) {
            existing.emailVerified = true;
          }
          await existing.save();
          await ensureProfile(existing);
          return done(null, publicUser(existing));
        }

        const user = await User.create({
          google_id: profile.id,
          email,
          name: displayName,
          display_name: displayName,
          profile_pic: profilePic,
          auth_provider: 'google',
          role: getRole(req),
          emailVerified: Boolean(email),
        });

        await ensureProfile(user);
        return done(null, publicUser(user));
      } catch (error) {
        return done(error);
      }
    }));
  }
};

module.exports = configurePassport;
