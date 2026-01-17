// Test Script 1: إنشاء الطلب من المسوق
// هذا السكريبت يختبر إنشاء طلب من المسوق بدون معلومات شحن

const mongoose = require('mongoose');
require('dotenv').config();

async function testCreateOrderFromMarketer() {
  try {
    console.log('🧪 Test 1: إنشاء الطلب من المسوق\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false, timestamps: true }));
    
    // Find a marketer user
    const marketer = await User.findOne({ role: 'marketer', isActive: true }).lean();
    if (!marketer) {
      console.error('❌ No marketer user found in database');
      process.exit(1);
    }
    
    console.log(`📝 Using marketer: ${marketer.name} (${marketer._id})\n`);
    
    // Create test order data (as marketer would create)
    const testOrderData = {
      customerId: marketer._id,
      customerRole: 'marketer',
      supplierId: new mongoose.Types.ObjectId(), // Will be set from product
      items: [{
        productId: new mongoose.Types.ObjectId(), // Will be replaced with actual product
        productName: 'منتج اختبار',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        priceType: 'marketer'
      }],
      subtotal: 100,
      shippingCost: 0, // Will be calculated by admin
      shippingMethod: 'الشحن الأساسي',
      shippingZone: 'في انتظار مراجعة الإدارة',
      commission: 10,
      total: 100,
      marketerProfit: 20,
      status: 'pending', // ✅ Must be pending
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddress: {
        fullName: 'عميل اختبار',
        phone: '0599999999',
        street: 'شارع الاختبار',
        manualVillageName: 'قرية الاختبار - البقعة', // ✅ Manual village name only
        // villageId: NOT SET ✅
        // villageName: NOT SET ✅
      },
      deliveryNotes: 'ملاحظات الاختبار'
    };
    
    // Find a real product to use
    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const product = await Product.findOne({ isActive: true }).lean();
    
    if (product) {
      testOrderData.supplierId = product.supplierId;
      testOrderData.items[0].productId = product._id;
      testOrderData.items[0].productName = product.name;
      testOrderData.items[0].unitPrice = product.marketerPrice || 100;
      testOrderData.items[0].totalPrice = testOrderData.items[0].unitPrice * testOrderData.items[0].quantity;
      testOrderData.subtotal = testOrderData.items[0].totalPrice;
      testOrderData.total = testOrderData.subtotal;
    }
    
    console.log('📦 Creating test order with the following data:');
    console.log('   - Status: pending ✅');
    console.log('   - Shipping Company: NOT SET ✅');
    console.log('   - Village ID: NOT SET ✅');
    console.log('   - Manual Village Name: ' + testOrderData.shippingAddress.manualVillageName + ' ✅\n');
    
    // Create order - let mongoose handle orderNumber generation via pre-save middleware
    const order = new Order(testOrderData);
    
    // Save order - pre-save middleware will generate orderNumber
    try {
      await order.save();
    } catch (error) {
      // If duplicate orderNumber error, try again with a unique timestamp
      if (error.code === 11000 && error.keyPattern?.orderNumber) {
        console.log('⚠️  Duplicate orderNumber detected, retrying with timestamp...');
        testOrderData.orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const retryOrder = new Order(testOrderData);
        await retryOrder.save();
        Object.assign(order, retryOrder);
      } else {
        throw error;
      }
    }
    
    console.log('✅ Order created successfully!');
    console.log(`   Order ID: ${order._id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Shipping Company: ${order.shippingCompany || 'NOT SET ✅'}`);
    console.log(`   Village ID: ${order.shippingAddress?.villageId || 'NOT SET ✅'}`);
    console.log(`   Manual Village Name: ${order.shippingAddress?.manualVillageName || 'NOT SET'}\n`);
    
    // Verify order data
    const verification = {
      statusIsPending: order.status === 'pending',
      noShippingCompany: !order.shippingCompany,
      noVillageId: !order.shippingAddress?.villageId,
      hasManualVillageName: !!order.shippingAddress?.manualVillageName
    };
    
    console.log('🔍 Verification:');
    console.log(`   Status is 'pending': ${verification.statusIsPending ? '✅' : '❌'}`);
    console.log(`   No shipping company: ${verification.noShippingCompany ? '✅' : '❌'}`);
    console.log(`   No village ID: ${verification.noVillageId ? '✅' : '❌'}`);
    console.log(`   Has manual village name: ${verification.hasManualVillageName ? '✅' : '❌'}\n`);
    
    const allPassed = Object.values(verification).every(v => v === true);
    
    if (allPassed) {
      console.log('✅ Test 1 PASSED: Order created correctly by marketer\n');
      console.log(`📌 Order ID for next test: ${order._id}\n`);
      return { success: true, orderId: order._id.toString() };
    } else {
      console.log('❌ Test 1 FAILED: Order data is incorrect\n');
      return { success: false, orderId: order._id.toString() };
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run test
if (require.main === module) {
  testCreateOrderFromMarketer().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testCreateOrderFromMarketer };

