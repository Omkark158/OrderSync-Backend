// controllers/invoiceController.js - COMPLETE FIXED VERSION
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const { generateInvoicePDF } = require('../services/invoiceService');
const path = require('path');
const fs = require('fs');

// ========================================
// @desc    Generate invoice for an order
// @route   POST /api/invoices/generate/:orderId
// @access  Private/Admin
// ========================================
exports.generateInvoice = async (req, res) => {
  console.log('🔄 Generate Invoice - Order ID:', req.params.orderId);
  
  try {
    const { orderId } = req.params;
    const { billingAddress, shippingAddress, customerGSTIN, notes } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ order: orderId });
    if (existingInvoice) {
      console.log('⚠️ Invoice already exists:', existingInvoice.invoiceNumber);
      return res.status(400).json({
        success: false,
        message: 'Invoice already generated for this order',
        data: existingInvoice,
      });
    }

    // Create invoice items from order
    const items = order.orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.subtotal,
    }));

    // Calculate totals
    const subtotal = order.totalAmount;
    const totalAmount = order.totalAmount;

    // Determine invoice type
    let invoiceType = 'bill_of_supply';
    if (customerGSTIN) {
      invoiceType = 'tax_invoice';
    }

    // Create invoice
    const invoice = await Invoice.create({
      order: orderId,
      user: order.user,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerGSTIN: customerGSTIN || '',
      billingAddress: billingAddress || order.deliveryAddress,
      shippingAddress: shippingAddress || order.deliveryAddress,
      items,
      subtotal,
      totalAmount,
      receivedAmount: order.advancePayment || 0,
      balance: totalAmount - (order.advancePayment || 0),
      invoiceType,
      notes: notes || "Don't waste food",
      deliveryDate: order.orderDateTime,
      status: 'sent',
      sentAt: Date.now(),
    });

    console.log('✅ Invoice created:', invoice.invoiceNumber);

    // Generate PDF
    try {
      const pdfResult = await generateInvoicePDF(invoice);
      invoice.pdfUrl = pdfResult.url;
      invoice.pdfPath = pdfResult.path;
      await invoice.save();
      console.log('✅ PDF generated:', pdfResult.fileName);
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError);
      // Continue even if PDF fails
    }

    // Update order
    order.invoiceGenerated = true;
    order.invoice = invoice._id;
    await order.save();

    console.log('✅ Order updated with invoice');

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

// ========================================
// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
// ========================================
exports.getInvoiceById = async (req, res) => {
  console.log('🔍 Get Invoice by ID:', req.params.id);
  
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('order')
      .populate('user', 'name email phone');

    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    console.log('✅ Invoice found:', invoice.invoiceNumber);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('❌ Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
    });
  }
};

// ========================================
// @desc    Get invoice by order ID
// @route   GET /api/invoices/order/:orderId
// @access  Private
// ========================================
exports.getInvoiceByOrderId = async (req, res) => {
  console.log('🔍 Get Invoice by Order ID:', req.params.orderId);
  
  try {
    const invoice = await Invoice.findOne({ order: req.params.orderId })
      .populate('order')
      .populate('user', 'name email phone');

    if (!invoice) {
      console.log('❌ Invoice not found for order:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order',
      });
    }

    console.log('✅ Invoice found:', invoice.invoiceNumber);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('❌ Get invoice by order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
    });
  }
};

// ========================================
// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
// ========================================
exports.getAllInvoices = async (req, res) => {
  console.log('📋 Get All Invoices');
  
  try {
    const { status, paymentStatus, startDate, endDate } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('order', 'orderNumber orderStatus')
      .populate('user', 'name email phone')
      .sort({ invoiceDate: -1 });

    console.log(`✅ Found ${invoices.length} invoices`);

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error('❌ Get all invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
    });
  }
};

// ========================================
// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
// ========================================
exports.downloadInvoice = async (req, res) => {
  console.log('📥 Download Invoice:', req.params.id);
  
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      console.log('❌ PDF not found:', invoice.pdfPath);
      
      // Try to regenerate PDF
      try {
        const pdfResult = await generateInvoicePDF(invoice);
        invoice.pdfUrl = pdfResult.url;
        invoice.pdfPath = pdfResult.path;
        await invoice.save();
        console.log('✅ PDF regenerated');
      } catch (pdfError) {
        console.error('❌ PDF regeneration failed:', pdfError);
        return res.status(500).json({
          success: false,
          message: 'PDF file not found and regeneration failed',
        });
      }
    }

    console.log('✅ Sending PDF:', invoice.pdfPath);

    res.download(invoice.pdfPath, `Invoice_${invoice.invoiceNumber}.pdf`, (err) => {
      if (err) {
        console.error('❌ Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download invoice',
        });
      }
    });
  } catch (error) {
    console.error('❌ Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice',
    });
  }
};

// ========================================
// @desc    View invoice PDF in browser
// @route   GET /api/invoices/:id/view
// @access  Private
// ========================================
exports.viewInvoice = async (req, res) => {
  console.log('👁️ View Invoice:', req.params.id);
  
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      console.log('❌ PDF not found:', invoice.pdfPath);
      
      // Try to regenerate PDF
      try {
        const pdfResult = await generateInvoicePDF(invoice);
        invoice.pdfUrl = pdfResult.url;
        invoice.pdfPath = pdfResult.path;
        await invoice.save();
        console.log('✅ PDF regenerated');
      } catch (pdfError) {
        console.error('❌ PDF regeneration failed:', pdfError);
        return res.status(500).json({
          success: false,
          message: 'PDF file not found and regeneration failed',
        });
      }
    }

    console.log('✅ Viewing PDF:', invoice.pdfPath);

    res.contentType('application/pdf');
    fs.createReadStream(invoice.pdfPath).pipe(res);
  } catch (error) {
    console.error('❌ View invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to view invoice',
    });
  }
};

// ========================================
// @desc    Update payment status
// @route   PUT /api/invoices/:id/payment
// @access  Private/Admin
// ========================================
exports.updatePaymentStatus = async (req, res) => {
  console.log('💰 Update Payment:', req.params.id);
  
  try {
    const { receivedAmount, paymentMethod, paymentNote } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    invoice.receivedAmount = receivedAmount;
    invoice.balance = invoice.totalAmount - receivedAmount;

    if (receivedAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
      invoice.paidAt = Date.now();
    } else if (receivedAmount > 0) {
      invoice.paymentStatus = 'partial';
    } else {
      invoice.paymentStatus = 'unpaid';
    }

    await invoice.save();

    console.log('✅ Payment updated:', invoice.paymentStatus);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: invoice,
    });
  } catch (error) {
    console.error('❌ Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
    });
  }
};

// ========================================
// @desc    Cancel invoice
// @route   PUT /api/invoices/:id/cancel
// @access  Private/Admin
// ========================================
exports.cancelInvoice = async (req, res) => {
  console.log('🚫 Cancel Invoice:', req.params.id);
  
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    invoice.status = 'cancelled';
    invoice.cancelledAt = Date.now();
    await invoice.save();

    console.log('✅ Invoice cancelled:', invoice.invoiceNumber);

    res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: invoice,
    });
  } catch (error) {
    console.error('❌ Cancel invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel invoice',
    });
  }
};


// ========================================
// @desc    Delete invoice (only if order is delivered)
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
// ========================================
exports.deleteInvoice = async (req, res) => {
  console.log('🗑️ Delete Invoice:', req.params.id);
  
  try {
    const invoice = await Invoice.findById(req.params.id).populate('order');
    
    if (!invoice) {
      console.log('❌ Invoice not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check if order exists and is delivered
    if (!invoice.order) {
      console.log('❌ Order not found for invoice:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice - associated order not found',
      });
    }

    if (invoice.order.orderStatus !== 'delivered') {
      console.log('❌ Order not delivered:', invoice.order.orderStatus);
      return res.status(403).json({
        success: false,
        message: 'Cannot delete invoice. Order must be delivered first.',
        currentStatus: invoice.order.orderStatus,
      });
    }

    // Delete PDF file if exists
    if (invoice.pdfPath && fs.existsSync(invoice.pdfPath)) {
      try {
        fs.unlinkSync(invoice.pdfPath);
        console.log('✅ PDF file deleted:', invoice.pdfPath);
      } catch (fileError) {
        console.error('⚠️ Failed to delete PDF file:', fileError);
      }
    }

    // Update order to remove invoice reference
    await Order.findByIdAndUpdate(invoice.order._id, {
      invoiceGenerated: false,
      invoice: null,
    });

    // Delete invoice
    await Invoice.findByIdAndDelete(req.params.id);

    console.log('✅ Invoice deleted:', invoice.invoiceNumber);

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
    });
  }
};