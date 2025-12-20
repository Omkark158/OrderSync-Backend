// routes/invoiceRoutes.js - COMPLETE FIX
const express = require('express');
const router = express.Router();
const {
  generateInvoice,
  getInvoiceById,
  getInvoiceByOrderId,
  getAllInvoices,
  updatePaymentStatus,
  downloadInvoice,
  viewInvoice,
  cancelInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
  console.log('🔍 Invoice Route:', req.method, req.originalUrl);
  next();
});

// All routes require authentication
router.use(protect);

// ⚠️ CRITICAL: Order matters! Most specific routes FIRST

// 1. No params - list all
router.get('/', getAllInvoices);

// 2. Generate (admin only)
router.post('/generate/:orderId', authorize('admin'), generateInvoice);

// 3. Get by order ID (before :id to avoid conflict)
router.get('/order/:orderId', getInvoiceByOrderId);

// 4. Download route (MUST be before :id)
router.get('/:id/download', downloadInvoice);

// 5. View route (MUST be before :id)
router.get('/:id/view', viewInvoice);

// 6. Payment update (action route)
router.put('/:id/payment', authorize('admin'), updatePaymentStatus);

// 7. Cancel (action route)
router.put('/:id/cancel', authorize('admin'), cancelInvoice);

// 8. Get by ID (MUST BE LAST - catches all other :id patterns)
router.get('/:id', getInvoiceById);

module.exports = router;