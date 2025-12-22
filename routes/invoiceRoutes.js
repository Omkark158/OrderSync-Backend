// routes/invoiceRoutes.js - FIXED VERSION
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
  console.log('🔍 Invoice Route Hit:', req.method, req.originalUrl);
  console.log('📦 Params:', req.params);
  console.log('👤 User:', req.user ? req.user._id : 'No user');
  next();
});

// All routes require authentication
router.use(protect);

// ========================================
// CRITICAL: Route Order Matters!
// Most specific routes FIRST, generic routes LAST
// ========================================

// 1. Generate invoice for an order (admin only)
router.post('/generate/:orderId', authorize('admin'), generateInvoice);

// 2. Download PDF (specific action before :id)
router.get('/:id/download', downloadInvoice);

// 3. View invoice (specific action before :id)
router.get('/:id/view', viewInvoice);

// 4. Get invoice by order ID (different param name)
router.get('/order/:orderId', getInvoiceByOrderId);

// 5. Update payment status (admin only)
router.put('/:id/payment', authorize('admin'), updatePaymentStatus);

// 6. Cancel invoice (admin only)
router.put('/:id/cancel', authorize('admin'), cancelInvoice);

// 7. Get all invoices
router.get('/', getAllInvoices);

// 8. Get single invoice by ID (MUST BE LAST)
router.get('/:id', getInvoiceById);

module.exports = router;

// ========================================
// USAGE EXAMPLES:
// ========================================
// POST   /api/invoices/generate/507f1f77bcf86cd799439011  → Generate invoice
// GET    /api/invoices/507f1f77bcf86cd799439011/download  → Download PDF
// GET    /api/invoices/507f1f77bcf86cd799439011/view      → View invoice
// GET    /api/invoices/order/507f1f77bcf86cd799439011     → Get by order ID
// GET    /api/invoices/507f1f77bcf86cd799439011           → Get invoice details
// GET    /api/invoices/                                   → Get all invoices
// PUT    /api/invoices/507f1f77bcf86cd799439011/payment   → Update payment
// PUT    /api/invoices/507f1f77bcf86cd799439011/cancel    → Cancel invoice