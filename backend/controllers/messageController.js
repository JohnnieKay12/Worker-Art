const { Message, Conversation, Booking, User } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get user conversations
 * @route   GET /api/messages/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const conversations = await Conversation.find({
    'participants.user': req.user.id,
    isActive: true,
  })
    .populate({
      path: 'participants.user',
      select: 'firstName lastName profileImage role',
    })
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender',
    })
    .populate('booking', 'bookingNumber status')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Conversation.countDocuments({
    'participants.user': req.user.id,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: conversations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single conversation
 * @route   GET /api/messages/conversations/:id
 * @access  Private
 */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate({
      path: 'participants.user',
      select: 'firstName lastName profileImage role',
    })
    .populate('booking', 'bookingNumber status scheduledDate');

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.user._id.toString() === req.user.id
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Reset unread count for this user
  await conversation.resetUnread(req.user.id);

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

/**
 * @desc    Create or get conversation for booking
 * @route   POST /api/messages/conversations
 * @access  Private
 */
const createConversation = asyncHandler(async (req, res) => {
  const { bookingId, participantId } = req.body;

  let conversation;

  if (bookingId) {
    // Check if booking exists and user is involved
    const booking = await Booking.findById(bookingId)
      .populate('user')
      .populate({
        path: 'artisan',
        populate: { path: 'user' },
      });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    const isInvolved =
      booking.user._id.toString() === req.user.id ||
      booking.artisan.user._id.toString() === req.user.id;

    if (!isInvolved && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
    }

    // Check if conversation already exists
    conversation = await Conversation.findOne({ booking: bookingId });

    if (!conversation) {
      // Create new conversation
      const userId = booking.user._id;
      const artisanUserId = booking.artisan.user._id;

      conversation = await Conversation.create({
        participants: [
          { user: userId, role: 'user' },
          { user: artisanUserId, role: 'artisan' },
        ],
        booking: bookingId,
        conversationType: 'booking',
      });

      // Update booking with chat reference
      booking.chat = conversation._id;
      await booking.save();
    }
  } else if (participantId) {
    // Create general conversation
    const participant = await User.findById(participantId);
    if (!participant) {
      throw new AppError('Participant not found', 404, 'USER_NOT_FOUND');
    }

    // Check if conversation already exists
    conversation = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { user: req.user.id } },
          { $elemMatch: { user: participantId } },
        ],
      },
      conversationType: 'general',
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          { user: req.user.id, role: req.user.role },
          { user: participantId, role: participant.role },
        ],
        conversationType: 'general',
      });
    }
  } else {
    throw new AppError('Booking ID or Participant ID required', 400, 'MISSING_PARAMS');
  }

  await conversation.populate({
    path: 'participants.user',
    select: 'firstName lastName profileImage role',
  });

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

/**
 * @desc    Get messages in conversation
 * @route   GET /api/messages/conversations/:id/messages
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.user.toString() === req.user.id
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const messages = await Message.find({
    conversation: req.params.id,
    isDeleted: false,
  })
    .populate('sender', 'firstName lastName profileImage')
    .populate({
      path: 'replyTo',
      select: 'content sender',
      populate: {
        path: 'sender',
        select: 'firstName lastName',
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Message.countDocuments({
    conversation: req.params.id,
    isDeleted: false,
  });

  // Mark messages as read
  await Message.markAllAsRead(req.params.id, req.user.id);

  // Reset unread count in conversation
  await conversation.resetUnread(req.user.id);

  res.status(200).json({
    success: true,
    data: messages.reverse(), // Return in chronological order
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Send message
 * @route   POST /api/messages/conversations/:id/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { content, messageType = 'text', replyTo, attachments } = req.body;

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.user.toString() === req.user.id && p.isActive
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Create message
  const message = await Message.create({
    conversation: req.params.id,
    sender: req.user.id,
    content,
    messageType,
    replyTo,
    attachments,
  });

  // Update conversation
  await conversation.updateLastMessage(message._id, content);
  await conversation.incrementUnread(req.user.id);

  await message.populate('sender', 'firstName lastName profileImage');

  // Emit to socket (will be handled by socket handler)
  req.app.get('io').to(req.params.id).emit('new_message', {
    conversationId: req.params.id,
    message,
  });

  logger.info(`Message sent: ${message._id} in conversation: ${req.params.id}`);
  res.status(201).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Edit message
 * @route   PUT /api/messages/:id
 * @access  Private
 */
const editMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
  }

  // Check ownership
  if (message.sender.toString() !== req.user.id) {
    throw new AppError('Not authorized to edit this message', 403, 'NOT_AUTHORIZED');
  }

  // Can only edit text messages
  if (message.messageType !== 'text') {
    throw new AppError('Can only edit text messages', 400, 'CANNOT_EDIT');
  }

  await message.edit(content);
  await message.populate('sender', 'firstName lastName profileImage');

  // Emit to socket
  req.app.get('io').to(message.conversation.toString()).emit('message_edited', {
    conversationId: message.conversation,
    message,
  });

  res.status(200).json({
    success: true,
    data: message,
  });
});

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
  }

  // Check ownership or admin
  if (message.sender.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this message', 403, 'NOT_AUTHORIZED');
  }

  await message.softDelete(req.user.id);

  // Emit to socket
  req.app.get('io').to(message.conversation.toString()).emit('message_deleted', {
    conversationId: message.conversation,
    messageId: message._id,
  });

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully',
  });
});

/**
 * @desc    Mark conversation as read
 * @route   PUT /api/messages/conversations/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.user.toString() === req.user.id
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Mark all messages as read
  await Message.markAllAsRead(req.params.id, req.user.id);

  // Reset unread count
  await conversation.resetUnread(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Conversation marked as read',
  });
});

/**
 * @desc    Archive conversation
 * @route   PUT /api/messages/conversations/:id/archive
 * @access  Private
 */
const archiveConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    p => p.user.toString() === req.user.id
  );

  if (!isParticipant && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  await conversation.archiveForUser(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Conversation archived',
  });
});

/**
 * @desc    Get unread message count
 * @route   GET /api/messages/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    'participants.user': req.user.id,
    isActive: true,
  });

  let totalUnread = 0;
  const conversationUnread = [];

  for (const conversation of conversations) {
    const participant = conversation.participants.find(
      p => p.user.toString() === req.user.id
    );
    if (participant && participant.unreadCount > 0) {
      totalUnread += participant.unreadCount;
      conversationUnread.push({
        conversationId: conversation._id,
        unreadCount: participant.unreadCount,
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      totalUnread,
      conversations: conversationUnread,
    },
  });
});

module.exports = {
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  archiveConversation,
  getUnreadCount,
};
