const express = require('express');
const router = express.Router();
const { serviceCategoryController } = require('../controllers');
const { protect, authorize } = require('../middleware/auth');
const { createCategoryValidation, paginationValidation } = require('../middleware/validation');

// Public routes
router.get('/', paginationValidation, serviceCategoryController.getCategories);
router.get('/slug/:slug', serviceCategoryController.getCategoryBySlug);
router.get('/stats/overview', serviceCategoryController.getCategoryStats);
router.get('/:id', serviceCategoryController.getCategory);

// Protected routes - Admin only
router.use(protect);
router.use(authorize('admin'));

router.post('/', createCategoryValidation, serviceCategoryController.createCategory);
router.put('/:id', serviceCategoryController.updateCategory);
router.delete('/:id', serviceCategoryController.deleteCategory);
router.put('/reorder', serviceCategoryController.reorderCategories);

module.exports = router;
