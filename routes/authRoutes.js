// routes/authRoutes.js - FIXED IMPORT
const express = require('express');
const router = express.Router();

// ✅ Import auth controller functions
const {
  signup,
  verifySignupOTP,
  resendSignupOTP,
  login,
  verifyLoginOTP,
  resendLoginOTP,
  getMe,
  refreshToken, 
  logout,
} = require('../controllers/authController');

// ✅ Import admin controller - SEPARATE REQUIRE
const adminController = require('../controllers/adminController');

// Import middleware
const { protect } = require('../middleware/auth');
const {
  signupValidator,
  loginValidator,
  verifyOTPValidator,
} = require('../validators/authValidator');
const { validate } = require('../middleware/validate');

// ============================================
// PUBLIC ROUTES
// ============================================

// ✅ ADMIN LOGIN - Must be FIRST to avoid conflicts
router.post('/admin-login', adminController.hiddenAdminLogin);

// Signup routes
router.post('/signup', signupValidator, validate, signup);
router.post('/verify-signup', verifyOTPValidator, validate, verifySignupOTP);
router.post('/resend-signup', resendSignupOTP);

// Login routes
router.post('/login', loginValidator, validate, login);
router.post('/verify-login', verifyOTPValidator, validate, verifyLoginOTP);
router.post('/resend-login', resendLoginOTP);

// ============================================
// PROTECTED ROUTES
// ============================================

// Token refresh
router.post('/refresh', protect, refreshToken);

// Get current user
router.get('/me', protect, getMe);

// Logout
router.post('/logout', protect, logout);

module.exports = router;