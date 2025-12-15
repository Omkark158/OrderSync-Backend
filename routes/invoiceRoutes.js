const express = require('express');
const router = express.Router();
const {
  generateInvoice,
  getInvoiceById,
  getInvoiceByOrderId,
  getAllInvoices,
  updatePaymentStatus,
  downloadInvoice,
  cancelInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Invoice routes
router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);
router.get('/order/:orderId', getInvoiceByOrderId);
router.get('/:id/download', downloadInvoice);

// Admin only
router.post('/generate/:orderId', authorize('admin'), generateInvoice);
router.put('/:id/payment', authorize('admin'), updatePaymentStatus);
router.put('/:id/cancel', authorize('admin'), cancelInvoice);

module.exports = router;