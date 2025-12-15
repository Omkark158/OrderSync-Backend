const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true,
    },
    role: {
      type: String,
      enum: ['user', 'restaurant', 'delivery', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Phone Verification Fields
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerificationOTP: {
      type: String,
      select: false,
    },
    phoneVerificationOTPExpire: {
      type: Date,
      select: false,
    },
    // Login OTP Fields
    loginOTP: {
      type: String,
      select: false,
    },
    loginOTPExpire: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);