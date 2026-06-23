const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { decryptToken } = require('../utils/instagramTokenCrypto');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const instagramPublicFields = [
  'instagram_handle',
  'display_name',
  'instagram_profile_pic',
  'follower_count',
  'following_count',
  'media_count',
  'biography',
  'engagement_rate',
  'avg_like_count',
  'avg_comment_count',
  'instagram_source',
  'instagram_recent_posts',
  'instagram_verified',
  'instagram_last_synced_at',
];

const serializeInstagramStats = (user, extra = {}) => ({
  has_stats: Boolean(user.instagram_handle && user.instagram_last_synced_at),
  username: user.instagram_handle,
  full_name: user.display_name || user.name,
  profile_pic_url: user.instagram_profile_pic,
  follower_count: user.follower_count || 0,
  following_count: user.following_count || 0,
  media_count: user.media_count || 0,
  biography: user.biography || '',
  engagement_rate: user.engagement_rate || 0,
  avg_like_count: user.avg_like_count || 0,
  avg_comment_count: user.avg_comment_count || 0,
  source: user.instagram_source || '',
  recent_posts: user.instagram_recent_posts || [],
  instagram_verified: Boolean(user.instagram_verified),
  last_synced_at: user.instagram_last_synced_at,
  ...extra,
});

const hasFreshInstagramCache = (user) => (
  user.instagram_last_synced_at &&
  Date.now() - new Date(user.instagram_last_synced_at).getTime() < ONE_DAY_MS
);

const runPublicScraper = (username) => new Promise((resolve, reject) => {
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'instagram_scraper.py');
  const child = spawn('python3', [scriptPath, username], {
    cwd: path.join(__dirname, '..', '..'),
    env: {
      ...process.env,
      DOTENV_PATH: path.join(__dirname, '..', '.env'),
    },
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', reject);
  child.on('close', (code) => {
    try {
      const parsed = JSON.parse(stdout || '{}');
      if (parsed.error) {
        reject(new Error(parsed.error));
        return;
      }
      if (code !== 0) {
        reject(new Error(stderr.trim() || 'Instagram scraper failed'));
        return;
      }
      resolve(parsed);
    } catch (error) {
      reject(new Error(stderr.trim() || error.message || 'Could not parse Instagram scraper output'));
    }
  });
});

const normalizeStats = (stats) => ({
  instagram_handle: String(stats.username || '').replace(/^@/, '').trim(),
  display_name: stats.full_name || stats.username || '',
  instagram_profile_pic: stats.profile_pic_url || '',
  follower_count: Number(stats.follower_count) || 0,
  following_count: Number(stats.following_count) || 0,
  media_count: Number(stats.media_count) || 0,
  biography: stats.biography || '',
  engagement_rate: Number(stats.engagement_rate) || 0,
  avg_like_count: Number(stats.avg_like_count) || 0,
  avg_comment_count: Number(stats.avg_comment_count) || 0,
  instagram_source: stats.source || '',
  instagram_recent_posts: Array.isArray(stats.recent_posts)
    ? stats.recent_posts.slice(0, 12).map((post) => ({
      shortcode: post.shortcode || '',
      display_url: post.display_url || '',
      like_count: Number(post.like_count) || 0,
      comment_count: Number(post.comment_count) || 0,
      is_video: Boolean(post.is_video),
      timestamp: post.timestamp ? new Date(Number(post.timestamp) * 1000) : undefined,
    }))
    : [],
  instagram_last_synced_at: new Date(),
});

const syncProfileStats = async (userId, normalizedStats) => {
  const user = await User.findById(userId).select('role');
  const profileRole = ['brand', 'creator', 'influencer'].includes(user?.role) ? user.role : 'creator';

  await Profile.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        handle: normalizedStats.instagram_handle ? `@${normalizedStats.instagram_handle}` : '',
        platform: 'Instagram',
        avatar: normalizedStats.instagram_profile_pic,
        followerCount: normalizedStats.follower_count,
        engagementRate: normalizedStats.engagement_rate,
      },
      $setOnInsert: {
        user: userId,
        role: profileRole,
        displayName: normalizedStats.display_name || normalizedStats.instagram_handle || 'Creator',
        bio: normalizedStats.biography || '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const savePublicStats = async (userId, stats) => {
  const normalizedStats = normalizeStats(stats);
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...normalizedStats,
        instagram_verified: false,
      },
    },
    { new: true }
  ).select(instagramPublicFields.join(' '));

  await syncProfileStats(userId, normalizedStats);
  return user;
};

const saveVerifiedStats = async (userId, stats) => {
  const normalizedStats = normalizeStats(stats);
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        ...normalizedStats,
        instagram_verified: true,
      },
    },
    { new: true }
  );

  await syncProfileStats(userId, normalizedStats);
  return user;
};

const fetchVerifiedForUser = async (user) => {
  const accessToken = decryptToken(user.instagram_access_token);
  const profileResponse = await axios.get('https://graph.instagram.com/me', {
    params: {
      fields: 'id,username,account_type,media_count',
      access_token: accessToken,
    },
  });

  const mediaResponse = await axios.get('https://graph.instagram.com/me/media', {
    params: {
      fields: 'id,like_count,comments_count,timestamp',
      limit: 12,
      access_token: accessToken,
    },
  });

  const media = mediaResponse.data?.data || [];
  const totals = media.reduce((acc, item) => ({
    likes: acc.likes + (Number(item.like_count) || 0),
    comments: acc.comments + (Number(item.comments_count) || 0),
  }), { likes: 0, comments: 0 });
  const avgLikes = media.length ? totals.likes / media.length : 0;
  const avgComments = media.length ? totals.comments / media.length : 0;
  const followerCount = Number(user.follower_count) || 0;
  const engagementRate = followerCount
    ? Number((((avgLikes + avgComments) / followerCount) * 100).toFixed(2))
    : 0;

  return saveVerifiedStats(user._id, {
    username: profileResponse.data.username || user.instagram_handle,
    full_name: user.display_name || profileResponse.data.username || user.name,
    profile_pic_url: user.instagram_profile_pic || '',
    follower_count: user.follower_count || 0,
    following_count: user.following_count || 0,
    media_count: profileResponse.data.media_count || user.media_count || 0,
    biography: user.biography || '',
    engagement_rate: engagementRate,
    avg_like_count: avgLikes,
    avg_comment_count: avgComments,
    recent_posts: media.map((item) => ({
      shortcode: item.id || '',
      display_url: '',
      like_count: Number(item.like_count) || 0,
      comment_count: Number(item.comments_count) || 0,
      is_video: false,
      timestamp: item.timestamp ? new Date(item.timestamp).getTime() / 1000 : undefined,
    })),
    source: 'instagram_basic_display',
  });
};

const markInstagramTokenExpired = (userId) => User.findByIdAndUpdate(userId, {
  $set: { instagram_verified: false },
  $unset: { instagram_access_token: 1 },
});

module.exports = {
  hasFreshInstagramCache,
  runPublicScraper,
  savePublicStats,
  serializeInstagramStats,
  fetchVerifiedForUser,
  markInstagramTokenExpired,
};
