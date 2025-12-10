const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentByOrderId,
  getUserPayments,
  handlePaymentFailure,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { createPaymentValidator, verifyPaymentValidator } = require('../validators/paymentValidator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(protect);

// Payment routes
router.post('/create-order', createPaymentValidator, validateRequest, createPaymentOrder);
router.post('/verify', verifyPaymentValidator, validateRequest, verifyPayment);
router.post('/failure', handlePaymentFailure);
router.get('/order/:orderId', getPaymentByOrderId);
router.get('/', getUserPayments);

module.exports = router;