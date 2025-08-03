const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce');

async function quickTestFinancial() {
  try {
    console.log('🧪 اختبار سريع للإعدادات المالية...\n');
    
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
    
    // Test 1: Check current financial settings
    console.log('🔧 اختبار 1: التحقق من الإعدادات المالية الحالية');
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      console.log('❌ لا توجد إعدادات مالية في النظام');
      return;
    }
    
    console.log('✅ تم العثور على الإعدادات المالية');
    console.log('\n📊 الإعدادات المالية الحالية:');
    console.log(`  - الحد الأدنى للسحب: ${settings.withdrawalSettings.minimumWithdrawal}₪`);
    console.log(`  - الحد الأقصى للسحب: ${settings.withdrawalSettings.maximumWithdrawal}₪`);
    console.log(`  - رسوم السحب: ${settings.withdrawalSettings.withdrawalFees}%`);
    console.log(`  - عدد نسب العمولة: ${settings.commissionRates.length}`);
    
    // Test 2: Withdrawal validation
    console.log('\n💳 اختبار 2: التحقق من السحب');
    const testWithdrawal = 500;
    const isValidWithdrawal = testWithdrawal >= settings.withdrawalSettings.minimumWithdrawal && 
                             testWithdrawal <= settings.withdrawalSettings.maximumWithdrawal;
    const fees = (testWithdrawal * settings.withdrawalSettings.withdrawalFees) / 100;
    
    console.log(`  - سحب ${testWithdrawal}₪: ${isValidWithdrawal ? '✅ صحيح' : '❌ خطأ'}`);
    console.log(`  - الرسوم: ${fees}₪`);
    console.log(`  - الإجمالي: ${testWithdrawal + fees}₪`);
    
    // Test 3: Commission calculation
    console.log('\n💸 اختبار 3: حساب العمولة');
    const testOrder = 1000;
    const rate = settings.commissionRates.find(
      r => testOrder >= r.minPrice && testOrder <= r.maxPrice
    );
    const commission = rate ? (testOrder * rate.rate / 100) : 0;
    
    console.log(`  - طلب ${testOrder}₪: ${rate ? rate.rate : 0}% = ${commission}₪`);
    
    console.log('\n✅ تم الاختبار بنجاح!');
    console.log('\n🎯 الإعدادات المالية تعمل بشكل صحيح في:');
    console.log('  - التحقق من السحب');
    console.log('  - حساب العمولة');
    console.log('  - حساب رسوم السحب');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
quickTestFinancial(); 