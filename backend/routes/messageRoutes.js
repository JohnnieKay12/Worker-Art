const express = require('express');
const router = express.Router();
const { messageController } = require('../controllers');
const { protect } = require('../middleware/auth');
const { sendMessageValidation, paginationValidation } = require('../middleware/validation');
const { messageLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(protect);

// Conversation routes
router.get('/conversations', paginationValidation, messageController.getConversations);
router.post('/conversations', messageController.createConversation);
router.get('/conversations/:id', messageController.getConversation);
router.get('/conversations/:id/messages', paginationValidation, messageController.getMessages);
router.post('/conversations/:id/messages', messageLimiter, sendMessageValidation, messageController.sendMessage);
router.put('/conversations/:id/read', messageController.markAsRead);
router.put('/conversations/:id/archive', messageController.archiveConversation);

// Message routes
router.put('/:id', messageController.editMessage);
router.delete('/:id', messageController.deleteMessage);

// Unread count
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;
