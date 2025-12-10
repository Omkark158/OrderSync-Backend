const nodemailer = require('nodemailer');
const config = require('../config/env');

// Create transporter
const createTransporter = () => {
  if (!config.email.user || !config.email.password) {
    console.warn('⚠️  Email credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
};

// Send email
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('Email not sent - credentials not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Send order confirmation email
exports.sendOrderConfirmationEmail = async (to, orderDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Order Confirmation</h2>
      <p>Thank you for your order!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${orderDetails.orderNumber}</p>
        <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount}</p>
        <p><strong>Order Date:</strong> ${new Date(orderDetails.orderDateTime).toLocaleString()}</p>
      </div>
      
      <p>We'll notify you when your order is ready.</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Best regards,<br>
        OrderSync Team
      </p>
    </div>
  `;

  return await this.sendEmail({
    to,
    subject: `Order Confirmation - ${orderDetails.orderNumber}`,
    html,
  });
};

// Send booking reminder email
exports.sendBookingReminderEmail = async (to, bookingDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Booking Reminder</h2>
      <p>This is a reminder for your upcoming booking.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Booking Details</h3>
        <p><strong>Date & Time:</strong> ${new Date(bookingDetails.bookingDateTime).toLocaleString()}</p>
        <p><strong>Type:</strong> ${bookingDetails.bookingType}</p>
        ${bookingDetails.specialRequests ? `<p><strong>Special Requests:</strong> ${bookingDetails.specialRequests}</p>` : ''}
      </div>
      
      <p>We look forward to serving you!</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Best regards,<br>
        OrderSync Team
      </p>
    </div>
  `;

  return await this.sendEmail({
    to,
    subject: 'Booking Reminder - OrderSync',
    html,
  });
};

// Send payment receipt email
exports.sendPaymentReceiptEmail = async (to, paymentDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">Payment Successful</h2>
      <p>Your payment has been received successfully.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details</h3>
        <p><strong>Amount Paid:</strong> ₹${paymentDetails.amount}</p>
        <p><strong>Payment ID:</strong> ${paymentDetails.razorpay_payment_id}</p>
        <p><strong>Date:</strong> ${new Date(paymentDetails.paidAt).toLocaleString()}</p>
      </div>
      
      <p>Thank you for your payment!</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Best regards,<br>
        OrderSync Team
      </p>
    </div>
  `;

  return await this.sendEmail({
    to,
    subject: 'Payment Receipt - OrderSync',
    html,
  });
};