const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Update the Order collection schema
async function updateOrderSchema() {
  try {
    console.log('🔄 Updating Order schema...');
    
    // Get the Order model
    const Order = require('../models/Order').default;
    
    // Update all existing orders to ensure they have valid status values
    const orders = await Order.find({});
    console.log(`📊 Found ${orders.length} orders to check`);
    
    let updatedCount = 0;
    
    for (const order of orders) {
      let needsUpdate = false;
      
      // Check if status is valid
      const validStatuses = [
        'pending',
        'confirmed', 
        'processing',
        'ready_for_shipping',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'refunded'
      ];
      
      if (!validStatuses.includes(order.status)) {
        console.log(`⚠️ Order ${order.orderNumber} has invalid status: ${order.status}, updating to 'pending'`);
        order.status = 'pending';
        needsUpdate = true;
      }
      
      // Ensure all required fields exist
      if (!order.orderNumber) {
        console.log(`⚠️ Order ${order._id} missing orderNumber, generating...`);
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        order.orderNumber = `ORD-${year}${month}${day}-${random}`;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await order.save();
        updatedCount++;
        console.log(`✅ Updated order ${order.orderNumber}`);
      }
    }
    
    console.log(`✅ Schema update complete. Updated ${updatedCount} orders.`);
    
    // Test creating a new order with the new status
    console.log('🧪 Testing new order creation with ready_for_shipping status...');
    
    const testOrder = new Order({
      orderNumber: 'TEST-ORDER-001',
      customerId: new mongoose.Types.ObjectId(),
      customerRole: 'marketer',
      supplierId: new mongoose.Types.ObjectId(),
      items: [{
        productId: new mongoose.Types.ObjectId(),
        productName: 'Test Product',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        priceType: 'marketer'
      }],
      subtotal: 100,
      commission: 10,
      total: 110,
      status: 'ready_for_shipping',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddress: {
        fullName: 'Test User',
        phone: '123456789',
        street: 'Test Street',
        city: 'Test City',
        governorate: 'Test Governorate'
      }
    });
    
    await testOrder.save();
    console.log('✅ Test order created successfully with ready_for_shipping status');
    
    // Clean up test order
    await Order.findByIdAndDelete(testOrder._id);
    console.log('🧹 Test order cleaned up');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    await updateOrderSchema();
    console.log('🎉 Database schema update completed successfully!');
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
main();
