#!/usr/bin/env node

/**
 * Proper Admin Creation Script
 * Uses the exact same User model as the application
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import the exact same User model as the application
const User = require('../models/User').default;
const Wallet = require('../models/Wallet').default;

async function createAdminProper() {
  try {
    console.log('🚀 بدء إنشاء مدير النظام...\n');

    // Connect to database
    const mongoUri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudei?retryWrites=true&w=majority&appName=Cluster0"

    
    await mongoose.connect(mongoUri);
    console.log('✅ متصل بقاعدة البيانات');

    // Check if admin exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@ribh.com' },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  يوجد مدير بالفعل:');
      console.log(`   البريد: ${existingAdmin.email}`);
      console.log(`   الاسم: ${existingAdmin.name}`);
      console.log(`   تم الإنشاء: ${existingAdmin.createdAt}`);
      
      // Update the existing admin with new password
      existingAdmin.password = 'Admin123!'; // Will be hashed by pre-save middleware
      existingAdmin.isActive = true;
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      
      console.log('✅ تم تحديث بيانات المدير');
    } else {
      // Create new admin
      const adminData = {
        name: 'مدير النظام',
        email: 'admin@ribh.com',
        phone: '01234567890',
        password: 'Admin123!', // Will be hashed by pre-save middleware
        role: 'admin',
        isActive: true,
        isVerified: true,
        companyName: 'منصة ربح للتجارة الإلكترونية',
        address: 'الرياض، المملكة العربية السعودية',
        taxId: '1234567890'
      };

      const admin = new User(adminData);
      await admin.save();
      console.log('✅ تم إنشاء المدير الجديد');

      // Create wallet for admin
      const walletData = {
        userId: admin._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        isActive: true,
        minimumWithdrawal: 0
      };

      const wallet = new Wallet(walletData);
      await wallet.save();
      console.log('💰 تم إنشاء محفظة المدير');
    }

    console.log('\n🎉 تم بنجاح! بيانات تسجيل الدخول:');
    console.log('📧 البريد الإلكتروني: admin@ribh.com');
    console.log('🔐 كلمة المرور: Admin123!');
    console.log('🌐 رابط تسجيل الدخول: http://localhost:3000/auth/login');
    console.log('\n💡 تأكد من تشغيل التطبيق أولاً: npm run dev');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    
    if (error.code === 11000) {
      console.error('💡 البريد الإلكتروني مستخدم بالفعل');
    }
    
    if (error.name === 'ValidationError') {
      console.error('💡 خطأ في البيانات المدخلة:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 تم قطع الاتصال');
    process.exit(0);
  }
}

// Run the script
createAdminProper(); 