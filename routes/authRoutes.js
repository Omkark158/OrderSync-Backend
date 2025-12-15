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
const { protect } = require('../middleware/auth');
const {
  signupValidator,
  loginValidator,
  verifyOTPValidator,
} = require('../validators/authValidator');
const { validate } = require('../middleware/validate');

// Signup routes
router.post('/signup', signupValidator, validate, signup);
router.post('/verify-signup', verifyOTPValidator, validate, verifySignupOTP); // ✅ RENAMED
router.post('/resend-signup', resendSignupOTP); // ✅ RENAMED

// Login routes
router.post('/login', loginValidator, validate, login);
router.post('/verify-login', verifyOTPValidator, validate, verifyLoginOTP); // ✅ SHORT
router.post('/resend-login', resendLoginOTP); // ✅ SHORT

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;