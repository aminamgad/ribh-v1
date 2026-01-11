const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Collection names in the database
const COLLECTIONS = [
  'users',
  'products',
  'orders',
  'categories',
  'chats',
  'messages',
  'comments',
  'notifications',
  'wallets',
  'withdrawalrequests',
  'packages',
  'packagetypes',
  'villages',
  'externalcompanies',
  'fulfillmentrequests',
  'storeintegrations',
  'systemsettings',
  'favorites',
  'counters',
];

// Fields to exclude or mask in export (sensitive data)
const SENSITIVE_FIELDS = {
  users: {
    exclude: ['password', '__v'],
    mask: []
  },
  externalcompanies: {
    exclude: ['apiSecret', '__v'],
    mask: ['apiKey'] // Mask API keys
  },
  wallets: {
    exclude: ['__v'],
    mask: []
  },
  // Add more collections as needed
};

/**
 * Mask sensitive data
 */
function maskSensitiveData(data, collectionName) {
  if (!SENSITIVE_FIELDS[collectionName]) {
    return data;
  }

  const config = SENSITIVE_FIELDS[collectionName];
  const masked = JSON.parse(JSON.stringify(data));

  // Exclude fields
  if (config.exclude) {
    config.exclude.forEach(field => {
      delete masked[field];
    });
  }

  // Mask fields (show partial value)
  if (config.mask) {
    config.mask.forEach(field => {
      if (masked[field]) {
        const value = String(masked[field]);
        if (value.length > 8) {
          masked[field] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
        } else {
          masked[field] = '***';
        }
      }
    });
  }

  return masked;
}

/**
 * Convert MongoDB ObjectId to string recursively
 */
function convertObjectIds(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof mongoose.Types.ObjectId) {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectIds(item));
  }

  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertObjectIds(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

/**
 * Export a single collection
 */
async function exportCollection(db, collectionName, outputDir, includeEmpty = false) {
  try {
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();

    if (count === 0 && !includeEmpty) {
      console.log(`${colors.yellow}⏭️  Skipping ${collectionName} (empty)${colors.reset}`);
      return { collectionName, count: 0, exported: false };
    }

    console.log(`${colors.cyan}📦 Exporting ${collectionName}... (${count} documents)${colors.reset}`);

    // Get all documents
    const documents = await collection.find({}).toArray();

    // Process documents
    const processedDocuments = documents.map(doc => {
      let processed = convertObjectIds(doc);
      processed = maskSensitiveData(processed, collectionName.toLowerCase());
      return processed;
    });

    // Create export data with metadata
    const exportData = {
      metadata: {
        collection: collectionName,
        exportedAt: new Date().toISOString(),
        totalDocuments: count,
        version: '1.0.0',
        database: db.databaseName
      },
      data: processedDocuments
    };

    // Save to file
    const fileName = `${collectionName}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log(`${colors.green}✅ Exported ${collectionName}: ${count} documents → ${filePath}${colors.reset}`);
    
    return { collectionName, count, exported: true, filePath };
  } catch (error) {
    console.error(`${colors.red}❌ Error exporting ${collectionName}: ${error.message}${colors.reset}`);
    return { collectionName, count: 0, exported: false, error: error.message };
  }
}

/**
 * Export all collections
 */
async function exportAllCollections(db, outputDir, collections = COLLECTIONS, includeEmpty = false) {
  const results = [];
  
  console.log(`${colors.bright}${colors.blue}📊 Starting database export...${colors.reset}\n`);

  for (const collectionName of collections) {
    const result = await exportCollection(db, collectionName, outputDir, includeEmpty);
    results.push(result);
  }

  return results;
}

/**
 * Create summary report
 */
function createSummaryReport(results, outputDir) {
  const totalCollections = results.length;
  const exportedCollections = results.filter(r => r.exported).length;
  const skippedCollections = results.filter(r => !r.exported && r.count === 0).length;
  const failedCollections = results.filter(r => !r.exported && r.error).length;
  const totalDocuments = results.reduce((sum, r) => sum + (r.count || 0), 0);

  const summary = {
    exportInfo: {
      exportedAt: new Date().toISOString(),
      totalCollections,
      exportedCollections,
      skippedCollections,
      failedCollections,
      totalDocuments
    },
    collections: results.map(r => ({
      name: r.collectionName,
      exported: r.exported,
      documentCount: r.count || 0,
      filePath: r.filePath || null,
      error: r.error || null
    }))
  };

  const summaryPath = path.join(outputDir, '_export_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  return summary;
}

/**
 * Export all collections to a single JSON file
 */
async function exportToSingleFile(db, outputDir, collections = COLLECTIONS, includeEmpty = false) {
  const allData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      database: db.databaseName,
      version: '1.0.0',
      totalCollections: 0,
      totalDocuments: 0
    },
    collections: {}
  };

  console.log(`${colors.bright}${colors.blue}📊 Exporting all data to single file...${colors.reset}\n`);

  // Get available collections
  const availableCollections = await db.listCollections().toArray();
  const collectionNames = availableCollections.map(c => c.name);

  for (const collectionName of collectionNames) {
    try {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      if (count === 0 && !includeEmpty) {
        console.log(`${colors.yellow}⏭️  Skipping ${collectionName} (empty)${colors.reset}`);
        continue;
      }

      console.log(`${colors.cyan}📦 Exporting ${collectionName}... (${count} documents)${colors.reset}`);

      // Get all documents
      const documents = await collection.find({}).toArray();

      // Process documents
      const processedDocuments = documents.map(doc => {
        let processed = convertObjectIds(doc);
        processed = maskSensitiveData(processed, collectionName.toLowerCase());
        return processed;
      });

      allData.collections[collectionName] = {
        metadata: {
          collection: collectionName,
          documentCount: count
        },
        data: processedDocuments
      };

      allData.metadata.totalCollections++;
      allData.metadata.totalDocuments += count;

      console.log(`${colors.green}✅ Exported ${collectionName}: ${count} documents${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Error exporting ${collectionName}: ${error.message}${colors.reset}`);
    }
  }

  // Save to single file
  const fileName = `database-full-export-${new Date().toISOString().split('T')[0]}.json`;
  const filePath = path.join(outputDir, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf8');

  console.log(`\n${colors.bright}${colors.green}✅ All data exported to: ${filePath}${colors.reset}`);
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  📊 Collections: ${allData.metadata.totalCollections}`);
  console.log(`  📄 Total Documents: ${allData.metadata.totalDocuments}`);
  console.log(`  💾 File Size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB\n`);

  return {
    filePath,
    metadata: allData.metadata,
    collections: Object.keys(allData.collections)
  };
}

/**
 * Main export function
 */
async function exportDatabase() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const collectionArg = args.find(arg => arg.startsWith('--collection='));
    const outputArg = args.find(arg => arg.startsWith('--output='));
    const includeEmptyArg = args.includes('--include-empty');
    const singleFileArg = args.includes('--single-file');

    const specificCollection = collectionArg ? collectionArg.split('=')[1] : null;
    const outputDir = outputArg 
      ? path.resolve(outputArg.split('=')[1])
      : path.join(__dirname, '..', 'database-export', new Date().toISOString().split('T')[0]);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`${colors.green}📁 Created output directory: ${outputDir}${colors.reset}\n`);
    }

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce';
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log(`${colors.cyan}🔌 Connecting to MongoDB...${colors.reset}`);
    await mongoose.connect(MONGODB_URI);
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}\n`);

    const db = mongoose.connection.db;
    const dbName = db.databaseName;

    console.log(`${colors.bright}Database: ${dbName}${colors.reset}`);
    console.log(`${colors.bright}Output Directory: ${outputDir}${colors.reset}`);
    console.log(`${colors.bright}Mode: ${singleFileArg ? 'Single File' : 'Multiple Files'}${colors.reset}\n`);

    let results;

    // Export to single file or multiple files
    if (singleFileArg) {
      // Export all to single file
      if (specificCollection) {
        console.log(`${colors.yellow}⚠️  --single-file ignores --collection. Exporting all collections.${colors.reset}\n`);
      }
      
      const exportResult = await exportToSingleFile(db, outputDir, COLLECTIONS, includeEmptyArg);
      
      console.log(`\n${colors.bright}${colors.green}✅ Export completed!${colors.reset}\n`);
      console.log(`${colors.bright}Export File:${colors.reset}`);
      console.log(`  📄 ${exportResult.filePath}`);
      console.log(`  📊 Collections: ${exportResult.metadata.totalCollections}`);
      console.log(`  📄 Total Documents: ${exportResult.metadata.totalDocuments}\n`);

      // Disconnect
      await mongoose.disconnect();
      console.log(`${colors.green}👋 Disconnected from MongoDB${colors.reset}`);

      process.exit(0);
    }

    // Export specific collection or all (multiple files)
    if (specificCollection) {
      console.log(`${colors.yellow}📌 Exporting single collection: ${specificCollection}${colors.reset}\n`);
      results = [await exportCollection(db, specificCollection, outputDir, includeEmptyArg)];
    } else {
      // Get available collections
      const availableCollections = await db.listCollections().toArray();
      const collectionNames = availableCollections.map(c => c.name);

      console.log(`${colors.cyan}📋 Found ${collectionNames.length} collections${colors.reset}\n`);

      results = await exportAllCollections(db, outputDir, collectionNames, includeEmptyArg);
    }

    // Create summary report
    console.log(`\n${colors.cyan}📝 Creating summary report...${colors.reset}`);
    const summary = createSummaryReport(results, outputDir);
    
    console.log(`\n${colors.bright}${colors.green}✅ Export completed!${colors.reset}\n`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  📊 Total Collections: ${summary.exportInfo.totalCollections}`);
    console.log(`  ✅ Exported: ${summary.exportInfo.exportedCollections}`);
    console.log(`  ⏭️  Skipped (empty): ${summary.exportInfo.skippedCollections}`);
    console.log(`  ❌ Failed: ${summary.exportInfo.failedCollections}`);
    console.log(`  📄 Total Documents: ${summary.exportInfo.totalDocuments}`);
    console.log(`\n📁 Export Location: ${outputDir}`);
    console.log(`📋 Summary Report: ${path.join(outputDir, '_export_summary.json')}\n`);

    // Disconnect
    await mongoose.disconnect();
    console.log(`${colors.green}👋 Disconnected from MongoDB${colors.reset}`);

    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}❌ Fatal Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  console.log(`
${colors.bright}${colors.blue}
╔════════════════════════════════════════════╗
║     Database Export Tool - Ribh Platform   ║
╚════════════════════════════════════════════╝
${colors.reset}

Usage:
  node scripts/export-database.js [options]

Options:
  --collection=<name>    Export specific collection only (ignored with --single-file)
  --output=<path>       Output directory (default: ./database-export/YYYY-MM-DD)
  --include-empty       Include empty collections
  --single-file         Export all collections to a single JSON file

Examples:
  node scripts/export-database.js
  node scripts/export-database.js --single-file
  node scripts/export-database.js --collection=users
  node scripts/export-database.js --single-file --output=./my-backup
  node scripts/export-database.js --output=./backups

${colors.reset}
  `);

  exportDatabase();
}

module.exports = { exportDatabase };

