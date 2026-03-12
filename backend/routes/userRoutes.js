const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// User routes (for logged in user)
router.get('/dashboard', userController.getUserDashboard);
router.get('/bookings', paginationValidation, userController.getUserBookings);
router.get('/reviews', paginationValidation, userController.getUserReviews);

// Admin only routes
router.use(authorize('admin'));

router.get('/', paginationValidation, userController.getUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.put('/:id/suspend', userController.suspendUser);
router.put('/:id/reactivate', userController.reactivateUser);

module.exports = router;
