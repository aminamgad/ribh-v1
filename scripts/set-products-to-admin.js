/**
 * Script to set all products in the database to be under "الإدارة" (Administration).
 * Sets supplierId of every product to the first admin user's _id.
 *
 * Usage: node scripts/set-products-to-admin.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

let Product;
let User;

try {
  Product = require('../models/Product').default;
} catch (e) {
  const productSchema = new mongoose.Schema({
    name: String,
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }, { timestamps: true });
  Product = mongoose.models.Product || mongoose.model('Product', productSchema);
}

try {
  User = require('../models/User').default;
} catch (e) {
  const userSchema = new mongoose.Schema({
    name: String,
    role: String
  }, { timestamps: true });
  User = mongoose.models.User || mongoose.model('User', userSchema);
}

async function setProductsToAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const adminUser = await User.findOne({ role: 'admin' }).select('_id name').lean();
    if (!adminUser) {
      console.error('❌ No admin user found in the database. Create an admin user first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const adminId = adminUser._id;
    console.log('📌 Admin user (الإدارة):', adminUser.name || adminId.toString(), '\n');

    const totalProducts = await Product.countDocuments({});
    console.log('📋 Total products:', totalProducts);

    if (totalProducts === 0) {
      console.log('✅ No products to update. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    const result = await Product.updateMany(
      {},
      { $set: { supplierId: adminId } }
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 Result:');
    console.log('='.repeat(60));
    console.log('  Matched:', result.matchedCount);
    console.log('  Modified:', result.modifiedCount);
    console.log('='.repeat(60));
    console.log('\n✅ All products are now under الإدارة (admin user).');
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setProductsToAdmin();
