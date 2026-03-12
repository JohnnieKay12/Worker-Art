const { ServiceCategory, Artisan } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get all service categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, parentOnly, isActive } = req.query;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (parentOnly === 'true') filter.parentCategory = null;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const categories = await ServiceCategory.find(filter)
    .populate('parentCategory', 'name')
    .populate('subcategories', 'name description icon')
    .sort({ displayOrder: 1, name: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ServiceCategory.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: categories,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @desc    Get single category
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategory = asyncHandler(async (req, res) => {
  const category = await ServiceCategory.findById(req.params.id)
    .populate('parentCategory', 'name description')
    .populate('subcategories', 'name description icon image')
    .populate({
      path: 'artisans',
      match: { isApproved: true, isSuspended: false },
      populate: {
        path: 'user',
        select: 'firstName lastName profileImage',
      },
    });

  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Get category by slug
 * @route   GET /api/categories/slug/:slug
 * @access  Public
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await ServiceCategory.findOne({ slug: req.params.slug })
    .populate('parentCategory', 'name description')
    .populate('subcategories', 'name description icon image');

  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Create category (admin only)
 * @route   POST /api/categories
 * @access  Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    icon,
    image,
    parentCategory,
    displayOrder,
    popularServices,
  } = req.body;

  // Check if category exists
  const existingCategory = await ServiceCategory.findOne({ name });
  if (existingCategory) {
    throw new AppError('Category with this name already exists', 400, 'CATEGORY_EXISTS');
  }

  // Validate parent category if provided
  if (parentCategory) {
    const parent = await ServiceCategory.findById(parentCategory);
    if (!parent) {
      throw new AppError('Parent category not found', 404, 'PARENT_NOT_FOUND');
    }
  }

  const category = await ServiceCategory.create({
    name,
    description,
    icon,
    image,
    parentCategory,
    displayOrder,
    popularServices,
  });

  // If has parent, add to parent's subcategories
  if (parentCategory) {
    await ServiceCategory.findByIdAndUpdate(parentCategory, {
      $push: { subcategories: category._id },
    });
  }

  logger.info(`Category created: ${name} by admin: ${req.user.id}`);
  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
});

/**
 * @desc    Update category (admin only)
 * @route   PUT /api/categories/:id
 * @access  Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    icon,
    image,
    parentCategory,
    isActive,
    displayOrder,
    popularServices,
  } = req.body;

  const category = await ServiceCategory.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  // Check for name conflict
  if (name && name !== category.name) {
    const existingCategory = await ServiceCategory.findOne({ name });
    if (existingCategory) {
      throw new AppError('Category with this name already exists', 400, 'CATEGORY_EXISTS');
    }
  }

  // Handle parent category change
  if (parentCategory !== undefined && parentCategory !== category.parentCategory?.toString()) {
    // Remove from old parent's subcategories
    if (category.parentCategory) {
      await ServiceCategory.findByIdAndUpdate(category.parentCategory, {
        $pull: { subcategories: category._id },
      });
    }

    // Add to new parent's subcategories
    if (parentCategory) {
      const parent = await ServiceCategory.findById(parentCategory);
      if (!parent) {
        throw new AppError('Parent category not found', 404, 'PARENT_NOT_FOUND');
      }
      await ServiceCategory.findByIdAndUpdate(parentCategory, {
        $push: { subcategories: category._id },
      });
    }

    category.parentCategory = parentCategory || null;
  }

  // Update fields
  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (icon !== undefined) category.icon = icon;
  if (image !== undefined) category.image = image;
  if (isActive !== undefined) category.isActive = isActive;
  if (displayOrder !== undefined) category.displayOrder = displayOrder;
  if (popularServices) category.popularServices = popularServices;

  await category.save();

  logger.info(`Category updated: ${category.name} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
});

/**
 * @desc    Delete category (admin only)
 * @route   DELETE /api/categories/:id
 * @access  Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await ServiceCategory.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  // Check if category has subcategories
  if (category.subcategories && category.subcategories.length > 0) {
    throw new AppError(
      'Cannot delete category with subcategories. Delete subcategories first.',
      400,
      'HAS_SUBCATEGORIES'
    );
  }

  // Check if category is used by artisans
  const artisanCount = await Artisan.countDocuments({ skills: req.params.id });
  if (artisanCount > 0) {
    throw new AppError(
      `Cannot delete category. It is used by ${artisanCount} artisans.`,
      400,
      'CATEGORY_IN_USE'
    );
  }

  // Remove from parent's subcategories
  if (category.parentCategory) {
    await ServiceCategory.findByIdAndUpdate(category.parentCategory, {
      $pull: { subcategories: category._id },
    });
  }

  await category.deleteOne();

  logger.info(`Category deleted: ${category.name} by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

/**
 * @desc    Get category statistics (admin only)
 * @route   GET /api/categories/stats/overview
 * @access  Admin
 */
const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await ServiceCategory.getStats();

  // Get category usage
  const categoryUsage = await ServiceCategory.aggregate([
    {
      $lookup: {
        from: 'artisans',
        localField: '_id',
        foreignField: 'skills',
        as: 'artisans',
      },
    },
    {
      $project: {
        name: 1,
        artisanCount: { $size: '$artisans' },
        isActive: 1,
      },
    },
    { $sort: { artisanCount: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      usage: categoryUsage,
    },
  });
});

/**
 * @desc    Reorder categories (admin only)
 * @route   PUT /api/categories/reorder
 * @access  Admin
 */
const reorderCategories = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    throw new AppError('Categories array required', 400, 'INVALID_DATA');
  }

  const updates = categories.map((cat, index) => ({
    updateOne: {
      filter: { _id: cat.id },
      update: { displayOrder: index },
    },
  }));

  await ServiceCategory.bulkWrite(updates);

  logger.info(`Categories reordered by admin: ${req.user.id}`);
  res.status(200).json({
    success: true,
    message: 'Categories reordered successfully',
  });
});

module.exports = {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  reorderCategories,
};
