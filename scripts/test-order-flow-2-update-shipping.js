// Test Script 2: تحديث معلومات الشحن من الإدمن
// هذا السكريبت يختبر تحديث معلومات الشحن (shippingCompany و villageId)

const mongoose = require('mongoose');
require('dotenv').config();

async function testUpdateShippingInfo(orderId) {
  try {
    console.log('🧪 Test 2: تحديث معلومات الشحن من الإدمن\n');
    
    if (!orderId) {
      console.error('❌ Please provide order ID as argument');
      console.log('Usage: node scripts/test-order-flow-2-update-shipping.js <orderId>');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const ExternalCompany = mongoose.models.ExternalCompany || mongoose.model('ExternalCompany', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const Village = mongoose.models.Village || mongoose.model('Village', new mongoose.Schema({}, { strict: false, timestamps: true }));
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`❌ Order ${orderId} not found`);
      process.exit(1);
    }
    
    console.log(`📦 Found order: ${order.orderNumber} (${order._id})\n`);
    console.log('📋 Current order data:');
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Shipping Company: ${order.shippingCompany || 'NOT SET'}`);
    console.log(`   - Village ID: ${order.shippingAddress?.villageId || 'NOT SET'}`);
    console.log(`   - Manual Village Name: ${order.shippingAddress?.manualVillageName || 'NOT SET'}\n`);
    
    // Find shipping company (Ultra Pal)
    const shippingCompany = await ExternalCompany.findOne({ 
      companyName: 'Ultra Pal',
      isActive: true 
    }).lean();
    
    if (!shippingCompany) {
      console.error('❌ Shipping company "Ultra Pal" not found');
      console.log('   Please create it using: node scripts/update-external-company-api.js');
      process.exit(1);
    }
    
    console.log(`✅ Found shipping company: ${shippingCompany.companyName}`);
    console.log(`   - API Endpoint: ${shippingCompany.apiEndpointUrl}`);
    console.log(`   - Has API Token: ${!!shippingCompany.apiToken}\n`);
    
    // Find a village
    const village = await Village.findOne({ isActive: true }).lean();
    if (!village) {
      console.error('❌ No active villages found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found village: ${village.villageName} (ID: ${village.villageId})\n`);
    
    // Update shipping info (simulating admin action)
    console.log('📝 Updating shipping info...');
    
    // Use findByIdAndUpdate to ensure data is saved correctly
    const updateData = {
      shippingCompany: shippingCompany.companyName,
      shippingAddress: {
        ...(order.shippingAddress || {}),
        villageId: village.villageId,
        villageName: village.villageName,
        city: village.villageName
      }
    };
    
    await Order.findByIdAndUpdate(orderId, { $set: updateData }, { new: true });
    
    console.log('✅ Shipping info updated successfully!\n');
    
    // Reload order to verify
    const updatedOrder = await Order.findById(orderId).lean();
    
    console.log('📋 Updated order data:');
    console.log(`   - Shipping Company: ${updatedOrder.shippingCompany || 'NOT SET'}`);
    console.log(`   - Village ID: ${updatedOrder.shippingAddress?.villageId || 'NOT SET'}`);
    console.log(`   - Village Name: ${updatedOrder.shippingAddress?.villageName || 'NOT SET'}`);
    console.log(`   - City: ${updatedOrder.shippingAddress?.city || 'NOT SET'}\n`);
    
    // Verify
    const verification = {
      hasShippingCompany: updatedOrder.shippingCompany === shippingCompany.companyName,
      hasVillageId: updatedOrder.shippingAddress?.villageId === village.villageId,
      hasVillageName: updatedOrder.shippingAddress?.villageName === village.villageName,
      hasCity: !!updatedOrder.shippingAddress?.city
    };
    
    console.log('🔍 Verification:');
    console.log(`   Has shipping company: ${verification.hasShippingCompany ? '✅' : '❌'}`);
    console.log(`   Has village ID: ${verification.hasVillageId ? '✅' : '❌'}`);
    console.log(`   Has village name: ${verification.hasVillageName ? '✅' : '❌'}`);
    console.log(`   Has city: ${verification.hasCity ? '✅' : '❌'}\n`);
    
    const allPassed = Object.values(verification).every(v => v === true);
    
    if (allPassed) {
      console.log('✅ Test 2 PASSED: Shipping info updated correctly\n');
      return { success: true, orderId: orderId };
    } else {
      console.log('❌ Test 2 FAILED: Shipping info update incorrect\n');
      return { success: false, orderId: orderId };
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
  const orderId = process.argv[2];
  testUpdateShippingInfo(orderId).then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testUpdateShippingInfo };

