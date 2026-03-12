const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { protect } = require('../middleware/auth');
const { uploadProfile } = require('../config/cloudinary');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
  updateAddressValidation,
} = require('../middleware/validation');
const {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiter');

// Public routes
router.post('/register', registerLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.post('/refresh-token', authController.refreshAccessToken);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.use(protect);

router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/update-profile', updateProfileValidation, authController.updateProfile);
router.put('/update-address', updateAddressValidation, authController.updateAddress);
router.put('/update-image', uploadProfile.single('image'), authController.updateProfileImage);
router.put('/change-password', changePasswordValidation, authController.changePassword);

module.exports = router;
