const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function initCounter() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Counter = mongoose.model('Counter', new mongoose.Schema({
      _id: String,
      sequence_value: { type: Number, default: 100000 }
    }));

    // Initialize the counter if it doesn't exist
    const counter = await Counter.findByIdAndUpdate(
      'orderNumber',
      { $setOnInsert: { sequence_value: 100000 } },
      { upsert: true, new: true }
    );

    console.log('Counter initialized with value:', counter.sequence_value);
    
    // Check if there are existing orders and update counter if needed
    try {
      const Order = mongoose.model('Order', new mongoose.Schema({
        orderNumber: String,
        customerId: String,
        supplierId: String,
        items: Array,
        subtotal: Number,
        total: Number,
        status: String
      }));
      
      const maxOrderNumber = await Order.findOne().sort({ orderNumber: -1 });
      
      if (maxOrderNumber && maxOrderNumber.orderNumber) {
        const currentNumber = parseInt(maxOrderNumber.orderNumber);
        if (currentNumber >= 100000) {
          await Counter.findByIdAndUpdate('orderNumber', { sequence_value: currentNumber + 1 });
          console.log('Updated counter to:', currentNumber + 1);
        }
      }
    } catch (error) {
      console.log('No existing orders found or error checking orders:', error.message);
    }

    console.log('Counter initialization completed successfully');
  } catch (error) {
    console.error('Error initializing counter:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

initCounter();
