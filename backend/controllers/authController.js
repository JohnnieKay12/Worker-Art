const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Artisan } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { emailService } = require('../services');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

// Send token response

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        address: user.address,
        isVerified: user.isVerified,
      },
    },
  });
};


// const sendTokenResponse = (user, statusCode, res) => {
//   const token = generateToken(user._id);
//   const refreshToken = generateRefreshToken(user._id);

//   // Remove password from output
//   user.password = undefined;

//   res.status(statusCode).json({
//     success: true,
//     token,
//     refreshToken,
//     user: {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phone: user.phone,
//       profileImage: user.profileImage,
//       role: user.role,
//       address: user.address,
//       isVerified: user.isVerified,
//     },
//   });
// };

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: role || 'user',
  });

  // Send welcome email (non-blocking)
  emailService.sendWelcomeEmail(user).catch(err => {
    logger.error('Failed to send welcome email:', err.message);
  });

  logger.info(`New user registered: ${email}`);
  sendTokenResponse(user, 201, res);
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${email}`);
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // But we can add the token to a blacklist if needed
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  // If user is an artisan, get artisan profile
  let artisanProfile = null;
  if (user.role === 'artisan') {
    artisanProfile = await Artisan.findOne({ user: user._id })
      .populate('skills', 'name description')
      .populate({
        path: 'reviews',
        select: 'rating comment createdAt',
        options: { limit: 5, sort: { createdAt: -1 } },
      });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        address: user.address,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      artisanProfile,
    },
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { firstName, lastName, phone },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
    },
  });
});

/**
 * @desc    Update user address
 * @route   PUT /api/auth/update-address
 * @access  Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      address: { street, city, state, zipCode, country },
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: user.address,
  });
});

/**
 * @desc    Update profile image
 * @route   PUT /api/auth/update-image
 * @access  Private
 */
const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400, 'NO_IMAGE');
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { profileImage: req.file.path },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile image updated successfully',
    data: { profileImage: user.profileImage },
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, 'INCORRECT_PASSWORD');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);
  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset email has been sent',
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // Send email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken, resetUrl);
    
    logger.info(`Password reset email sent to: ${email}`);
    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    // Reset token fields if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error('Failed to send password reset email:', error.message);
    throw new AppError('Failed to send password reset email', 500, 'EMAIL_SEND_FAILED');
  }
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info(`Password reset successful for: ${user.email}`);
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public (requires valid refresh token)
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'NO_REFRESH_TOKEN');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
});

/**
 * @desc    Verify email (placeholder - implement with actual email verification)
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Implement email verification logic here
  // For now, return success
  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updateAddress,
  updateProfileImage,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  verifyEmail,
};
