const crypto = require('crypto');
const getRazorpayInstance = require('../config/razorpay');
const config = require('../config/env');

// Create Razorpay order
exports.createRazorpayOrder = async (amount) => {
  try {
    const razorpay = getRazorpayInstance();

    const options = {
      amount: amount * 100, // Amount in paise (multiply by 100)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        description: 'OrderSync Payment',
      },
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create Razorpay order');
  }
};

// Verify Razorpay payment signature
exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', config.razorpay.key_secret)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// Fetch payment details from Razorpay
exports.fetchPaymentDetails = async (paymentId) => {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Capture payment (if authorized but not captured)
exports.capturePayment = async (paymentId, amount) => {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.capture(paymentId, amount * 100);
    return payment;
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error('Failed to capture payment');
  }
};

// Refund payment
exports.refundPayment = async (paymentId, amount = null) => {
  try {
    const razorpay = getRazorpayInstance();
    
    const options = amount ? { amount: amount * 100 } : {};
    const refund = await razorpay.payments.refund(paymentId, options);
    
    return refund;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw new Error('Failed to refund payment');
  }
};