const express = require('express');
const router = express.Router();
const {
  createBooking,
  getUpcomingBookings,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  completeBooking,
  addFeedback,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Booking routes
router.post('/', createBooking);
router.get('/', getAllBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/:id', getBookingById);
router.put('/:id', updateBooking);
router.put('/:id/cancel', cancelBooking);
router.post('/:id/feedback', addFeedback);

// Admin only
router.put('/:id/complete', authorize('admin'), completeBooking);

module.exports = router;