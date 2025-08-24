const mongoose = require('mongoose');
require('dotenv').config();

async function testSimpleOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Counter model
    const Counter = mongoose.model('Counter', new mongoose.Schema({
      _id: String,
      sequence_value: { type: Number, default: 100000 }
    }));

    // Create Order model with pre-save middleware
    const orderSchema = new mongoose.Schema({
      orderNumber: {
        type: String,
        unique: true,
        default: 'PENDING'
      },
      customerId: String,
      supplierId: String,
      items: Array,
      subtotal: Number,
      total: Number,
      status: String
    });

    // Add pre-save middleware
    orderSchema.pre('save', async function(next) {
      if (!this.orderNumber || this.orderNumber === 'PENDING') {
        try {
          const counter = await Counter.findByIdAndUpdate(
            'orderNumber',
            { $inc: { sequence_value: 1 } },
            { new: true, upsert: true }
          );
          this.orderNumber = counter.sequence_value.toString();
        } catch (error) {
          console.error('Error generating order number:', error);
          this.orderNumber = Date.now().toString();
        }
      }
      next();
    });

    const Order = mongoose.model('TestOrder', orderSchema);

    // Check current counter
    const counter = await Counter.findById('orderNumber');
    console.log('Current counter value:', counter?.sequence_value || 'Not found');

    // Create test order
    console.log('Creating test order...');
    const testOrder = new Order({
      customerId: 'test-customer',
      supplierId: 'test-supplier',
      items: [{ productName: 'Test Product', quantity: 1, price: 100 }],
      subtotal: 100,
      total: 100,
      status: 'pending'
    });

    await testOrder.save();
    console.log('Test order created with number:', testOrder.orderNumber);

    // Check counter after creation
    const newCounter = await Counter.findById('orderNumber');
    console.log('Counter value after order creation:', newCounter?.sequence_value);

    // Clean up
    await Order.findByIdAndDelete(testOrder._id);
    console.log('Test order deleted');

    console.log('Test completed successfully');

  } catch (error) {
    console.error('Error testing simple order:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testSimpleOrder();
