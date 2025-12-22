// controllers/orderController.js - With enhanced debugging
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Invoice = require('../models/Invoice');
const smsService = require('../services/smsService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    console.log('📝 Create order request received');
    console.log('User ID:', req.user?.id);
    console.log('User Name:', req.user?.name);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      orderItems,
      deliveryAddress,
      orderDateTime,
      advancePayment,
      paymentMethod,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!orderItems || orderItems.length === 0) {
      console.error('❌ No order items');
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
      });
    }

    if (!deliveryAddress) {
      console.error('❌ No delivery address');
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required',
      });
    }

    // Validate order items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    console.log(`🔍 Validating ${orderItems.length} items...`);

    for (const item of orderItems) {
      console.log(`Checking item: ${item.menuItem}`);
      const menuItem = await Menu.findById(item.menuItem);

      if (!menuItem) {
        console.error(`❌ Menu item not found: ${item.menuItem}`);
        return res.status(404).json({
          success: false,
          message: `Menu item ${item.menuItem} not found`,
        });
      }

      console.log(`✅ Found: ${menuItem.name}`);

      if (!menuItem.isAvailable) {
        console.error(`❌ Item unavailable: ${menuItem.name}`);
        return res.status(400).json({
          success: false,
          message: `${menuItem.name} is currently unavailable`,
        });
      }

      const subtotal = menuItem.price * item.quantity;
      totalAmount += subtotal;

      validatedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal,
      });
    }

    console.log(`✅ Items validated. Total: ₹${totalAmount}`);

    // Create order
    console.log('💾 Creating order...');
    const order = await Order.create({
      user: req.user.id,
      customerName: req.user.name,
      customerPhone: req.user.phone,
      customerEmail: req.user.email,
      orderItems: validatedItems,
      deliveryAddress,
      orderDateTime,
      totalAmount,
      advancePayment: advancePayment || 0,
      paymentMethod,
      specialInstructions,
    });

    console.log(`✅ Order created: ${order._id}`);

    // Populate menu items
    await order.populate('orderItems.menuItem');
    console.log('✅ Order populated');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Create order error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Get all orders (admin) or user orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only get user's orders
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    const orders = await Order.find(query)
      .populate('orderItems.menuItem')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('orderItems.menuItem')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Make sure user is order owner or admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    next(error);
  }
};

// @desc    Get orders by phone number
// @route   GET /api/orders/phone/:phone
// @access  Private
exports.getOrdersByPhone = async (req, res, next) => {
  try {
    const { phone } = req.params;

    // Only allow users to get their own orders or admin to get any
    if (req.user.phone !== phone && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const orders = await Order.find({ customerPhone: phone })
      .populate('orderItems.menuItem')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders by phone error:', error);
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.orderStatus = orderStatus;

    // If order is delivered, set actual delivery time
    if (orderStatus === 'delivered') {
      order.actualDeliveryTime = Date.now();
    }

    // If order is cancelled, set cancelled time
    if (orderStatus === 'cancelled') {
      order.cancelledAt = Date.now();
      order.cancellationReason = req.body.cancellationReason;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order',
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this order',
      });
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = Date.now();
    order.cancellationReason = req.body.reason || 'Cancelled by user';

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    next(error);
  }
};

// @desc    Send order invoice via SMS
// @route   POST /api/orders/:id/send-invoice-sms
// @access  Private
exports.sendOrderInvoiceSMS = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Get invoice
    const invoice = await Invoice.findOne({ order: order._id });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Generate invoice URL
    const invoiceUrl = `${req.protocol}://${req.get('host')}/api/invoices/${invoice._id}/download`;
    
    // Send SMS
    const message = `Order #${order.orderNumber} Invoice: ${invoiceUrl} - Sachin Foods`;
    await smsService.sendSMS(order.customerPhone, message);

    res.status(200).json({
      success: true,
      message: 'Invoice sent via SMS',
      invoiceUrl,
    });
  } catch (error) {
    console.error('Send invoice SMS error:', error);
    next(error);
  }
};

// @desc    Get invoice for order
// @route   GET /api/orders/:id/invoice
// @access  Private
exports.getOrderInvoice = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const invoice = await Invoice.findOne({ order: order._id });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get order invoice error:', error);
    next(error);
  }
};

// @desc    Delete order permanently (Admin only) - Invoice remains intact
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // NO status check here → allows deletion of delivered & cancelled orders

    // Permanently delete ONLY the order
    await Order.findByIdAndDelete(req.params.id);

    // Invoice is NOT deleted → it stays forever

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully. Invoice preserved.',
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment-status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    console.log('💰 Update payment status:', req.params.id);
    
    const { paymentStatus } = req.body;

    // Validate payment status
    const validStatuses = ['pending', 'partial', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update payment status
    order.paymentStatus = paymentStatus;

    // If marking as completed, set advance payment to total
    if (paymentStatus === 'completed') {
      order.advancePayment = order.totalAmount;
      order.remainingAmount = 0;
    }

    await order.save();

    console.log('✅ Payment status updated:', paymentStatus);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: order,
    });
  } catch (error) {
    console.error('❌ Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
    });
  }
};
