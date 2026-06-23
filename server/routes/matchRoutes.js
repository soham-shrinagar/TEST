const express = require('express');
const { getMyMatches } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getMyMatches);

module.exports = router;
 