const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import Product model
const Product = require('../models/Product');

async function testProductStatus() {
  try {
    console.log('🔍 Testing product status...');
    
    // Find a rejected product
    const rejectedProduct = await Product.findOne({ isRejected: true });
    
    if (rejectedProduct) {
      console.log('✅ Found rejected product:', {
        id: rejectedProduct._id,
        name: rejectedProduct.name,
        isApproved: rejectedProduct.isApproved,
        isRejected: rejectedProduct.isRejected,
        rejectionReason: rejectedProduct.rejectionReason,
        rejectedAt: rejectedProduct.rejectedAt,
        rejectedBy: rejectedProduct.rejectedBy
      });
    } else {
      console.log('⚠️ No rejected products found');
    }
    
    // Find a pending product
    const pendingProduct = await Product.findOne({ 
      isApproved: false, 
      isRejected: false 
    });
    
    if (pendingProduct) {
      console.log('✅ Found pending product:', {
        id: pendingProduct._id,
        name: pendingProduct.name,
        isApproved: pendingProduct.isApproved,
        isRejected: pendingProduct.isRejected
      });
    } else {
      console.log('⚠️ No pending products found');
    }
    
    // Find an approved product
    const approvedProduct = await Product.findOne({ isApproved: true });
    
    if (approvedProduct) {
      console.log('✅ Found approved product:', {
        id: approvedProduct._id,
        name: approvedProduct.name,
        isApproved: approvedProduct.isApproved,
        isRejected: approvedProduct.isRejected,
        approvedAt: approvedProduct.approvedAt,
        approvedBy: approvedProduct.approvedBy
      });
    } else {
      console.log('⚠️ No approved products found');
    }
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/products/' + (rejectedProduct?._id || 'test'));
    console.log('API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response data:', {
        success: data.success,
        product: data.product ? {
          id: data.product._id,
          name: data.product.name,
          isApproved: data.product.isApproved,
          isRejected: data.product.isRejected,
          rejectionReason: data.product.rejectionReason
        } : null
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing product status:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testProductStatus(); 