// models/User.js - FIXED (Mongoose async pre-save hook)
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number'],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
    },

    password: {
      type: String,
      select: false,
      minlength: 8,
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

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1 });

// ================= PASSWORD HASHING - FIXED =================
// CORRECT WAY: async function WITHOUT next parameter
userSchema.pre('save', async function () {
  // Only hash if password exists and was modified
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  // No next() needed — Mongoose awaits the async function automatically
});

// ================= METHODS =================
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPasswordAuth = function () {
  return !!this.password;
};

module.exports = mongoose.model('User', userSchema);