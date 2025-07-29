#!/usr/bin/env node

/**
 * Simple Admin Creation Script
 * Direct database operation
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const mongoUri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudei?retryWrites=true&w=majority&appName=Cluster0";

async function createSimpleAdmin() {
  try {
    console.log('🚀 إنشاء مدير بسيط...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ متصل بقاعدة البيانات');

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123!', 12);
    
    // Create admin directly
    const adminData = {
      name: 'مدير النظام',
      email: 'admin@ribh.com',
      phone: '01234567890',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isVerified: true,
      companyName: 'منصة ربح',
      address: 'الرياض، السعودية',
      taxId: '1234567890',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Delete existing admin if exists
    await mongoose.connection.db.collection('users').deleteOne({ email: 'admin@ribh.com' });
    console.log('🗑️  تم حذف المدير السابق (إن وجد)');

    // Insert new admin
    const result = await mongoose.connection.db.collection('users').insertOne(adminData);
    console.log('✅ تم إنشاء المدير الجديد');

    // Create wallet
    const walletData = {
      userId: result.insertedId,
      balance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      isActive: true,
      minimumWithdrawal: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await mongoose.connection.db.collection('wallets').insertOne(walletData);
    console.log('💰 تم إنشاء المحفظة');

    console.log('\n🎉 تم بنجاح!');
    console.log('📧 البريد: admin@ribh.com');
    console.log('🔐 كلمة المرور: Admin123!');
    console.log('🌐 الرابط: http://localhost:3000/auth/login');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال');
    process.exit(0);
  }
}

createSimpleAdmin(); 