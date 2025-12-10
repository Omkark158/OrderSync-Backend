const mongoose = require('mongoose');

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
    customerEmail: {
      type: String,
    },
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
    // Reminder settings
    reminderSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      // How many minutes before the booking to send reminder
      reminderBefore: {
        type: Number,
        default: 60, // 1 hour before
      },
      reminderType: {
        type: [String],
        enum: ['sms', 'email', 'both'],
        default: ['sms'],
      },
    },
    // Reminder status
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: {
      type: Date,
    },
    reminderAttempts: {
      type: Number,
      default: 0,
    },
    lastReminderError: {
      type: String,
    },
    // Scheduled reminder time (calculated)
    scheduledReminderTime: {
      type: Date,
    },
    // Additional notes
    specialRequests: {
      type: String,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    numberOfGuests: {
      type: Number,
      min: 1,
    },
    tableNumber: {
      type: String,
    },
    // Cancellation
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    // Completion
    completedAt: {
      type: Date,
    },
    // Feedback
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
      submittedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate scheduled reminder time before saving
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

// Index for faster queries
bookingSchema.index({ order: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ bookingDateTime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledReminderTime: 1, reminderSent: 1 });

// Method to check if reminder should be sent
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