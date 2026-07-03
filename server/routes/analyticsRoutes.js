const express = require('express');
const { getDashboardStats, getCreatorDashboardStats } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.get('/creator-dashboard', protect, getCreatorDashboardStats);

module.exports = router;
