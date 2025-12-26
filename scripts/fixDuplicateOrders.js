// fixOrderCounter.js - Run this to fix duplicate order number issue
// Usage: node fixOrderCounter.js

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ordersync')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Define schemas
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  createdAt: Date
}, { collection: 'orders' });

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number
}, { collection: 'counters' });

const Order = mongoose.model('Order', orderSchema);
const Counter = mongoose.model('Counter', counterSchema);

async function fixCounter() {
  try {
    console.log('🔍 Analyzing order numbers...\n');

    // Get current date info
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${year}${month}`;
    const counterId = `order-${currentYearMonth}`;

    console.log(`📅 Current Year-Month: ${currentYearMonth}`);
    console.log(`🔑 Counter ID: ${counterId}\n`);

    // Find all orders for current month
    const orderPattern = new RegExp(`^SF${currentYearMonth}`);
    const currentMonthOrders = await Order.find({ 
      orderNumber: orderPattern 
    }).sort({ orderNumber: -1 });

    console.log(`📦 Found ${currentMonthOrders.length} orders for ${currentYearMonth}`);

    if (currentMonthOrders.length === 0) {
      console.log('ℹ️  No orders for current month. Resetting counter to 0.');
      
      await Counter.findByIdAndUpdate(
        counterId,
        { seq: 0 },
        { upsert: true, new: true }
      );
      
      console.log('✅ Counter reset to 0');
      process.exit(0);
      return;
    }

    // Extract sequence numbers and find the highest
    const sequenceNumbers = currentMonthOrders.map(order => {
      const match = order.orderNumber.match(/^SF\d{6}(\d{4})$/);
      return match ? parseInt(match[1]) : 0;
    });

    const highestSeq = Math.max(...sequenceNumbers);
    console.log(`🔢 Highest sequence number: ${highestSeq}`);
    console.log(`📋 Latest order: ${currentMonthOrders[0].orderNumber}\n`);

    // Get current counter value
    const currentCounter = await Counter.findById(counterId);
    const currentSeq = currentCounter ? currentCounter.seq : 0;

    console.log(`📊 Current counter value: ${currentSeq}`);
    console.log(`📊 Should be: ${highestSeq}\n`);

    if (currentSeq < highestSeq) {
      console.log('⚠️  Counter is behind! Updating...');
      
      await Counter.findByIdAndUpdate(
        counterId,
        { seq: highestSeq },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Counter updated from ${currentSeq} to ${highestSeq}`);
      console.log(`✅ Next order number will be: SF${currentYearMonth}${String(highestSeq + 1).padStart(4, '0')}\n`);
    } else if (currentSeq === highestSeq) {
      console.log('✅ Counter is already correct!');
      console.log(`✅ Next order number will be: SF${currentYearMonth}${String(highestSeq + 1).padStart(4, '0')}\n`);
    } else {
      console.log('⚠️  Counter is ahead of actual orders (unusual but safe)');
      console.log(`✅ Next order number will be: SF${currentYearMonth}${String(currentSeq + 1).padStart(4, '0')}\n`);
    }

    // Show last 5 orders
    console.log('📋 Last 5 orders:');
    currentMonthOrders.slice(0, 5).forEach((order, i) => {
      console.log(`  ${i + 1}. ${order.orderNumber} - ${order.createdAt?.toLocaleString() || 'No date'}`);
    });

    console.log('\n✅ Counter fix complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing counter:', error);
    process.exit(1);
  }
}

// Run the fix
fixCounter();