const express = require('express');
const router = express.Router();
const { artisanController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { uploadProfile, uploadWork } = require('../config/cloudinary');
const {
  createArtisanValidation,
  updateArtisanValidation,
  paginationValidation,
} = require('../middleware/validation');

// Public routes
router.get('/', paginationValidation, artisanController.getArtisans);
router.get('/:id', artisanController.getArtisan);

// Protected routes
router.use(protect);

// Artisan dashboard and bookings
router.get('/dashboard/me', authorize('artisan'), artisanController.getArtisanDashboard);
router.get('/bookings/me', authorize('artisan'), paginationValidation, artisanController.getArtisanBookings);

// Artisan profile management
router.post('/', authorize('user', 'artisan'), createArtisanValidation, artisanController.createArtisan);
router.put('/:id', authorize('artisan', 'admin'), updateArtisanValidation, artisanController.updateArtisan);
router.put('/:id/profile-image', authorize('artisan', 'admin'), uploadProfile.single('image'), artisanController.uploadProfileImage);
router.post('/:id/work-images', authorize('artisan', 'admin'), uploadWork.array('images', 5), artisanController.uploadWorkImages);
router.delete('/:id/work-images/:imageId', authorize('artisan', 'admin'), artisanController.deleteWorkImage);

// Admin only routes
router.use(authorize('admin'));

router.get('/admin/pending', paginationValidation, artisanController.getPendingArtisans);
router.put('/:id/approve', artisanController.approveArtisan);
router.put('/:id/reject', artisanController.rejectArtisan);
router.put('/:id/suspend', artisanController.suspendArtisan);
router.put('/:id/unsuspend', artisanController.unsuspendArtisan);
router.delete('/:id', artisanController.deleteArtisan);

module.exports = router;
