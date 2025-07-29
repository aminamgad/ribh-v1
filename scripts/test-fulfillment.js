const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import models
const Product = require('../models/Product');
const User = require('../models/User');

async function testFulfillmentSystem() {
  try {
    console.log('🔍 Testing fulfillment system...');
    
    // 1. اختبار المنتجات المعتمدة
    console.log('\n📦 Testing approved products...');
    const approvedProducts = await Product.find({ 
      isApproved: true, 
      isRejected: false 
    }).populate('supplierId', 'name');
    
    console.log(`✅ Found ${approvedProducts.length} approved products:`);
    approvedProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.supplierId?.name}) - Stock: ${product.stockQuantity}`);
    });
    
    // 2. اختبار المنتجات المرفوضة
    console.log('\n❌ Testing rejected products...');
    const rejectedProducts = await Product.find({ 
      isRejected: true 
    }).populate('supplierId', 'name');
    
    console.log(`❌ Found ${rejectedProducts.length} rejected products:`);
    rejectedProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.supplierId?.name}) - Reason: ${product.rejectionReason}`);
    });
    
    // 3. اختبار المنتجات قيد المراجعة
    console.log('\n⏳ Testing pending products...');
    const pendingProducts = await Product.find({ 
      isApproved: false, 
      isRejected: false 
    }).populate('supplierId', 'name');
    
    console.log(`⏳ Found ${pendingProducts.length} pending products:`);
    pendingProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.supplierId?.name})`);
    });
    
    // 4. اختبار الموردين
    console.log('\n👥 Testing suppliers...');
    const suppliers = await User.find({ role: 'supplier' });
    console.log(`👥 Found ${suppliers.length} suppliers:`);
    suppliers.forEach(supplier => {
      console.log(`  - ${supplier.name} (${supplier.email})`);
    });
    
    // 5. اختبار إمكانية التخزين
    console.log('\n🏪 Testing storage eligibility...');
    const eligibleForStorage = approvedProducts.filter(product => product.stockQuantity > 0);
    console.log(`🏪 ${eligibleForStorage.length} products eligible for storage:`);
    eligibleForStorage.forEach(product => {
      console.log(`  - ${product.name}: ${product.stockQuantity} pieces available`);
    });
    
    // 6. اختبار المنتجات غير المؤهلة للتخزين
    console.log('\n⚠️ Products not eligible for storage:');
    const notEligible = approvedProducts.filter(product => product.stockQuantity <= 0);
    console.log(`⚠️ ${notEligible.length} approved products with no stock:`);
    notEligible.forEach(product => {
      console.log(`  - ${product.name}: ${product.stockQuantity} pieces`);
    });
    
    // 7. ملخص النظام
    console.log('\n📊 System Summary:');
    console.log(`  ✅ Approved products: ${approvedProducts.length}`);
    console.log(`  ❌ Rejected products: ${rejectedProducts.length}`);
    console.log(`  ⏳ Pending products: ${pendingProducts.length}`);
    console.log(`  🏪 Eligible for storage: ${eligibleForStorage.length}`);
    console.log(`  ⚠️ Approved but no stock: ${notEligible.length}`);
    console.log(`  👥 Total suppliers: ${suppliers.length}`);
    
    // 8. توصيات
    console.log('\n💡 Recommendations:');
    if (rejectedProducts.length > 0) {
      console.log('  - Some products are rejected and cannot be stored');
    }
    if (pendingProducts.length > 0) {
      console.log('  - Some products are pending approval');
    }
    if (notEligible.length > 0) {
      console.log('  - Some approved products have no stock for storage');
    }
    if (eligibleForStorage.length === 0) {
      console.log('  - No products are currently eligible for storage');
    } else {
      console.log(`  - ${eligibleForStorage.length} products can be stored`);
    }
    
  } catch (error) {
    console.error('❌ Error testing fulfillment system:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testFulfillmentSystem(); 