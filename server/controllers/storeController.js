const User = require('../models/User');
const StoreDeal = require('../models/StoreDeal');
const StoreDealApplication = require('../models/StoreDealApplication');
const Profile = require('../models/Profile');
const { createNotification } = require('../services/notificationService');
const { uploadFile } = require('../services/storageService');
const cache = require('../services/cacheService');
const { trackEvent } = require('../services/recommendationService');
const multer = require('multer');

const creatorRoles = ['creator', 'influencer'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const invalidateStoreCache = async (storeId) => {
  await Promise.all([
    cache.delPattern(`store:${storeId}:*`),
    cache.delPattern('store:discover:*'),
  ]);
};

const creatorSnapshot = (creator) => ({
  followerCount: creator.follower_count || 0,
  engagementRate: creator.engagement_rate || 0,
  instagramHandle: creator.instagram_handle || '',
});

// ─── Store Registration ───────────────────────────────────────────────────────

const registerStore = async (req, res) => {
  const { email, password, storeName, storeType, city } = req.body;
  if (!email || !password || !storeName) {
    return res.status(400).json({ message: 'email, password, and storeName are required' });
  }
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({
      name: storeName,
      email: email.toLowerCase().trim(),
      password,
      role: 'store',
      display_name: storeName,
      auth_provider: 'local',
      emailVerified: true,
      onboardingComplete: true,
      accountStatus: 'active',
      storeProfile: {
        storeName,
        storeType: storeType || '',
        address: { city: city || '' },
      },
    });

    const { issueAuthResponse } = require('./authController');
    return issueAuthResponse(user, req, res, 201);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Store Profile ────────────────────────────────────────────────────────────

const getStoreProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateStoreProfile = async (req, res) => {
  try {
    const PROTECTED = ['role', 'email', 'password', '_id', '__v'];
    const updates = {};

    // Build storeProfile update
    const storeProfileFields = [
      'storeName', 'storeType', 'description', 'contactPhone', 'websiteUrl',
      'instagramHandle', 'openingHours', 'averageSpend', 'gstNumber',
    ];
    const storeProfileUpdate = {};
    storeProfileFields.forEach((field) => {
      if (req.body[field] !== undefined) storeProfileUpdate[field] = req.body[field];
    });

    // Address as nested object
    if (req.body.address) {
      storeProfileUpdate.address = req.body.address;
    } else {
      const addrFields = ['street', 'city', 'state', 'pincode', 'googleMapsLink'];
      const addrUpdate = {};
      addrFields.forEach((f) => { if (req.body[f] !== undefined) addrUpdate[f] = req.body[f]; });
      if (Object.keys(addrUpdate).length) storeProfileUpdate.address = addrUpdate;
    }

    // Handle file uploads (logo + cover)
    if (req.files) {
      if (req.files.logoImage?.[0]) {
        const file = req.files.logoImage[0];
        const uploaded = await uploadFile(file.buffer, file.originalname, file.mimetype, 'store-logos');
        storeProfileUpdate.logoImage = uploaded.url;
      }
      if (req.files.coverImage?.[0]) {
        const file = req.files.coverImage[0];
        const uploaded = await uploadFile(file.buffer, file.originalname, file.mimetype, 'store-covers');
        storeProfileUpdate.coverImage = uploaded.url;
      }
    }

    const setOps = {};
    Object.entries(storeProfileUpdate).forEach(([key, value]) => {
      if (key === 'address' && typeof value === 'object') {
        Object.entries(value).forEach(([addrKey, addrVal]) => {
          setOps[`storeProfile.address.${addrKey}`] = addrVal;
        });
      } else {
        setOps[`storeProfile.${key}`] = value;
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true }
    ).select('-password');

    await invalidateStoreCache(req.user._id);
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Store Deal CRUD ──────────────────────────────────────────────────────────

const createDeal = async (req, res) => {
  try {
    // Enforce one active deal per store
    const existingActive = await StoreDeal.findOne({ store: req.user._id, status: 'active' });
    if (existingActive) {
      return res.status(400).json({
        error: 'active_deal_exists',
        message: 'You already have an active deal. Complete or pause it first.',
      });
    }

    const deal = await StoreDeal.create({ ...req.body, store: req.user._id });

    // If deal is created as active, set activeDealId
    if (deal.status === 'active') {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { 'storeProfile.activeDealId': deal._id },
        $inc: { 'storeProfile.totalDealsPosted': 1 },
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'storeProfile.totalDealsPosted': 1 },
      });
    }

    await invalidateStoreCache(req.user._id);
    return res.status(201).json(deal);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listStoreDeals = async (req, res) => {
  try {
    const filter = { store: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const deals = await StoreDeal.find(filter).sort({ createdAt: -1 });
    return res.json(deals);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStoreDeal = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const applications = await StoreDealApplication.find({ storeDeal: deal._id })
      .populate('creator', 'name instagram_handle follower_count engagement_rate instagram_profile_pic profile_pic')
      .sort({ createdAt: -1 });

    return res.json({ deal, applications });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDeal = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    if (!['draft', 'active'].includes(deal.status)) {
      return res.status(400).json({ message: 'Only draft or active deals can be updated' });
    }

    // If changing to active, ensure no other active deal
    if (req.body.status === 'active' && deal.status !== 'active') {
      const existingActive = await StoreDeal.findOne({
        store: req.user._id,
        status: 'active',
        _id: { $ne: deal._id },
      });
      if (existingActive) {
        return res.status(400).json({
          error: 'active_deal_exists',
          message: 'You already have an active deal. Complete or pause it first.',
        });
      }
    }

    Object.assign(deal, req.body);
    deal.store = req.user._id; // prevent store field override
    await deal.save();
    await invalidateStoreCache(req.user._id);
    return res.json(deal);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDealStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    if (status === 'active') {
      const existingActive = await StoreDeal.findOne({
        store: req.user._id,
        status: 'active',
        _id: { $ne: deal._id },
      });
      if (existingActive) {
        return res.status(400).json({
          error: 'active_deal_exists',
          message: 'You already have an active deal. Complete or pause it first.',
        });
      }
      await User.findByIdAndUpdate(req.user._id, { $set: { 'storeProfile.activeDealId': deal._id } });
    } else if (['paused', 'completed'].includes(status)) {
      await User.findByIdAndUpdate(req.user._id, { $set: { 'storeProfile.activeDealId': null } });
    }

    deal.status = status;
    await deal.save();
    await invalidateStoreCache(req.user._id);
    return res.json(deal);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Applications (Store side) ────────────────────────────────────────────────

const listApplications = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const filter = { storeDeal: deal._id };
    if (req.query.status) filter.status = req.query.status;

    const applications = await StoreDealApplication.find(filter)
      .populate('creator', 'name instagram_handle follower_count engagement_rate instagram_profile_pic profile_pic')
      .sort({ createdAt: -1 });

    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewApplication = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    if (!['accepted', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    const application = await StoreDealApplication.findOne({
      _id: req.params.appId,
      storeDeal: deal._id,
    });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = req.body.status;

    if (req.body.status === 'accepted') {
      // Set compensation details from deal
      application.compensationType = deal.offerType;
      application.flatFeeAmount = deal.flatFeeAmount || 0;
      application.offerDescription = deal.offerDescription || '';
      application.paymentStatus = deal.flatFeeAmount > 0 ? 'pending' : 'na';

      await StoreDeal.findByIdAndUpdate(deal._id, { $inc: { 'stats.totalAccepted': 1 } });

      const storeName = req.user.storeProfile?.storeName || 'the store';
      await createNotification(
        application.creator,
        'store_application_accepted',
        `Your application to visit ${storeName} was accepted! 🎉`,
        'Check the details and book your visit.',
        `/creator/store-visits/${deal._id}`,
      );
    } else {
      const storeName = req.user.storeProfile?.storeName || 'the store';
      await createNotification(
        application.creator,
        'store_application_rejected',
        `Your application to ${storeName} was not selected this time`,
        'Keep applying to other store deals!',
        '/creator/deals',
      );
    }

    await application.save();
    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const confirmVisit = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const application = await StoreDealApplication.findOne({
      _id: req.params.appId,
      storeDeal: deal._id,
      status: 'accepted',
    });
    if (!application) return res.status(404).json({ message: 'Application not found or not accepted' });

    application.visitConfirmed = true;
    application.visitedAt = new Date();
    application.status = 'visited';
    await application.save();

    const storeName = req.user.storeProfile?.storeName || 'the store';
    const visitDate = application.visitSlotBooked?.date
      ? new Date(application.visitSlotBooked.date).toLocaleDateString()
      : 'your scheduled date';
    const visitTime = application.visitSlotBooked?.time || '';
    const storeAddress = [
      req.user.storeProfile?.address?.street,
      req.user.storeProfile?.address?.city,
    ].filter(Boolean).join(', ');

    await createNotification(
      application.creator,
      'store_visit_confirmed',
      `Visit confirmed at ${storeName} on ${visitDate}${visitTime ? ` at ${visitTime}` : ''}!`,
      storeAddress ? `Address: ${storeAddress}` : 'Open the app for address details.',
      `/creator/store-visits/${deal._id}`,
    );

    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const approveSubmission = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, store: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const application = await StoreDealApplication.findOne({ _id: req.params.appId, storeDeal: deal._id });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const subIndex = Number(req.params.subIndex);
    if (subIndex < 0 || subIndex >= application.submissions.length) {
      return res.status(400).json({ message: 'Invalid submission index' });
    }

    const { approvalStatus, note } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'approvalStatus must be approved or rejected' });
    }

    application.submissions[subIndex].approvalStatus = approvalStatus === 'approved' ? 'live' : 'rejected';
    application.submissions[subIndex].approvalNote = note || '';
    await application.save();

    if (approvalStatus === 'approved') {
      await StoreDeal.findByIdAndUpdate(deal._id, { $inc: { 'stats.totalPostsLive': 1 } });
      const storeName = req.user.storeProfile?.storeName || 'the store';
      await createNotification(
        application.creator,
        'store_post_approved',
        `Your post for ${storeName} was approved ✓`,
        note || '',
        `/creator/store-visits/${deal._id}`,
      );
    }

    return res.json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Creator-Facing Routes ────────────────────────────────────────────────────

const discoverStoreDeals = async (req, res) => {
  try {
    const cacheKey = `store:discover:${req.user._id}:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const filter = { status: 'active' };
    if (req.query.city) filter['requirements.location'] = new RegExp(req.query.city, 'i');
    if (req.query.niche) filter['requirements.preferredNiches'] = req.query.niche;
    if (req.query.offerType) filter.offerType = req.query.offerType;
    if (req.query.minPay) filter.flatFeeAmount = { $gte: Number(req.query.minPay) };
    if (req.query.slotsAvailable === 'true') {
      filter['stats.totalAccepted'] = { $lt: 1 }; // rough proxy; refined below
    }

    const sort = req.query.sort === 'highest_value'
      ? { flatFeeAmount: -1 }
      : req.query.sort === 'most_slots'
        ? { 'requirements.maxCreators': -1 }
        : { createdAt: -1 };

    const deals = await StoreDeal.find(filter).sort(sort).limit(50);

    // Enrich with store profile
    const storeIds = [...new Set(deals.map((d) => d.store.toString()))];
    const stores = await User.find({ _id: { $in: storeIds } }).select('storeProfile name');
    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    // Check creator's existing applications
    const existingApps = await StoreDealApplication.find({ creator: req.user._id }).select('storeDeal status');
    const appliedDeals = new Map(existingApps.map((a) => [a.storeDeal.toString(), a.status]));

    const creatorFollowers = req.user.follower_count || 0;

    const payload = deals
      .filter((deal) => (deal.requirements?.minFollowers || 0) <= creatorFollowers)
      .map((deal) => {
        const store = storeMap.get(deal.store.toString());
        return {
          ...deal.toObject(),
          storeInfo: store ? {
            _id: store._id,
            storeName: store.storeProfile?.storeName || store.name,
            storeType: store.storeProfile?.storeType,
            city: store.storeProfile?.address?.city,
            logoImage: store.storeProfile?.logoImage,
            storeVerified: store.storeProfile?.storeVerified,
            averageRating: store.storeProfile?.averageRating,
            totalReviews: store.storeProfile?.totalReviews,
          } : null,
          applicationStatus: appliedDeals.get(deal._id.toString()) || null,
          spotsRemaining: Math.max(0, (deal.requirements?.maxCreators || 5) - (deal.stats?.totalAccepted || 0)),
        };
      });

    await cache.set(cacheKey, payload, 60);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicDeal = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({
      _id: req.params.id,
      status: { $in: ['active', 'paused'] },
    });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const store = await User.findById(deal.store).select('storeProfile name');
    let application = null;
    if (req.user) {
      application = await StoreDealApplication.findOne({
        storeDeal: deal._id,
        creator: req.user._id,
      });
      // Track view event for recommendation scoring
      trackEvent(req.user._id, deal._id, 'StoreDeal', 'view').catch(() => {});
    }

    return res.json({ deal, store, application });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const applyToDeal = async (req, res) => {
  try {
    const deal = await StoreDeal.findOne({ _id: req.params.id, status: 'active' });
    if (!deal) return res.status(404).json({ message: 'Deal not found or not active' });

    // Check follower requirement
    const snapshot = creatorSnapshot(req.user);
    if (deal.requirements?.minFollowers > snapshot.followerCount) {
      return res.status(400).json({
        message: `This deal requires at least ${deal.requirements.minFollowers} followers`,
      });
    }

    // Check spots available
    if (deal.stats.totalAccepted >= (deal.requirements?.maxCreators || 5)) {
      return res.status(400).json({ message: 'All spots for this deal have been filled' });
    }

    // Check for existing application
    const existing = await StoreDealApplication.findOne({ storeDeal: deal._id, creator: req.user._id });
    if (existing) return res.status(409).json({ message: 'You have already applied to this deal' });

    const application = await StoreDealApplication.create({
      storeDeal: deal._id,
      creator: req.user._id,
      pitch: req.body.pitch || '',
      creatorStatsSnapshot: snapshot,
    });

    await StoreDeal.findByIdAndUpdate(deal._id, { $inc: { 'stats.totalApplications': 1 } });

    // Track apply event for recommendation scoring
    trackEvent(req.user._id, deal._id, 'StoreDeal', 'apply').catch(() => {});

    // Notify store
    const store = await User.findById(deal.store).select('storeProfile');
    const handle = snapshot.instagramHandle || req.user.name || 'A creator';
    await createNotification(
      deal.store,
      'store_new_application',
      `@${handle} applied to your deal`,
      req.body.pitch || '',
      `/store/deals/${deal._id}`,
    );

    await invalidateStoreCache(deal.store);
    return res.status(201).json(application);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied to this deal' });
    return res.status(500).json({ message: error.message });
  }
};

const submitContent = async (req, res) => {
  try {
    const application = await StoreDealApplication.findOne({
      storeDeal: req.params.id,
      creator: req.user._id,
      status: { $in: ['accepted', 'visited'] },
    });
    if (!application) return res.status(403).json({ message: 'Accepted application required' });

    const { type, postUrl, googleReviewUrl } = req.body;
    if (!['reel', 'story', 'static_post', 'google_review'].includes(type)) {
      return res.status(400).json({ message: 'Invalid submission type' });
    }

    let screenshotUrl = '';
    if (req.file) {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'store-submissions');
      screenshotUrl = uploaded.url;
    }

    application.submissions.push({
      type,
      postUrl: postUrl || googleReviewUrl || '',
      screenshotUrl,
      submittedAt: new Date(),
    });
    await application.save();

    // Notify store
    const snapshot = application.creatorStatsSnapshot;
    const handle = snapshot?.instagramHandle || req.user.name || 'creator';
    await createNotification(
      (await StoreDeal.findById(req.params.id).select('store')).store,
      'store_post_submitted',
      `@${handle} submitted content for review`,
      `Content type: ${type}`,
      `/store/deals/${req.params.id}`,
    );

    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Store Verification Request (Part 14) ────────────────────────────────────

const requestVerification = async (req, res) => {
  try {
    const { gstNumber } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'storeProfile.verificationRequested': true,
        ...(gstNumber ? { 'storeProfile.gstNumber': gstNumber } : {}),
      },
    });
    console.log(`[store:verification] Store ${req.user._id} (${req.user.storeProfile?.storeName}) requested verification.`);
    return res.json({ message: 'Verification request submitted. Our team will review and contact you.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Creator Review of Store (Part 15) ───────────────────────────────────────

const reviewStore = async (req, res) => {
  try {
    const application = await StoreDealApplication.findOne({
      _id: req.params.appId,
      storeDeal: req.params.id,
      creator: req.user._id,
      status: 'completed',
    });
    if (!application) {
      return res.status(403).json({ message: 'You can only review after completing a deal' });
    }
    if (application.review?.rating) {
      return res.status(409).json({ message: 'You have already reviewed this store' });
    }

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    application.review = { rating, comment: comment || '', submittedAt: new Date() };
    await application.save();

    // Recalculate store's aggregate rating
    const deal = await StoreDeal.findById(req.params.id).select('store');
    const storeDeals = await StoreDeal.find({ store: deal.store }).select('_id');
    const allApps = await StoreDealApplication.find({
      storeDeal: { $in: storeDeals.map((d) => d._id) },
      'review.rating': { $exists: true, $gt: 0 },
    }).select('review');

    const totalReviews = allApps.length;
    const averageRating = totalReviews
      ? allApps.reduce((sum, app) => sum + app.review.rating, 0) / totalReviews
      : 0;

    await User.findByIdAndUpdate(deal.store, {
      $set: {
        'storeProfile.averageRating': Math.round(averageRating * 10) / 10,
        'storeProfile.totalReviews': totalReviews,
      },
    });

    return res.status(201).json(application.review);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Store Profile Page (Creator View — Part 10) ──────────────────────────────

const getStorePublicProfile = async (req, res) => {
  try {
    const store = await User.findOne({ _id: req.params.storeId, role: 'store' }).select('storeProfile name');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const [activeDeal, completedDeals, reviews] = await Promise.all([
      StoreDeal.findOne({ store: store._id, status: 'active' }),
      StoreDeal.find({ store: store._id, status: 'completed' }).sort({ updatedAt: -1 }).limit(5),
      StoreDealApplication.find({
        storeDeal: { $in: (await StoreDeal.find({ store: store._id }).select('_id')).map((d) => d._id) },
        'review.rating': { $exists: true, $gt: 0 },
      })
        .populate('creator', 'name instagram_profile_pic profile_pic instagram_handle')
        .select('review creator')
        .sort({ 'review.submittedAt': -1 })
        .limit(10),
    ]);

    return res.json({ store, activeDeal, completedDeals, reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Browse Stores (Part 13B) ─────────────────────────────────────────────────

const browseStores = async (req, res) => {
  try {
    const filter = { role: 'store' };
    const storeFilter = {};
    if (req.query.city) storeFilter['storeProfile.address.city'] = new RegExp(req.query.city, 'i');
    if (req.query.storeType) storeFilter['storeProfile.storeType'] = req.query.storeType;

    const stores = await User.find({ ...filter, ...storeFilter })
      .select('storeProfile name')
      .limit(60);

    const storeIds = stores.map((s) => s._id);
    const activeDeals = await StoreDeal.find({ store: { $in: storeIds }, status: 'active' }).select('store');
    const activeSet = new Set(activeDeals.map((d) => d.store.toString()));

    let payload = stores.map((s) => ({
      _id: s._id,
      storeName: s.storeProfile?.storeName || s.name,
      storeType: s.storeProfile?.storeType,
      city: s.storeProfile?.address?.city,
      logoImage: s.storeProfile?.logoImage,
      storeVerified: s.storeProfile?.storeVerified,
      averageRating: s.storeProfile?.averageRating,
      totalReviews: s.storeProfile?.totalReviews,
      totalDealsPosted: s.storeProfile?.totalDealsPosted,
      hasActiveDeal: activeSet.has(s._id.toString()),
    }));

    if (req.query.onlyActive === 'true') {
      payload = payload.filter((s) => s.hasActiveDeal);
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Creator's Store Visit Workspace ─────────────────────────────────────────

const getCreatorStoreWorkspace = async (req, res) => {
  try {
    const application = await StoreDealApplication.findOne({
      storeDeal: req.params.dealId,
      creator: req.user._id,
    });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const deal = await StoreDeal.findById(req.params.dealId);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    const storeUser = await User.findById(deal.store).select('storeProfile name');
    return res.json({ deal, application, store: storeUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─── Creator's All Store Visits ───────────────────────────────────────────────

const getCreatorStoreVisits = async (req, res) => {
  try {
    const applications = await StoreDealApplication.find({ creator: req.user._id })
      .populate({
        path: 'storeDeal',
        populate: { path: 'store', select: 'storeProfile name' },
      })
      .sort({ updatedAt: -1 });

    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerStore,
  getStoreProfile,
  updateStoreProfile,
  createDeal,
  listStoreDeals,
  getStoreDeal,
  updateDeal,
  updateDealStatus,
  listApplications,
  reviewApplication,
  confirmVisit,
  approveSubmission,
  discoverStoreDeals,
  getPublicDeal,
  applyToDeal,
  submitContent,
  requestVerification,
  reviewStore,
  getStorePublicProfile,
  browseStores,
  getCreatorStoreWorkspace,
  getCreatorStoreVisits,
};
