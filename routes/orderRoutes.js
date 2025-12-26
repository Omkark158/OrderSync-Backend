// routes/orderRoutes.js - FIXED ROUTE ORDER
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderByOrderNumber,
  getOrdersByPhone,
  updateOrderStatus,
  updatePaymentStatus, 
  cancelOrder,
  sendOrderInvoiceSMS,    
  getOrderInvoice,
  deleteOrder,
  getMyOrders,                 
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { createOrderValidator } = require('../validators/orderValidator');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(protect);

// ⚠️ CRITICAL: ALL STATIC ROUTES MUST COME BEFORE :id ROUTES
// ============================================
// STATIC ROUTES (NO PARAMS) - FIRST
// ============================================
router.post('/', createOrderValidator, validateRequest, createOrder);
router.get('/', getOrders);

// ============================================
// SPECIFIC STATIC PATH ROUTES - BEFORE :id
// ============================================
router.get('/my-orders', getMyOrders); // ← MUST BE BEFORE /:id
router.get('/phone/:phone', getOrdersByPhone);

// ============================================
// :id ACTION ROUTES - BEFORE GENERIC :id
// ============================================
router.get('/:id/invoice', getOrderInvoice);
router.post('/:id/send-invoice-sms', sendOrderInvoiceSMS);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/status', authorize('admin'), updateOrderStatus);
router.put('/:id/payment-status', authorize('admin'), updatePaymentStatus);
router.delete('/:id', authorize('admin'), deleteOrder);

// ============================================
// GENERIC :id ROUTE - ALWAYS LAST
// ============================================
router.get('/:orderNumber', protect, getOrderByOrderNumber);

module.exports = router;