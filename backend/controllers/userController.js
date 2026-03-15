const { User, Booking, Review } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, isActive } = req.query;

  // Build filter
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
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
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Admin
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
    .populate('artisanProfile');

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Create user (admin only)
 * @route   POST /api/users
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
  });

  logger.info(`User created by admin: ${email}`);
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

/**
 * @desc    Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, role, isActive, address } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Update fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (address) user.address = { ...user.address, ...address };

  await user.save();

  logger.info(`User updated by admin: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent deleting admin users
  if (user.role === 'admin') {
    throw new AppError('Cannot delete admin users', 403, 'CANNOT_DELETE_ADMIN');
  }

  await user.deleteOne();

  logger.info(`User deleted by admin: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/users/dashboard
 * @access  Private
 */

const getUserDashboard = asyncHandler(async (req, res) => {
  console.log("Logged in user ID:", req.user.id);

  const userId = new mongoose.Types.ObjectId(req.user.id);
  
  const bookings = await Booking.find({ user: userId });
  console.log("Bookings found for this user:", bookings.length);

  const bookingStats = await Booking.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        pendingBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        acceptedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalSpent: {
          $sum: {
            $cond: [
              { $eq: ['$paymentStatus', 'paid'] },
              '$price.totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  const stats = bookingStats[0] || {
    totalBookings: 0,
    pendingBookings: 0,
    acceptedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0
  };

  const recentBookings = await Booking.find({ user: userId })
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage'
      }
    })
    .populate('serviceCategory', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentReviews = await Review.find({ user: userId })
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage'
      }
    })
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      stats,
      recentBookings,
      recentReviews
    }
  });
});


// const getUserDashboard = asyncHandler(async (req, res) => {
//   const userId = new mongoose.Types.ObjectId(req.user.id);

//   // Get booking stats
//   const bookingStats = await Booking.aggregate([
//     { $match: { user: userId } },
//     {
//       $group: {
//         _id: null,
//         totalBookings: { $sum: 1 },
//         pendingBookings: {
//           $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
//         },
//         acceptedBookings: {
//           $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
//         },
//         completedBookings: {
//           $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
//         },
//         cancelledBookings: {
//           $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
//         },
//         totalSpent: {
//           $sum: {
//             $cond: [
//               { $eq: ['$paymentStatus', 'paid'] },
//               '$price.totalAmount',
//               0,
//             ],
//           },
//         },
//       },
//     },
//   ]);

//   // Get recent bookings
//   const recentBookings = await Booking.find({ user: userId })
//     .populate('artisan', 'user hourlyRate')
//     .populate('artisan.user', 'firstName lastName profileImage')
//     .populate('serviceCategory', 'name')
//     .sort({ createdAt: -1 })
//     .limit(5);

//   // Get recent reviews
//   const recentReviews = await Review.find({ user: userId })
//     .populate('artisan', 'user')
//     .populate('artisan.user', 'firstName lastName profileImage')
//     .sort({ createdAt: -1 })
//     .limit(5);

//   res.status(200).json({
//     success: true,
//     data: {
//       stats: bookingStats[0] || {
//         totalBookings: 0,
//         pendingBookings: 0,
//         acceptedBookings: 0,
//         completedBookings: 0,
//         cancelledBookings: 0,
//         totalSpent: 0,
//       },
//       recentBookings,
//       recentReviews,
//     },
//   });
// });

/**
 * @desc    Get user booking history
 * @route   GET /api/users/bookings
 * @access  Private
 */
const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { user: userId };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(filter)
    .populate({
      path: 'artisan',
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage phone',
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
 * @desc    Get user reviews
 * @route   GET /api/users/reviews
 * @access  Private
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find({ user: userId })
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

  const total = await Review.countDocuments({ user: userId });

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
 * @desc    Suspend user (admin only)
 * @route   PUT /api/users/:id/suspend
 * @access  Admin
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.role === 'admin') {
    throw new AppError('Cannot suspend admin users', 403, 'CANNOT_SUSPEND_ADMIN');
  }

  user.isActive = false;
  await user.save();

  logger.info(`User suspended by admin: ${user.email}, Reason: ${reason}`);
  res.status(200).json({
    success: true,
    message: 'User suspended successfully',
  });
});

/**
 * @desc    Reactivate user (admin only)
 * @route   PUT /api/users/:id/reactivate
 * @access  Admin
 */
const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  user.isActive = true;
  await user.save();

  logger.info(`User reactivated by admin: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'User reactivated successfully',
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserDashboard,
  getUserBookings,
  getUserReviews,
  suspendUser,
  reactivateUser,
};
