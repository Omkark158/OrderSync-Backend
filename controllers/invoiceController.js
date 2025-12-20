// controllers/invoiceController.js - FIXED with proper binary streaming
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const invoiceService = require('../services/invoiceService');
const fs = require('fs');
const path = require('path');

// @desc    Generate invoice for order
// @route   POST /api/invoices/generate/:orderId
// @access  Private/Admin
exports.generateInvoice = async (req, res, next) => {
  try {
    console.log('📝 Generate invoice for order:', req.params.orderId);
    
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'name email phone')
      .populate('orderItems.menuItem');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if invoice already exists
    let invoice = await Invoice.findOne({ order: order._id });

    if (invoice) {
      console.log('ℹ️ Invoice already exists:', invoice.invoiceNumber);
      return res.status(200).json({
        success: true,
        message: 'Invoice already exists',
        data: invoice,
      });
    }

    // Prepare invoice data
    const invoiceData = {
      order: order._id,
      user: order.user._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      billingAddress: order.deliveryAddress,
      shippingAddress: order.deliveryAddress,
      deliveryDate: order.orderDateTime,
      
      items: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        rate: item.price,
        amount: item.subtotal,
      })),
      
      subtotal: order.totalAmount,
      totalAmount: order.totalAmount,
      receivedAmount: order.advancePayment || 0,
      
      invoiceType: order.totalAmount > 0 ? 'cash_sale' : 'bill_of_supply',
      
      taxDetails: order.gstDetails || {
        isTaxable: false,
        cgst: { rate: 0, amount: 0 },
        sgst: { rate: 0, amount: 0 },
        igst: { rate: 0, amount: 0 },
        totalTax: 0,
      },
    };

    console.log('💾 Creating invoice...');
    invoice = await Invoice.create(invoiceData);
    console.log('✅ Invoice created:', invoice.invoiceNumber);

    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfResult = await invoiceService.generateInvoicePDF(invoice);
    console.log('✅ PDF generated:', pdfResult.fileName);

    // Update invoice with PDF details
    invoice.pdfUrl = pdfResult.url;
    invoice.pdfPath = pdfResult.path;
    invoice.status = 'sent';
    invoice.sentAt = Date.now();
    await invoice.save();

    console.log('✅ Invoice generation complete');

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice,
    });
  } catch (error) {
    console.error('❌ Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate invoice',
    });
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getAllInvoices = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    const invoices = await Invoice.find(query)
      .populate('user', 'name email phone')
      .populate('order')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res, next) => {
  try {
    console.log('🔍 Getting invoice:', req.params.id);
    
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('order');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check authorization
    if (invoice.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    next(error);
  }
};

// @desc    Get invoice by order ID
// @route   GET /api/invoices/order/:orderId
// @access  Private
exports.getInvoiceByOrderId = async (req, res, next) => {
  try {
    console.log('🔍 Getting invoice for order:', req.params.orderId);
    
    const invoice = await Invoice.findOne({ order: req.params.orderId })
      .populate('user', 'name email phone')
      .populate('order');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order',
      });
    }

    // Check authorization
    if (invoice.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get invoice by order error:', error);
    next(error);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
exports.downloadInvoice = async (req, res, next) => {
  try {
    console.log('📥 Download invoice:', req.params.id);
    
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      console.error('❌ Invoice not found');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check authorization
    if (invoice.user.toString() !== req.user.id && req.user.role !== 'admin') {
      console.error('❌ Unauthorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if PDF exists
    if (!invoice.pdfPath) {
      console.error('❌ No PDF path');
      return res.status(404).json({
        success: false,
        message: 'PDF not generated yet',
      });
    }

    const pdfPath = path.resolve(invoice.pdfPath);
    console.log('📂 PDF path:', pdfPath);

    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found on disk');
      return res.status(404).json({
        success: false,
        message: 'PDF file not found. Please regenerate invoice.',
      });
    }

    const stat = fs.statSync(pdfPath);
    console.log('📊 File size:', stat.size, 'bytes');

    // Get filename
    const filename = `Invoice_${invoice.invoiceNumber}.pdf`;
    
    // ✅ Set headers for binary PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log('✅ Headers set, streaming file...');
    
    // Create read stream and pipe directly to response
    const readStream = fs.createReadStream(pdfPath);
    
    readStream.on('open', () => {
      console.log('✅ File stream opened');
    });
    
    readStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file',
        });
      }
    });
    
    readStream.on('end', () => {
      console.log('✅ File stream completed');
    });
    
    // Pipe the file stream to response
    readStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download invoice',
        error: error.message,
      });
    }
  }
};

// @desc    View invoice PDF in browser
// @route   GET /api/invoices/:id/view
// @access  Private
exports.viewInvoice = async (req, res, next) => {
  try {
    console.log('👁️ View invoice:', req.params.id);
    
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check authorization
    if (invoice.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found',
      });
    }

    const stat = fs.statSync(invoice.pdfPath);
    
    // ✅ Set headers for inline viewing (not download)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', stat.size);
    
    const readStream = fs.createReadStream(invoice.pdfPath);
    readStream.pipe(res);
    
    console.log('✅ Streaming for view');
    
  } catch (error) {
    console.error('❌ View error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to view invoice',
      });
    }
  }
};

// @desc    Update payment status
// @route   PUT /api/invoices/:id/payment
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { receivedAmount } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    invoice.receivedAmount = receivedAmount;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated',
      data: invoice,
    });
  } catch (error) {
    console.error('Update payment error:', error);
    next(error);
  }
};

// @desc    Cancel invoice
// @route   PUT /api/invoices/:id/cancel
// @access  Private/Admin
exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel paid invoice',
      });
    }

    invoice.status = 'cancelled';
    invoice.cancelledAt = Date.now();
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice cancelled',
      data: invoice,
    });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    next(error);
  }
};