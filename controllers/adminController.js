// controllers/adminController.js - COMPLETE & FIXED
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt_secret, {
    expiresIn: config.jwt_expire,
  });
};

// @desc    Admin login with email, password, and secret key
// @route   POST /api/auth/admin-login
// @access  Public
exports.hiddenAdminLogin = async (req, res) => {
  try {
    console.log('🔥 Admin login route hit!');
    console.log('Request body:', req.body);

    const { email, password, adminKey } = req.body;

    // Validate required fields
    if (!email || !password || !adminKey) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Email, password, and adminKey are required"
      });
    }

    // Verify admin secret key
    if (adminKey !== process.env.ADMIN_KEY) {
      console.log('❌ Invalid admin key');
      return res.status(403).json({
        success: false,
        message: "Access denied - Invalid admin key"
      });
    }

    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check if user has a password (only admins should)
    if (!user.password) {
      console.log('❌ User has no password set');
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Verify user is admin
    if (user.role !== 'admin') {
      console.log('❌ User is not admin, role:', user.role);
      return res.status(403).json({
        success: false,
        message: "Access denied - Not an admin"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Admin login successful for:', user.email);
    
    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during admin login",
      error: error.message
    });
  }
};