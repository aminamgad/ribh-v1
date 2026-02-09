/**
 * Script to delete all products from the database
 * 
 * WARNING: This will permanently delete ALL products!
 * This action cannot be undone.
 * 
 * Usage: node scripts/delete-products.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

// Import Product model
let Product;
try {
  Product = require('../models/Product').default;
} catch (e) {
  // Fallback: define Product model if import fails
  const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    marketingText: String,
    images: [String],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplierPrice: Number,
    marketerPrice: Number,
    wholesalerPrice: Number,
    minimumSellingPrice: Number,
    isMinimumPriceMandatory: Boolean,
    stockQuantity: Number,
    isActive: Boolean,
    isLocked: Boolean,
    isApproved: Boolean,
    isRejected: Boolean,
    isFulfilled: Boolean,
    tags: [String],
    sku: String
  }, { timestamps: true });

  Product = mongoose.models.Product || mongoose.model('Product', productSchema);
}

async function deleteProducts() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get product count and statistics
    console.log('📋 Analyzing products...');
    const totalProducts = await Product.countDocuments({});
    console.log(`📊 Total products found: ${totalProducts}\n`);

    if (totalProducts === 0) {
      console.log('✅ No products to delete. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get product statistics by status
    const statusStats = await Product.aggregate([
      {
        $group: {
          _id: {
            isActive: '$isActive',
            isApproved: '$isApproved',
            isRejected: '$isRejected',
            isLocked: '$isLocked'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('📊 Products by status:');
    console.log('='.repeat(80));
    statusStats.forEach(stat => {
      const status = stat._id;
      const statusStr = [
        status.isActive ? 'Active' : 'Inactive',
        status.isApproved ? 'Approved' : 'Not Approved',
        status.isRejected ? 'Rejected' : '',
        status.isLocked ? 'Locked' : ''
      ].filter(Boolean).join(', ');
      console.log(`  ${statusStr || 'N/A'}: ${stat.count} product(s)`);
    });
    console.log('');

    // Get statistics by supplier
    const supplierStats = await Product.aggregate([
      {
        $group: {
          _id: '$supplierId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log('📊 Top 10 suppliers by product count:');
    console.log('='.repeat(80));
    supplierStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. Supplier ID: ${stat._id}: ${stat.count} product(s)`);
    });
    console.log('');

    // Get total stock quantity
    const stockResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stockQuantity' }
        }
      }
    ]);
    const totalStock = stockResult[0]?.totalStock || 0;

    console.log(`📦 Total stock quantity: ${totalStock.toLocaleString()} units\n`);

    // Get products with variants
    const productsWithVariants = await Product.countDocuments({ hasVariants: true });
    console.log(`🔄 Products with variants: ${productsWithVariants}\n`);

    console.log('⚠️  WARNING: You are about to delete ALL products!');
    console.log('⚠️  This action cannot be undone!\n');

    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with deletion
    console.log('🗑️  Deleting products...');

    // Delete products in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;
    let errorCount = 0;

    // Get total count for progress tracking
    let processedCount = 0;

    while (processedCount < totalProducts) {
      try {
        // Get a batch of product IDs
        const batch = await Product.find({})
          .select('_id name')
          .limit(batchSize)
          .lean();
        
        if (batch.length === 0) {
          // No more products to delete
          break;
        }

        // Extract IDs
        const productIds = batch.map(product => product._id);
        
        // Delete the batch
        const result = await Product.deleteMany({ _id: { $in: productIds } });
        
        deletedCount += result.deletedCount;
        processedCount += result.deletedCount;
        
        const progress = ((processedCount / totalProducts) * 100).toFixed(1);
        console.log(`  ✅ Deleted ${deletedCount} product(s) [${progress}%]`);
      } catch (error) {
        errorCount += batchSize;
        console.error(`  ❌ Error deleting batch:`, error.message);
        break;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Deletion Summary:');
    console.log('='.repeat(80));
    console.log(`  Total products before: ${totalProducts}`);
    console.log(`  Products deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount}`);
    }
    console.log('='.repeat(80));

    // Verify final count
    const remainingProducts = await Product.countDocuments({});
    console.log(`\n✅ Verification: ${remainingProducts} product(s) remaining in database`);

    if (remainingProducts === 0) {
      console.log('✅ All products have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: Expected 0 products, but found ${remainingProducts}`);
      console.log('   You may need to run the script again to delete remaining products.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting products:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
deleteProducts();

