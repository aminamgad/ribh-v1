const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Import User model
const User = require('../models/User');

async function testSettings() {
  try {
    console.log('🧪 Testing user settings...');
    
    // Find a test user
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log('👤 Found user:', {
      id: user._id,
      name: user.name,
      email: user.email,
      currentSettings: user.settings
    });
    
    // Test updating profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        name: 'Test User Updated',
        phone: '+201234567890',
        companyName: 'Test Company',
        address: 'Test Address',
        settings: {
          emailNotifications: false,
          pushNotifications: true,
          profileVisibility: 'private',
          language: 'en',
          autoWithdraw: true,
          withdrawThreshold: 200
        }
      },
      { new: true }
    );
    
    console.log('✅ Updated user profile and settings:', {
      name: updatedUser.name,
      phone: updatedUser.phone,
      companyName: updatedUser.companyName,
      address: updatedUser.address,
      settings: updatedUser.settings
    });
    
    // Test reading settings back
    const readUser = await User.findById(user._id);
    console.log('📖 Read back user data:', {
      name: readUser.name,
      phone: readUser.phone,
      companyName: readUser.companyName,
      address: readUser.address,
      settings: readUser.settings
    });
    
    // Test partial settings update
    const partiallyUpdatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        settings: {
          ...readUser.settings,
          language: 'ar',
          autoWithdraw: false
        }
      },
      { new: true }
    );
    
    console.log('✅ Partially updated settings:', {
      settings: partiallyUpdatedUser.settings
    });
    
    console.log('✅ Settings test completed successfully!');
    
  } catch (error) {
    console.error('❌ Settings test failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

testSettings(); 