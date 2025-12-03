/**
 * Migration script to add profitsDistributed field to existing orders
 * This script updates all delivered orders to have profitsDistributed: false
 * so they can be processed later if needed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Order from '../models/Order';

async function migrateOrderProfits() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all delivered orders without profitsDistributed field
    const orders = await Order.find({
      status: 'delivered',
      $or: [
        { profitsDistributed: { $exists: false } },
        { profitsDistributed: null }
      ]
    });

    console.log(`📊 Found ${orders.length} delivered orders without profitsDistributed field`);

    if (orders.length === 0) {
      console.log('✅ No orders to migrate');
      await mongoose.disconnect();
      return;
    }

    // Update orders
    let updated = 0;
    for (const order of orders) {
      try {
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            profitsDistributed: false
          }
        });
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`⏳ Updated ${updated}/${orders.length} orders...`);
        }
      } catch (error) {
        console.error(`❌ Error updating order ${order.orderNumber}:`, error);
      }
    }

    console.log(`✅ Migration completed: Updated ${updated} orders`);
    
    // Show statistics
    const distributedCount = await Order.countDocuments({
      status: 'delivered',
      profitsDistributed: true
    });
    
    const notDistributedCount = await Order.countDocuments({
      status: 'delivered',
      profitsDistributed: false
    });

    console.log('\n📈 Statistics:');
    console.log(`   - Orders with profits distributed: ${distributedCount}`);
    console.log(`   - Orders without profits distributed: ${notDistributedCount}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateOrderProfits();

