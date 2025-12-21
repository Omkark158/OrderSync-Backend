// app.js - FIXED with Counter model import
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// ✅ Import models to ensure they're registered with Mongoose
require('./models/Counter');  
require('./models/Invoice');  

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const smsRoutes = require('./routes/smsRoutes');

const app = express();

// CORS
const corsOptions = {
  origin: config.frontend_url,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'OrderSync API is running', version: '1.0.0' });
});

// Apply JSON parsing ONLY to non-binary routes
app.use('/api/auth', express.json(), authRoutes);
app.use('/api/users', express.json(), userRoutes);
app.use('/api/menu', express.json(), menuRoutes);
app.use('/api/orders', express.json(), orderRoutes);
app.use('/api/payments', express.json(), paymentRoutes);
app.use('/api/bookings', express.json(), bookingRoutes);
app.use('/api/sms', express.json(), smsRoutes);

// Invoice routes WITHOUT express.json() to preserve binary data
app.use('/api/invoices', invoiceRoutes);

// 404 Handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;