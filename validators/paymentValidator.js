const { body } = require('express-validator');

// Create payment order validation
exports.createPaymentValidator = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),

  body('paymentType')
    .optional()
    .isIn(['full', 'advance', 'remaining'])
    .withMessage('Invalid payment type'),
];

// Verify payment validation
exports.verifyPaymentValidator = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),

  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),

  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
];