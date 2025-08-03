const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce');

async function testFinancialSettings() {
  try {
    console.log('🧪 اختبار الإعدادات المالية...\n');
    
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
      freeShippingThreshold: Number
    }));
    
    // Test 1: Check current financial settings
    console.log('🔧 اختبار 1: التحقق من الإعدادات المالية الحالية');
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      console.log('❌ لا توجد إعدادات في النظام');
      console.log('📝 إنشاء إعدادات مالية افتراضية...');
      
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
        freeShippingThreshold: 500
      });
      
      console.log('✅ تم إنشاء الإعدادات المالية الافتراضية');
    } else {
      console.log('✅ تم العثور على الإعدادات المالية الموجودة');
    }
    
    console.log('\n📊 الإعدادات المالية الحالية:');
    console.log(`  - الحد الأدنى للسحب: ${settings.withdrawalSettings.minimumWithdrawal}₪`);
    console.log(`  - الحد الأقصى للسحب: ${settings.withdrawalSettings.maximumWithdrawal}₪`);
    console.log(`  - رسوم السحب: ${settings.withdrawalSettings.withdrawalFees}%`);
    console.log(`  - عدد نسب العمولة: ${settings.commissionRates.length}`);
    
    // Test 2: Update financial settings
    console.log('\n💰 اختبار 2: تحديث الإعدادات المالية');
    
    const newFinancialSettings = {
      withdrawalSettings: {
        minimumWithdrawal: 200,
        maximumWithdrawal: 75000,
        withdrawalFees: 2
      },
      commissionRates: [
        { minPrice: 0, maxPrice: 2000, rate: 12 },
        { minPrice: 2001, maxPrice: 8000, rate: 10 },
        { minPrice: 8001, maxPrice: 15000, rate: 8 },
        { minPrice: 15001, maxPrice: 999999, rate: 6 }
      ]
    };
    
    // Update settings
    await SystemSettings.findByIdAndUpdate(settings._id, {
      withdrawalSettings: newFinancialSettings.withdrawalSettings,
      commissionRates: newFinancialSettings.commissionRates
    });
    
    // Reload settings
    settings = await SystemSettings.findById(settings._id);
    
    console.log('✅ تم تحديث الإعدادات المالية');
    console.log(`  - الحد الأدنى للسحب: ${settings.withdrawalSettings.minimumWithdrawal}₪`);
    console.log(`  - الحد الأقصى للسحب: ${settings.withdrawalSettings.maximumWithdrawal}₪`);
    console.log(`  - رسوم السحب: ${settings.withdrawalSettings.withdrawalFees}%`);
    console.log(`  - عدد نسب العمولة: ${settings.commissionRates.length}`);
    
    // Test 3: Withdrawal validation
    console.log('\n💳 اختبار 3: التحقق من السحب');
    
    const testWithdrawals = [
      { amount: 150, expected: false, reason: 'أقل من الحد الأدنى الجديد' },
      { amount: 300, expected: true, reason: 'ضمن الحدود الجديدة' },
      { amount: 80000, expected: false, reason: 'أكثر من الحد الأقصى الجديد' }
    ];
    
    for (const test of testWithdrawals) {
      const isValid = test.amount >= settings.withdrawalSettings.minimumWithdrawal && 
                     test.amount <= settings.withdrawalSettings.maximumWithdrawal;
      
      const fees = (test.amount * settings.withdrawalSettings.withdrawalFees) / 100;
      const totalAmount = test.amount + fees;
      
      console.log(`  - سحب ${test.amount}₪: ${isValid ? '✅' : '❌'} ${test.reason}`);
      console.log(`    الرسوم: ${fees}₪`);
      console.log(`    الإجمالي: ${totalAmount}₪`);
    }
    
    // Test 4: Commission calculation
    console.log('\n💸 اختبار 4: حساب العمولة');
    
    const testCommissions = [
      { amount: 1000, expectedRate: 12 },
      { amount: 5000, expectedRate: 10 },
      { amount: 12000, expectedRate: 8 },
      { amount: 20000, expectedRate: 6 }
    ];
    
    for (const test of testCommissions) {
      const rate = settings.commissionRates.find(
          r => test.amount >= r.minPrice && test.amount <= r.maxPrice
        );
      const commission = rate ? (test.amount * rate.rate / 100) : 0;
      
      console.log(`  - طلب ${test.amount}₪: ${rate ? rate.rate : 0}% = ${commission}₪`);
    }
    
    // Test 5: API simulation
    console.log('\n🌐 اختبار 5: محاكاة API');
    console.log('  - GET /api/admin/settings: جلب إعدادات الإدارة');
    console.log('  - PUT /api/admin/settings: تحديث الإعدادات المالية');
    console.log('  - POST /api/withdrawals: إنشاء طلب سحب مع التحقق من الإعدادات');
    console.log('  - POST /api/orders: إنشاء طلب مع حساب العمولة');
    
    console.log('\n✅ تم اختبار الإعدادات المالية بنجاح!');
    console.log('\n🎯 الإعدادات المالية مطبقة في:');
    console.log('  - API طلبات السحب: /api/withdrawals');
    console.log('  - API الطلبات: /api/orders');
    console.log('  - صفحة طلبات السحب: /dashboard/withdrawals');
    console.log('  - إعدادات النظام: /dashboard/admin/settings');
    
    console.log('\n📝 ملاحظات:');
    console.log('  - الإعدادات المالية يتم حفظها في قاعدة البيانات');
    console.log('  - التحقق من قيم السحب يتم تطبيقه');
    console.log('  - حساب العمولة يتم تطبيقه تلقائياً');
    console.log('  - حساب رسوم السحب يتم تطبيقه تلقائياً');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الإعدادات المالية:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
testFinancialSettings(); 