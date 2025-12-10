// app.js
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const { hiddenAdminLogin } = require('./controllers/adminController');

const app = express();

// CORS
const corsOptions = {
  origin: config.frontend_url,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger)

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'OrderSync API is running', version: '1.0.0' });
});

// Normal Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);

// HIDDEN ADMIN LOGIN
app.post('/api/auth/admin-login', hiddenAdminLogin);

// ONE-TIME ADMIN CREATION ROUTE (MUST BE BEFORE 404!)
app.post('/api/create-super-admin', async (req, res) => {
  try {
    const { name, email, phone, password, secret } = req.body;

    if (secret !== 'SecretAdminKey') {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const User = require('./models/User');
    await User.deleteOne({ email });

    const admin = await User.create({
      name: name || "Super Admin",
      email,
      phone,
      password,
      role: "admin"
    });

    res.status(201).json({
      success: true,
      message: "Super Admin created!",
      admin: { id: admin._id, email: admin.email, role: admin.role }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 Handler — MUST BE AFTER ALL ROUTES
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error Handler — LAST
app.use(errorHandler);

module.exports = app;