const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import Product model
const Product = require('../models/Product');

async function fixProductStatus() {
  try {
    console.log('🔧 Fixing product status...');
    
    // Find all products
    const products = await Product.find({});
    console.log(`📊 Found ${products.length} products`);
    
    let updatedCount = 0;
    
    for (const product of products) {
      let needsUpdate = false;
      const updateData = {};
      
      // Check if product has rejection data but isRejected is false
      if (product.rejectionReason && !product.isRejected) {
        console.log(`🔧 Fixing product ${product.name}: has rejection reason but isRejected is false`);
        updateData.isRejected = true;
        updateData.isApproved = false;
        needsUpdate = true;
      }
      
      // Check if product has approval data but isApproved is false
      if (product.approvedAt && !product.isApproved) {
        console.log(`🔧 Fixing product ${product.name}: has approval date but isApproved is false`);
        updateData.isApproved = true;
        updateData.isRejected = false;
        needsUpdate = true;
      }
      
      // Check if product has both approval and rejection data (conflict)
      if (product.isApproved && product.isRejected) {
        console.log(`🔧 Fixing product ${product.name}: has both approval and rejection status`);
        // Prefer rejection if it has rejection reason
        if (product.rejectionReason) {
          updateData.isApproved = false;
          updateData.isRejected = true;
        } else {
          updateData.isApproved = true;
          updateData.isRejected = false;
        }
        needsUpdate = true;
      }
      
      // Check if product has neither approval nor rejection (should be pending)
      if (!product.isApproved && !product.isRejected) {
        console.log(`✅ Product ${product.name}: correctly set as pending`);
      }
      
      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updateData);
        updatedCount++;
        console.log(`✅ Updated product ${product.name}`);
      }
    }
    
    console.log(`\n🎉 Fixed ${updatedCount} products`);
    
    // Show summary
    const approvedCount = await Product.countDocuments({ isApproved: true, isRejected: false });
    const rejectedCount = await Product.countDocuments({ isRejected: true });
    const pendingCount = await Product.countDocuments({ isApproved: false, isRejected: false });
    
    console.log('\n📊 Product Status Summary:');
    console.log(`✅ Approved: ${approvedCount}`);
    console.log(`❌ Rejected: ${rejectedCount}`);
    console.log(`⏳ Pending: ${pendingCount}`);
    
  } catch (error) {
    console.error('❌ Error fixing product status:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixProductStatus(); 