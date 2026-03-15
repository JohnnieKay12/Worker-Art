const express = require('express');
const router = express.Router();
const { bookingController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const {
  createBookingValidation,
  updateBookingStatusValidation,
  cancelBookingValidation,
  paginationValidation,
} = require('../middleware/validation');
const { bookingLimiter } = require('../middleware/rateLimiter');


// PUBLIC PAYMENT VERIFICATION ROUTE
router.get('/verify/:reference', bookingController.verifyPayment);


// All routes below require authentication
router.use(protect);


// User routes
router.post('/', bookingLimiter, createBookingValidation, bookingController.createBooking);
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/:id', bookingController.getBooking);
router.put('/:id/status', updateBookingStatusValidation, bookingController.updateBookingStatus);
router.put('/:id/cancel', cancelBookingValidation, bookingController.cancelBooking);
router.put('/:id/complete', authorize('artisan', 'admin'), bookingController.completeBooking);


// Payment routes
router.post('/:id/pay', bookingController.initializePayment);


// Admin only routes
router.use(authorize('admin'));

router.get('/', paginationValidation, bookingController.getBookings);
router.delete('/:id', bookingController.deleteBooking);
router.get('/stats/overview', bookingController.getBookingStats);

module.exports = router;