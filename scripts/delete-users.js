/**
 * Script to delete all users except protected accounts
 * 
 * Protected accounts:
 * - gheras1@gmail.com
 * - abdallah-labeeb@ribh.net
 * - gheras2@gmail.com
 * - admin@ribh.com
 * - amin@marketer.com
 * 
 * Usage: node scripts/delete-users.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
let User;
try {
  User = require('../models/User').default;
} catch (e) {
  // Fallback: define User model if import fails
  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, lowercase: true },
    phone: String,
    password: String,
    role: { type: String, enum: ['admin', 'supplier', 'marketer', 'wholesaler'], default: 'marketer' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }
  }, { timestamps: true });

  User = mongoose.models.User || mongoose.model('User', userSchema);
}

// Protected email addresses (case-insensitive)
const PROTECTED_EMAILS = [
  'gheras1@gmail.com',
  'abdallah-labeeb@ribh.net',
  'gheras2@gmail.com',
  'admin@ribh.com',
  'amin@marketer.com'
].map(email => email.toLowerCase());

async function deleteUsers() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    console.log('📋 Fetching all users...');
    const allUsers = await User.find({}).select('_id email name role');
    console.log(`📊 Total users found: ${allUsers.length}\n`);

    // Separate protected and deletable users
    const protectedUsers = [];
    const deletableUsers = [];

    allUsers.forEach(user => {
      const email = user.email?.toLowerCase();
      if (email && PROTECTED_EMAILS.includes(email)) {
        protectedUsers.push(user);
      } else {
        deletableUsers.push(user);
      }
    });

    // Display protected users
    console.log('🛡️  Protected users (will NOT be deleted):');
    console.log('='.repeat(80));
    if (protectedUsers.length === 0) {
      console.log('  No protected users found');
    } else {
      protectedUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'N/A'}, ${user.role || 'N/A'})`);
      });
    }
    console.log('');

    // Display users to be deleted
    console.log('🗑️  Users to be deleted:');
    console.log('='.repeat(80));
    if (deletableUsers.length === 0) {
      console.log('  No users to delete');
    } else {
      deletableUsers.forEach(user => {
        console.log(`  - ${user.email || 'N/A'} (${user.name || 'N/A'}, ${user.role || 'N/A'})`);
      });
    }
    console.log('');

    // Confirm deletion
    if (deletableUsers.length === 0) {
      console.log('✅ No users to delete. Exiting...');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`⚠️  WARNING: You are about to delete ${deletableUsers.length} user(s)!`);
    console.log('⚠️  This action cannot be undone!\n');

    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with deletion
    console.log('🗑️  Deleting users...');

    // Delete users in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < deletableUsers.length; i += batchSize) {
      const batch = deletableUsers.slice(i, i + batchSize);
      const userIds = batch.map(u => u._id);

      try {
        const result = await User.deleteMany({ _id: { $in: userIds } });
        deletedCount += result.deletedCount;
        console.log(`  ✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${result.deletedCount} user(s)`);
      } catch (error) {
        errorCount += batch.length;
        console.error(`  ❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Deletion Summary:');
    console.log('='.repeat(80));
    console.log(`  Total users before: ${allUsers.length}`);
    console.log(`  Protected users: ${protectedUsers.length}`);
    console.log(`  Users deleted: ${deletedCount}`);
    if (errorCount > 0) {
      console.log(`  Errors: ${errorCount}`);
    }
    console.log(`  Remaining users: ${protectedUsers.length}`);
    console.log('='.repeat(80));

    // Verify final count
    const remainingUsers = await User.countDocuments({});
    console.log(`\n✅ Verification: ${remainingUsers} user(s) remaining in database`);

    if (remainingUsers === protectedUsers.length) {
      console.log('✅ All non-protected users have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: Expected ${protectedUsers.length} users, but found ${remainingUsers}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
deleteUsers();

