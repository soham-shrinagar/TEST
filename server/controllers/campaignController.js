const Campaign = require('../models/Campaign');
const CampaignApplication = require('../models/CampaignApplication');
const CampaignPost = require('../models/CampaignPost');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { updateCampaignStats } = require('../services/campaignInstagramService');
const recommendationService = require('../services/recommendationService');
const { uploadFile } = require('../services/storageService');
const cache = require('../services/cacheService');
const { analyticsQueue, instagramQueue, addJob } = require('../config/queues');

const creatorRoles = ['creator', 'influencer'];
const isBrand = (user) => user?.role === 'brand';
const isCreator = (user) => creatorRoles.includes(user?.role);

const requiredPostsPerCreator = (campaign) => (
  (campaign.deliverables?.reels?.count || 0)
  + (campaign.deliverables?.stories?.count || 0)
  + (campaign.deliverables?.staticPosts?.count || 0)
);

const totalNeededPosts = (campaign) => (
  requiredPostsPerCreator(campaign) * (campaign.requirements?.totalCreatorsNeeded || 1)
);

const calculateTotalAmount = (campaign, agreedRates = {}) => {
  const deliverables = campaign.deliverables || {};
  return (
    (deliverables.reels?.count || 0) * (agreedRates.reels ?? deliverables.reels?.ratePerPost ?? 0)
    + (deliverables.stories?.count || 0) * (agreedRates.stories ?? deliverables.stories?.ratePerPost ?? 0)
    + (deliverables.staticPosts?.count || 0) * (agreedRates.staticPosts ?? deliverables.staticPosts?.ratePerPost ?? 0)
  );
};

const getBrandCampaign = async (campaignId, userId) => Campaign.findOne({ _id: campaignId, brand: userId });
const invalidateCampaignCaches = async (campaignId, brandId, creatorId = '*') => {
  await Promise.all([
    cache.delPattern(`campaign:${campaignId}:*`),
    cache.delPattern(`campaigns:brand:${brandId || '*'}:*`),
    cache.delPattern(`campaigns:creator:${creatorId}:*`),
    cache.delPattern('campaigns:discover:*'),
    cache.delPattern('recommendations:*'),
  ]);
};

const queueCampaignStats = async (campaignId, brandId) => (
  addJob(analyticsQueue, 'campaign-stats', { campaignId: campaignId.toString(), brandId: brandId?.toString?.() || '' })
);

const creatorSnapshot = async (creatorId) => {
  const [user, profile] = await Promise.all([
    User.findById(creatorId).select('instagram_handle follower_count engagement_rate'),
    Profile.findOne({ user: creatorId }).select('handle followerCount engagementRate'),
  ]);

  return {
    followerCount: user?.follower_count || profile?.followerCount || 0,
    engagementRate: user?.engagement_rate || profile?.engagementRate || 0,
    instagramHandle: user?.instagram_handle || profile?.handle || '',
  };
};

const withCreatorProfile = async (applications) => Promise.all(applications.map(async (application) => {
  const profile = await Profile.findOne({ user: application.creator._id || application.creator })
    .populate('user', 'name role instagram_handle follower_count engagement_rate instagram_profile_pic profile_pic');
  return { ...application.toObject(), profile };
}));

const createCampaign = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    if (req.body.status === 'active' && (!req.body.contentDeadline || !req.body.applicationDeadline)) {
      return res.status(400).json({ message: 'Application and content deadlines are required to launch' });
    }

    const campaign = await Campaign.create({
      ...req.body,
      brand: req.user._id,
      status: req.body.status || 'draft',
    });
    await queueCampaignStats(campaign._id, campaign.brand);
    await invalidateCampaignCaches(campaign._id, campaign.brand);
    return res.status(201).json(campaign);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCampaign = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['draft', 'active'].includes(campaign.status)) {
      return res.status(400).json({ message: 'Only draft or active campaigns can be updated' });
    }

    Object.assign(campaign, req.body);
    campaign.brand = req.user._id;
    await campaign.save();
    await queueCampaignStats(campaign._id, campaign.brand);
    await invalidateCampaignCaches(campaign._id, campaign.brand);
    return res.json(campaign);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCampaignStatus = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['draft', 'active', 'paused', 'completed', 'cancelled'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid campaign status' });
    }
    if (req.body.status === 'active' && (!campaign.contentDeadline || !campaign.applicationDeadline)) {
      return res.status(400).json({ message: 'Application and content deadlines are required to launch' });
    }

    campaign.status = req.body.status;
    await campaign.save();
    if (req.body.status === 'completed') {
      const acceptedCreators = await CampaignApplication.find({ campaign: campaign._id, status: 'accepted' }).select('creator');
      acceptedCreators.forEach((application) => {
        recommendationService.trackEvent(req.user._id, application.creator, 'User', 'complete').catch(() => {});
      });
    }
    await invalidateCampaignCaches(campaign._id, campaign.brand);
    return res.json(campaign);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status !== 'draft') return res.status(400).json({ message: 'Only draft campaigns can be deleted' });
    await Campaign.deleteOne({ _id: campaign._id });
    await invalidateCampaignCaches(campaign._id, campaign.brand);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listBrandCampaigns = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const cacheKey = `campaigns:brand:${req.user._id}:${req.query.status || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const filter = { brand: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });
    const payload = campaigns.map((campaign) => ({
      ...campaign.toObject(),
      totalPostsNeeded: totalNeededPosts(campaign),
    }));
    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCampaignDashboard = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const cacheKey = `campaign:${req.params.id}:dashboard:${req.user._id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const [applications, posts] = await Promise.all([
      CampaignApplication.find({ campaign: campaign._id }).populate('creator', 'name role instagram_handle follower_count engagement_rate instagram_profile_pic profile_pic').sort({ createdAt: -1 }),
      CampaignPost.find({ campaign: campaign._id }).populate('creator', 'name role instagram_handle instagram_profile_pic profile_pic').sort({ createdAt: -1 }),
    ]);
    const enrichedApplications = await withCreatorProfile(applications);
    const paymentSummary = applications.reduce((sum, app) => {
      sum.totalAgreed += app.totalAgreedAmount || 0;
      if (app.paymentStatus === 'paid') sum.totalPaid += app.totalAgreedAmount || 0;
      return sum;
    }, { totalAgreed: 0, totalPaid: 0 });
    paymentSummary.totalPending = Math.max(paymentSummary.totalAgreed - paymentSummary.totalPaid, 0);

    const payload = {
      campaign: { ...campaign.toObject(), totalPostsNeeded: totalNeededPosts(campaign) },
      stats: campaign.stats,
      applications: enrichedApplications,
      posts,
      paymentSummary,
    };
    await cache.set(cacheKey, payload, 30);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listApplications = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const filter = { campaign: campaign._id };
    if (req.query.status) filter.status = req.query.status;
    const applications = await CampaignApplication.find(filter).populate('creator', 'name role instagram_handle follower_count engagement_rate instagram_profile_pic profile_pic').sort({ createdAt: -1 });
    return res.json(await withCreatorProfile(applications));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewApplication = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['accepted', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    const application = await CampaignApplication.findOne({ _id: req.params.applicationId, campaign: campaign._id });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = req.body.status;
    application.rejectionReason = req.body.status === 'rejected' ? (req.body.rejectionReason || '') : '';
    application.agreedRates = req.body.agreedRates || application.agreedRates;
    application.totalAgreedAmount = req.body.status === 'accepted'
      ? calculateTotalAmount(campaign, application.agreedRates)
      : 0;
    await application.save();
    await queueCampaignStats(campaign._id, campaign.brand);

    if (application.status === 'accepted') {
      recommendationService.trackEvent(req.user._id, application.creator, 'User', 'accept').catch(() => {});
      await createNotification(application.creator, 'campaign_accepted', `You've been accepted to ${campaign.title}!`, 'Start preparing your deliverables.', `/creator/campaigns/${campaign._id}/workspace`);
    } else {
      recommendationService.trackEvent(req.user._id, application.creator, 'User', 'reject').catch(() => {});
      await createNotification(application.creator, 'campaign_rejected', `Your application for ${campaign.title} was not accepted`, application.rejectionReason, '/creator/deals');
    }
    await invalidateCampaignCaches(campaign._id, campaign.brand, application.creator);

    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const inviteCreator = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const creator = await User.findById(req.params.creatorId).select('name role');
    if (!creator || !isCreator(creator)) return res.status(404).json({ message: 'Creator not found' });
    const existing = await CampaignApplication.findOne({ campaign: campaign._id, creator: creator._id });
    if (existing) return res.status(409).json({ message: 'Creator has already applied or been invited' });

    const application = await CampaignApplication.create({
      campaign: campaign._id,
      creator: creator._id,
      type: 'invitation',
      status: 'pending',
      creatorStatsSnapshot: await creatorSnapshot(creator._id),
    });
    await createNotification(creator._id, 'campaign_invite', `You've been invited to join ${campaign.title} by ${req.user.name || 'a brand'}`, 'Review the campaign and accept if it fits.', `/creator/deals/${campaign._id}`);
    await queueCampaignStats(campaign._id, campaign.brand);
    recommendationService.trackEvent(req.user._id, creator._id, 'User', 'invite').catch(() => {});
    await invalidateCampaignCaches(campaign._id, campaign.brand, creator._id);
    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewPost = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['approved', 'rejected'].includes(req.body.approvalStatus)) {
      return res.status(400).json({ message: 'approvalStatus must be approved or rejected' });
    }

    const post = await CampaignPost.findOne({ _id: req.params.postId, campaign: campaign._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const now = new Date();
    post.approvalStatus = req.body.approvalStatus === 'approved' ? 'live' : 'rejected';
    post.approvalNote = req.body.approvalNote || '';
    post.approvedAt = req.body.approvalStatus === 'approved' ? now : undefined;
    post.rejectedAt = req.body.approvalStatus === 'rejected' ? now : undefined;
    await post.save();
    await queueCampaignStats(campaign._id, campaign.brand);

    await createNotification(
      post.creator,
      req.body.approvalStatus === 'approved' ? 'post_approved' : 'post_rejected',
      req.body.approvalStatus === 'approved' ? `Your post for ${campaign.title} has been approved` : `Your post for ${campaign.title} needs changes`,
      post.approvalNote,
      `/creator/campaigns/${campaign._id}/workspace`,
    );
    await invalidateCampaignCaches(campaign._id, campaign.brand, post.creator);
    return res.json(post);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    if (!isBrand(req.user)) return res.status(403).json({ message: 'Brand access required' });
    const campaign = await getBrandCampaign(req.params.id, req.user._id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['pending', 'partial', 'paid'].includes(req.body.paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const application = await CampaignApplication.findOne({ _id: req.params.applicationId, campaign: campaign._id });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    application.paymentStatus = req.body.paymentStatus;
    application.paymentNote = req.body.paymentNote || '';
    application.paidAt = req.body.paymentStatus === 'paid' ? new Date() : undefined;
    await application.save();
    await queueCampaignStats(campaign._id, campaign.brand);

    if (application.paymentStatus === 'paid') {
      await createNotification(application.creator, 'payment_paid', `Payment received for ${campaign.title}`, application.paymentNote, `/creator/campaigns/${campaign._id}/workspace`);
    }
    await invalidateCampaignCaches(campaign._id, campaign.brand, application.creator);
    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const discoverCampaigns = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const cacheKey = `campaigns:discover:${req.user._id}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const existing = await CampaignApplication.find({ creator: req.user._id }).select('campaign');
    const excludedCampaigns = existing.map((application) => application.campaign);
    const filter = { status: 'active', _id: { $nin: excludedCampaigns }, applicationDeadline: { $gt: new Date() } };
    if (req.query.minPay) filter.budgetPerCreator = { ...filter.budgetPerCreator, $gte: Number(req.query.minPay) };
    if (req.query.maxPay) filter.budgetPerCreator = { ...filter.budgetPerCreator, $lte: Number(req.query.maxPay) };
    if (req.query.niche) filter['requirements.niches'] = req.query.niche;
    if (req.query.location) filter['requirements.locations'] = new RegExp(req.query.location, 'i');
    if (req.query.contentType === 'reel') filter['deliverables.reels.count'] = { $gt: 0 };
    if (req.query.contentType === 'story') filter['deliverables.stories.count'] = { $gt: 0 };
    if (req.query.contentType === 'static_post') filter['deliverables.staticPosts.count'] = { $gt: 0 };

    const sort = req.query.sort === 'highest_pay'
      ? { budgetPerCreator: -1 }
      : req.query.sort === 'deadline'
        ? { applicationDeadline: 1 }
        : { createdAt: -1 };
    const campaigns = await Campaign.find(filter).populate('brand', 'name profile_pic instagram_profile_pic').sort(sort);
    const brandProfiles = await Profile.find({ user: { $in: campaigns.map((campaign) => campaign.brand._id) } }).select('user displayName avatar brandCategory');
    const profileByUser = new Map(brandProfiles.map((profile) => [profile.user.toString(), profile]));
    const payload = campaigns.map((campaign) => ({
      ...campaign.toObject(),
      totalPostsNeeded: totalNeededPosts(campaign),
      brandProfile: profileByUser.get(campaign.brand._id.toString()) || null,
    }));
    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicCampaign = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const campaign = await Campaign.findOne({ _id: req.params.id, status: { $in: ['active', 'paused', 'completed'] } }).populate('brand', 'name profile_pic instagram_profile_pic');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const [brandProfile, application] = await Promise.all([
      Profile.findOne({ user: campaign.brand._id }),
      CampaignApplication.findOne({ campaign: campaign._id, creator: req.user._id }),
    ]);
    recommendationService.trackEvent(req.user._id, campaign._id, 'Campaign', 'view').catch(() => {});
    return res.json({ campaign, brandProfile, application });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const applyToCampaign = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const campaign = await Campaign.findOne({ _id: req.params.id, status: 'active' }).populate('brand', 'name');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    const snapshot = await creatorSnapshot(req.user._id);
    if ((campaign.requirements?.minFollowers || 0) > snapshot.followerCount) {
      return res.status(400).json({ message: `Requires at least ${campaign.requirements.minFollowers} followers` });
    }
    const existing = await CampaignApplication.findOne({ campaign: campaign._id, creator: req.user._id });
    if (existing) return res.status(409).json({ message: 'You have already applied or been invited' });

    const application = await CampaignApplication.create({
      campaign: campaign._id,
      creator: req.user._id,
      pitch: req.body.pitch || '',
      creatorStatsSnapshot: snapshot,
    });
    await createNotification(campaign.brand._id, 'new_application', `New application from @${snapshot.instagramHandle || req.user.name || 'creator'} for ${campaign.title}`, req.body.pitch || '', `/brand/campaigns/${campaign._id}/dashboard#creators`);
    await queueCampaignStats(campaign._id, campaign.brand);
    recommendationService.trackEvent(req.user._id, campaign._id, 'Campaign', 'apply').catch(() => {});
    await invalidateCampaignCaches(campaign._id, campaign.brand, req.user._id);
    return res.status(201).json(application);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied or been invited' });
    return res.status(500).json({ message: error.message });
  }
};

const withdrawApplication = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const application = await CampaignApplication.findOne({ campaign: req.params.id, creator: req.user._id });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.status !== 'pending') return res.status(400).json({ message: 'Only pending applications can be withdrawn' });
    application.status = 'withdrawn';
    await application.save();
    await queueCampaignStats(req.params.id, null);
    recommendationService.trackEvent(req.user._id, req.params.id, 'Campaign', 'withdraw').catch(() => {});
    await invalidateCampaignCaches(req.params.id, '*', req.user._id);
    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listCreatorCampaigns = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const cacheKey = `campaigns:creator:${req.user._id}:all`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const applications = await CampaignApplication.find({ creator: req.user._id })
      .populate({ path: 'campaign', populate: { path: 'brand', select: 'name profile_pic instagram_profile_pic' } })
      .sort({ updatedAt: -1 });
    const posts = await CampaignPost.find({ creator: req.user._id });
    const postsByCampaign = posts.reduce((map, post) => {
      const key = post.campaign.toString();
      map.set(key, [...(map.get(key) || []), post]);
      return map;
    }, new Map());
    const payload = applications.map((application) => ({
      application,
      campaign: application.campaign,
      posts: postsByCampaign.get(application.campaign?._id?.toString()) || [],
      postsRequired: application.campaign ? requiredPostsPerCreator(application.campaign) : 0,
    }));
    await cache.set(cacheKey, payload, 30);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCreatorWorkspace = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const cacheKey = `campaign:${req.params.id}:workspace:${req.user._id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    const application = await CampaignApplication.findOne({ campaign: req.params.id, creator: req.user._id, status: 'accepted' });
    if (!application) return res.status(403).json({ message: 'Accepted application required' });
    const [campaign, posts] = await Promise.all([
      Campaign.findById(req.params.id).populate('brand', 'name profile_pic instagram_profile_pic'),
      CampaignPost.find({ campaign: req.params.id, creator: req.user._id }).sort({ createdAt: 1 }),
    ]);
    const payload = { campaign, application, posts, postsRequired: requiredPostsPerCreator(campaign), messagesThreadId: null };
    await cache.set(cacheKey, payload, 30);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitPost = async (req, res) => {
  try {
    if (!isCreator(req.user)) return res.status(403).json({ message: 'Creator access required' });
    const application = await CampaignApplication.findOne({ campaign: req.params.id, creator: req.user._id, status: 'accepted' });
    if (!application) return res.status(403).json({ message: 'Accepted application required' });
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!['reel', 'story', 'static_post'].includes(req.body.deliverableType)) {
      return res.status(400).json({ message: 'Invalid deliverable type' });
    }
    const allowed = (
      (req.body.deliverableType === 'reel' && campaign.deliverables?.reels?.count > 0)
      || (req.body.deliverableType === 'story' && campaign.deliverables?.stories?.count > 0)
      || (req.body.deliverableType === 'static_post' && campaign.deliverables?.staticPosts?.count > 0)
    );
    if (!allowed) return res.status(400).json({ message: 'This deliverable type is not required' });

    const uploaded = req.file
      ? await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'screenshots')
      : null;

    const post = await CampaignPost.create({
      campaign: campaign._id,
      application: application._id,
      creator: req.user._id,
      brand: campaign.brand,
      deliverableType: req.body.deliverableType,
      instagramPostUrl: req.body.instagramPostUrl || '',
      screenshotUrl: uploaded?.url || '',
      submittedAt: new Date(),
      verified: false,
      approvalStatus: 'pending',
    });
    await createNotification(campaign.brand, 'post_submitted', `@${application.creatorStatsSnapshot?.instagramHandle || req.user.name || 'creator'} submitted a post for review`, req.body.deliverableType, `/brand/campaigns/${campaign._id}/dashboard#content`);
    const submittedOnTime = !campaign.contentDeadline || post.submittedAt <= campaign.contentDeadline;
    recommendationService.trackEvent(
      req.user._id,
      campaign.brand,
      'User',
      submittedOnTime ? 'submit_ontime' : 'submit_late',
    ).catch(() => {});

    let verification = null;
    if (post.deliverableType !== 'story') {
      await addJob(instagramQueue, 'verify-post', {
        postId: post._id.toString(),
        campaignId: campaign._id.toString(),
        expectedHandle: application.creatorStatsSnapshot?.instagramHandle || '',
      });
      verification = { status: 'processing', verified: false };
    } else {
      await queueCampaignStats(campaign._id, campaign.brand);
    }
    await invalidateCampaignCaches(campaign._id, campaign.brand, req.user._id);

    return res.status(201).json({ post: verification?.post || post, verification });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  listBrandCampaigns,
  getCampaignDashboard,
  listApplications,
  reviewApplication,
  inviteCreator,
  reviewPost,
  updatePayment,
  discoverCampaigns,
  getPublicCampaign,
  applyToCampaign,
  withdrawApplication,
  listCreatorCampaigns,
  getCreatorWorkspace,
  submitPost,
};
