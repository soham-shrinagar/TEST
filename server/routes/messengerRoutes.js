const express = require('express');
const multer = require('multer');
const {
  createConversation,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
} = require('../controllers/messengerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, createConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/conversations/:conversationId/read', protect, markConversationRead);
router.post('/conversations/:conversationId/messages', protect, upload.single('attachment'), sendMessage);

module.exports = router;
