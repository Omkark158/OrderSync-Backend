// routes/authRoutes.js - FIXED WITH ADMIN LOGIN
const express = require('express');
const router = express.Router();
const {
  signup,
  verifySignupOTP,
  resendSignupOTP,
  login,
  verifyLoginOTP,
  resendLoginOTP,
  getMe,
  logout,
} = require('../controllers/authController');
const { hiddenAdminLogin } = require('../controllers/adminController'); // ✅ ADD THIS
const { protect } = require('../middleware/auth');
const {
  signupValidator,
  loginValidator,
  verifyOTPValidator,
} = require('../validators/authValidator');
const { validate } = require('../middleware/validate');

// ✅ ADMIN LOGIN ROUTE - ADD THIS AT THE TOP
router.post('/admin-login', hiddenAdminLogin);

// Signup routes
router.post('/signup', signupValidator, validate, signup);
router.post('/verify-signup', verifyOTPValidator, validate, verifySignupOTP);
router.post('/resend-signup', resendSignupOTP);

// Login routes
router.post('/login', loginValidator, validate, login);
router.post('/verify-login', verifyOTPValidator, validate, verifyLoginOTP);
router.post('/resend-login', resendLoginOTP);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;