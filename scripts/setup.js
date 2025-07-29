#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 بدء إعداد منصة ربح...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 إنشاء ملف البيئة...');
  const envExamplePath = path.join(process.cwd(), '.env.local.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ تم إنشاء ملف .env.local');
    console.log('⚠️  يرجى تعديل ملف .env.local وإضافة القيم المناسبة\n');
  } else {
    console.log('❌ ملف .env.local.example غير موجود');
    process.exit(1);
  }
} else {
  console.log('✅ ملف .env.local موجود بالفعل\n');
}

// Install dependencies
console.log('📦 تثبيت التبعيات...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ تم تثبيت التبعيات بنجاح\n');
} catch (error) {
  console.log('❌ فشل في تثبيت التبعيات');
  process.exit(1);
}

// Check if MongoDB is running
console.log('🔍 التحقق من قاعدة البيانات...');
try {
  execSync('mongosh --eval "db.runCommand({ping: 1})"', { stdio: 'ignore' });
  console.log('✅ MongoDB يعمل بشكل صحيح\n');
} catch (error) {
  console.log('⚠️  تحذير: MongoDB غير متاح');
  console.log('   يرجى التأكد من تشغيل MongoDB أو استخدام MongoDB Atlas\n');
}

console.log('🎉 تم إعداد المشروع بنجاح!');
console.log('\n📋 الخطوات التالية:');
console.log('1. تعديل ملف .env.local وإضافة القيم المناسبة');
console.log('2. تشغيل المشروع: npm run dev');
console.log('3. فتح المتصفح على: http://localhost:3000');
console.log('\n📚 للمزيد من المعلومات، راجع ملف README.md'); 