// routes/smsRoutes.js - COMPLETE FINAL VERSION
const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const { protect, authorize } = require('../middleware/auth');

// ============================================
// Admin Notifications
// ============================================

router.post('/admin-notification', protect, async (req, res) => {
  try {
    const { orderNumber, customerName, totalAmount, orderDateTime } = req.body;
    
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
    
    console.log('Admin notifications sent:', results);
    
    res.json({ 
      success: true, 
      message: 'Admin notified',
      sent: results.filter(r => r.success).length,
      total: adminPhones.length
    });
  } catch (error) {
    console.error('Admin notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to send admin notification' });
  }
});

// ============================================
// Customer Notifications
// ============================================

router.post('/order-confirmed', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, orderNumber, deliveryDate, customerName } = req.body;
    
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
      console.log('Order confirmation SMS sent to:', phone);
      res.json({ success: true, message: 'Customer notified of order confirmation' });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Order confirmation SMS error:', error);
    res.status(500).json({ success: false, message: 'Failed to send confirmation SMS' });
  }
});

router.post('/order-denied', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, orderNumber, reason, customerName } = req.body;
    
    const message = `Order Status Update\n\nHi ${customerName}, we're sorry but we cannot process order ${orderNumber} at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}For assistance, please call:\n9539387240, 9388808825\n\nSachin Foods, Kundara`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('Order denial SMS sent to:', phone);
      res.json({ success: true, message: 'Customer notified of order denial' });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Order denial SMS error:', error);
    res.status(500).json({ success: false, message: 'Failed to send denial SMS' });
  }
});

router.post('/order-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, orderNumber, status, customerName } = req.body;
    
    const statusMessages = {
      preparing: `Order Update\n\nHi ${customerName}! We're preparing fresh food for your order ${orderNumber}.\n\nExpected delivery as scheduled.\n\nSachin Foods, Kundara\n9539387240`,
      ready: `Order Ready!\n\nHi ${customerName}! Your order ${orderNumber} is ready and will be delivered on time.\n\nFresh Chappathy, Appam & more!\n\nSachin Foods\n9539387240`,
      delivered: `Order Delivered!\n\nThank you ${customerName} for choosing Sachin Foods!\n\nOrder ${orderNumber} delivered.\n\nHope you enjoyed our Chappathy, Appam & bakery items!\n\n9539387240, 9388808825`,
    };
    
    const message = statusMessages[status] || `Order ${orderNumber} status: ${status}\n\nSachin Foods\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log(`Status update SMS (${status}) sent to:`, phone);
      res.json({ success: true, message: `Customer notified of ${status} status` });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Status update SMS error:', error);
    res.status(500).json({ success: false, message: 'Failed to send status update SMS' });
  }
});

// FIXED: Route path changed to /send-invoice to match frontend
// @desc    Send invoice link via SMS
// @route   POST /api/sms/send-invoice
// @access  Private/Admin
router.post('/send-invoice', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, orderNumber, invoiceUrl, customerName, totalAmount } = req.body;
    
    const message = `Invoice Ready\n\nHi ${customerName}!\n\nYour invoice for Order ${orderNumber} is ready.\n\nTotal: ₹${totalAmount}\n\nDownload: ${invoiceUrl}\n\nThank you!\nSachin Foods, Kundara\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('Invoice SMS sent to:', phone);
      res.json({ success: true, message: 'Invoice SMS sent successfully' });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Invoice SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send invoice SMS',
      error: error.message 
    });
  }
});

router.post('/payment-confirmation', protect, async (req, res) => {
  try {
    const { phone, amount, orderNumber, customerName, balance } = req.body;
    
    const message = `Payment Received\n\nHi ${customerName}!\n\nPayment of ₹${amount} received for order ${orderNumber}.\n\n${balance > 0 ? `Balance: ₹${balance}\n\n` : ''}Thank you!\n\nSachin Foods, Kundara\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('Payment confirmation SMS sent to:', phone);
      res.json({ success: true, message: 'Payment confirmation sent' });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Payment confirmation SMS error:', error);
    res.status(500).json({ success: false, message: 'Failed to send payment confirmation' });
  }
});

router.post('/delivery-reminder', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, orderNumber, deliveryDate, customerName } = req.body;
    
    const formattedDate = new Date(deliveryDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const message = `Delivery Reminder\n\nHi ${customerName}!\n\nYour order ${orderNumber} is scheduled for delivery on ${formattedDate}.\n\nWe're ready with fresh food!\n\nSachin Foods, Kundara\n9539387240`;
    
    const result = await smsService.sendSMS(phone, message);
    
    if (result.success) {
      console.log('Delivery reminder SMS sent to:', phone);
      res.json({ success: true, message: 'Delivery reminder sent' });
    } else {
      throw new Error('SMS sending failed');
    }
  } catch (error) {
    console.error('Delivery reminder SMS error:', error);
    res.status(500).json({ success: false, message: 'Failed to send delivery reminder' });
  }
});

router.post('/test', protect, authorize('admin'), async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone and message are required'
      });
    }
    
    const result = await smsService.sendSMS(phone, message);
    
    res.json({ 
      success: result.success, 
      message: result.message,
      details: result
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({ success: false, message: 'Test SMS failed' });
  }
});

module.exports = router;