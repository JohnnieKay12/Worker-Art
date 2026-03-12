const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      required: true,
    },
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['booking', 'artisan_registration', 'subscription', 'refund'],
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'ussd', 'qr', 'mobile_money', 'cash', ''],
      default: '',
    },
    paymentChannel: {
      type: String,
      default: '',
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    authorization: {
      authorization_code: { type: String },
      card_type: { type: String },
      last4: { type: String },
      exp_month: { type: String },
      exp_year: { type: String },
      bin: { type: String },
      bank: { type: String },
      channel: { type: String },
      signature: { type: String },
      reusable: { type: Boolean },
      country_code: { type: String },
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
    },
    fees: {
      paystackFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
    },
    ipAddress: {
      type: String,
    },
    deviceDetails: {
      type: String,
    },
    webhookEvents: [
      {
        event: { type: String },
        receivedAt: { type: Date, default: Date.now },
        data: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paymentSchema.index({ reference: 1 });
paymentSchema.index({ paystackReference: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentType: 1 });
paymentSchema.index({ createdAt: -1 });

// Pre-save middleware to generate reference
paymentSchema.pre('save', async function (next) {
  if (!this.reference) {
    const prefix = this.paymentType === 'artisan_registration' ? 'ARF' : 'PAY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reference = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
  return `${this.currency} ${(this.amount / 100).toFixed(2)}`;
});

// Static method to get payment statistics
paymentSchema.statics.getStats = async function (filter = {}) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        successfulAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        refundedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
        },
        totalRefunded: {
          $sum: '$refundAmount',
        },
      },
    },
  ]);
};

// Instance method to mark as successful
paymentSchema.methods.markAsSuccessful = async function (paystackData) {
  this.status = 'success';
  this.paystackReference = paystackData.reference;
  this.paymentMethod = paystackData.channel;
  this.paymentChannel = paystackData.channel;
  this.paidAt = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();
  this.gatewayResponse = paystackData;
  
  if (paystackData.authorization) {
    this.authorization = paystackData.authorization;
  }
  
  if (paystackData.fees) {
    this.fees.paystackFee = paystackData.fees;
  }
  
  return await this.save();
};

// Instance method to mark as failed
paymentSchema.methods.markAsFailed = async function (reason, paystackData = {}) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.gatewayResponse = paystackData;
  return await this.save();
};

// Instance method to process refund
paymentSchema.methods.processRefund = async function (amount, reason) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.status = 'refunded';
  return await this.save();
};

// Instance method to add webhook event
paymentSchema.methods.addWebhookEvent = async function (event, data) {
  this.webhookEvents.push({
    event,
    data,
    receivedAt: new Date(),
  });
  return await this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
