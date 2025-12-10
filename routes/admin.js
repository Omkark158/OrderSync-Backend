// routes/admin.js   (create new file or put in existing admin routes)
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// HIDDEN ADMIN ROUTE — NO ONE KNOWS THIS ENDPOINT EXISTS
router.get('/a', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hidden Admin Dashboard",
    admin: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    },
    stats: {
      totalUsers: "Check DB",
      totalOrders: "Check DB",
      serverTime: new Date().toISOString(),
      uptime: process.uptime().toFixed(0) + "s"
    },
    secret_message: "You are a true admin"
  });
});

module.exports = router;