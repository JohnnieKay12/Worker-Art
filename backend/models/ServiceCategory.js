const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      default: null,
    },
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    averagePrice: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    popularServices: [
      {
        name: { type: String },
        description: { type: String },
        estimatedHours: { type: Number },
      },
    ],
    artisanCount: {
      type: Number,
      default: 0,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
serviceCategorySchema.index({ slug: 1 });
serviceCategorySchema.index({ isActive: 1 });
serviceCategorySchema.index({ displayOrder: 1 });

// Pre-save middleware to create slug
serviceCategorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for artisans in this category
serviceCategorySchema.virtual('artisans', {
  ref: 'Artisan',
  localField: '_id',
  foreignField: 'skills',
});

// Static method to get category stats
serviceCategorySchema.statics.getStats = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        activeCategories: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        totalArtisans: { $sum: '$artisanCount' },
        totalBookings: { $sum: '$bookingCount' },
      },
    },
  ]);
};

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
