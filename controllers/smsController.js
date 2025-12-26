// controllers/smsController.js - COMPLETE VERSION
const smsService = require('../services/smsService');
const config = require('../config/env');

// ============================================
// @desc    Send admin notification for new order
// @route   POST /api/sms/admin-notification
// @access  Private
// ============================================
exports.sendAdminNotification = async (req, res) => {
  try {
    const { orderNumber, customerName, totalAmount, orderDateTime } = req.body;
    
    if (!orderNumber || !customerName || !totalAmount || !orderDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const adminPhones = ['9539387240', '9388808825'];
    
    const deliveryDate = new Date(orderDateTime).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `New Order Alert!\n\nOrder: ${orderNumber}\nCustomer: ${customerName}\nAmount: ₹${totalAmount}\nDelivery: ${deliveryDate}\n\nLogin: sachinfoodskundara.com/admin/orders`;
    
    const results = await Promise.all(
      adminPhones.map(phone => smsService.sendSMS(phone, message))
    );
    
    console.log('✅ Admin notifications sent:', results);
    
    res.json({ 
      success: true, 
      message: 'Admin notified successfully',
      sent: results.filter(r => r.success).length,
      total: adminPhones.length
    });
  } catch (error) {
    console.error('❌ Admin notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send admin notification',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send order confirmation SMS to customer
// @route   POST /api/sms/order-confirmed
// @access  Private/Admin
// ============================================
exports.sendOrderConfirmation = async (req, res) => {
  try {
    const { phone, orderNumber, deliveryDate, customerName } = req.body;
    
    if (!phone || !orderNumber || !deliveryDate || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `Order Confirmed!\n\nHi ${customerName}, your order ${orderNumber} has been confirmed by Sachin Foods.\n\nDelivery: ${formattedDate}\n\nWe'll prepare fresh Chappathy, Appam & more!\n\nContact: 9539387240, 9388808825`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('✅ Order confirmation SMS sent to:', phone);
      res.json({ 
        success: true, 
        message: 'Customer notified of order confirmation' 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Order confirmation SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send confirmation SMS',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send order denial/cancellation SMS
// @route   POST /api/sms/order-denied
// @access  Private/Admin
// ============================================
exports.sendOrderDenial = async (req, res) => {
  try {
    const { phone, orderNumber, reason, customerName } = req.body;
    
    if (!phone || !orderNumber || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const message = `Order Status Update\n\nHi ${customerName}, we're sorry but we cannot process order ${orderNumber} at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}For assistance, please call:\n9539387240, 9388808825\n\nSachin Foods, Kundara`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('✅ Order denial SMS sent to:', phone);
      res.json({ 
        success: true, 
        message: 'Customer notified of order denial' 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Order denial SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send denial SMS',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send order status update SMS
// @route   POST /api/sms/order-status
// @access  Private/Admin
// ============================================
exports.sendOrderStatusUpdate = async (req, res) => {
  try {
    const { phone, orderNumber, status, customerName } = req.body;
    
    if (!phone || !orderNumber || !status || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const statusMessages = {
      confirmed: `Order Confirmed!\n\nHi ${customerName}! Your order ${orderNumber} has been confirmed.\n\nWe'll prepare fresh food for you!\n\nSachin Foods, Kundara\n9539387240`,
      preparing: `Order Update\n\nHi ${customerName}! We're preparing fresh food for your order ${orderNumber}.\n\nExpected delivery as scheduled.\n\nSachin Foods, Kundara\n9539387240`,
      ready: `Order Ready!\n\nHi ${customerName}! Your order ${orderNumber} is ready and will be delivered on time.\n\nFresh Chappathy, Appam & more!\n\nSachin Foods\n9539387240`,
      delivered: `Order Delivered!\n\nThank you ${customerName} for choosing Sachin Foods!\n\nOrder ${orderNumber} delivered.\n\nHope you enjoyed our Chappathy, Appam & bakery items!\n\n9539387240, 9388808825`,
      cancelled: `Order Cancelled\n\nOrder ${orderNumber} has been cancelled.\n\nFor assistance contact:\n9539387240, 9388808825\n\nSachin Foods, Kundara`,
    };
    
    const message = statusMessages[status] || `Order ${orderNumber} status: ${status}\n\nSachin Foods\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log(`✅ Status update SMS (${status}) sent to:`, phone);
      res.json({ 
        success: true, 
        message: `Customer notified of ${status} status` 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Status update SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send status update SMS',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send invoice link via SMS
// @route   POST /api/sms/send-invoice
// @access  Private/Admin
// ============================================
exports.sendInvoiceLink = async (req, res) => {
  try {
    const { phone, orderNumber, invoiceUrl, customerName, totalAmount } = req.body;
    
    if (!phone || !orderNumber || !invoiceUrl || !customerName || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const message = `Invoice Ready\n\nHi ${customerName}!\n\nYour invoice for Order ${orderNumber} is ready.\n\nTotal: ₹${totalAmount}\n\nDownload: ${invoiceUrl}\n\nThank you!\nSachin Foods, Kundara\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('✅ Invoice SMS sent to:', phone);
      res.json({ 
        success: true, 
        message: 'Invoice SMS sent successfully' 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Invoice SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send invoice SMS',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send payment confirmation SMS
// @route   POST /api/sms/payment-confirmation
// @access  Private
// ============================================
exports.sendPaymentConfirmation = async (req, res) => {
  try {
    const { phone, orderNumber, amount, paymentType, remainingAmount, customerName } = req.body;

    if (!phone || !orderNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phone, orderNumber, amount',
      });
    }

    const name = customerName || 'Customer';
    let message = '';
    
    if (paymentType === 'full' || remainingAmount === 0) {
      // Full payment message
      message = `Payment Received! ✓\n\nHi ${name}!\n\nPayment of ₹${amount} received for order ${orderNumber}.\n\nPayment Status: COMPLETED\n\nThank you!\n\nSachin Foods, Kundara\n9539387240, 9388808825`;
    } else {
      // Advance payment message
      message = `Advance Payment Received! ✓\n\nHi ${name}!\n\nAdvance payment of ₹${amount} received for order ${orderNumber}.\n\nBalance Due: ₹${remainingAmount}\n(Pay balance on pickup)\n\nThank you!\n\nSachin Foods, Kundara\n9539387240, 9388808825`;
    }

    // Send to Customer
    const customerResult = await smsService.sendSMS(phone, message);

    // Send notification to Admin
    const adminPhones = ['9539387240', '9388808825'];
    const adminMessage = `💰 Payment Alert!\n\nOrder: ${orderNumber}\nCustomer: ${phone}\nAmount: ₹${amount}\nType: ${paymentType === 'full' ? 'Full Payment' : 'Advance Payment'}\n${remainingAmount > 0 ? `Balance: ₹${remainingAmount}` : 'Payment Complete ✓'}\n\n- Sachin Foods System`;

    await Promise.all(
      adminPhones.map(adminPhone => smsService.sendSMS(adminPhone, adminMessage))
    );

    if (customerResult.success) {
      console.log('✅ Payment confirmation SMS sent to:', phone);
      res.status(200).json({
        success: true,
        message: 'Payment confirmation SMS sent',
        data: customerResult,
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Payment SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send payment confirmation SMS',
      error: error.message,
    });
  }
};

// ============================================
// @desc    Send delivery reminder SMS
// @route   POST /api/sms/delivery-reminder
// @access  Private/Admin
// ============================================
exports.sendDeliveryReminder = async (req, res) => {
  try {
    const { phone, orderNumber, deliveryDate, customerName } = req.body;
    
    if (!phone || !orderNumber || !deliveryDate || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `Delivery Reminder\n\nHi ${customerName}!\n\nYour order ${orderNumber} is scheduled for delivery on ${formattedDate}.\n\nWe're ready with fresh food!\n\nSachin Foods, Kundara\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('✅ Delivery reminder SMS sent to:', phone);
      res.json({ 
        success: true, 
        message: 'Delivery reminder sent' 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Delivery reminder SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send delivery reminder',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send test SMS (Admin only)
// @route   POST /api/sms/test
// @access  Private/Admin
// ============================================
exports.sendTestSMS = async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone and message are required'
      });
    }
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('✅ Test SMS sent to:', phone);
      res.json({ 
        success: true, 
        message: 'Test SMS sent successfully',
        details: result
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Test SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test SMS failed',
      error: error.message 
    });
  }
};

// ============================================
// @desc    Send OTP via SMS
// @route   POST /api/sms/send-otp
// @access  Public
// ============================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone, otp, purpose } = req.body;
    
    if (!phone || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Phone, OTP, and purpose are required',
      });
    }

    let message = '';
    
    if (purpose === 'signup') {
      message = `Welcome to Sachin Foods, Kundara! Your signup OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    } else if (purpose === 'login') {
      message = `Your Sachin Foods login OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    } else {
      message = `Your Sachin Foods OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    }

    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log(`✅ ${purpose} OTP sent to:`, phone);
      res.json({ 
        success: true, 
        message: 'OTP sent successfully' 
      });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP',
      error: error.message 
    });
  }
};