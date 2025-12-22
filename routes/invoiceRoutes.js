// routes/invoiceRoutes.js - COMPLETE WITH DELETE
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
  deleteInvoice, // ← Add this import
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
  console.log('🔍 Invoice Route Hit:', req.method, req.originalUrl);
  console.log('📦 Params:', req.params);
  console.log('👤 User:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');
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

// 2. Download PDF
router.get('/:id/download', downloadInvoice);

// 3. View invoice PDF inline
router.get('/:id/view', viewInvoice);

// 4. Get invoice by order ID
router.get('/order/:orderId', getInvoiceByOrderId);

// 5. Update payment status (admin only)
router.put('/:id/payment', authorize('admin'), updatePaymentStatus);

// 6. Cancel invoice (admin only)
router.put('/:id/cancel', authorize('admin'), cancelInvoice);

// 7. Delete invoice (admin only) 
router.delete('/:id', authorize('admin'), deleteInvoice);

// 8. Get all invoices (admin only)
router.get('/', authorize('admin'), getAllInvoices);

// 9. Get single invoice by ID (admin only)
router.get('/:id', authorize('admin'), getInvoiceById);

module.exports = router;