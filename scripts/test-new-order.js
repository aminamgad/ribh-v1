const mongoose = require('mongoose');
require('dotenv').config();

async function testNewOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import the actual models
    const Counter = require('../models/Counter').default;
    const Order = require('../models/Order').default;

    // Check current counter value
    const counter = await Counter.findById('orderNumber');
    console.log('Current counter value:', counter?.sequence_value || 'Not found');

    // Create a test order using the actual Order model
    console.log('Creating test order...');
    const testOrder = new Order({
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
      shippingCost: 0,
      commission: 10,
      total: 100,
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippingAddress: {
        fullName: 'Test Customer',
        phone: '123456789',
        street: 'Test Street',
        city: 'Test City',
        governorate: 'Test Governorate'
      }
    });

    await testOrder.save();
    console.log('Test order created with number:', testOrder.orderNumber);

    // Check counter value after order creation
    const newCounter = await Counter.findById('orderNumber');
    console.log('Counter value after order creation:', newCounter?.sequence_value);

    // Clean up - delete the test order
    await Order.findByIdAndDelete(testOrder._id);
    console.log('Test order deleted');

    console.log('Test completed successfully');

  } catch (error) {
    console.error('Error testing new order:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testNewOrder();
