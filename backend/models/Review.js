const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    categories: {
      punctuality: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        editedAt: { type: Date, default: Date.now },
        previousRating: { type: Number },
        previousComment: { type: String },
      },
    ],
    helpful: {
      count: { type: Number, default: 0 },
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    response: {
      text: { type: String, maxlength: [500, 'Response cannot exceed 500 characters'] },
      respondedAt: { type: Date },
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    moderationReason: {
      type: String,
    },
    moderatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ booking: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ artisan: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ isVisible: 1 });

// Compound index to prevent duplicate reviews
reviewSchema.index({ user: 1, artisan: 1, booking: 1 }, { unique: true });

// Pre-save middleware to verify booking completion
reviewSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.booking);
    
    if (!booking) {
      return next(new Error('Booking not found'));
    }
    
    if (booking.status !== 'completed') {
      return next(new Error('Can only review completed bookings'));
    }
    
    if (booking.user.toString() !== this.user.toString()) {
      return next(new Error('Only the booking user can leave a review'));
    }
    
    this.isVerified = true;
  }
  next();
});

// Post-save middleware to update artisan rating
reviewSchema.post('save', async function () {
  const Artisan = mongoose.model('Artisan');
  const artisan = await Artisan.findById(this.artisan);
  
  if (artisan) {
    await artisan.updateRating();
  }
});

// Post-remove middleware to update artisan rating
reviewSchema.post('remove', async function () {
  const Artisan = mongoose.model('Artisan');
  const artisan = await Artisan.findById(this.artisan);
  
  if (artisan) {
    await artisan.updateRating();
  }
});

// Virtual for average category rating
reviewSchema.virtual('averageCategoryRating').get(function () {
  const cats = this.categories;
  if (!cats) return null;
  
  const values = [
    cats.punctuality,
    cats.professionalism,
    cats.quality,
    cats.communication,
    cats.value,
  ].filter(v => v !== undefined);
  
  if (values.length === 0) return null;
  
  return values.reduce((a, b) => a + b, 0) / values.length;
});

// Static method to get review statistics for an artisan
reviewSchema.statics.getStatsForArtisan = async function (artisanId) {
  return await this.aggregate([
    { $match: { artisan: artisanId, isVisible: true } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating',
        },
        averagePunctuality: { $avg: '$categories.punctuality' },
        averageProfessionalism: { $avg: '$categories.professionalism' },
        averageQuality: { $avg: '$categories.quality' },
        averageCommunication: { $avg: '$categories.communication' },
        averageValue: { $avg: '$categories.value' },
      },
    },
    {
      $addFields: {
        fiveStar: {
          $size: {
            $filter: {
              input: '$ratingDistribution',
              cond: { $eq: ['$$this', 5] },
            },
          },
        },
        fourStar: {
          $size: {
            $filter: {
              input: '$ratingDistribution',
              cond: { $eq: ['$$this', 4] },
            },
          },
        },
        threeStar: {
          $size: {
            $filter: {
              input: '$ratingDistribution',
              cond: { $eq: ['$$this', 3] },
            },
          },
        },
        twoStar: {
          $size: {
            $filter: {
              input: '$ratingDistribution',
              cond: { $eq: ['$$this', 2] },
            },
          },
        },
        oneStar: {
          $size: {
            $filter: {
              input: '$ratingDistribution',
              cond: { $eq: ['$$this', 1] },
            },
          },
        },
      },
    },
  ]);
};

// Instance method to add artisan response
reviewSchema.methods.addResponse = async function (text) {
  this.response = {
    text,
    respondedAt: new Date(),
  };
  return await this.save();
};

// Instance method to mark as helpful
reviewSchema.methods.markHelpful = async function (userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count = this.helpful.users.length;
    return await this.save();
  }
  return this;
};

// Instance method to moderate review
reviewSchema.methods.moderate = async function (moderatorId, reason, isVisible = false) {
  this.isVisible = isVisible;
  this.moderatedBy = moderatorId;
  this.moderationReason = reason;
  this.moderatedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
