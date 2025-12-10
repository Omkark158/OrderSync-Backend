const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersByPhone,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { createOrderValidator } = require('../validators/orderValidator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(protect);

// Order routes
router.post('/', createOrderValidator, validateRequest, createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.get('/phone/:phone', getOrdersByPhone);

// Cancel order (user or admin)
router.put('/:id/cancel', cancelOrder);

// Update order status (admin only)
router.put('/:id/status', authorize('admin'), updateOrderStatus);

module.exports = router;