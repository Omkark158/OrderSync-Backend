// ============================================
// 1. USER MODEL (models/User.js)
// ============================================
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
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
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
    // Phone Verification
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
    // Login OTP
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
    // Addresses
    addresses: [
      {
        label: {
          type: String,
          enum: ['home', 'work', 'other'],
          default: 'home',
        },
        street: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Customer GSTIN (if business)
    gstin: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);