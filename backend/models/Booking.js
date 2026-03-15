const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      // required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    serviceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      // required: true,
    },
    serviceDescription: {
      type: String,
      required: [true, 'Service description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String },
      country: { type: String, default: 'Nigeria' },
      landmark: { type: String },
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
    },
    estimatedDuration: {
      type: Number, // in hours
      default: 1,
    },
    price: {
      baseAmount: { type: Number, required: true },
      serviceFee: { type: Number, default: 0 },
      materialsFee: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    //
    paymentReference: {
      type: String,
    },
    
    platformCommission: {
      type: Number,
      default: 0,
    },
    
    artisanPayoutAmount: {
      type: Number,
      default: 0,
    },
    
    paymentMethod: {
      type: String,
      enum: ['paystack', 'cash', 'transfer'],
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
      },
    ],
    artisanResponse: {
      respondedAt: { type: Date },
      note: { type: String },
    },
    completionDetails: {
      completedAt: { type: Date },
      actualDuration: { type: Number },
      finalAmount: { type: Number },
      materialsUsed: { type: String },
      notes: { type: String },
      artisanSignature: { type: String },
      userSignature: { type: String },
    },
    cancellation: {
      cancelledAt: { type: Date },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      refundAmount: { type: Number },
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    specialInstructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high', 'emergency'],
      default: 'normal',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringDetails: {
      frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'] },
      endDate: { type: Date },
      occurrences: { type: Number },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ artisan: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Pre-save middleware to generate booking number
bookingSchema.pre('save', async function (next) {
  if (!this.bookingNumber) {
    const date = new Date();
    const prefix = 'BK';
    const timestamp = date.getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.bookingNumber = `${prefix}-${timestamp}-${random}`;
  }

  // Add to status history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      note: this.status === 'pending' ? 'Booking created' : `Status changed to ${this.status}`,
    });
  }

  next();
});

// Virtual for checking if booking can be cancelled
bookingSchema.virtual('canCancel').get(function () {
  return ['pending', 'accepted'].includes(this.status);
});

// Virtual for checking if booking can be reviewed
bookingSchema.virtual('canReview').get(function () {
  return this.status === 'completed' && !this.review;
});

// Static method to get booking statistics
bookingSchema.statics.getStats = async function (filter = {}) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$price.totalAmount' },
        pendingBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        acceptedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
        },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
      },
    },
  ]);
};

// Instance method to cancel booking
bookingSchema.methods.cancel = async function (cancelledBy, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledAt: new Date(),
    cancelledBy,
    reason,
  };
  return await this.save();
};

// Instance method to complete booking
bookingSchema.methods.complete = async function (completionData) {
  this.status = 'completed';
  this.completionDetails = {
    completedAt: new Date(),
    ...completionData,
  };
  return await this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
