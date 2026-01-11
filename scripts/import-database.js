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

/**
 * Convert string to MongoDB ObjectId
 */
function toObjectId(id) {
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

/**
 * Convert date string to Date object
 */
function toDate(dateStr) {
  if (typeof dateStr === 'string') {
    return new Date(dateStr);
  }
  return dateStr;
}

/**
 * Restore ObjectIds and Dates recursively
 */
function restoreTypes(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => restoreTypes(item));
  }

  if (typeof obj === 'object') {
    const restored = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // Convert _id fields to ObjectId
        if (key === '_id' && typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
          restored[key] = new mongoose.Types.ObjectId(value);
        }
        // Convert fields ending with 'Id' to ObjectId
        else if (key.endsWith('Id') && typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
          restored[key] = new mongoose.Types.ObjectId(value);
        }
        // Convert date fields
        else if ((key === 'createdAt' || key === 'updatedAt' || key === 'date' || key.endsWith('At') || key.endsWith('Date')) && typeof value === 'string') {
          restored[key] = new Date(value);
        }
        // Recursively process nested objects
        else {
          restored[key] = restoreTypes(value);
        }
      }
    }
    return restored;
  }

  return obj;
}

/**
 * Import a single collection from JSON file
 */
async function importCollection(db, filePath, options = {}) {
  const { dropExisting = false, skipDuplicates = true } = options;

  try {
    // Read file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const exportData = JSON.parse(fileContent);

    if (!exportData.data || !Array.isArray(exportData.data)) {
      throw new Error('Invalid export file format');
    }

    const collectionName = exportData.metadata?.collection || path.basename(filePath, '.json');
    const collection = db.collection(collectionName);
    const documents = exportData.data;
    const totalCount = documents.length;

    console.log(`${colors.cyan}📥 Importing ${collectionName}... (${totalCount} documents)${colors.reset}`);

    // Drop existing collection if requested
    if (dropExisting) {
      await collection.drop();
      console.log(`${colors.yellow}🗑️  Dropped existing collection: ${collectionName}${colors.reset}`);
    }

    // Restore ObjectIds and Dates
    const processedDocuments = documents.map(doc => restoreTypes(doc));

    let imported = 0;
    let skipped = 0;

    // Import documents
    if (skipDuplicates && !dropExisting) {
      // Insert only if document doesn't exist
      for (const doc of processedDocuments) {
        try {
          if (doc._id) {
            const existing = await collection.findOne({ _id: doc._id });
            if (existing) {
              skipped++;
              continue;
            }
          }
          await collection.insertOne(doc);
          imported++;
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error
            skipped++;
          } else {
            throw error;
          }
        }
      }
    } else {
      // Insert all documents
      if (processedDocuments.length > 0) {
        await collection.insertMany(processedDocuments, { ordered: false });
        imported = processedDocuments.length;
      }
    }

    console.log(`${colors.green}✅ Imported ${collectionName}: ${imported} new, ${skipped} skipped${colors.reset}`);

    return { collectionName, imported, skipped, total: totalCount };
  } catch (error) {
    console.error(`${colors.red}❌ Error importing ${filePath}: ${error.message}${colors.reset}`);
    return { collectionName: path.basename(filePath, '.json'), imported: 0, skipped: 0, error: error.message };
  }
}

/**
 * Import all collections from a directory
 */
async function importAllCollections(db, importDir, options = {}) {
  const results = [];

  console.log(`${colors.bright}${colors.blue}📥 Starting database import...${colors.reset}\n`);

  // Read all JSON files in directory
  const files = fs.readdirSync(importDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('_'));

  console.log(`${colors.cyan}📋 Found ${files.length} files to import${colors.reset}\n`);

  for (const file of files) {
    const filePath = path.join(importDir, file);
    const result = await importCollection(db, filePath, options);
    results.push(result);
  }

  return results;
}

/**
 * Create import summary
 */
function createImportSummary(results, importDir) {
  const totalFiles = results.length;
  const successfulImports = results.filter(r => !r.error).length;
  const failedImports = results.filter(r => r.error).length;
  const totalImported = results.reduce((sum, r) => sum + (r.imported || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);

  const summary = {
    importInfo: {
      importedAt: new Date().toISOString(),
      totalFiles,
      successfulImports,
      failedImports,
      totalDocumentsImported: totalImported,
      totalDocumentsSkipped: totalSkipped
    },
    collections: results.map(r => ({
      name: r.collectionName,
      imported: r.imported || 0,
      skipped: r.skipped || 0,
      total: r.total || 0,
      error: r.error || null
    }))
  };

  const summaryPath = path.join(importDir, '_import_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  return summary;
}

/**
 * Import from single file containing all collections
 */
async function importFromSingleFile(db, filePath, options = {}) {
  const { dropExisting = false, skipDuplicates = true } = options;

  try {
    // Read file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`${colors.cyan}📥 Reading single file: ${filePath}${colors.reset}\n`);

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const exportData = JSON.parse(fileContent);

    // Check if it's a single file export format
    if (!exportData.metadata || !exportData.collections) {
      throw new Error('Invalid single file export format. Expected metadata and collections.');
    }

    const collections = exportData.collections;
    const results = [];

    console.log(`${colors.cyan}📋 Found ${Object.keys(collections).length} collections in file${colors.reset}\n`);

    for (const [collectionName, collectionData] of Object.entries(collections)) {
      try {
        const collection = db.collection(collectionName);
        const documents = collectionData.data || [];
        const totalCount = documents.length;

        console.log(`${colors.cyan}📥 Importing ${collectionName}... (${totalCount} documents)${colors.reset}`);

        // Drop existing collection if requested
        if (dropExisting) {
          await collection.drop();
          console.log(`${colors.yellow}🗑️  Dropped existing collection: ${collectionName}${colors.reset}`);
        }

        // Restore ObjectIds and Dates
        const processedDocuments = documents.map(doc => restoreTypes(doc));

        let imported = 0;
        let skipped = 0;

        // Import documents
        if (skipDuplicates && !dropExisting) {
          // Insert only if document doesn't exist
          for (const doc of processedDocuments) {
            try {
              if (doc._id) {
                const existing = await collection.findOne({ _id: doc._id });
                if (existing) {
                  skipped++;
                  continue;
                }
              }
              await collection.insertOne(doc);
              imported++;
            } catch (error) {
              if (error.code === 11000) {
                // Duplicate key error
                skipped++;
              } else {
                throw error;
              }
            }
          }
        } else {
          // Insert all documents
          if (processedDocuments.length > 0) {
            await collection.insertMany(processedDocuments, { ordered: false });
            imported = processedDocuments.length;
          }
        }

        console.log(`${colors.green}✅ Imported ${collectionName}: ${imported} new, ${skipped} skipped${colors.reset}`);

        results.push({ collectionName, imported, skipped, total: totalCount });
      } catch (error) {
        console.error(`${colors.red}❌ Error importing ${collectionName}: ${error.message}${colors.reset}`);
        results.push({ collectionName, imported: 0, skipped: 0, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error(`${colors.red}❌ Error importing from single file: ${error.message}${colors.reset}`);
    throw error;
  }
}

/**
 * Main import function
 */
async function importDatabase() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='));
    const dirArg = args.find(arg => arg.startsWith('--dir='));
    const dropArg = args.includes('--drop-existing');
    const noSkipArg = args.includes('--no-skip-duplicates');

    const importFile = fileArg ? path.resolve(fileArg.split('=')[1]) : null;
    const importDir = dirArg 
      ? path.resolve(dirArg.split('=')[1])
      : (importFile ? path.dirname(importFile) : path.join(__dirname, '..', 'database-export'));

    const options = {
      dropExisting: dropArg,
      skipDuplicates: !noSkipArg
    };

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
    console.log(`${colors.bright}Import Source: ${importFile || importDir}${colors.reset}`);
    console.log(`${colors.yellow}Options: Drop Existing=${dropArg}, Skip Duplicates=${options.skipDuplicates}${colors.reset}\n`);

    // Confirm before dropping
    if (dropArg) {
      console.log(`${colors.red}⚠️  WARNING: --drop-existing is enabled. This will DELETE all existing data!${colors.reset}\n`);
    }

    let results;

    // Import single file or directory
    if (importFile) {
      // Check if it's a single file export format
      const fileContent = fs.readFileSync(importFile, 'utf8');
      const fileData = JSON.parse(fileContent);
      
      if (fileData.metadata && fileData.collections && typeof fileData.collections === 'object') {
        // Single file format (all collections in one file)
        console.log(`${colors.yellow}📌 Importing from single file (all collections): ${importFile}${colors.reset}\n`);
        results = await importFromSingleFile(db, importFile, options);
      } else {
        // Single collection file format
        console.log(`${colors.yellow}📌 Importing single collection file: ${importFile}${colors.reset}\n`);
        results = [await importCollection(db, importFile, options)];
      }
    } else {
      if (!fs.existsSync(importDir)) {
        throw new Error(`Import directory not found: ${importDir}`);
      }
      
      // Check if there's a single file export in the directory
      const files = fs.readdirSync(importDir);
      const singleFileExport = files.find(f => f.startsWith('database-full-export-') && f.endsWith('.json'));
      
      if (singleFileExport) {
        const singleFilePath = path.join(importDir, singleFileExport);
        console.log(`${colors.yellow}📌 Found single file export: ${singleFileExport}${colors.reset}\n`);
        results = await importFromSingleFile(db, singleFilePath, options);
      } else {
        // Multiple files format
        results = await importAllCollections(db, importDir, options);
      }
    }

    // Create summary
    console.log(`\n${colors.cyan}📝 Creating import summary...${colors.reset}`);
    const summary = createImportSummary(results, importDir);

    console.log(`\n${colors.bright}${colors.green}✅ Import completed!${colors.reset}\n`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  📊 Total Files: ${summary.importInfo.totalFiles}`);
    console.log(`  ✅ Successful: ${summary.importInfo.successfulImports}`);
    console.log(`  ❌ Failed: ${summary.importInfo.failedImports}`);
    console.log(`  📥 Imported: ${summary.importInfo.totalDocumentsImported} documents`);
    console.log(`  ⏭️  Skipped: ${summary.importInfo.totalDocumentsSkipped} documents`);
    console.log(`\n📋 Summary Report: ${path.join(importDir, '_import_summary.json')}\n`);

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
║     Database Import Tool - Ribh Platform   ║
╚════════════════════════════════════════════╝
${colors.reset}

Usage:
  node scripts/import-database.js [options]

Options:
  --file=<path>            Import specific file (single collection or full export)
  --dir=<path>             Import directory (default: ./database-export)
  --drop-existing          Drop existing collections before import
  --no-skip-duplicates     Import all documents (even duplicates)

Examples:
  node scripts/import-database.js
  node scripts/import-database.js --file=./backup/users.json
  node scripts/import-database.js --file=./backup/database-full-export-2024-01-15.json
  node scripts/import-database.js --dir=./database-export/2024-01-01
  node scripts/import-database.js --dir=./backup --drop-existing

${colors.reset}
  `);

  importDatabase();
}

module.exports = { importDatabase };

