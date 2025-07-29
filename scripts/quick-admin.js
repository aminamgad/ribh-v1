#!/usr/bin/env node

/**
 * Quick Admin Creation Script
 * Creates an admin user with minimal setup
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function quickAdmin() {
  try {
    console.log('🚀 بدء إنشاء مدير سريع...\n');

    // Connect to database
    const mongoUri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudeei?retryWrites=true&w=majority&appName=Cluster0"

    await mongoose.connect(mongoUri);
    console.log('✅ متصل بقاعدة البيانات');

    // Simple schemas
    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      phone: String,
      password: String,
      role: { type: String, default: 'admin' },
      isActive: { type: Boolean, default: true },
      isVerified: { type: Boolean, default: true },
      companyName: String,
      address: String,
      taxId: String
    }, { timestamps: true }));

    const Wallet = mongoose.model('Wallet', new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
      balance: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      totalWithdrawals: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      minimumWithdrawal: { type: Number, default: 0 }
    }, { timestamps: true }));

    // Admin data - Don't hash password here, let the model do it
    const adminData = {
      name: 'مدير النظام',
      email: 'admin@ribh.com',
      phone: '01234567890',
      password: 'Admin123!', // Plain password - let User model hash it
      role: 'admin',
      isActive: true,
      isVerified: true,
      companyName: 'منصة ربح',
      address: 'الرياض، السعودية',
      taxId: '1234567890'
    };

    // Check if admin exists
    const existing = await User.findOne({ 
      $or: [{ email: adminData.email }, { role: 'admin' }]
    });

    if (existing) {
      console.log('⚠️  يوجد مدير بالفعل:', existing.email);
      console.log('🔄 جاري التحديث...');
      
      await User.findByIdAndUpdate(existing._id, {
        ...adminData,
        _id: existing._id
      });
      
      console.log('✅ تم تحديث بيانات المدير');
    } else {
      // Create new admin
      const admin = await User.create(adminData);
      console.log('✅ تم إنشاء المدير الجديد');

      // Create wallet
      await Wallet.create({
        userId: admin._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        isActive: true,
        minimumWithdrawal: 0
      });
      console.log('💰 تم إنشاء محفظة المدير');
    }

    console.log('\n🎉 تم بنجاح! بيانات تسجيل الدخول:');
    console.log('📧 البريد: admin@ribh.com');
    console.log('🔐 كلمة المرور: Admin123!');
    console.log('🌐 الرابط: http://localhost:3000/auth/login');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (error.code === 11000) {
      console.error('💡 البريد الإلكتروني مستخدم بالفعل');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 تم قطع الاتصال');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  quickAdmin();
}

module.exports = quickAdmin; 