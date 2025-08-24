const mongoose = require('mongoose');
require('dotenv').config();

async function testOrderNumbering() {
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
      status: String
    }));

    // Test the counter
    console.log('Testing counter initialization...');
    const counter = await Counter.findByIdAndUpdate(
      'orderNumber',
      { $setOnInsert: { sequence_value: 100000 } },
      { upsert: true, new: true }
    );
    console.log('Current counter value:', counter.sequence_value);

    // Test generating a new order number
    console.log('Testing order number generation...');
    const newCounter = await Counter.findByIdAndUpdate(
      'orderNumber',
      { $inc: { sequence_value: 1 } },
      { new: true }
    );
    console.log('New order number would be:', newCounter.sequence_value);

    // Check existing orders
    console.log('Checking existing orders...');
    const existingOrders = await Order.find().limit(5).sort({ createdAt: -1 });
    console.log('Sample existing orders:');
    existingOrders.forEach(order => {
      console.log(`- Order ${order._id}: ${order.orderNumber}`);
    });

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing order numbering:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testOrderNumbering();
