const express = require('express');
const router = express.Router();
const { paymentController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { initializePaymentValidation, paginationValidation } = require('../middleware/validation');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// Webhook route (public but with signature verification)
router.post('/webhook', webhookLimiter, express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// All other routes require authentication
router.use(protect);

// User routes
router.post('/initialize', paymentLimiter, initializePaymentValidation, paymentController.initializePayment);
router.post('/artisan-registration', paymentLimiter, paymentController.initializeArtisanRegistration);
router.get('/verify', paymentController.verifyPayment);
router.get('/my-payments', paginationValidation, paymentController.getMyPayments);
router.get('/:id', paymentController.getPayment);

// Admin only routes
router.use(authorize('admin'));

router.get('/', paginationValidation, paymentController.getPayments);
router.post('/:id/refund', paymentController.processRefund);
router.get('/stats/overview', paymentController.getPaymentStats);

module.exports = router;
