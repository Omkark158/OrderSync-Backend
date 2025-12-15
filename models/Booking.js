// 5. BOOKING MODEL (models/Booking.js)
// ============================================
const bookingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerEmail: String,
    bookingDateTime: {
      type: Date,
      required: [true, 'Booking date and time is required'],
    },
    bookingType: {
      type: String,
      enum: ['delivery', 'pickup', 'dine-in'],
      default: 'delivery',
    },
    status: {
      type: String,
      enum: ['scheduled', 'reminded', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    reminderSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      reminderBefore: {
        type: Number,
        default: 60, // 1 hour
      },
      reminderType: {
        type: [String],
        enum: ['sms', 'email', 'both'],
        default: ['sms'],
      },
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: Date,
    reminderAttempts: {
      type: Number,
      default: 0,
    },
    lastReminderError: String,
    scheduledReminderTime: Date,
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    numberOfGuests: {
      type: Number,
      min: 1,
    },
    tableNumber: String,
    cancelledAt: Date,
    cancellationReason: String,
    completedAt: Date,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters'],
      },
      submittedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.pre('save', function (next) {
  if (this.reminderSettings.enabled && this.bookingDateTime) {
    const reminderTime = new Date(this.bookingDateTime);
    reminderTime.setMinutes(
      reminderTime.getMinutes() - this.reminderSettings.reminderBefore
    );
    this.scheduledReminderTime = reminderTime;
  }
  next();
});

bookingSchema.index({ order: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ bookingDateTime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledReminderTime: 1, reminderSent: 1 });

bookingSchema.methods.shouldSendReminder = function () {
  const now = new Date();
  return (
    this.reminderSettings.enabled &&
    !this.reminderSent &&
    this.status === 'scheduled' &&
    this.scheduledReminderTime &&
    now >= this.scheduledReminderTime &&
    now < this.bookingDateTime
  );
};

module.exports = mongoose.model('Booking', bookingSchema);