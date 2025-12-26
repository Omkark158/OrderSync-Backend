// controllers/paymentController.js - FIXED: Don't auto-confirm before payment
const Order = require('../models/Order');
const razorpayService = require('../services/razorpayService');
const { sendSMS } = require('../services/smsService');
const config = require('../config/env');

// ============================================
// @desc    Create Razorpay payment order
// @route   POST /api/payments/create-order
// @access  Private
// ============================================
exports.createPaymentOrder = async (req, res) => {
  console.log('🔄 Creating payment order...');
  
  try {
    const { orderNumber, amount, paymentType } = req.body;

    if (!orderNumber || !amount || !paymentType) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderNumber, amount, paymentType',
      });
    }

    if (!['advance', 'full', 'remaining'].includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment type. Must be: advance, full, or remaining',
      });
    }

    const order = await Order.findOne({ orderNumber }).populate('user');
    
    if (!order) {
      console.log('❌ Order not found:', orderNumber);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      console.log('❌ Unauthorized access attempt');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this payment',
      });
    }

    const totalAmount = order.totalAmount;
    const paidAmount = order.advancePayment || 0;
    const remainingAmount = totalAmount - paidAmount;

    console.log('💰 Payment Details:', {
      orderNumber,
      totalAmount,
      paidAmount,
      remainingAmount,
      requestedAmount: amount,
      paymentType
    });

    // Validate payment amounts
    if (paymentType === 'full') {
      if (paidAmount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Order already has partial payment. Use "remaining" payment type.',
        });
      }
      if (amount !== totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Full payment must be exactly ₹${totalAmount}`,
        });
      }
    }

    if (paymentType === 'remaining') {
      if (paidAmount === 0) {
        return res.status(400).json({
          success: false,
          message: 'No advance payment found. Use "full" payment type.',
        });
      }
      if (amount !== remainingAmount) {
        return res.status(400).json({
          success: false,
          message: `Remaining payment must be exactly ₹${remainingAmount}`,
        });
      }
    }

    if (paymentType === 'advance') {
      if (paidAmount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Advance payment already made. Use "remaining" to pay balance.',
        });
      }
      
      const minAdvance = 1;
      const maxAdvance = totalAmount - 1;
      
      if (amount < minAdvance || amount >= totalAmount) {
        return res.status(400).json({
          success: false,
          message: `Advance payment must be between ₹${minAdvance} and ₹${maxAdvance}`,
        });
      }
    }

    // Create Razorpay order
    console.log('📝 Creating Razorpay order for amount:', amount);
    const razorpayOrder = await razorpayService.createRazorpayOrder(amount);

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        razorpay_order_id: razorpayOrder.id,
        amount: razorpayOrder.amount / 100,
        currency: razorpayOrder.currency,
        key_id: config.razorpay.key_id,
        order: {
          orderNumber: order.orderNumber,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          remainingAmount: remainingAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail
        }
      },
    });
  } catch (error) {
    console.error('❌ Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private
// ============================================
exports.verifyPayment = async (req, res) => {
  console.log('🔍 Verifying payment...');
  
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderNumber,
      amount,
      paymentType 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderNumber || !amount || !paymentType) {
      console.log('❌ Missing payment verification details');
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data',
      });
    }

    // Verify signature
    console.log('🔐 Verifying signature...');
    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.log('❌ Invalid payment signature');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature',
      });
    }

    console.log('✅ Signature verified successfully');

    // Find order
    const order = await Order.findOne({ orderNumber }).populate('user');
    
    if (!order) {
      console.log('❌ Order not found:', orderNumber);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      console.log('❌ Unauthorized access');
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check duplicate payment
    if (!order.paymentTransactions) {
      order.paymentTransactions = [];
    }

    const existingTransaction = order.paymentTransactions.find(
      t => t.razorpayPaymentId === razorpay_payment_id
    );

    if (existingTransaction) {
      console.log('⚠️ Payment already recorded');
      return res.status(200).json({
        success: true,
        message: 'Payment already recorded',
        data: { order }
      });
    }

    // Record transaction
    const transaction = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: parseFloat(amount),
      paymentType: paymentType,
      status: 'success',
      timestamp: new Date(),
      smsNotificationSent: false
    };

    order.paymentTransactions.push(transaction);

    // Update payment amounts
    const previousAdvance = order.advancePayment || 0;
    order.advancePayment = previousAdvance + parseFloat(amount);
    order.remainingAmount = order.totalAmount - order.advancePayment;

    // Update payment status
    if (order.advancePayment >= order.totalAmount) {
      order.paymentStatus = 'completed';
      order.paymentMethod = 'online';
      order.advancePayment = order.totalAmount;
      order.remainingAmount = 0;
    } else if (order.advancePayment > 0) {
      order.paymentStatus = 'partial';
      order.paymentMethod = 'online';
    }

    // ✅ FIX: ONLY auto-confirm if order is pending
    // Don't show "Order placed successfully" - payment is what succeeded
    if (order.orderStatus === 'pending') {
      order.orderStatus = 'confirmed';
      order.confirmedAt = Date.now();
      console.log('✅ Order auto-confirmed after payment');
    }

    await order.save();

    console.log('✅ Order updated:', {
      orderNumber: order.orderNumber,
      advancePayment: order.advancePayment,
      remainingAmount: order.remainingAmount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus
    });

    // Send SMS notifications
    try {
      await sendPaymentNotifications(order, amount, paymentType);
      
      const lastTransaction = order.paymentTransactions[order.paymentTransactions.length - 1];
      lastTransaction.smsNotificationSent = true;
      await order.save();
      
      console.log('✅ SMS notifications sent');
    } catch (smsError) {
      console.error('⚠️ SMS notification error:', smsError.message);
    }

    // ✅ Return success with proper message
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully', // Don't say "order placed"
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          advancePayment: order.advancePayment,
          remainingAmount: order.remainingAmount,
          paymentTransactions: order.paymentTransactions,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          orderDateTime: order.orderDateTime
        }
      },
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// @desc    Handle payment failure
// @route   POST /api/payments/failure
// @access  Private
// ============================================
exports.handlePaymentFailure = async (req, res) => {
  console.log('⚠️ Handling payment failure...');
  
  try {
    const { razorpay_order_id, orderNumber, error } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required'
      });
    }

    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.paymentTransactions) {
      order.paymentTransactions = [];
    }

    // Record failed transaction
    order.paymentTransactions.push({
      razorpayOrderId: razorpay_order_id,
      status: 'failed',
      timestamp: new Date(),
      failureReason: error?.description || error?.reason || 'Payment failed'
    });

    await order.save();

    console.log('✅ Payment failure recorded for order:', orderNumber);

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    console.error('❌ Handle failure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// @desc    Get payment history for an order
// @route   GET /api/payments/order/:orderNumber
// @access  Private
// ============================================
exports.getPaymentByOrderNumber = async (req, res) => {
  console.log('📋 Fetching payments for order:', req.params.orderNumber);
  
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .select('paymentTransactions totalAmount advancePayment remainingAmount paymentStatus paymentMethod user orderNumber customerName customerPhone');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user && order.user.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these payments',
      });
    }

    const transactions = order.paymentTransactions || [];

    console.log(`✅ Found ${transactions.length} payment transactions`);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: {
        orderNumber: orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        paidAmount: order.advancePayment || 0,
        remainingAmount: order.remainingAmount || 0,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        transactions: transactions
      },
    });
  } catch (error) {
    console.error('❌ Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// HELPER: Send Payment SMS Notifications
// ============================================
async function sendPaymentNotifications(order, amount, paymentType) {
  const adminPhones = config.admin_phone
    ? config.admin_phone.split(',').map(p => p.trim())
    : ['9539387240', '9388808825'];

  let customerMessage = '';
  let adminMessage = '';

  const formattedAmount = parseFloat(amount).toFixed(2);
  const formattedRemaining = order.remainingAmount.toFixed(2);
  const formattedPaid = order.advancePayment.toFixed(2);

  if (paymentType === 'advance' || order.paymentStatus === 'partial') {
    customerMessage = `Payment Received! ✓\n\nHi ${order.customerName}!\n\nAdvance payment of ₹${formattedAmount} received for order ${order.orderNumber}.\n\nBalance Due: ₹${formattedRemaining}\n(Pay balance on pickup)\n\nThank you!\n\nSachin Foods, Kundara\n9539387240, 9388808825`;
    
    adminMessage = `💰 Payment Alert!\n\nOrder: ${order.orderNumber}\nCustomer: ${order.customerName} (${order.customerPhone})\nAmount Paid: ₹${formattedAmount}\nType: Advance Payment\nBalance Due: ₹${formattedRemaining}\n\n- Sachin Foods System`;
  } else {
    customerMessage = `Payment Received! ✓\n\nHi ${order.customerName}!\n\nPayment of ₹${formattedAmount} received for order ${order.orderNumber}.\n\nPayment Status: COMPLETED\n\nThank you!\n\nSachin Foods, Kundara\n9539387240, 9388808825`;
    
    adminMessage = `💰 Payment Alert!\n\nOrder: ${order.orderNumber}\nCustomer: ${order.customerName} (${order.customerPhone})\nAmount: ₹${formattedAmount}\nType: Full Payment\nTotal Paid: ₹${formattedPaid}\nPayment Complete ✓\n\n- Sachin Foods System`;
  }

  // Send to customer
  if (order.customerPhone) {
    try {
      await sendSMS(order.customerPhone, customerMessage);
      console.log(`📱 Customer SMS sent to: ${order.customerPhone}`);
    } catch (error) {
      console.error(`❌ Failed to send SMS to customer: ${error.message}`);
    }
  }

  // Send to admins
  for (const adminPhone of adminPhones) {
    if (adminPhone) {
      try {
        await sendSMS(adminPhone, adminMessage);
        console.log(`📱 Admin SMS sent to: ${adminPhone}`);
      } catch (error) {
        console.error(`❌ Failed to send SMS to admin ${adminPhone}: ${error.message}`);
      }
    }
  }
}