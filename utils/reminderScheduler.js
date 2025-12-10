const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendBookingReminderEmail } = require('../services/emailService');
const { sendBookingReminderSMS } = require('../services/smsService');

// Check and send reminders every 5 minutes
const checkAndSendReminders = async () => {
  try {
    const now = new Date();

    // Find bookings that need reminders
    const bookingsToRemind = await Booking.find({
      status: 'scheduled',
      reminderSent: false,
      'reminderSettings.enabled': true,
      scheduledReminderTime: { $lte: now },
      bookingDateTime: { $gt: now }, // Booking is still in future
    })
      .populate('user', 'email phone name')
      .populate('order', 'orderNumber');

    console.log(`📅 Found ${bookingsToRemind.length} bookings to remind`);

    for (const booking of bookingsToRemind) {
      try {
        const reminderTypes = booking.reminderSettings.reminderType || ['sms'];

        // Send Email reminder
        if (reminderTypes.includes('email') || reminderTypes.includes('both')) {
          if (booking.customerEmail) {
            await sendBookingReminderEmail(booking.customerEmail, {
              bookingDateTime: booking.bookingDateTime,
              bookingType: booking.bookingType,
              specialRequests: booking.specialRequests,
            });
            console.log(`✅ Email reminder sent to ${booking.customerEmail}`);
          }
        }

        // Send SMS reminder
        if (reminderTypes.includes('sms') || reminderTypes.includes('both')) {
          if (booking.customerPhone) {
            await sendBookingReminderSMS(
              booking.customerPhone,
              booking.bookingDateTime
            );
            console.log(`✅ SMS reminder sent to ${booking.customerPhone}`);
          }
        }

        // Update booking
        booking.reminderSent = true;
        booking.reminderSentAt = new Date();
        booking.reminderAttempts += 1;
        booking.status = 'reminded';
        await booking.save();

        console.log(`✅ Reminder sent for booking ${booking._id}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder for booking ${booking._id}:`, error);
        
        // Log error in booking
        booking.reminderAttempts += 1;
        booking.lastReminderError = error.message;
        await booking.save();
      }
    }
  } catch (error) {
    console.error('❌ Error in reminder scheduler:', error);
  }
};

// Mark completed bookings
const markCompletedBookings = async () => {
  try {
    const now = new Date();

    // Find bookings that have passed and are still in 'reminded' or 'scheduled' status
    const pastBookings = await Booking.find({
      bookingDateTime: { $lt: now },
      status: { $in: ['scheduled', 'reminded'] },
    });

    for (const booking of pastBookings) {
      booking.status = 'completed';
      booking.completedAt = new Date();
      await booking.save();
    }

    if (pastBookings.length > 0) {
      console.log(`✅ Marked ${pastBookings.length} bookings as completed`);
    }
  } catch (error) {
    console.error('❌ Error marking completed bookings:', error);
  }
};

// Start the reminder scheduler
exports.startReminderScheduler = () => {
  console.log('🚀 Starting reminder scheduler...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log(' Running reminder check...');
    await checkAndSendReminders();
    await markCompletedBookings();
  });

  // Run immediately on startup
  checkAndSendReminders();
  markCompletedBookings();

  console.log('✅ Reminder scheduler started (runs every 5 minutes)');
};

// Manual trigger for testing
exports.triggerReminderCheck = async () => {
  console.log('🔄 Manually triggering reminder check...');
  await checkAndSendReminders();
  await markCompletedBookings();
};

// Get upcoming reminders (for debugging)
exports.getUpcomingReminders = async () => {
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingReminders = await Booking.find({
    status: 'scheduled',
    reminderSent: false,
    'reminderSettings.enabled': true,
    scheduledReminderTime: { $gte: now, $lte: next24Hours },
  })
    .populate('user', 'name email phone')
    .populate('order', 'orderNumber')
    .sort({ scheduledReminderTime: 1 });

  return upcomingReminders;
};