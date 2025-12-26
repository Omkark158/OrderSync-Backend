// routes/paymentRoutes.js - CORRECTED
const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getPaymentByOrderNumber
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ========================================
// Payment Order Creation & Verification
// ========================================

// Create Razorpay payment order
router.post('/create-order', createPaymentOrder);

// Verify payment after Razorpay success
router.post('/verify', verifyPayment);

// Handle payment failure
router.post('/failure', handlePaymentFailure);

// ========================================
// Payment Retrieval Routes
// ========================================

// Get payments by order number
router.get('/order/:orderNumber', getPaymentByOrderNumber);

module.exports = router;