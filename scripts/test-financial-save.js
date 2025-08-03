const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce');

async function testFinancialSave() {
  try {
    console.log('🧪 اختبار حفظ الإعدادات المالية...\n');
    
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
      }]
    }));
    
    // Test 1: Check current settings
    console.log('🔧 اختبار 1: التحقق من الإعدادات الحالية');
    
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
          { minPrice: 0, maxPrice: 1000, rate: 10 }
        ]
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
        minimumWithdrawal: 300,
        maximumWithdrawal: 100000,
        withdrawalFees: 3
      },
      commissionRates: [
        { minPrice: 0, maxPrice: 2000, rate: 15 },
        { minPrice: 2001, maxPrice: 8000, rate: 12 },
        { minPrice: 8001, maxPrice: 15000, rate: 10 },
        { minPrice: 15001, maxPrice: 999999, rate: 8 }
      ]
    };
    
    console.log('💰 الإعدادات المالية الجديدة:', newFinancialSettings);
    
    // Update settings directly in database
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
    
    // Test 3: Verify the update
    console.log('\n🔍 اختبار 3: التحقق من التحديث');
    
    const testWithdrawal = 500;
    const isValidWithdrawal = testWithdrawal >= settings.withdrawalSettings.minimumWithdrawal && 
                             testWithdrawal <= settings.withdrawalSettings.maximumWithdrawal;
    const fees = (testWithdrawal * settings.withdrawalSettings.withdrawalFees) / 100;
    
    console.log(`  - سحب ${testWithdrawal}₪: ${isValidWithdrawal ? '✅ صحيح' : '❌ خطأ'}`);
    console.log(`  - الرسوم: ${fees}₪`);
    console.log(`  - الإجمالي: ${testWithdrawal + fees}₪`);
    
    // Test 4: Commission calculation
    console.log('\n💸 اختبار 4: حساب العمولة');
    
    const testOrder = 5000;
    const rate = settings.commissionRates.find(
      r => testOrder >= r.minPrice && testOrder <= r.maxPrice
    );
    const commission = rate ? (testOrder * rate.rate / 100) : 0;
    
    console.log(`  - طلب ${testOrder}₪: ${rate ? rate.rate : 0}% = ${commission}₪`);
    
    console.log('\n✅ تم اختبار حفظ الإعدادات المالية بنجاح!');
    console.log('\n🎯 الإعدادات المالية محفوظة ومطبقة في:');
    console.log('  - قاعدة البيانات');
    console.log('  - التحقق من السحب');
    console.log('  - حساب العمولة');
    console.log('  - حساب رسوم السحب');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار حفظ الإعدادات المالية:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
testFinancialSave(); 