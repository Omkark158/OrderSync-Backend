// scripts/createAdmin.js
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    const adminEmail = 'admin@sachinfoods.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@SachinFoods';

    // Check if admin exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log('👤 Admin user already exists');
      console.log('🔄 Updating password...');
      
      // Update password
      admin.password = adminPassword;
      admin.role = 'admin';
      await admin.save();
      
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('🆕 Creating new admin user...');
      
      // Create new admin
      admin = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: '9539387240',
        isVerified: true
      });
      
      console.log('✅ Admin user created successfully');
    }

    console.log('\n📋 Admin Details:');
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Password:', adminPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();