const path = require('path');
const { spawn } = require('child_process');
const Campaign = require('../models/Campaign');
const CampaignApplication = require('../models/CampaignApplication');
const CampaignPost = require('../models/CampaignPost');
const User = require('../models/User');

const extractShortcode = (postUrl) => {
  const match = String(postUrl || '').match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/i);
  return match?.[1] || '';
};

const runScraper = (postUrl, expectedHandle) => new Promise((resolve) => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'instagram_post_scraper.py');
  const child = spawn('python3', [scriptPath, postUrl, expectedHandle || ''], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', (error) => {
    resolve({ error: error.message });
  });

  child.on('close', () => {
    try {
      resolve(JSON.parse(stdout || '{}'));
    } catch {
      resolve({ error: stderr || 'Could not parse Instagram scraper output' });
    }
  });
});

const updateCampaignStats = async (campaignId) => {
  const [totalApplications, totalCreatorsAccepted, paidApplications, livePosts, totalPostsPending] = await Promise.all([
    CampaignApplication.countDocuments({ campaign: campaignId }),
    CampaignApplication.countDocuments({ campaign: campaignId, status: 'accepted' }),
    CampaignApplication.find({ campaign: campaignId, paymentStatus: 'paid' }).select('totalAgreedAmount'),
    CampaignPost.find({ campaign: campaignId, approvalStatus: 'live' }).select('stats'),
    CampaignPost.countDocuments({ campaign: campaignId, approvalStatus: 'pending' }),
  ]);

  const totals = livePosts.reduce((sum, post) => ({
    totalReach: sum.totalReach + (post.stats?.estimatedReach || 0),
    totalLikes: sum.totalLikes + (post.stats?.likeCount || 0),
    totalComments: sum.totalComments + (post.stats?.commentCount || 0),
  }), { totalReach: 0, totalLikes: 0, totalComments: 0 });

  const totalSpend = paidApplications.reduce((sum, app) => sum + (app.totalAgreedAmount || 0), 0);
  const stats = {
    totalApplications,
    totalCreatorsAccepted,
    totalPostsLive: livePosts.length,
    totalPostsPending,
    totalReach: totals.totalReach,
    totalLikes: totals.totalLikes,
    totalComments: totals.totalComments,
    totalEngagement: totals.totalLikes + totals.totalComments,
    totalSpend,
  };

  await Campaign.findByIdAndUpdate(campaignId, { stats });
  return stats;
};

const verifyInstagramPost = async (postId, expectedHandle) => {
  const post = await CampaignPost.findById(postId).populate('campaign');
  if (!post) {
    return { verified: false, error: 'Campaign post not found' };
  }

  const shortcode = extractShortcode(post.instagramPostUrl);
  if (!shortcode) {
    post.verified = false;
    post.verificationError = 'Invalid Instagram post URL';
    await post.save();
    return { verified: false, error: post.verificationError };
  }

  const creator = await User.findById(post.creator).select('follower_count instagram_handle');
  const handle = expectedHandle || creator?.instagram_handle || '';
  const result = await runScraper(post.instagramPostUrl, handle);

  if (result.error) {
    post.verified = false;
    post.verificationError = result.error;
    post.instagramPostId = shortcode;
    await post.save();
    await updateCampaignStats(post.campaign._id);
    return { verified: false, error: result.error };
  }

  if (handle && result.owner_handle && result.owner_handle.toLowerCase() !== handle.toLowerCase()) {
    post.verified = false;
    post.verificationError = 'Post does not belong to this creator';
    post.instagramPostId = shortcode;
    await post.save();
    await updateCampaignStats(post.campaign._id);
    return { verified: false, error: post.verificationError };
  }

  const now = new Date();
  post.verified = true;
  post.verifiedAt = now;
  post.verificationError = '';
  post.instagramPostId = result.shortcode || shortcode;
  post.stats = {
    likeCount: result.like_count || 0,
    commentCount: result.comment_count || 0,
    estimatedReach: Math.round((creator?.follower_count || 0) * 0.3),
    thumbnailUrl: result.thumbnail_url || '',
    caption: result.caption || '',
    postedAt: result.posted_at ? new Date(result.posted_at) : undefined,
    lastFetchedAt: now,
  };
  post.approvalStatus = post.campaign.approvalMode === 'post_approval' ? 'live' : 'pending';
  await post.save();
  await updateCampaignStats(post.campaign._id);

  return { verified: true, post };
};

const refreshAllLivePosts = async () => {
  const posts = await CampaignPost.find({ approvalStatus: 'live', instagramPostUrl: { $ne: '' } });
  await Promise.all(posts.map(async (post) => {
    const creator = await User.findById(post.creator).select('instagram_handle');
    return verifyInstagramPost(post._id, creator?.instagram_handle || '');
  }));
};

module.exports = {
  extractShortcode,
  verifyInstagramPost,
  updateCampaignStats,
  refreshAllLivePosts,
};
