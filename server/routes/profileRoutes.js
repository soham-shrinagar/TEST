const express = require('express');
const multer = require('multer');
const path = require('path');
const { getMyProfile, updateMyProfile, getProfileById } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
      return cb(null, true);
    }

    return cb(new Error('Only image files are allowed'));
  },
});

router.get('/me', protect, getMyProfile);
router.put('/me', protect, upload.single('avatar'), updateMyProfile);
router.get('/:userId', protect, getProfileById);

module.exports = router;
