const mongoose = require('mongoose');

const artisanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
      },
    ],
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative'],
    },
    basePrice: {
      type: Number,
      default: 0,
      min: [0, 'Base price cannot be negative'],
    },
    workImages: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String },
        year: { type: Number },
      },
    ],
    availability: {
      monday: { available: { type: Boolean, default: true }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      tuesday: { available: { type: Boolean, default: true }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      wednesday: { available: { type: Boolean, default: true }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      thursday: { available: { type: Boolean, default: true }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      friday: { available: { type: Boolean, default: true }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      saturday: { available: { type: Boolean, default: false }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
      sunday: { available: { type: Boolean, default: false }, hours: { start: { type: String, default: '09:00' }, end: { type: String, default: '17:00' } } },
    },
    serviceArea: {
      radius: { type: Number, default: 10 }, // in kilometers
      cities: [{ type: String }],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvalDate: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    registrationFeePaid: {
      type: Boolean,
      default: false,
    },
    registrationPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    completedBookings: {
      type: Number,
      default: 0,
    },
    idType: {
      type: String,
      enum: ['national_id', 'drivers_license', 'passport', 'voters_card', ''],
      default: '',
    },
    idNumber: {
      type: String,
      default: '',
    },
    idImage: {
      type: String,
      default: '',
    },
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      bankCode: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
artisanSchema.index({ user: 1 });
artisanSchema.index({ skills: 1 });
artisanSchema.index({ approvalStatus: 1 });
artisanSchema.index({ isApproved: 1 });
artisanSchema.index({ 'rating.average': -1 });
artisanSchema.index({ hourlyRate: 1 });

// Virtual for reviews
artisanSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'artisan',
});

// Virtual for user details
artisanSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
});

// Method to update rating
artisanSchema.methods.updateRating = async function () {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { artisan: this._id } },
    {
      $group: {
        _id: '$artisan',
        avgRating: { $avg: '$rating' },
        numRatings: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.rating.average = Math.round(stats[0].avgRating * 10) / 10;
    this.rating.count = stats[0].numRatings;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }

  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Artisan', artisanSchema);
