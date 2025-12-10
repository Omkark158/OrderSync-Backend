// controllers/adminController.js
const User = require('../models/User');
const { generateToken } = require('../services/tokenService');

exports.hiddenAdminLogin = async (req, res) => {
  try {
    const { email, password, adminKey } = req.body;

    // 1. Validate input
    if (!email || !password || !adminKey) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and adminKey are required"
      });
    }

    // 2. Check secret admin key first (from .env)
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // 3. Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 4. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // 5. Must be admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // SUCCESS — Generate token
    const token = generateToken(user._id);

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
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};