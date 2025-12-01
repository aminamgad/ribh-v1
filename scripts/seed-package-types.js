const mongoose = require('mongoose');
require('dotenv').config();
// Import PackageType model - handle both CommonJS and ES modules
let PackageType;
try {
  PackageType = require('../models/PackageType').default;
} catch (e) {
  const mongoose = require('mongoose');
  const packageTypeSchema = new mongoose.Schema({
    typeKey: String,
    name: String,
    nameEn: String,
    description: String,
    baseCost: Number,
    isActive: Boolean
  }, { timestamps: true });
  PackageType = mongoose.models.PackageType || mongoose.model('PackageType', packageTypeSchema);
}

async function seedPackageTypes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Default package types
    const packageTypes = [
      {
        typeKey: 'normal',
        name: 'عادي',
        nameEn: 'Normal',
        description: 'توصيل عادي',
        isActive: true
      },
      {
        typeKey: 'express',
        name: 'سريع',
        nameEn: 'Express',
        description: 'توصيل سريع',
        isActive: true
      },
      {
        typeKey: 'fragile',
        name: 'هش',
        nameEn: 'Fragile',
        description: 'بضاعة هشة - يتطلب عناية خاصة',
        isActive: true
      },
      {
        typeKey: 'heavy',
        name: 'ثقيل',
        nameEn: 'Heavy',
        description: 'بضاعة ثقيلة',
        isActive: true
      },
      {
        typeKey: 'document',
        name: 'مستندات',
        nameEn: 'Documents',
        description: 'مستندات فقط',
        isActive: true
      }
    ];

    let created = 0;
    let updated = 0;

    for (const typeData of packageTypes) {
      try {
        const existing = await PackageType.findOne({ typeKey: typeData.typeKey });

        if (existing) {
          // Update existing
          Object.assign(existing, typeData);
          await existing.save();
          updated++;
          console.log(`🔄 Updated: ${typeData.typeKey}`);
        } else {
          // Create new
          const packageType = new PackageType(typeData);
          await packageType.save();
          created++;
          console.log(`✅ Created: ${typeData.typeKey}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${typeData.typeKey}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   📦 Total: ${packageTypes.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run seed
seedPackageTypes();

