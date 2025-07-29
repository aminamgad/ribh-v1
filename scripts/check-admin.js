#!/usr/bin/env node

/**
 * Check Admin Script
 * Verify admin exists and test password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = "mongodb+srv://ribh:HY7m3naAOhSvTIhJ@cluster0.imwab6h.mongodb.net/claudei?retryWrites=true&w=majority&appName=Cluster0";

async function checkAdmin() {
  try {
    console.log('🔍 فحص المدير...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ متصل بقاعدة البيانات');

    // Find admin
    const admin = await mongoose.connection.db.collection('users').findOne({ 
      email: 'admin@ribh.com' 
    });

    if (!admin) {
      console.log('❌ المدير غير موجود');
      return;
    }

    console.log('✅ المدير موجود:');
    console.log(`   الاسم: ${admin.name}`);
    console.log(`   البريد: ${admin.email}`);
    console.log(`   الدور: ${admin.role}`);
    console.log(`   نشط: ${admin.isActive}`);
    console.log(`   موثق: ${admin.isVerified}`);
    console.log(`   تم الإنشاء: ${admin.createdAt}`);

    // Test password
    const testPassword = 'Admin123!';
    const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
    
    console.log(`\n🔐 اختبار كلمة المرور: ${isPasswordValid ? '✅ صحيحة' : '❌ خاطئة'}`);
    
    if (isPasswordValid) {
      console.log('🎉 يمكن تسجيل الدخول بنجاح!');
      console.log('📧 البريد: admin@ribh.com');
      console.log('🔐 كلمة المرور: Admin123!');
    } else {
      console.log('⚠️  كلمة المرور غير صحيحة');
    }

    // Check wallet
    const wallet = await mongoose.connection.db.collection('wallets').findOne({ 
      userId: admin._id 
    });

    if (wallet) {
      console.log(`💰 المحفظة موجودة - الرصيد: ${wallet.balance} جنيه`);
    } else {
      console.log('⚠️  المحفظة غير موجودة');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال');
    process.exit(0);
  }
}

checkAdmin(); 