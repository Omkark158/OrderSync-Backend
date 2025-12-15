require('dotenv').config();

const config = {
  // Server Configuration
  node_env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  // Database
  mongodb_uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ordersync',
  
  // Frontend URL (for CORS)
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // JWT Configuration
  jwt_secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  jwt_expire: process.env.JWT_EXPIRE || '7d',
  
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
  
  // Fast2SMS Configuration
  fast2sms: {
    api_key: process.env.FAST2SMS_API_KEY,
  },
  
  // Admin Secret Key
  admin_key: process.env.ADMIN_KEY || 'SecretAdminKey',
  
  // Other Settings
  bcrypt_rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  otp_expire: 10 * 60 * 1000, // 10 minutes in milliseconds
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
      console.warn('⚠️  Running with default values (development mode)');
    }
  }
  
  // Warn about missing optional but recommended vars
  if (!process.env.FAST2SMS_API_KEY) {
    console.warn('⚠️  Fast2SMS API key not set - SMS features will only log messages');
  }
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️  Razorpay credentials not set - payment features will not work');
  }
};

validateConfig();

module.exports = config;