const config = require('../config/env');

// Note: This is a template. You'll need to integrate with an actual SMS provider
// Popular options: Twilio, Fast2SMS, MSG91, AWS SNS

// Send SMS (template - needs actual SMS provider integration)
exports.sendSMS = async (phone, message) => {
  try {
    if (!config.sms.api_key) {
      console.warn('⚠️  SMS API key not configured');
      return { success: false, message: 'SMS service not configured' };
    }

    // TODO: Integrate with your SMS provider
    // Example for Twilio, Fast2SMS, MSG91, etc.
    
    console.log(`📱 SMS to ${phone}: ${message}`);
    
    // Simulate SMS sending for now
    return { success: true, message: 'SMS sent successfully' };
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    throw new Error('Failed to send SMS');
  }
};

// Send OTP SMS
exports.sendOTP = async (phone, otp) => {
  const message = `Your OrderSync OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return await this.sendSMS(phone, message);
};

// Send order confirmation SMS
exports.sendOrderConfirmationSMS = async (phone, orderNumber) => {
  const message = `Your order ${orderNumber} has been confirmed! Thank you for ordering with OrderSync.`;
  return await this.sendSMS(phone, message);
};

// Send booking reminder SMS
exports.sendBookingReminderSMS = async (phone, bookingDateTime) => {
  const dateTime = new Date(bookingDateTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const message = `Reminder: Your booking at OrderSync is scheduled for ${dateTime}. See you soon!`;
  return await this.sendSMS(phone, message);
};

// Send order status update SMS
exports.sendOrderStatusSMS = async (phone, orderNumber, status) => {
  const statusMessages = {
    confirmed: `Your order ${orderNumber} has been confirmed and is being prepared.`,
    preparing: `Your order ${orderNumber} is being prepared.`,
    ready: `Your order ${orderNumber} is ready for pickup/delivery!`,
    delivered: `Your order ${orderNumber} has been delivered. Enjoy your meal!`,
    cancelled: `Your order ${orderNumber} has been cancelled.`,
  };

  const message = statusMessages[status] || `Order ${orderNumber} status updated to ${status}.`;
  return await this.sendSMS(phone, message);
};

// Send payment confirmation SMS
exports.sendPaymentConfirmationSMS = async (phone, amount, orderId) => {
  const message = `Payment of ₹${amount} received for order ${orderId}. Thank you!`;
  return await this.sendSMS(phone, message);
};

// Example integration with Fast2SMS (Indian SMS provider)
/*
const axios = require('axios');

exports.sendSMSFast2SMS = async (phone, message) => {
  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'v3',
        sender_id: config.sms.sender_id,
        message: message,
        language: 'english',
        flash: 0,
        numbers: phone,
      },
      {
        headers: {
          authorization: config.sms.api_key,
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Fast2SMS error:', error);
    throw new Error('Failed to send SMS');
  }
};
*/

// Example integration with Twilio
/*
const twilio = require('twilio');

exports.sendSMSTwilio = async (phone, message) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    throw new Error('Failed to send SMS');
  }
};
*/