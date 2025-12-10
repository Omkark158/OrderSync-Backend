const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { createRazorpayOrder, verifyPaymentSignature } = require('../services/razorpayService');
const config = require('../config/env');

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId, amount, paymentType } = req.body;

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(amount);

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      user: req.user.id,
      amount,
      paymentType: paymentType || 'full',
      razorpay_order_id: razorpayOrder.id,
      receipt: razorpayOrder.receipt,
      status: 'created',
      customerEmail: req.user.email,
      customerPhone: req.user.phone,
    });

    res.status(200).json({
      success: true,
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: config.razorpay.key_id,
        payment_id: payment._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Find payment record
    const payment = await Payment.findOne({ razorpay_order_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      payment.status = 'failed';
      payment.failureReason = 'Invalid signature';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Update payment record
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.razorpay_signature = razorpay_signature;
    payment.status = 'captured';
    payment.paidAt = Date.now();
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.order);
    if (payment.paymentType === 'full') {
      order.advancePayment = payment.amount;
      order.paymentStatus = 'completed';
    } else if (payment.paymentType === 'advance') {
      order.advancePayment += payment.amount;
      order.paymentStatus = order.advancePayment >= order.totalAmount ? 'completed' : 'partial';
    }
    order.orderStatus = 'confirmed';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        payment,
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Verify order belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const payments = await Payment.find({ order: orderId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for user
// @route   GET /api/payments
// @access  Private
exports.getUserPayments = async (req, res, next) => {
  try {
    let query = {};

    // If not admin, only get user's payments
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const payments = await Payment.find(query)
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle payment failure
// @route   POST /api/payments/failure
// @access  Private
exports.handlePaymentFailure = async (req, res, next) => {
  try {
    const { razorpay_order_id, error } = req.body;

    const payment = await Payment.findOne({ razorpay_order_id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    payment.status = 'failed';
    payment.errorCode = error.code;
    payment.errorDescription = error.description;
    payment.failureReason = error.reason;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    next(error);
  }
};