const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');

async function backupOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Order = mongoose.model('Order', new mongoose.Schema({
      orderNumber: String,
      customerId: String,
      supplierId: String,
      items: Array,
      subtotal: Number,
      total: Number,
      status: String,
      createdAt: Date
    }));

    // Get all orders
    console.log('Fetching all orders for backup...');
    const orders = await Order.find().sort({ createdAt: 1 });
    console.log(`Found ${orders.length} orders to backup`);

    if (orders.length === 0) {
      console.log('No orders to backup');
      return;
    }

    // Create backup data
    const backupData = {
      timestamp: new Date().toISOString(),
      totalOrders: orders.length,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt
      }))
    };

    // Save to file
    const backupFile = `order-backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log(`Backup completed successfully!`);
    console.log(`Backup saved to: ${backupFile}`);
    console.log(`Backed up ${orders.length} orders`);

  } catch (error) {
    console.error('Error during backup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

backupOrders();
