const { Booking, Artisan, User, ServiceCategory, Payment, Conversation } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { emailService } = require('../services');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * @desc    Get all bookings
 * @route   GET /api/bookings
 * @access  Admin
 */
const getBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus, startDate, endDate } = req.query;


  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    filter.scheduledDate = {};
    if (startDate) filter.scheduledDate.$gte = new Date(startDate);
    if (endDate) filter.scheduledDate.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(filter)
    .populate('user', 'firstName lastName email phone')
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName email phone',
      },
    })
    .populate('serviceCategory', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});


/**
 * @desc    Get bookings for logged in user
 * @route   GET /api/bookings/my-bookings
 * @access  Private
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate({
      path: 'artisan',
      // Remove this line completely ── or at least don't limit fields here
      // select: 'skills hourlyRate',   ← DELETE or COMMENT OUT
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage'   // this now works
      }
    })
    // .populate('serviceCategory', 'name')   // optional
    .sort({ createdAt: -1 });

    // Add this:
console.log('First booking artisan after populate:', bookings[0]?.artisan || 'NULL');

  res.status(200).json({
    success: true,
    data: bookings
  });
});

/**
 * @desc    Get single booking
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'firstName lastName email phone profileImage address')
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName email phone profileImage',
      },
    })
    .populate('serviceCategory', 'name description')
    .populate('payment')
    .populate('review');

  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  // Check if user is authorized to view this booking
  const isAuthorized =
    req.user.role === 'admin' ||
    booking.user._id.toString() === req.user.id ||
    booking.artisan.user._id.toString() === req.user.id;

  if (!isAuthorized) {
    throw new AppError('Not authorized to view this booking', 403, 'NOT_AUTHORIZED');
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * @desc    Create booking
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = asyncHandler(async (req, res) => {
  console.log("BOOKING BODY:", req.body);
  console.log("ARTISAN RECEIVED:", req.body.artisan);
  const {
    artisan: artisanId,
    serviceDescription,
    address,
    scheduledDate,
    scheduledTime,
    estimatedDuration,
    specialInstructions,
    urgency,
  } = req.body;
  console.log("Artisan received:", artisanId);

  // Check if artisan exists and is approved
  const artisan = await Artisan.findById(artisanId).populate('user');
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  if (!artisan.isApproved) {
    throw new AppError('Artisan is not approved', 400, 'ARTISAN_NOT_APPROVED');
  }

  if (artisan.isSuspended) {
    throw new AppError('Artisan is currently suspended', 400, 'ARTISAN_SUSPENDED');
  }

  if (!artisan.isAvailable) {
    throw new AppError('Artisan is currently not available', 400, 'ARTISAN_UNAVAILABLE');
  }

  // Check if service category exists
  // const category = await ServiceCategory.findById(serviceCategory);
  // if (!category) {
  //   throw new AppError('Service category not found', 404, 'CATEGORY_NOT_FOUND');
  // }

  // // Check if artisan offers this service
  // const offersService = artisan.skills.some(
  //   skill => skill.toString() === serviceCategory
  // );
  
  // if (!offersService) {
  //   throw new AppError('Artisan does not offer this service', 400, 'SERVICE_NOT_OFFERED');
  // }

  // const serviceCategory = artisan.skills[0]

  // Calculate price
  const duration = estimatedDuration || 1;
  const baseAmount = Math.round(artisan.hourlyRate * duration * 100); // Convert to kobo
  const serviceFee = Math.round(baseAmount * 0.05); // 5% service fee
  const totalAmount = baseAmount + serviceFee;

  // Create booking
  const booking = await Booking.create({
    user: req.user.id,
    artisan: artisanId,
    // serviceCategory,
    serviceDescription,
    address,
    scheduledDate,
    scheduledTime,
    estimatedDuration: duration,
    price: {
      baseAmount,
      serviceFee,
      totalAmount,
    },
    specialInstructions,
    urgency: urgency || 'normal',
  });

  const populatedBooking = await Booking.findById(booking._id)
  .populate({
    path: 'artisan',
    select: 'skills hourlyRate',
    populate: {
      path: 'user',
      select: 'firstName lastName profileImage'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: populatedBooking,
  });

  // Send notification emails (non-blocking)
  emailService.sendBookingRequestEmail(booking, req.user, artisan.user).catch(err => {
    logger.error('Failed to send booking request email:', err.message);
  });

  logger.info(`Booking created: ${booking.bookingNumber} by user: ${req.user.id}`);
  // res.status(201).json({
  //   success: true,
  //   message: 'Booking created successfully',
  //   data: booking,
  // });
});

/**
 * @desc Initialize Paystack payment
 * @route POST /api/bookings/:id/pay
 * @access Private (User)
 */
const initializePayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('user');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.user._id.toString() !== req.user.id) {
    throw new AppError('Not authorized to pay for this booking', 403);
  }

  if (booking.paymentStatus === 'paid') {
    throw new AppError('Booking already paid', 400);
  }

  const amount = booking.price.totalAmount;

  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: booking.user.email,
      amount: amount,
      callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      // callback_url: `${process.env.FRONTEND_URL}/dashboard`,
      metadata: {
        bookingId: booking._id,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  res.status(200).json({
    success: true,
    data: response.data.data,
  });
});

/**
 * @desc Verify Paystack payment
 * @route GET /api/bookings/verify/:reference
 * @access Private
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const data = response.data.data;

  if (data.status !== 'success') {
    throw new AppError('Payment verification failed', 400);
  }

  const bookingId = data.metadata.bookingId;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  booking.paymentStatus = 'paid';
  booking.paymentReference = reference;
  booking.paymentMethod = 'paystack';
  booking.status = "accepted";

  await booking.save();

  res.status(200).json({
    success: true,
    message: 'Payment successful',
    data: booking,
  });
});

/**
 * @desc    Update booking status (accept/reject/complete)
 * @route   PUT /api/bookings/:id/status
 * @access  Private
 */
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const booking = await Booking.findById(req.params.id)
    .populate('user')
    .populate({
      path: 'artisan',
      populate: { path: 'user' },
    });

  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  // Check authorization based on status change
  const isUser = booking.user._id.toString() === req.user.id;
  const isArtisan = booking.artisan.user._id.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  // Validate status transitions
  const validTransitions = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    rejected: [],
    completed: [],
    cancelled: [],
  };

  if (!validTransitions[booking.status].includes(status)) {
    throw new AppError(
      `Cannot change status from ${booking.status} to ${status}`,
      400,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Authorization checks
  if (status === 'accepted' || status === 'rejected') {
    if (!isArtisan && !isAdmin) {
      throw new AppError('Only the artisan can accept or reject bookings', 403, 'NOT_AUTHORIZED');
    }
  } else if (status === 'in_progress') {
    if (!isArtisan && !isAdmin) {
      throw new AppError('Only the artisan can start a booking', 403, 'NOT_AUTHORIZED');
    }
  } else if (status === 'completed') {
    if (!isArtisan && !isAdmin) {
      throw new AppError('Only the artisan can complete a booking', 403, 'NOT_AUTHORIZED');
    }
  } else if (status === 'cancelled') {
    if (!isUser && !isArtisan && !isAdmin) {
      throw new AppError('Not authorized to cancel this booking', 403, 'NOT_AUTHORIZED');
    }
  }

  // Update status
  booking.status = status;
  booking.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: req.user.id,
    note,
  });

  if (status === 'accepted') {
    booking.artisanResponse = {
      respondedAt: new Date(),
      note,
    };

    // Send confirmation email to user
    emailService.sendBookingConfirmationEmail(booking, booking.user, booking.artisan).catch(err => {
      logger.error('Failed to send booking confirmation email:', err.message);
    });
  }

  if (status === 'completed') {
    booking.completionDetails = {
      completedAt: new Date(),
    };

    // Update artisan stats
    await Artisan.findByIdAndUpdate(booking.artisan._id, {
      $inc: { completedBookings: 1 },
    });
  }

  await booking.save();

  logger.info(`Booking ${booking.bookingNumber} status updated to: ${status}`);
  res.status(200).json({
    success: true,
    message: `Booking ${status} successfully`,
    data: booking,
  });
});

/**
 * @desc    Cancel booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  // Check authorization
  const isUser = booking.user.toString() === req.user.id;
  const isArtisan = booking.artisan.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isUser && !isArtisan && !isAdmin) {
    throw new AppError('Not authorized to cancel this booking', 403, 'NOT_AUTHORIZED');
  }

  // Check if booking can be cancelled
  if (!['pending', 'accepted'].includes(booking.status)) {
    throw new AppError(
      `Cannot cancel booking with status: ${booking.status}`,
      400,
      'CANNOT_CANCEL'
    );
  }

  await booking.cancel(req.user.id, reason);

  // Process refund if payment was made
  if (booking.paymentStatus === 'paid' && booking.payment) {
    // Refund logic would go here
    logger.info(`Refund initiated for booking: ${booking.bookingNumber}`);
  }

  logger.info(`Booking cancelled: ${booking.bookingNumber}`);
  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

/**
 * @desc    Complete booking with details
 * @route   PUT /api/bookings/:id/complete
 * @access  Private (Artisan only)
 */
const completeBooking = asyncHandler(async (req, res) => {
  const { actualDuration, materialsUsed, notes, finalAmount } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  // Check if artisan
  const artisan = await Artisan.findOne({ user: req.user.id });
  if (!artisan || booking.artisan.toString() !== artisan._id.toString()) {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  if (booking.status !== 'in_progress') {
    throw new AppError('Booking must be in progress to complete', 400, 'INVALID_STATUS');
  }

  booking.status = 'completed';
  booking.completionDetails = {
    completedAt: new Date(),
    actualDuration,
    finalAmount,
    materialsUsed,
    notes,
  };

  await booking.save();

  // Update artisan stats
  artisan.completedBookings += 1;
  await artisan.save();

  logger.info(`Booking completed: ${booking.bookingNumber}`);
  res.status(200).json({
    success: true,
    message: 'Booking completed successfully',
    data: booking,
  });
});

/**
 * @desc    Delete booking (admin only)
 * @route   DELETE /api/bookings/:id
 * @access  Admin
 */
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  await booking.deleteOne();

  logger.info(`Booking deleted: ${booking.bookingNumber} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully',
  });
});

/**
 * @desc    Get booking statistics (admin only)
 * @route   GET /api/bookings/stats/overview
 * @access  Admin
 */
const getBookingStats = asyncHandler(async (req, res) => {
  const stats = await Booking.getStats();

  // Get monthly stats
  const monthlyStats = await Booking.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$price.totalAmount', 0],
          },
        },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      monthly: monthlyStats,
    },
  });
});

module.exports = {
  getBookings,
  getMyBookings,
  getBooking,
  createBooking,
  initializePayment,
  verifyPayment,
  updateBookingStatus,
  cancelBooking,
  completeBooking,
  deleteBooking,
  getBookingStats,
};
