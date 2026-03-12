const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validation');
const { adminActionLimiter } = require('../middleware/rateLimiter');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', paginationValidation, adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getAllUsers);
router.put('/users/:id', adminActionLimiter, adminController.updateUser);
router.delete('/users/:id', adminActionLimiter, adminController.deleteUser);

// Artisan management
router.get('/artisans', paginationValidation, adminController.getAllArtisans);
router.post('/artisans', adminController.createArtisan);

// Booking management
router.get('/bookings', paginationValidation, adminController.getAllBookings);

// Payment management
router.get('/payments', paginationValidation, adminController.getAllPayments);

// Review management
router.get('/reviews', paginationValidation, adminController.getAllReviews);

// Analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
