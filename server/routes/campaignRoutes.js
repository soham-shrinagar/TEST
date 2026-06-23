const express = require('express');
const multer = require('multer');
const {
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
} = require('../controllers/campaignController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

router.use(protect);

router.get('/brand/all', listBrandCampaigns);
router.get('/creator/all', listCreatorCampaigns);
router.get('/discover', discoverCampaigns);
router.post('/', createCampaign);
router.patch('/:id', updateCampaign);
router.patch('/:id/status', updateCampaignStatus);
router.delete('/:id', deleteCampaign);
router.get('/:id/dashboard', getCampaignDashboard);
router.get('/:id/applications', listApplications);
router.patch('/:id/applications/:applicationId', reviewApplication);
router.patch('/:id/applications/:applicationId/payment', updatePayment);
router.post('/:id/invite/:creatorId', inviteCreator);
router.patch('/:id/posts/:postId/approve', reviewPost);
router.get('/:id/public', getPublicCampaign);
router.post('/:id/apply', applyToCampaign);
router.delete('/:id/apply', withdrawApplication);
router.get('/:id/workspace', getCreatorWorkspace);
router.post('/:id/posts', upload.single('screenshotFile'), submitPost);

module.exports = router;
