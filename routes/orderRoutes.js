// routes/orderRoutes.js - With DELETE route added
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersByPhone,
  updateOrderStatus,
  updatePaymentStatus, 
  cancelOrder,
  sendOrderInvoiceSMS,    
  getOrderInvoice,
  deleteOrder,                  
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { createOrderValidator } = require('../validators/orderValidator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(protect);

// ⚠️ CRITICAL: ALL specific routes MUST come BEFORE :id routes
// Order creation and listing (no params)
router.post('/', createOrderValidator, validateRequest, createOrder);
router.get('/', getOrders);

// Specific routes with static path segments (BEFORE :id)
router.get('/phone/:phone', getOrdersByPhone);

// Order-specific action routes (BEFORE generic :id route)
router.get('/:id/invoice', getOrderInvoice);
router.post('/:id/send-invoice-sms', sendOrderInvoiceSMS);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', authorize('admin'), updateOrderStatus);
router.route('/:id/payment-status').put(protect, authorize('admin'), updatePaymentStatus);

// ← NEW: DELETE route (admin only) - must come BEFORE generic GET /:id
router.delete('/:id', authorize('admin'), deleteOrder);

// Generic :id route MUST be last
router.get('/:id', getOrderById);

module.exports = router;