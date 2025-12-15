const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { sendSignupOTP, sendLoginOTP, generateOTP } = require('../services/smsService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt_secret, {
    expiresIn: config.jwt_expire,
  });
};

// @desc    Register a new user - Step 1: Create account and send OTP
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and phone number',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    // Generate phone verification OTP
    const phoneOTP = generateOTP();
    const phoneOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Create user
    const user = await User.create({
      name,
      phone,
      phoneVerificationOTP: phoneOTP,
      phoneVerificationOTPExpire: phoneOTPExpire,
    });

    // Send phone verification OTP via SMS
    try {
      await sendSignupOTP(phone, phoneOTP);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    res.status(201).json({
      success: true,
      message: 'OTP sent to your phone. Please verify to complete signup.',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: error.message,
    });
  }
};

// @desc    Verify phone OTP after signup
// @route   POST /api/auth/verify-signup-otp
// @access  Public
exports.verifySignupOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and OTP',
      });
    }

    const user = await User.findOne({
      phone,
      phoneVerificationOTP: otp,
      phoneVerificationOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationOTP = undefined;
    user.phoneVerificationOTPExpire = undefined;
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Account verified successfully! Welcome to Sachin Foods.',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during phone verification',
      error: error.message,
    });
  }
};

// @desc    Resend signup OTP
// @route   POST /api/auth/resend-signup-otp
// @access  Public
exports.resendSignupOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone already verified',
      });
    }

    // Generate new OTP
    const phoneOTP = generateOTP();
    user.phoneVerificationOTP = phoneOTP;
    user.phoneVerificationOTPExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via SMS
    try {
      await sendSignupOTP(phone, phoneOTP);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent to your phone',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Login - Step 1: Send OTP to phone
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please signup first.',
      });
    }

    // Check if phone is verified
    if (!user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone number first',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Generate login OTP
    const loginOTP = generateOTP();
    const loginOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.loginOTP = loginOTP;
    user.loginOTPExpire = loginOTPExpire;
    await user.save();

    // Send login OTP via SMS
    try {
      await sendLoginOTP(phone, loginOTP);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your phone',
      phone: phone.slice(-4), // Only show last 4 digits for security
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Login - Step 2: Verify OTP and complete login
// @route   POST /api/auth/verify-login-otp
// @access  Public
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and OTP',
      });
    }

    // Find user with valid OTP
    const user = await User.findOne({
      phone,
      loginOTP: otp,
      loginOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Clear login OTP
    user.loginOTP = undefined;
    user.loginOTPExpire = undefined;
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message,
    });
  }
};

// @desc    Resend login OTP
// @route   POST /api/auth/resend-login-otp
// @access  Public
exports.resendLoginOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new login OTP
    const loginOTP = generateOTP();
    user.loginOTP = loginOTP;
    user.loginOTPExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via SMS
    try {
      await sendLoginOTP(phone, loginOTP);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent to your phone',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};