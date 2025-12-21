// scripts/initCounters.js
const mongoose = require('mongoose');
const Counter = require('../models/Counter');
require('dotenv').config();

const initCounters = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingCounter = await Counter.findById('invoiceNumber');
    
    if (existingCounter) {
      console.log('ℹ️ Invoice counter already exists');
      console.log('📊 Current sequence number:', existingCounter.seq);
      console.log('📄 Next invoice will be: SF' + String(existingCounter.seq + 1).padStart(3, '0'));
    } else {
      await Counter.create({
        _id: 'invoiceNumber',
        seq: 0,
      });
      console.log('✅ Invoice counter initialized');
      console.log('📄 First invoice will be: SF001');
    }

    console.log('✅ Counter initialization complete');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing counters:', error);
    process.exit(1);
  }
};

initCounters();