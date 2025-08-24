const mongoose = require('mongoose');
require('dotenv').config();

async function migrateOrderNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import the models
    const Counter = mongoose.model('Counter', new mongoose.Schema({
      _id: String,
      sequence_value: { type: Number, default: 100000 }
    }));

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

    // Get all orders sorted by creation date (oldest first)
    console.log('Fetching all orders...');
    const orders = await Order.find().sort({ createdAt: 1 });
    console.log(`Found ${orders.length} orders to migrate`);

    if (orders.length === 0) {
      console.log('No orders to migrate');
      return;
    }

    // Start from 100000
    let currentNumber = 100000;

    // Update each order with a new sequential number
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const oldNumber = order.orderNumber;
      const newNumber = currentNumber.toString();
      
      console.log(`Migrating order ${i + 1}/${orders.length}: ${oldNumber} -> ${newNumber}`);
      
      await Order.findByIdAndUpdate(order._id, { orderNumber: newNumber });
      currentNumber++;
    }

    // Update the counter to the next available number
    await Counter.findByIdAndUpdate('orderNumber', { sequence_value: currentNumber });
    console.log(`Counter updated to: ${currentNumber}`);

    console.log('Migration completed successfully!');
    console.log(`Migrated ${orders.length} orders to sequential numbering starting from 100000`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateOrderNumbers();
