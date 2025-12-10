require('dotenv').config();


const config = {
  // Server Configuration
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  // Database
  mongodb_uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ordersync',
  
  // Frontend URL (for CORS)
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },
  
  // Razorpay Configuration
  razorpay: {
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  },
  
  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'OrderSync <noreply@ordersync.com>',
  },
  
  // SMS Configuration
  sms: {
    api_key: process.env.SMS_API_KEY,
    sender_id: process.env.SMS_SENDER_ID || 'ORDSYN',
  },
  
  // Other Settings
  bcrypt_rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  password_reset_expire: parseInt(process.env.PASSWORD_RESET_EXPIRE) || 3600000,
};

// Validation
const validateConfig = () => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Running with default values (development mode)');
    }
  }
  
  // Warn about missing optional but recommended vars
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('Razorpay credentials not set - payment features will not work');
  }
};

validateConfig();

module.exports = config;