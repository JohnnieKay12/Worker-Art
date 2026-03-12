const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['user', 'artisan'],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        lastReadAt: {
          type: Date,
          default: Date.now,
        },
        unreadCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    conversationType: {
      type: String,
      enum: ['booking', 'support', 'general'],
      default: 'booking',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archivedAt: { type: Date, default: Date.now },
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
conversationSchema.index({ participants: 'user' });
conversationSchema.index({ booking: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isActive: 1 });
conversationSchema.index({ conversationType: 1 });

// Compound index to prevent duplicate conversations for same booking
conversationSchema.index({ booking: 1 }, { unique: true, sparse: true });

// Pre-save middleware to ensure at least 2 participants
conversationSchema.pre('save', function (next) {
  if (this.participants.length < 2) {
    return next(new Error('Conversation must have at least 2 participants'));
  }
  next();
});

// Virtual for getting the other participant
conversationSchema.methods.getOtherParticipant = function (userId) {
  return this.participants.find(
    p => p.user.toString() !== userId.toString()
  );
};

// Virtual for getting participant info
conversationSchema.methods.getParticipant = function (userId) {
  return this.participants.find(
    p => p.user.toString() === userId.toString()
  );
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function (participantIds, bookingId = null, conversationType = 'booking') {
  // Check if conversation already exists
  let query = { participants: { $all: participantIds.map(id => ({ user: id })) } };
  
  if (bookingId) {
    query.booking = bookingId;
  }
  
  let conversation = await this.findOne(query);
  
  if (!conversation) {
    // Create new conversation
    const participants = participantIds.map(id => ({
      user: id,
      role: 'user', // Will be updated based on actual user roles
    }));
    
    conversation = await this.create({
      participants,
      booking: bookingId,
      conversationType,
    });
  }
  
  return conversation;
};

// Static method to get conversations for a user
conversationSchema.statics.getForUser = async function (userId, options = {}) {
  const { page = 1, limit = 20, activeOnly = true } = options;
  
  const query = {
    'participants.user': userId,
  };
  
  if (activeOnly) {
    query.isActive = true;
    query['participants.isActive'] = true;
  }
  
  return await this.find(query)
    .populate('participants.user', 'firstName lastName profileImage role')
    .populate('lastMessage')
    .populate('booking', 'bookingNumber status scheduledDate')
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Instance method to update last message
conversationSchema.methods.updateLastMessage = async function (messageId, preview) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  this.lastMessagePreview = preview.substring(0, 100);
  return await this.save();
};

// Instance method to increment unread count for other participants
conversationSchema.methods.incrementUnread = async function (senderId) {
  const otherParticipants = this.participants.filter(
    p => p.user.toString() !== senderId.toString()
  );
  
  for (const participant of otherParticipants) {
    participant.unreadCount += 1;
  }
  
  return await this.save();
};

// Instance method to reset unread count for a user
conversationSchema.methods.resetUnread = async function (userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.unreadCount = 0;
    participant.lastReadAt = new Date();
    return await this.save();
  }
  
  return this;
};

// Instance method to archive conversation for a user
conversationSchema.methods.archiveForUser = async function (userId) {
  const existingArchive = this.archivedBy.find(
    a => a.user.toString() === userId.toString()
  );
  
  if (!existingArchive) {
    this.archivedBy.push({ user: userId, archivedAt: new Date() });
    return await this.save();
  }
  
  return this;
};

// Instance method to leave conversation
conversationSchema.methods.leave = async function (userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    return await this.save();
  }
  
  return this;
};

module.exports = mongoose.model('Conversation', conversationSchema);
