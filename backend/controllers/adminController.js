const {
  User,
  Artisan,
  Booking,
  Payment,
  Review,
  ServiceCategory,
  Message,
} = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/dashboard
 * @access  Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalArtisans = await Artisan.countDocuments();
  const pendingArtisans = await Artisan.countDocuments({ approvalStatus: 'pending' });
  const totalBookings = await Booking.countDocuments();
  const totalPayments = await Payment.countDocuments({ status: 'success' });
  const totalReviews = await Review.countDocuments();

  // Get revenue stats
  const revenueStats = await Payment.aggregate([
    { $match: { status: 'success' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
      },
    },
  ]);

  // Get monthly stats
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyStats = await Booking.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        bookings: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$price.totalAmount', 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Get recent bookings
  const recentBookings = await Booking.find()
    .populate('user', 'firstName lastName')
    .populate({
      path: 'artisan',
      populate: { path: 'user', select: 'firstName lastName' },
    })
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recent users
  const recentUsers = await User.find()
    .select('firstName lastName email role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      counts: {
        users: totalUsers,
        artisans: totalArtisans,
        pendingArtisans,
        bookings: totalBookings,
        payments: totalPayments,
        reviews: totalReviews,
      },
      revenue: revenueStats[0] || { totalRevenue: 0, totalTransactions: 0 },
      monthlyStats,
      recentBookings,
      recentUsers,
    },
  });
});

/**
 * @desc    Get all users (admin)
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await User.find(filter)
    .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Create user (admin)
 * @route   POST /api/admin/users
 * @access  Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role, address } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || 'user',
    address,
    isVerified: true,
  });

  logger.info(`User created by admin: ${email}`);
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

/**
 * @desc    Update user (admin)
 * @route   PUT /api/admin/users/:id
 * @access  Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, role, isActive, isVerified, address } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent changing own role
  if (user._id.toString() === req.user.id && role && role !== user.role) {
    throw new AppError('Cannot change your own role', 400, 'CANNOT_CHANGE_OWN_ROLE');
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (isVerified !== undefined) user.isVerified = isVerified;
  if (address) user.address = { ...user.address, ...address };

  await user.save();

  logger.info(`User updated by admin: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

/**
 * @desc    Delete user (admin)
 * @route   DELETE /api/admin/users/:id
 * @access  Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent deleting self
  if (user._id.toString() === req.user.id) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  await user.deleteOne();

  logger.info(`User deleted by admin: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Get all artisans (admin)
 * @route   GET /api/admin/artisans
 * @access  Admin
 */
const getAllArtisans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, approvalStatus, isSuspended } = req.query;

  const filter = {};
  if (approvalStatus) filter.approvalStatus = approvalStatus;
  if (isSuspended !== undefined) filter.isSuspended = isSuspended === 'true';

  if (search) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    filter.user = { $in: users.map(u => u._id) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const artisans = await Artisan.find(filter)
    .populate('user', 'firstName lastName email phone profileImage isActive')
    .populate('skills', 'name')
    .sort({ createdAt: -1 })
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
 * @desc    Create artisan (admin)
 * @route   POST /api/admin/artisans
 * @access  Admin
 */
const createArtisan = asyncHandler(async (req, res) => {
  const {
    userId,
    bio,
    skills,
    hourlyRate,
    experience,
    isApproved,
  } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if user already has artisan profile
  const existingArtisan = await Artisan.findOne({ user: userId });
  if (existingArtisan) {
    throw new AppError('User already has an artisan profile', 400, 'ARTISAN_EXISTS');
  }

  const artisan = await Artisan.create({
    user: userId,
    bio,
    skills,
    hourlyRate,
    experience,
    approvalStatus: isApproved ? 'approved' : 'pending',
    isApproved: isApproved || false,
    approvalDate: isApproved ? new Date() : null,
    approvedBy: isApproved ? req.user.id : null,
  });

  // Update user role
  user.role = 'artisan';
  await user.save();

  logger.info(`Artisan created by admin: ${user.email}`);
  res.status(201).json({
    success: true,
    message: 'Artisan created successfully',
    data: artisan,
  });
});

/**
 * @desc    Get all bookings (admin)
 * @route   GET /api/admin/bookings
 * @access  Admin
 */
const getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, startDate, endDate } = req.query;

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
      populate: { path: 'user', select: 'firstName lastName email phone' },
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
 * @desc    Get all payments (admin)
 * @route   GET /api/admin/payments
 * @access  Admin
 */
const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentType } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentType) filter.paymentType = paymentType;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payments = await Payment.find(filter)
    .populate('user', 'firstName lastName email')
    .populate('booking', 'bookingNumber')
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
 * @desc    Get all reviews (admin)
 * @route   GET /api/admin/reviews
 * @access  Admin
 */
const getAllReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isVisible } = req.query;

  const filter = {};
  if (isVisible !== undefined) filter.isVisible = isVisible === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find(filter)
    .populate('user', 'firstName lastName email')
    .populate({
      path: 'artisan',
      populate: { path: 'user', select: 'firstName lastName' },
    })
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
 * @desc    Get system analytics
 * @route   GET /api/admin/analytics
 * @access  Admin
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  // User growth
  const userGrowth = await User.aggregate([
    { $match: startDate || endDate ? { createdAt: dateFilter } : {} },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Booking stats
  const bookingStats = await Booking.aggregate([
    { $match: startDate || endDate ? { createdAt: dateFilter } : {} },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Revenue by category
  const revenueByCategory = await Booking.aggregate([
    { $match: { paymentStatus: 'paid', ...(startDate || endDate ? { createdAt: dateFilter } : {}) } },
    {
      $lookup: {
        from: 'servicecategories',
        localField: 'serviceCategory',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category.name',
        revenue: { $sum: '$price.totalAmount' },
        bookings: { $sum: 1 },
      },
    },
  ]);

  // Top artisans
  const topArtisans = await Artisan.aggregate([
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'artisan',
        as: 'bookings',
      },
    },
    {
      $project: {
        totalBookings: { $size: '$bookings' },
        completedBookings: {
          $size: {
            $filter: {
              input: '$bookings',
              cond: { $eq: ['$$this.status', 'completed'] },
            },
          },
        },
        rating: 1,
      },
    },
    { $sort: { 'rating.average': -1, totalBookings: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    success: true,
    data: {
      userGrowth,
      bookingStats,
      revenueByCategory,
      topArtisans,
    },
  });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllArtisans,
  createArtisan,
  getAllBookings,
  getAllPayments,
  getAllReviews,
  getAnalytics,
};
