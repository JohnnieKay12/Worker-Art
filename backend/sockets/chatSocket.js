const jwt = require('jsonwebtoken');
const { Message, Conversation, User } = require('../models');
const logger = require('../utils/logger');

// Store connected users
const connectedUsers = new Map();

/**
 * Initialize chat socket handlers
 * @param {object} io - Socket.io instance
 */
const initializeChatSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}, Socket ID: ${socket.id}`);

    // Store user's socket connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
    });

    // Join user's personal room for direct notifications
    socket.join(`user_${socket.userId}`);

    // Handle joining conversation
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user is part of this conversation
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          p => p.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }

        socket.join(conversationId);
        socket.emit('joined_conversation', { conversationId });
        
        logger.debug(`User ${socket.userId} joined conversation ${conversationId}`);
      } catch (error) {
        logger.error('Join conversation error:', error.message);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      socket.emit('left_conversation', { conversationId });
      logger.debug(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicator
    socket.on('typing', async (data) => {
      const { conversationId, isTyping } = data;
      
      socket.to(conversationId).emit('user_typing', {
        conversationId,
        user: socket.user,
        isTyping,
      });
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, messageType = 'text', replyTo, attachments } = data;

        // Verify user is part of this conversation
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          p => p.user.toString() === socket.userId && p.isActive
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send messages in this conversation' });
          return;
        }

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          content,
          messageType,
          replyTo,
          attachments,
        });

        await message.populate('sender', 'firstName lastName profileImage');

        // Update conversation
        await conversation.updateLastMessage(message._id, content);
        await conversation.incrementUnread(socket.userId);

        // Broadcast message to all participants in the conversation
        io.to(conversationId).emit('new_message', {
          conversationId,
          message,
        });

        // Send notification to offline participants
        const otherParticipants = conversation.participants.filter(
          p => p.user.toString() !== socket.userId
        );

        for (const participant of otherParticipants) {
          const participantSocket = connectedUsers.get(participant.user.toString());
          
          if (!participantSocket) {
            // User is offline - could send push notification here
            io.to(`user_${participant.user}`).emit('new_message_notification', {
              conversationId,
              message: {
                ...message.toObject(),
                sender: socket.user,
              },
            });
          }
        }

        logger.info(`Message sent: ${message._id} in conversation: ${conversationId}`);
      } catch (error) {
        logger.error('Send message error:', error.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle mark as read
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;

        await Message.markAllAsRead(conversationId, socket.userId);
        
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          await conversation.resetUnread(socket.userId);
        }

        socket.emit('messages_read', { conversationId });
        
        // Notify other participants
        socket.to(conversationId).emit('participant_read', {
          conversationId,
          userId: socket.userId,
        });
      } catch (error) {
        logger.error('Mark read error:', error.message);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle edit message
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to edit this message' });
          return;
        }

        await message.edit(content);
        await message.populate('sender', 'firstName lastName profileImage');

        io.to(message.conversation.toString()).emit('message_edited', {
          conversationId: message.conversation,
          message,
        });
      } catch (error) {
        logger.error('Edit message error:', error.message);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle delete message
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to delete this message' });
          return;
        }

        await message.softDelete(socket.userId);

        io.to(message.conversation.toString()).emit('message_deleted', {
          conversationId: message.conversation,
          messageId: message._id,
        });
      } catch (error) {
        logger.error('Delete message error:', error.message);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle get online status
    socket.on('get_online_status', (userIds) => {
      const statuses = {};
      
      userIds.forEach(userId => {
        statuses[userId] = connectedUsers.has(userId);
      });

      socket.emit('online_statuses', statuses);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}, Socket ID: ${socket.id}`);
      connectedUsers.delete(socket.userId);
      
      // Broadcast user offline status to conversations
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('user_offline', { userId: socket.userId });
        }
      });
    });
  });
};

/**
 * Get online users count
 * @returns {number} Number of connected users
 */
const getOnlineUsersCount = () => {
  return connectedUsers.size;
};

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean} Is user online
 */
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

/**
 * Get user's socket ID
 * @param {string} userId - User ID
 * @returns {string|null} Socket ID or null
 */
const getUserSocketId = (userId) => {
  const user = connectedUsers.get(userId);
  return user ? user.socketId : null;
};

/**
 * Send notification to specific user
 * @param {object} io - Socket.io instance
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const sendNotificationToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

module.exports = {
  initializeChatSocket,
  getOnlineUsersCount,
  isUserOnline,
  getUserSocketId,
  sendNotificationToUser,
};
