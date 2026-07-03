const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { discoverFeed } = require('../controllers/feedController');

const router = express.Router();

// GET /api/feed/discover
// Unified influencer feed: brand campaigns + store deals scored and merged.
// Auth: any authenticated user (access gated in controller to creator/influencer roles).
router.get('/discover', protect, discoverFeed);

module.exports = router;
