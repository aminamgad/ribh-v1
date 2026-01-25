require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Define Order schema inline since importing TS model is problematic
    const orderSchema = new mongoose.Schema({
      orderNumber: Number,
      status: String,
      shippingCompany: String,
      shippingAddress: {
        fullName: String,
        phone: String,
        street: String,
        city: String,
        governorate: String,
        villageId: Number,
        villageName: String
      },
      total: Number,
      items: [mongoose.Schema.Types.Mixed]
    });
    
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
    const order = await Order.findOne({ orderNumber: 100048 })
      .populate('shippingAddress.villageId')
      .lean();
      
    if (!order) {
      console.log('Order 100048 not found');
      return;
    }
    
    console.log('\n=== Order 100048 Details ===');
    console.log('Order Number:', order.orderNumber);
    console.log('Status:', order.status);
    console.log('Shipping Company:', order.shippingCompany || 'NOT SET');
    console.log('');
    
    console.log('=== Shipping Address ===');
    if (!order.shippingAddress) {
      console.log('NO SHIPPING ADDRESS');
    } else {
      console.log('Full Name:', order.shippingAddress.fullName || 'MISSING');
      console.log('Phone:', order.shippingAddress.phone || 'MISSING');
      console.log('Street:', order.shippingAddress.street || 'MISSING');
      console.log('City:', order.shippingAddress.city || 'MISSING');
      console.log('Governorate:', order.shippingAddress.governorate || 'MISSING');
      console.log('Village ID:', order.shippingAddress.villageId || 'MISSING');
      console.log('Village Name:', order.shippingAddress.villageName || 'MISSING');
    }
    
    console.log('\n=== Issues Found ===');
    const issues = [];
    if (!order.shippingAddress) {
      issues.push('- Complete shipping address missing');
    } else {
      if (!order.shippingAddress.fullName) issues.push('- Full name missing');
      if (!order.shippingAddress.phone) issues.push('- Phone number missing');
      if (!order.shippingAddress.villageId) issues.push('- Village ID missing');
      if (!order.shippingAddress.street) issues.push('- Street address missing');
    }
    
    if (issues.length === 0) {
      console.log('No obvious issues found');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    
    console.log('\n=== Total and Items ===');
    console.log('Total:', order.total || 'MISSING');
    console.log('Items count:', order.items ? order.items.length : 'NO ITEMS');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrder();
