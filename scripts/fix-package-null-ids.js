const mongoose = require('mongoose');
require('dotenv').config();

async function fixPackageNullIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Package = mongoose.models.Package || mongoose.model('Package', new mongoose.Schema({}, { strict: false }));

    // Find all packages with null packageId
    const packagesWithNullId = await Package.find({ packageId: null }).lean();
    console.log(`\n📦 Found ${packagesWithNullId.length} packages with null packageId`);

    if (packagesWithNullId.length > 0) {
      // Get Counter model
      const Counter = mongoose.models.Counter || mongoose.model('Counter', new mongoose.Schema({
        _id: String,
        sequence: Number
      }));

      // Get or create counter
      let counter = await Counter.findById('packageId');
      if (!counter) {
        counter = new Counter({ _id: 'packageId', sequence_value: 0 });
        await counter.save();
      }

      // Get current sequence value
      let currentSequence = counter.sequence_value || 0;

      // Assign packageIds to null packages
      for (const pkg of packagesWithNullId) {
        currentSequence += 1;
        await Package.findByIdAndUpdate(pkg._id, { packageId: currentSequence });
        console.log(`   ✅ Assigned packageId ${currentSequence} to package ${pkg._id}`);
      }

      // Update counter
      counter.sequence_value = currentSequence;
      await counter.save();
      console.log(`\n✅ Updated counter to ${currentSequence}`);
    }

    // Drop and recreate the index to ensure sparse: true
    try {
      await Package.collection.dropIndex('packageId_1');
      console.log('\n✅ Dropped old packageId index');
    } catch (error) {
      if (error.code !== 27) { // Index not found
        console.log('⚠️  Could not drop index (may not exist):', error.message);
      }
    }

    // Recreate index with sparse: true
    await Package.collection.createIndex({ packageId: 1 }, { unique: true, sparse: true });
    console.log('✅ Created new sparse unique index on packageId');

    console.log('\n✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixPackageNullIds();
}

module.exports = { fixPackageNullIds };

