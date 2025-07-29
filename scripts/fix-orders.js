const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh');

// Import models
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

async function fixOrders() {
  try {
    console.log('🔧 Fixing orders data...\n');
    
    // Get all orders
    const orders = await Order.find({})
      .populate('items.productId', 'supplierId')
      .lean();
    
    console.log(`📊 Total orders found: ${orders.length}\n`);
    
    let fixedCount = 0;
    
    for (const order of orders) {
      console.log(`\n📦 Processing order: ${order.orderNumber}`);
      
      // Check if order has supplierId
      if (!order.supplierId) {
        console.log(`   ❌ Missing supplierId, trying to fix...`);
        
        // Try to get supplierId from the first product
        if (order.items && order.items.length > 0 && order.items[0].productId) {
          const product = order.items[0].productId;
          if (product.supplierId) {
            console.log(`   ✅ Found supplierId from product: ${product.supplierId}`);
            
            // Update the order
            await Order.findByIdAndUpdate(order._id, {
              supplierId: product.supplierId
            });
            
            console.log(`   ✅ Fixed order ${order.orderNumber}`);
            fixedCount++;
          } else {
            console.log(`   ❌ Product has no supplierId`);
          }
        } else {
          console.log(`   ❌ No products found in order`);
        }
      } else {
        console.log(`   ✅ Order has supplierId: ${order.supplierId}`);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} orders!`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const ordersAfterFix = await Order.find({})
      .populate('supplierId', 'name email role')
      .lean();
    
    const ordersWithMissingSupplier = ordersAfterFix.filter(order => !order.supplierId);
    if (ordersWithMissingSupplier.length > 0) {
      console.log(`❌ Still have ${ordersWithMissingSupplier.length} orders with missing supplierId`);
    } else {
      console.log('✅ All orders now have supplierId!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixOrders(); 