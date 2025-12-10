const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { signupValidator, loginValidator } = require('../validators/authValidator');
const validateRequest = require('../middleware/validateRequest');

// Public routes
router.post('/signup', signupValidator, validateRequest, signup);
router.post('/login', loginValidator, validateRequest, login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;