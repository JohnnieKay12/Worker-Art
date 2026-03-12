const { Review, Booking, Artisan } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get all reviews
 * @route   GET /api/reviews
 * @access  Public
 */
const getReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, artisan, user, minRating, maxRating } = req.query;

  const filter = { isVisible: true };
  if (artisan) filter.artisan = artisan;
  if (user) filter.user = user;
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) filter.rating.$gte = parseInt(minRating);
    if (maxRating) filter.rating.$lte = parseInt(maxRating);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find(filter)
    .populate('user', 'firstName lastName profileImage')
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage',
      },
    })
    .populate('booking', 'bookingNumber scheduledDate')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Review.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single review
 * @route   GET /api/reviews/:id
 * @access  Public
 */
const getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('user', 'firstName lastName profileImage')
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage',
      },
    })
    .populate('booking', 'bookingNumber scheduledDate');

  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: review,
  });
});

/**
 * @desc    Create review
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment, categories } = req.body;

  // Check if booking exists and belongs to user
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.user.toString() !== req.user.id) {
    throw new AppError('Not authorized to review this booking', 403, 'NOT_AUTHORIZED');
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    throw new AppError('Can only review completed bookings', 400, 'BOOKING_NOT_COMPLETED');
  }

  // Check if review already exists
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    throw new AppError('Review already exists for this booking', 400, 'REVIEW_EXISTS');
  }

  // Create review
  const review = await Review.create({
    booking: bookingId,
    user: req.user.id,
    artisan: booking.artisan,
    rating,
    comment,
    categories,
  });

  // Update booking with review reference
  booking.review = review._id;
  await booking.save();

  // Update artisan rating (handled by post-save middleware)

  logger.info(`Review created: ${review._id} for booking: ${bookingId}`);
  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: review,
  });
});

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment, categories } = req.body;

  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  // Check ownership
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this review', 403, 'NOT_AUTHORIZED');
  }

  // Store previous values for edit history
  const previousRating = review.rating;
  const previousComment = review.comment;

  // Update fields
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  if (categories) review.categories = { ...review.categories, ...categories };

  // Add to edit history
  review.isEdited = true;
  review.editHistory.push({
    editedAt: new Date(),
    previousRating,
    previousComment,
  });

  await review.save();

  logger.info(`Review updated: ${review._id}`);
  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: review,
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private/Admin
 */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  // Check ownership or admin
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this review', 403, 'NOT_AUTHORIZED');
  }

  await review.deleteOne();

  // Update artisan rating (handled by post-remove middleware)

  logger.info(`Review deleted: ${req.params.id}`);
  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
});

/**
 * @desc    Add artisan response to review
 * @route   POST /api/reviews/:id/response
 * @access  Private (Artisan only)
 */
const addResponse = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  // Check if user is the artisan
  const artisan = await Artisan.findOne({ user: req.user.id });
  if (!artisan || review.artisan.toString() !== artisan._id.toString()) {
    throw new AppError('Not authorized to respond to this review', 403, 'NOT_AUTHORIZED');
  }

  await review.addResponse(text);

  logger.info(`Response added to review: ${review._id}`);
  res.status(200).json({
    success: true,
    message: 'Response added successfully',
    data: review,
  });
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  await review.markHelpful(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Review marked as helpful',
    data: { helpfulCount: review.helpful.count },
  });
});

/**
 * @desc    Moderate review (admin only)
 * @route   PUT /api/reviews/:id/moderate
 * @access  Admin
 */
const moderateReview = asyncHandler(async (req, res) => {
  const { reason, isVisible } = req.body;

  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
  }

  await review.moderate(req.user.id, reason, isVisible);

  logger.info(`Review moderated: ${review._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Review moderated successfully',
    data: review,
  });
});

/**
 * @desc    Get reviews for artisan
 * @route   GET /api/reviews/artisan/:artisanId
 * @access  Public
 */
const getArtisanReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find({
    artisan: req.params.artisanId,
    isVisible: true,
  })
    .populate('user', 'firstName lastName profileImage')
    .populate('booking', 'bookingNumber scheduledDate')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({
    artisan: req.params.artisanId,
    isVisible: true,
  });

  // Get stats
  const stats = await Review.getStatsForArtisan(req.params.artisanId);

  res.status(200).json({
    success: true,
    data: reviews,
    stats: stats[0] || null,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get my reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find({ user: req.user.id })
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage',
      },
    })
    .populate('booking', 'bookingNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({ user: req.user.id });

  res.status(200).json({
    success: true,
    data: reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

module.exports = {
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  addResponse,
  markHelpful,
  moderateReview,
  getArtisanReviews,
  getMyReviews,
};
