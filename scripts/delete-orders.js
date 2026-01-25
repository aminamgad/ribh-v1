/**
 * Script to delete all orders from the database
 * 
 * WARNING: This will permanently delete ALL orders!
 * This action cannot be undone.
 * 
 * Usage: node scripts/delete-orders.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import Order model
let Order;
try {
  Order = require('../models/Order').default;
} catch (e) {
  // Fallback: define Order model if import fails
  const orderSchema = new mongoose.Schema({
    orderNumber: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [mongoose.Schema.Types.Mixed],
    subtotal: Number,
    shippingCost: Number,
    total: Number,
    status: String,
    paymentStatus: String
  }, { timestamps: true });

  Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
}

async function deleteOrders() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get order count and statistics
    console.log('📋 Analyzing orders...');
    const totalOrders = await Order.countDocuments({});
    console.log(`📊 Total orders found: ${totalOrders}\n`);

    if (totalOrders === 0) {
      console.log('✅ No orders to delete. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get order statistics by status
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Orders by status:');
    console.log('='.repeat(80));
    statusStats.forEach(stat => {
      console.log(`  ${stat._id || 'N/A'}: ${stat.count} order(s), Total: ${stat.totalAmount?.toFixed(2) || '0.00'} ₪`);
    });
    console.log('');

    // Get total amount
    const totalAmountResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' }
        }
      }
    ]);
    const totalAmount = totalAmountResult[0]?.totalAmount || 0;

    console.log(`💰 Total order value: ${totalAmount.toFixed(2)} ₪\n`);

    console.log('⚠️  WARNING: You are about to delete ALL orders!');
    console.log('⚠️  This action cannot be undone!\n');

    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with deletion
    console.log('🗑️  Deleting orders...');

    // Delete orders in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;
    let errorCount = 0;

    // Get total count for progress tracking
    let processedCount = 0;

    while (processedCount < totalOrders) {
      try {
        // Get a batch of order IDs
        const batch = await Order.find({})
          .select('_id')
          .limit(batchSize)
          .lean();
        
        if (batch.length === 0) {
          // No more orders to delete
          break;
        }

        // Extract IDs
        const orderIds = batch.map(order => order._id);
        
        // Delete the batch
        const result = await Order.deleteMany({ _id: { $in: orderIds } });
        
        deletedCount += result.deletedCount;
        processedCount += result.deletedCount;
        
        const progress = ((processedCount / totalOrders) * 100).toFixed(1);
        console.log(`  ✅ Deleted ${deletedCount} order(s) [${progress}%]`);
      } catch (error) {
        errorCount += batchSize;
        console.error(`  ❌ Error deleting batch:`, error.message);
        break;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Deletion Summary:');
    console.log('='.repeat(80));
    console.log(`  Total orders before: ${totalOrders}`);
    console.log(`  Orders deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount}`);
    }
    console.log('='.repeat(80));

    // Verify final count
    const remainingOrders = await Order.countDocuments({});
    console.log(`\n✅ Verification: ${remainingOrders} order(s) remaining in database`);

    if (remainingOrders === 0) {
      console.log('✅ All orders have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: Expected 0 orders, but found ${remainingOrders}`);
      console.log('   You may need to run the script again to delete remaining orders.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting orders:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
deleteOrders();

