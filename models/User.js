// models/User.js
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
      unique: true, // ✅ creates unique index automatically
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
      index: true, // ✅ single index (allowed)
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

    lastLogin: Date,

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
  { timestamps: true }
);

// ================= PASSWORD HASHING =================
userSchema.pre('save', async function () {
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// ================= METHODS =================
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPasswordAuth = function () {
  return Boolean(this.password);
};

module.exports = mongoose.model('User', userSchema);
