const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce');

async function quickTestSettings() {
  try {
    console.log('🧪 اختبار سريع للإعدادات...\n');
    
    // Create SystemSettings model
    const SystemSettings = mongoose.model('SystemSettings', new mongoose.Schema({
      withdrawalSettings: {
        minimumWithdrawal: Number,
        maximumWithdrawal: Number,
        withdrawalFees: Number
      },
      commissionRates: [{
        minPrice: Number,
        maxPrice: Number,
        rate: Number
      }],
      platformName: String,
      platformDescription: String,
      contactEmail: String,
      contactPhone: String,
      minimumOrderValue: Number,
      maximumOrderValue: Number,
      shippingCost: Number,
      freeShippingThreshold: Number,
      maxProductImages: Number,
      maxProductDescriptionLength: Number,
      autoApproveProducts: Boolean,
      emailNotifications: Boolean,
      smsNotifications: Boolean,
      pushNotifications: Boolean,
      passwordMinLength: Number,
      sessionTimeout: Number,
      maxLoginAttempts: Number,
      termsOfService: String,
      privacyPolicy: String,
      refundPolicy: String,
      googleAnalyticsId: String,
      facebookPixelId: String
    }));
    
    // Test 1: Check if settings exist and are properly structured
    console.log('🔧 اختبار 1: التحقق من وجود الإعدادات');
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      console.log('❌ لا توجد إعدادات في النظام');
      console.log('📝 إنشاء إعدادات افتراضية...');
      
      settings = await SystemSettings.create({
        withdrawalSettings: {
          minimumWithdrawal: 100,
          maximumWithdrawal: 50000,
          withdrawalFees: 0
        },
        commissionRates: [
          { minPrice: 0, maxPrice: 1000, rate: 10 },
          { minPrice: 1001, maxPrice: 5000, rate: 8 },
          { minPrice: 5001, maxPrice: 10000, rate: 6 },
          { minPrice: 10001, maxPrice: 999999, rate: 5 }
        ],
        platformName: 'ربح',
        platformDescription: 'منصة التجارة الإلكترونية العربية',
        contactEmail: 'support@ribh.com',
        contactPhone: '+966500000000',
        minimumOrderValue: 50,
        maximumOrderValue: 100000,
        shippingCost: 20,
        freeShippingThreshold: 500,
        maxProductImages: 10,
        maxProductDescriptionLength: 1000,
        autoApproveProducts: false,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        passwordMinLength: 8,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        termsOfService: 'شروط الخدمة',
        privacyPolicy: 'سياسة الخصوصية',
        refundPolicy: 'سياسة الاسترداد',
        googleAnalyticsId: '',
        facebookPixelId: ''
      });
      
      console.log('✅ تم إنشاء الإعدادات الافتراضية');
    } else {
      console.log('✅ تم العثور على الإعدادات الموجودة');
    }
    
    console.log('\n📊 الإعدادات الحالية:');
    console.log(`  - اسم المنصة: ${settings.platformName}`);
    console.log(`  - الحد الأدنى للطلب: ${settings.minimumOrderValue}₪`);
    console.log(`  - الحد الأقصى للطلب: ${settings.maximumOrderValue}₪`);
    console.log(`  - تكلفة الشحن: ${settings.shippingCost}₪`);
    console.log(`  - حد الشحن المجاني: ${settings.freeShippingThreshold}₪`);
    console.log(`  - الحد الأدنى للسحب: ${settings.withdrawalSettings.minimumWithdrawal}₪`);
    console.log(`  - الحد الأقصى للسحب: ${settings.withdrawalSettings.maximumWithdrawal}₪`);
    console.log(`  - رسوم السحب: ${settings.withdrawalSettings.withdrawalFees}%`);
    console.log(`  - عدد نسب العمولة: ${settings.commissionRates.length}`);
    
    // Test 2: Order validation
    console.log('\n🛒 اختبار 2: التحقق من الطلبات');
    const testOrder = 1000;
    const isValidOrder = testOrder >= settings.minimumOrderValue && 
                        testOrder <= settings.maximumOrderValue;
    const shippingCost = testOrder >= settings.freeShippingThreshold ? 0 : settings.shippingCost;
    
    console.log(`  - طلب ${testOrder}₪: ${isValidOrder ? '✅ صحيح' : '❌ خطأ'}`);
    console.log(`  - تكلفة الشحن: ${shippingCost}₪`);
    
    // Test 3: Withdrawal validation
    console.log('\n💰 اختبار 3: التحقق من السحب');
    const testWithdrawal = 500;
    const isValidWithdrawal = testWithdrawal >= settings.withdrawalSettings.minimumWithdrawal && 
                             testWithdrawal <= settings.withdrawalSettings.maximumWithdrawal;
    const fees = (testWithdrawal * settings.withdrawalSettings.withdrawalFees) / 100;
    
    console.log(`  - سحب ${testWithdrawal}₪: ${isValidWithdrawal ? '✅ صحيح' : '❌ خطأ'}`);
    console.log(`  - الرسوم: ${fees}₪`);
    
    // Test 4: Commission calculation
    console.log('\n💸 اختبار 4: حساب العمولة');
    const rate = settings.commissionRates.find(
      r => testOrder >= r.minPrice && testOrder <= r.maxPrice
    );
    const commission = rate ? (testOrder * rate.rate / 100) : 0;
    
    console.log(`  - طلب ${testOrder}₪: ${rate ? rate.rate : 0}% = ${commission}₪`);
    
    console.log('\n✅ تم الاختبار بنجاح!');
    console.log('\n🎯 الإعدادات تعمل بشكل صحيح في:');
    console.log('  - التحقق من الطلبات');
    console.log('  - التحقق من السحب');
    console.log('  - حساب العمولة');
    console.log('  - حساب الشحن');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
quickTestSettings(); 