const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Invoice = require('../models/Invoice');
const smsService = require('../services/smsService'); // ✅ FIXED: Changed from ../utils to ../services

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      deliveryAddress,
      orderDateTime,
      advancePayment,
      paymentMethod,
      specialInstructions,
    } = req.body;

    // Validate order items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const menuItem = await Menu.findById(item.menuItem);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item ${item.menuItem} not found`,
        });
      }

      if (!menuItem.isAvailable) {
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

    // Create order
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

    // Populate menu items
    await order.populate('orderItems.menuItem');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
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
    next(error);
  }
};

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
    next(error);
  }
};

// ADD THIS FUNCTION - Get invoice for order
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
    next(error);
  }
};