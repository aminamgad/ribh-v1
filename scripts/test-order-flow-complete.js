// Test Script: التدفق الكامل - من إنشاء الطلب إلى إرساله لشركة الشحن
// هذا السكريبت يختبر التدفق الكامل خطوة بخطوة

const { testCreateOrderFromMarketer } = require('./test-order-flow-1-create-order');
const { testUpdateShippingInfo } = require('./test-order-flow-2-update-shipping');
const { testCreatePackageAndSend } = require('./test-order-flow-3-create-package');

async function testCompleteOrderFlow() {
  try {
    console.log('🚀 ========================================');
    console.log('🚀 اختبار التدفق الكامل');
    console.log('🚀 من إنشاء الطلب إلى إرساله لشركة الشحن');
    console.log('🚀 ========================================\n\n');
    
    let orderId = null;
    
    // Test 1: Create order from marketer
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const test1Result = await testCreateOrderFromMarketer();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!test1Result.success) {
      console.error('❌ Test 1 failed. Stopping tests.');
      return { success: false, step: 1 };
    }
    
    orderId = test1Result.orderId;
    
    // Wait a bit to ensure order is saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Update shipping info
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const test2Result = await testUpdateShippingInfo(orderId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!test2Result.success) {
      console.error('❌ Test 2 failed. Stopping tests.');
      return { success: false, step: 2 };
    }
    
    // Wait a bit to ensure order is updated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Create package and send
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const test3Result = await testCreatePackageAndSend(orderId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!test3Result.success) {
      console.error('❌ Test 3 failed.');
      return { success: false, step: 3 };
    }
    
    // Final summary
    console.log('🎉 ========================================');
    console.log('🎉 جميع الاختبارات نجحت!');
    console.log('🎉 ========================================\n');
    console.log('✅ Test 1: إنشاء الطلب من المسوق - PASSED');
    console.log('✅ Test 2: تحديث معلومات الشحن - PASSED');
    console.log('✅ Test 3: إنشاء الحزمة وإرسالها - PASSED\n');
    console.log(`📦 Order ID: ${orderId}`);
    console.log(`📦 Package ID: ${test3Result.packageId || 'N/A'}\n`);
    console.log('✅ التدفق الكامل يعمل بشكل صحيح!\n');
    
    return { success: true, orderId, packageId: test3Result.packageId };
    
  } catch (error) {
    console.error('\n❌ ERROR in complete flow test:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return { success: false, error: error.message };
  }
}

// Run test
if (require.main === module) {
  testCompleteOrderFlow().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testCompleteOrderFlow };

