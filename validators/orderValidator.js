const { body } = require('express-validator');

// Create order validation
exports.createOrderValidator = [
  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('orderItems.*.menuItem')
    .notEmpty()
    .withMessage('Menu item ID is required')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('orderDateTime')
    .notEmpty()
    .withMessage('Order date and time is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const orderDate = new Date(value);
      const now = new Date();
      if (orderDate < now) {
        throw new Error('Order date cannot be in the past');
      }
      return true;
    }),

  body('deliveryAddress')
    .optional()
    .isObject()
    .withMessage('Delivery address must be an object'),

  body('deliveryAddress.street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street is required when providing delivery address'),

  body('deliveryAddress.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required when providing delivery address'),

  body('deliveryAddress.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State is required when providing delivery address'),

  body('deliveryAddress.pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Invalid pincode format'),

  body('advancePayment')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Advance payment must be a positive number'),

  body('paymentMethod')
    .optional()
    .isIn(['full', 'advance', 'cash', 'online'])
    .withMessage('Invalid payment method'),

  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
];