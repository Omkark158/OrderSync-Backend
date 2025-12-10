const Razorpay = require('razorpay');
const config = require('./env');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!config.razorpay.key_id || !config.razorpay.key_secret) {
      throw new Error('Razorpay credentials are not configured');
    }

    razorpayInstance = new Razorpay({
      key_id: config.razorpay.key_id,
      key_secret: config.razorpay.key_secret,
    });

    console.log('💳 Razorpay instance created');
  }

  return razorpayInstance;
};

module.exports = getRazorpayInstance;