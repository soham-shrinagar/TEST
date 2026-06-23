const express = require('express');
const multer = require('multer');
const { protect, requireStore, requireCreator } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/storeController');

const router = express.Router();

// Multer in-memory for store images
const upload = multer({ storage: multer.memoryStorage() });

// ─── Store Registration (public) ─────────────────────────────────────────────
router.post('/register', registerStore);

// ─── Store Own Routes ─────────────────────────────────────────────────────────
router.get('/profile', requireStore, getStoreProfile);
router.patch('/profile', requireStore, upload.fields([
  { name: 'logoImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]), updateStoreProfile);

// Deal management (store)
router.post('/deals', requireStore, createDeal);
router.get('/deals', requireStore, listStoreDeals);
router.get('/deals/:id', requireStore, getStoreDeal);
router.patch('/deals/:id', requireStore, updateDeal);
router.patch('/deals/:id/status', requireStore, updateDealStatus);

// Application management (store)
router.get('/deals/:id/applications', requireStore, listApplications);
router.patch('/deals/:id/applications/:appId', requireStore, reviewApplication);
router.patch('/deals/:id/applications/:appId/visit-confirmed', requireStore, confirmVisit);
router.patch('/deals/:id/applications/:appId/submissions/:subIndex/approve', requireStore, approveSubmission);

// Verification request (store)
router.post('/request-verification', requireStore, requestVerification);

// ─── Creator-Facing Routes ────────────────────────────────────────────────────
router.get('/discover', protect, discoverStoreDeals);
router.get('/deals/:id/public', protect, getPublicDeal);
router.post('/deals/:id/apply', requireCreator, applyToDeal);
router.post('/deals/:id/submit', requireCreator, upload.single('screenshotFile'), submitContent);

// Review store (creator, after completion)
router.post('/deals/:id/applications/:appId/review', requireCreator, reviewStore);

// Workspace + visits (creator)
router.get('/workspace/:dealId', requireCreator, getCreatorStoreWorkspace);
router.get('/creator/visits', requireCreator, getCreatorStoreVisits);

// Browse stores + public store profile (creator/general)
router.get('/browse', protect, browseStores);
router.get('/:storeId/profile', protect, getStorePublicProfile);

module.exports = router;
