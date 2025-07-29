const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh');

// Import models
const Order = require('../models/Order');
const User = require('../models/User');

async function checkOrders() {
  try {
    console.log('🔍 Checking orders data...\n');
    
    // Get all orders
    const orders = await Order.find({})
      .populate('supplierId', 'name email role')
      .populate('customerId', 'name email role')
      .lean();
    
    console.log(`📊 Total orders found: ${orders.length}\n`);
    
    // Check each order
    orders.forEach((order, index) => {
      console.log(`\n📦 Order ${index + 1}:`);
      console.log(`   Order ID: ${order._id}`);
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Status: ${order.status}`);
      
      // Check supplier
      if (order.supplierId) {
        console.log(`   Supplier ID: ${order.supplierId._id || order.supplierId}`);
        console.log(`   Supplier Name: ${order.supplierId.name || 'N/A'}`);
        console.log(`   Supplier Role: ${order.supplierId.role || 'N/A'}`);
      } else {
        console.log(`   ❌ Supplier ID: MISSING!`);
      }
      
      // Check customer
      if (order.customerId) {
        console.log(`   Customer ID: ${order.customerId._id || order.customerId}`);
        console.log(`   Customer Name: ${order.customerId.name || 'N/A'}`);
        console.log(`   Customer Role: ${order.customerId.role || 'N/A'}`);
      } else {
        console.log(`   ❌ Customer ID: MISSING!`);
      }
      
      console.log(`   Total: ${order.total}`);
      console.log(`   Marketer Profit: ${order.marketerProfit || 0}`);
    });
    
    // Check for orders with missing supplierId
    const ordersWithMissingSupplier = orders.filter(order => !order.supplierId);
    if (ordersWithMissingSupplier.length > 0) {
      console.log(`\n❌ Found ${ordersWithMissingSupplier.length} orders with missing supplierId:`);
      ordersWithMissingSupplier.forEach(order => {
        console.log(`   - ${order.orderNumber} (${order._id})`);
      });
    }
    
    // Check for orders with missing customerId
    const ordersWithMissingCustomer = orders.filter(order => !order.customerId);
    if (ordersWithMissingCustomer.length > 0) {
      console.log(`\n❌ Found ${ordersWithMissingCustomer.length} orders with missing customerId:`);
      ordersWithMissingCustomer.forEach(order => {
        console.log(`   - ${order.orderNumber} (${order._id})`);
      });
    }
    
    console.log('\n✅ Order check completed!');
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkOrders(); 