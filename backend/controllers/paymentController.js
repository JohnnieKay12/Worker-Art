const { Payment, Booking, Artisan } = require('../models');
const { paymentService, emailService } = require('../services');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Initialize payment for booking
 * @route   POST /api/payments/initialize
 * @access  Private
 */
const initializePayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId).populate('user');
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  // Check if user owns this booking
  if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Check if already paid
  if (booking.paymentStatus === 'paid') {
    throw new AppError('Booking already paid', 400, 'ALREADY_PAID');
  }

  // Create payment record
  const payment = await Payment.create({
    user: req.user.id,
    paymentType: 'booking',
    booking: bookingId,
    amount: booking.price.totalAmount,
    currency: 'NGN',
    customerEmail: booking.user.email,
    customerPhone: booking.user.phone,
    metadata: {
      bookingNumber: booking.bookingNumber,
      serviceDescription: booking.serviceDescription,
    },
  });

  // Initialize Paystack transaction
  const callbackUrl = `${process.env.CLIENT_URL}/payment/verify`;
  const paystackData = await paymentService.initializeTransaction({
    email: booking.user.email,
    amount: booking.price.totalAmount,
    reference: payment.reference,
    callback_url: callbackUrl,
    metadata: {
      payment_id: payment._id.toString(),
      booking_id: bookingId,
      user_id: req.user.id,
    },
  });

  // Update payment with Paystack reference
  payment.paystackReference = paystackData.data.reference;
  await payment.save();

  logger.info(`Payment initialized: ${payment.reference}`);
  res.status(200).json({
    success: true,
    message: 'Payment initialized',
    data: {
      payment,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    },
  });
});

/**
 * @desc    Initialize artisan registration payment
 * @route   POST /api/payments/artisan-registration
 * @access  Private
 */
const initializeArtisanRegistration = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findOne({ user: req.user.id });
  if (!artisan) {
    throw new AppError('Artisan profile not found', 404, 'ARTISAN_NOT_FOUND');
  }

  if (artisan.registrationFeePaid) {
    throw new AppError('Registration fee already paid', 400, 'ALREADY_PAID');
  }

  const registrationFee = parseInt(process.env.ARTISAN_REGISTRATION_FEE) || 500000; // Default NGN 5,000

  // Create payment record
  const payment = await Payment.create({
    user: req.user.id,
    paymentType: 'artisan_registration',
    artisan: artisan._id,
    amount: registrationFee,
    currency: 'NGN',
    customerEmail: req.user.email,
    customerPhone: req.user.phone,
    metadata: {
      artisanId: artisan._id.toString(),
    },
  });

  // Initialize Paystack transaction
  const callbackUrl = `${process.env.CLIENT_URL}/payment/verify-registration`;
  const paystackData = await paymentService.initializeTransaction({
    email: req.user.email,
    amount: registrationFee,
    reference: payment.reference,
    callback_url: callbackUrl,
    metadata: {
      payment_id: payment._id.toString(),
      artisan_id: artisan._id.toString(),
      user_id: req.user.id,
    },
  });

  // Update payment with Paystack reference
  payment.paystackReference = paystackData.data.reference;
  await payment.save();

  logger.info(`Artisan registration payment initialized: ${payment.reference}`);
  res.status(200).json({
    success: true,
    message: 'Payment initialized',
    data: {
      payment,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    },
  });
});

/**
 * @desc    Verify payment
 * @route   GET /api/payments/verify
 * @access  Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    throw new AppError('Reference is required', 400, 'NO_REFERENCE');
  }

  // Verify with Paystack
  const verification = await paymentService.verifyTransaction(reference);

  if (verification.data.status !== 'success') {
    throw new AppError('Payment verification failed', 400, 'VERIFICATION_FAILED');
  }

  // Find payment
  const payment = await Payment.findOne({
    $or: [{ reference }, { paystackReference: reference }],
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  // Update payment status
  await payment.markAsSuccessful(verification.data);

  // Handle based on payment type
  if (payment.paymentType === 'booking' && payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.paymentStatus = 'paid';
      booking.payment = payment._id;
      await booking.save();
    }
  } else if (payment.paymentType === 'artisan_registration' && payment.artisan) {
    const artisan = await Artisan.findById(payment.artisan);
    if (artisan) {
      artisan.registrationFeePaid = true;
      artisan.registrationPaymentId = payment._id;
      await artisan.save();
    }
  }

  // Send receipt email
  const user = await User.findById(payment.user);
  if (user) {
    emailService.sendPaymentReceiptEmail(payment, user).catch(err => {
      logger.error('Failed to send payment receipt:', err.message);
    });
  }

  logger.info(`Payment verified: ${reference}`);
  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: {
      payment,
      verification: verification.data,
    },
  });
});

/**
 * @desc    Handle Paystack webhook
 * @route   POST /api/payments/webhook
 * @access  Public
 */
const handleWebhook = asyncHandler(async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    logger.warn('Webhook received without signature');
    return res.status(400).send('No signature');
  }

  const isValid = paymentService.verifyWebhookSignature(
    signature,
    JSON.stringify(req.body)
  );

  if (!isValid) {
    logger.warn('Invalid webhook signature');
    return res.status(400).send('Invalid signature');
  }

  // Process webhook event
  const result = await paymentService.handleWebhookEvent(req.body);

  // Add webhook event to payment record if applicable
  if (req.body.data && req.body.data.reference) {
    const payment = await Payment.findOne({
      paystackReference: req.body.data.reference,
    });
    if (payment) {
      await payment.addWebhookEvent(req.body.event, req.body.data);
    }
  }

  logger.info(`Webhook processed: ${req.body.event}`);
  res.status(200).json({ received: true, processed: result.processed });
});

/**
 * @desc    Get all payments (admin only)
 * @route   GET /api/payments
 * @access  Admin
 */
const getPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentType, startDate, endDate } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentType) filter.paymentType = paymentType;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payments = await Payment.find(filter)
    .populate('user', 'firstName lastName email')
    .populate('booking', 'bookingNumber')
    .populate('artisan', 'user')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payment.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single payment
 * @route   GET /api/payments/:id
 * @access  Private
 */
const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('user', 'firstName lastName email phone')
    .populate('booking', 'bookingNumber status scheduledDate')
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName',
      },
    });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  // Check authorization
  if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

/**
 * @desc    Get user payments
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
const getMyPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payments = await Payment.find({ user: req.user.id })
    .populate('booking', 'bookingNumber')
    .populate('artisan', 'user')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payment.countDocuments({ user: req.user.id });

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Process refund (admin only)
 * @route   POST /api/payments/:id/refund
 * @access  Admin
 */
const processRefund = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.status !== 'success') {
    throw new AppError('Can only refund successful payments', 400, 'INVALID_PAYMENT_STATUS');
  }

  // Process refund through Paystack
  const refundAmount = amount || payment.amount;
  const refundResult = await paymentService.processRefund(
    payment.paystackReference,
    refundAmount
  );

  // Update payment record
  await payment.processRefund(refundAmount, reason);

  // Update booking if applicable
  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.paymentStatus = 'refunded';
      await booking.save();
    }
  }

  logger.info(`Refund processed for payment: ${payment.reference}`);
  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      payment,
      refund: refundResult,
    },
  });
});

/**
 * @desc    Get payment statistics (admin only)
 * @route   GET /api/payments/stats/overview
 * @access  Admin
 */
const getPaymentStats = asyncHandler(async (req, res) => {
  const stats = await Payment.getStats();

  // Get daily stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        status: 'success',
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Get payment type distribution
  const typeDistribution = await Payment.aggregate([
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      daily: dailyStats,
      byType: typeDistribution,
    },
  });
});

module.exports = {
  initializePayment,
  initializeArtisanRegistration,
  verifyPayment,
  handleWebhook,
  getPayments,
  getPayment,
  getMyPayments,
  processRefund,
  getPaymentStats,
};
