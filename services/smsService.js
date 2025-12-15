const axios = require('axios');

// Fast2SMS Configuration
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

// Send SMS using Fast2SMS
exports.sendSMS = async (phone, message) => {
  try {
    if (!FAST2SMS_API_KEY) {
      console.warn('⚠️  Fast2SMS API key not configured - logging OTP instead');
      console.log(`📱 SMS to ${phone}: ${message}`);
      // Extract OTP from message
      const otpMatch = message.match(/\d{6}/);
      if (otpMatch) {
        console.log(`🔐 OTP: ${otpMatch[0]}`);
      }
      return { success: true, message: 'SMS logged (API key missing)' };
    }

    // Format phone number (remove +91 if present)
    const formattedPhone = phone.replace(/^\+91/, '');

    const response = await axios.post(
      FAST2SMS_URL,
      {
        route: 'v3',
        sender_id: 'TXTIND',
        message: message,
        language: 'english',
        flash: 0,
        numbers: formattedPhone,
      },
      {
        headers: {
          authorization: FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.return === true) {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return { 
        success: true, 
        message: 'SMS sent successfully', 
        phone: formattedPhone,
        messageId: response.data.message_id 
      };
    } else {
      throw new Error(response.data.message || 'SMS sending failed');
    }
  } catch (error) {
    console.error('❌ Fast2SMS error:', error.response?.data || error.message);
    // Fallback to console logging instead of throwing error
    console.log(`📱 OTP for ${phone}: ${message.match(/\d{6}/)?.[0]}`);
    return { success: true, message: 'SMS logged (Fast2SMS error)' };
  }
};

// Generate 6-digit OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP SMS for signup
exports.sendSignupOTP = async (phone, otp) => {
  const message = `Welcome to Sachin Foods, Kundara! Your signup OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return await this.sendSMS(phone, message);
};

// Send OTP SMS for login
exports.sendLoginOTP = async (phone, otp) => {
  const message = `Your Sachin Foods login OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return await this.sendSMS(phone, message);
};

// Send catering order confirmation SMS
exports.sendOrderConfirmationSMS = async (phone, orderNumber, eventDate) => {
  const message = `Your order ${orderNumber} confirmed! Sachin Foods will deliver fresh Chappathy, Appam & more for your event. Thank you! Call: 9539387240`;
  return await this.sendSMS(phone, message);
};

// Send event/booking reminder SMS
exports.sendEventReminderSMS = async (phone, eventDateTime, guestCount) => {
  const dateTime = new Date(eventDateTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const message = `Reminder: Sachin Foods catering for ${guestCount} guests on ${dateTime}. We're ready with fresh food! Contact: 9539387240`;
  return await this.sendSMS(phone, message);
};

// Send catering order status update SMS
exports.sendOrderStatusSMS = async (phone, orderNumber, status) => {
  const statusMessages = {
    confirmed: `Order ${orderNumber} confirmed! Sachin Foods team is preparing fresh Chappathy, Appam & bakery items for your event. Call: 9539387240`,
    preparing: `We're preparing fresh food for your event. Order ${orderNumber} in progress. Sachin Foods, Kundara. Ph: 9539387240`,
    ready: `Your order ${orderNumber} is ready! Sachin Foods will deliver on time. Fresh Chappathy & more. Contact: 9539387240`,
    completed: `Thank you for choosing Sachin Foods! Hope you enjoyed our Chappathy, Appam & bakery items. Order ${orderNumber}. Ph: 9539387240`,
    cancelled: `Order ${orderNumber} cancelled. For assistance contact Sachin Foods at 9539387240, 9388808825. Kundara, Kollam.`,
  };

  const message = statusMessages[status] || `Order ${orderNumber} status: ${status}. Sachin Foods - Ph: 9539387240`;
  return await this.sendSMS(phone, message);
};

// Send payment confirmation SMS
exports.sendPaymentConfirmationSMS = async (phone, amount, orderId) => {
  const message = `Payment of ₹${amount} received for order ${orderId}. Thank you! Sachin Foods, Kundara, Kollam. Ph: 9539387240`;
  return await this.sendSMS(phone, message);
};

// Send quotation/inquiry response SMS
exports.sendQuotationSMS = async (phone, customerName) => {
  const message = `Hi ${customerName}, thank you for your inquiry! Sachin Foods quotation sent to your email. We specialize in Chappathy, Appam, Veesappam, Pathiri & Bakery items. Call: 9539387240`;
  return await this.sendSMS(phone, message);
};

// Send menu customization confirmation SMS
exports.sendMenuCustomizationSMS = async (phone, orderNumber) => {
  const message = `Custom menu confirmed for order ${orderNumber}! Sachin Foods will prepare fresh Chappathy, Appam & more specially for your event. Ph: 9539387240`;
  return await this.sendSMS(phone, message);
};