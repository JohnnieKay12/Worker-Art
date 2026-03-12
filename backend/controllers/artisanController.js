const { User, Artisan, ServiceCategory, Booking, Review } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { emailService } = require('../services');
const logger = require('../utils/logger');

/**
 * @desc    Get all artisans
 * @route   GET /api/artisans
 * @access  Public
 */
const getArtisans = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    minPrice,
    maxPrice,
    minRating,
    location,
    radius = 10,
    isAvailable,
    sortBy = 'rating',
  } = req.query;

  // Build filter
  const filter = { isApproved: true, isSuspended: false };

  if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
  if (minRating) filter['rating.average'] = { $gte: parseFloat(minRating) };
  if (minPrice || maxPrice) {
    filter.hourlyRate = {};
    if (minPrice) filter.hourlyRate.$gte = parseFloat(minPrice);
    if (maxPrice) filter.hourlyRate.$lte = parseFloat(maxPrice);
  }
  if (category) filter.skills = category;

  // Search by name
  let userFilter = {};
  if (search) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    filter.user = { $in: users.map(u => u._id) };
  }

  // Build sort
  let sort = {};
  switch (sortBy) {
    case 'rating':
      sort = { 'rating.average': -1 };
      break;
    case 'price_low':
      sort = { hourlyRate: 1 };
      break;
    case 'price_high':
      sort = { hourlyRate: -1 };
      break;
    case 'experience':
      sort = { experience: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const artisans = await Artisan.find(filter)
    .populate('user', 'firstName lastName profileImage phone')
    .populate('skills', 'name description icon')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Artisan.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: artisans,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single artisan
 * @route   GET /api/artisans/:id
 * @access  Public
 */
const getArtisan = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id)
    .populate('user', 'firstName lastName profileImage phone email createdAt')
    .populate('skills', 'name description icon')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage',
      },
      options: { sort: { createdAt: -1 } },
    });

  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Only show approved artisans to public
  if (!artisan.isApproved && req.user?.role !== 'admin') {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: artisan,
  });
});

/**
 * @desc    Create artisan profile
 * @route   POST /api/artisans
 * @access  Private
 */
const createArtisan = asyncHandler(async (req, res) => {
  const {
    bio,
    skills,
    hourlyRate,
    experience,
    basePrice,
    availability,
    serviceArea,
    idType,
    idNumber,
    bankDetails,
  } = req.body;

  // Check if user already has an artisan profile
  const existingArtisan = await Artisan.findOne({ user: req.user.id });
  if (existingArtisan) {
    throw new AppError('Artisan profile already exists', 400, 'ARTISAN_EXISTS');
  }

  // Validate skills
  if (skills && skills.length > 0) {
    const validSkills = await ServiceCategory.find({ _id: { $in: skills } });
    if (validSkills.length !== skills.length) {
      throw new AppError('One or more invalid skill categories', 400, 'INVALID_SKILLS');
    }
  }

  // Create artisan
  const artisan = await Artisan.create({
    user: req.user.id,
    bio,
    skills,
    hourlyRate,
    experience: experience || 0,
    basePrice: basePrice || 0,
    availability,
    serviceArea,
    idType,
    idNumber,
    bankDetails,
    approvalStatus: 'pending',
    isApproved: false,
  });

  // Update user role to artisan
  await User.findByIdAndUpdate(req.user.id, { role: 'artisan' });

  logger.info(`Artisan profile created: ${req.user.id}`);
  res.status(201).json({
    success: true,
    message: 'Artisan profile created successfully. Pending admin approval.',
    data: artisan,
  });
});

/**
 * @desc    Update artisan profile
 * @route   PUT /api/artisans/:id
 * @access  Private (Artisan only)
 */
const updateArtisan = asyncHandler(async (req, res) => {
  const {
    bio,
    skills,
    hourlyRate,
    experience,
    basePrice,
    availability,
    serviceArea,
    isAvailable,
    bankDetails,
  } = req.body;

  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Check ownership
  if (artisan.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Update fields
  if (bio !== undefined) artisan.bio = bio;
  if (skills) artisan.skills = skills;
  if (hourlyRate !== undefined) artisan.hourlyRate = hourlyRate;
  if (experience !== undefined) artisan.experience = experience;
  if (basePrice !== undefined) artisan.basePrice = basePrice;
  if (availability) artisan.availability = { ...artisan.availability, ...availability };
  if (serviceArea) artisan.serviceArea = { ...artisan.serviceArea, ...serviceArea };
  if (isAvailable !== undefined) artisan.isAvailable = isAvailable;
  if (bankDetails) artisan.bankDetails = { ...artisan.bankDetails, ...bankDetails };

  await artisan.save();

  logger.info(`Artisan profile updated: ${artisan._id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan profile updated successfully',
    data: artisan,
  });
});

/**
 * @desc    Upload profile image
 * @route   PUT /api/artisans/:id/profile-image
 * @access  Private (Artisan only)
 */
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400, 'NO_IMAGE');
  }

  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Update user's profile image
  const user = await User.findByIdAndUpdate(
    artisan.user,
    { profileImage: req.file.path },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile image uploaded successfully',
    data: { profileImage: user.profileImage },
  });
});

/**
 * @desc    Upload work images
 * @route   POST /api/artisans/:id/work-images
 * @access  Private (Artisan only)
 */
const uploadWorkImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('Please upload at least one image', 400, 'NO_IMAGES');
  }

  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Check ownership
  if (artisan.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Add new work images
  const newImages = req.files.map(file => ({
    url: file.path,
    caption: req.body.caption || '',
  }));

  artisan.workImages.push(...newImages);
  await artisan.save();

  res.status(200).json({
    success: true,
    message: 'Work images uploaded successfully',
    data: artisan.workImages,
  });
});

/**
 * @desc    Delete work image
 * @route   DELETE /api/artisans/:id/work-images/:imageId
 * @access  Private (Artisan only)
 */
const deleteWorkImage = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Check ownership
  if (artisan.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
  }

  // Remove image
  artisan.workImages = artisan.workImages.filter(
    img => img._id.toString() !== req.params.imageId
  );
  await artisan.save();

  res.status(200).json({
    success: true,
    message: 'Work image deleted successfully',
  });
});

/**
 * @desc    Get artisan dashboard
 * @route   GET /api/artisans/dashboard
 * @access  Private (Artisan only)
 */
const getArtisanDashboard = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findOne({ user: req.user.id });
  if (!artisan) {
    throw new AppError('Artisan profile not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Get booking stats
  const bookingStats = await Booking.aggregate([
    { $match: { artisan: artisan._id } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
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
        totalEarnings: {
          $sum: {
            $cond: [
              { $eq: ['$paymentStatus', 'paid'] },
              '$price.baseAmount',
              0,
            ],
          },
        },
      },
    },
  ]);

  // Get recent bookings
  const recentBookings = await Booking.find({ artisan: artisan._id })
    .populate('user', 'firstName lastName profileImage phone')
    .populate('serviceCategory', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recent reviews
  const recentReviews = await Review.find({ artisan: artisan._id })
    .populate('user', 'firstName lastName profileImage')
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      artisan,
      stats: bookingStats[0] || {
        totalBookings: 0,
        pendingBookings: 0,
        acceptedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalEarnings: 0,
      },
      recentBookings,
      recentReviews,
    },
  });
});

/**
 * @desc    Get artisan bookings
 * @route   GET /api/artisans/bookings
 * @access  Private (Artisan only)
 */
const getArtisanBookings = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findOne({ user: req.user.id });
  if (!artisan) {
    throw new AppError('Artisan profile not found', 404, 'ARTISAN_NOT_FOUND');
  }

  const { page = 1, limit = 10, status } = req.query;

  const filter = { artisan: artisan._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(filter)
    .populate('user', 'firstName lastName profileImage phone email')
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
 * @desc    Get pending artisans (admin only)
 * @route   GET /api/artisans/pending
 * @access  Admin
 */
const getPendingArtisans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const artisans = await Artisan.find({ approvalStatus: 'pending' })
    .populate('user', 'firstName lastName email phone profileImage createdAt')
    .populate('skills', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Artisan.countDocuments({ approvalStatus: 'pending' });

  res.status(200).json({
    success: true,
    data: artisans,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Approve artisan (admin only)
 * @route   PUT /api/artisans/:id/approve
 * @access  Admin
 */
const approveArtisan = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id).populate('user');
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  artisan.approvalStatus = 'approved';
  artisan.isApproved = true;
  artisan.approvalDate = new Date();
  artisan.approvedBy = req.user.id;
  await artisan.save();

  // Send approval email
  emailService.sendArtisanApprovalEmail(artisan.user, artisan).catch(err => {
    logger.error('Failed to send approval email:', err.message);
  });

  logger.info(`Artisan approved: ${artisan._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan approved successfully',
    data: artisan,
  });
});

/**
 * @desc    Reject artisan (admin only)
 * @route   PUT /api/artisans/:id/reject
 * @access  Admin
 */
const rejectArtisan = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const artisan = await Artisan.findById(req.params.id).populate('user');
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  artisan.approvalStatus = 'rejected';
  artisan.isApproved = false;
  artisan.rejectionReason = reason;
  await artisan.save();

  // Send rejection email
  emailService.sendArtisanRejectionEmail(artisan.user, reason).catch(err => {
    logger.error('Failed to send rejection email:', err.message);
  });

  logger.info(`Artisan rejected: ${artisan._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan rejected',
    data: artisan,
  });
});

/**
 * @desc    Suspend artisan (admin only)
 * @route   PUT /api/artisans/:id/suspend
 * @access  Admin
 */
const suspendArtisan = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  artisan.isSuspended = true;
  artisan.suspensionReason = reason;
  await artisan.save();

  logger.info(`Artisan suspended: ${artisan._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan suspended successfully',
  });
});

/**
 * @desc    Unsuspend artisan (admin only)
 * @route   PUT /api/artisans/:id/unsuspend
 * @access  Admin
 */
const unsuspendArtisan = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  artisan.isSuspended = false;
  artisan.suspensionReason = '';
  await artisan.save();

  logger.info(`Artisan unsuspended: ${artisan._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan unsuspended successfully',
  });
});

/**
 * @desc    Delete artisan (admin only)
 * @route   DELETE /api/artisans/:id
 * @access  Admin
 */
const deleteArtisan = asyncHandler(async (req, res) => {
  const artisan = await Artisan.findById(req.params.id);
  if (!artisan) {
    throw new AppError('Artisan not found', 404, 'ARTISAN_NOT_FOUND');
  }

  // Revert user role to 'user'
  await User.findByIdAndUpdate(artisan.user, { role: 'user' });

  await artisan.deleteOne();

  logger.info(`Artisan deleted: ${artisan._id} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Artisan deleted successfully',
  });
});

module.exports = {
  getArtisans,
  getArtisan,
  createArtisan,
  updateArtisan,
  uploadProfileImage,
  uploadWorkImages,
  deleteWorkImage,
  getArtisanDashboard,
  getArtisanBookings,
  getPendingArtisans,
  approveArtisan,
  rejectArtisan,
  suspendArtisan,
  unsuspendArtisan,
  deleteArtisan,
};
