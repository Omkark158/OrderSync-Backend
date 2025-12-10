require('dotenv').config();            
const config = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const { startReminderScheduler } = require('./utils/reminderScheduler');

// Connect to MongoDB
connectDB();

// Start reminder scheduler for bookings
startReminderScheduler();

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.node_env} mode on port ${PORT}`);
  console.log(`Frontend URL: ${config.frontend_url}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});