const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system', 'booking_update'],
      default: 'text',
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Pre-save middleware
messageSchema.pre('save', function (next) {
  // Update readBy if message is marked as read
  if (this.isModified('isRead') && this.isRead) {
    const existingRead = this.readBy.find(
      rb => rb.user.toString() === this.sender.toString()
    );
    if (!existingRead) {
      this.readBy.push({ user: this.sender, readAt: new Date() });
    }
  }
  next();
});

// Static method to get unread count for a user in a conversation
messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return await this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    isRead: false,
  });
};

// Static method to mark all messages as read in a conversation
messageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  return await this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      isRead: false,
    },
    {
      $set: { isRead: true },
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );
};

// Instance method to edit message
messageSchema.methods.edit = async function (newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return await this.save();
};

// Instance method to soft delete
messageSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return await this.save();
};

// Instance method to mark as read by a user
messageSchema.methods.markAsRead = async function (userId) {
  if (!this.isRead) {
    this.isRead = true;
  }
  
  const existingRead = this.readBy.find(
    rb => rb.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return await this.save();
  }
  
  return this;
};

module.exports = mongoose.model('Message', messageSchema);
