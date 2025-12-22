// app.js - COMPLETE FIXED VERSION

require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// ✅ Create the Express app instance FIRST
const app = express();

// ✅ Enable CORS early
const corsOptions = {
  origin: config.frontend_url,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ✅ Body parsing middleware - Apply globally (safe for most routes)
app.use(express.json({ limit: '10mb' }));                    // For JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form data

// ✅ Custom logger middleware
app.use(logger);

// ✅ Import models early to ensure they're registered with Mongoose
// This is important especially for Counter used in Invoice pre-save hook
require('./models/Counter');
require('./models/Invoice');
require('./models/Order');     // Recommended: import others too if needed
require('./models/User');
// ... import other models as needed

// ==================== ROUTES ====================

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const smsRoutes = require('./routes/smsRoutes');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'OrderSync API is running', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sms', smsRoutes);

// Invoice routes - NO extra express.json() needed here
// Your download/view routes use res.download() and streams → safe with global json parser
app.use('/api/invoices', invoiceRoutes);

// ==================== ERROR HANDLING ====================

// 404 Handler - for undefined routes
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;