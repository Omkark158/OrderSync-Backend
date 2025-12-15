const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const { generateInvoicePDF } = require('../services/invoiceService');

// @desc    Generate invoice for an order
// @route   POST /api/invoices/generate/:orderId
// @access  Private/Admin
exports.generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { billingAddress, shippingAddress, customerGSTIN, notes } = req.body;

    // Find order
    const order = await Order.findById(orderId).populate('orderItems.menuItem');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ order: orderId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already generated for this order',
        data: existingInvoice,
      });
    }

    // Prepare invoice items
    const items = order.orderItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.subtotal,
    }));

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    // Determine if customer is in Kerala (for CGST+SGST vs IGST)
    const isKeralaCustomer = shippingAddress?.state?.toLowerCase() === 'kerala';
    
    // Calculate GST (assuming 5% GST on food items)
    const gstRate = 5; // 5% GST
    let taxDetails = {
      isTaxable: subtotal > 0,
      cgst: { rate: 0, amount: 0 },
      sgst: { rate: 0, amount: 0 },
      igst: { rate: 0, amount: 0 },
      totalTax: 0,
    };

    if (subtotal > 0) {
      if (isKeralaCustomer) {
        // CGST + SGST for intra-state
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmount = (subtotal * cgstRate) / 100;
        const sgstAmount = (subtotal * sgstRate) / 100;
        
        taxDetails.cgst = { rate: cgstRate, amount: cgstAmount };
        taxDetails.sgst = { rate: sgstRate, amount: sgstAmount };
        taxDetails.totalTax = cgstAmount + sgstAmount;
      } else {
        // IGST for inter-state
        const igstAmount = (subtotal * gstRate) / 100;
        taxDetails.igst = { rate: gstRate, amount: igstAmount };
        taxDetails.totalTax = igstAmount;
      }
    }

    const totalAmount = subtotal + taxDetails.totalTax;

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
      taxDetails,
      totalAmount,
      receivedAmount: order.advancePayment,
      invoiceType: taxDetails.totalTax > 0 ? 'tax_invoice' : 'bill_of_supply',
      notes: notes || "Don't waste food",
      deliveryDate: order.orderDateTime,
      status: 'draft',
    });

    // Generate PDF
    try {
      const pdfResult = await generateInvoicePDF(invoice);
      invoice.pdfPath = pdfResult.path;
      invoice.pdfUrl = pdfResult.url;
      invoice.status = 'sent';
      invoice.sentAt = Date.now();
      await invoice.save();
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Invoice created but PDF failed - still return success
    }

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('order')
      .populate('user', 'name email phone');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check if user owns invoice or is admin
    if (invoice.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice by order ID
// @route   GET /api/invoices/order/:orderId
// @access  Private
exports.getInvoiceByOrderId = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ order: req.params.orderId })
      .populate('order')
      .populate('user', 'name email phone');

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
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices (admin) or user invoices
// @route   GET /api/invoices
// @access  Private
exports.getAllInvoices = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only get user's invoices
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by payment status if provided
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Filter by date range if provided
    if (req.query.startDate || req.query.endDate) {
      query.invoiceDate = {};
      if (req.query.startDate) {
        query.invoiceDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.invoiceDate.$lte = new Date(req.query.endDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('order', 'orderNumber orderStatus')
      .populate('user', 'name phone')
      .sort({ invoiceDate: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice payment status
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
      message: 'Payment status updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/download
// @access  Private
exports.downloadInvoice = async (req, res, next) => {
  try {
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

    if (!invoice.pdfPath) {
      // Generate PDF if not exists
      const pdfResult = await generateInvoicePDF(invoice);
      invoice.pdfPath = pdfResult.path;
      invoice.pdfUrl = pdfResult.url;
      await invoice.save();
    }

    // Send file
    res.download(invoice.pdfPath, `invoice_${invoice.invoiceNumber}.pdf`);
  } catch (error) {
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
      message: 'Invoice cancelled successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};