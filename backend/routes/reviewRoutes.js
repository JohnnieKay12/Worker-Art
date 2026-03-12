const express = require('express');
const router = express.Router();
const { reviewController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const {
  createReviewValidation,
  paginationValidation,
} = require('../middleware/validation');
const { reviewLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', paginationValidation, reviewController.getReviews);
router.get('/artisan/:artisanId', paginationValidation, reviewController.getArtisanReviews);
router.get('/:id', reviewController.getReview);

// Protected routes
router.use(protect);

// User routes
router.get('/my-reviews', paginationValidation, reviewController.getMyReviews);
router.post('/', reviewLimiter, createReviewValidation, reviewController.createReview);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);
router.post('/:id/helpful', reviewController.markHelpful);

// Artisan routes
router.post('/:id/response', authorize('artisan', 'admin'), reviewController.addResponse);

// Admin only routes
router.use(authorize('admin'));

router.put('/:id/moderate', reviewController.moderateReview);

module.exports = router;
