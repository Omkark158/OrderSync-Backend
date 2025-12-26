// routes/smsRoutes.js - CORRECTED
const express = require('express');
const router = express.Router();
const {
  sendAdminNotification,
  sendOrderConfirmation,
  sendOrderDenial,
  sendOrderStatusUpdate,
  sendInvoiceLink,
  sendPaymentConfirmation,
  sendDeliveryReminder,
  sendTestSMS,
  sendOTP,
} = require('../controllers/smsController');
const { protect } = require('../middleware/auth');

// ============================================
// Public Routes
// ============================================

// Send OTP (for signup/login)
router.post('/send-otp', sendOTP);

// ============================================
// Protected Routes (Authenticated Users)
// ============================================

// Admin notification (when customer creates order)
router.post('/admin-notification', protect, sendAdminNotification);

// Payment confirmation (customer and admin)
router.post('/payment-confirmation', protect, sendPaymentConfirmation);

// ============================================
// Admin-Only Routes
// ============================================

// Order confirmation
router.post('/order-confirmed', protect, sendOrderConfirmation);

// Order denial/cancellation
router.post('/order-denied', protect, sendOrderDenial);

// Order status update
router.post('/order-status', protect, sendOrderStatusUpdate);

// Send invoice link
router.post('/send-invoice', protect, sendInvoiceLink);

// Delivery reminder
router.post('/delivery-reminder', protect, sendDeliveryReminder);

// Test SMS
router.post('/test', protect, sendTestSMS);

module.exports = router;