const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Import Village model - handle both CommonJS and ES modules
let Village;
try {
  Village = require('../models/Village').default;
} catch (e) {
  const mongoose = require('mongoose');
  const villageSchema = new mongoose.Schema({
    villageId: Number,
    villageName: String,
    deliveryCost: Number,
    areaId: Number,
    isActive: Boolean
  }, { timestamps: true });
  Village = mongoose.models.Village || mongoose.model('Village', villageSchema);
}

async function importVillages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read villages JSON file
    const villagesFilePath = path.join(__dirname, '..', 'villages (1).json');
    const villagesData = JSON.parse(fs.readFileSync(villagesFilePath, 'utf8'));

    if (!villagesData.data || !Array.isArray(villagesData.data)) {
      throw new Error('Invalid JSON structure. Expected data array.');
    }

    console.log(`📦 Found ${villagesData.data.length} villages to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Import villages
    for (const villageData of villagesData.data) {
      try {
        // Check if village already exists
        const existing = await Village.findOne({ villageId: villageData.id });

        if (existing) {
          // Update existing village
          existing.villageName = villageData.village_name;
          existing.deliveryCost = villageData.delivery_cost;
          existing.areaId = villageData.area_id;
          existing.isActive = true;
          await existing.save();
          skipped++;
          continue;
        }

        // Create new village
        const village = new Village({
          villageId: villageData.id,
          villageName: villageData.village_name,
          deliveryCost: villageData.delivery_cost,
          areaId: villageData.area_id,
          isActive: true,
          createdAt: villageData.created_at ? new Date(villageData.created_at) : new Date(),
          updatedAt: villageData.updated_at ? new Date(villageData.updated_at) : new Date()
        });

        await village.save();
        imported++;
      } catch (error) {
        console.error(`❌ Error importing village ${villageData.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   🔄 Updated: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${villagesData.data.length}`);

    // Count total villages in database
    const totalVillages = await Village.countDocuments({ isActive: true });
    console.log(`\n📈 Total active villages in database: ${totalVillages}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importVillages();

