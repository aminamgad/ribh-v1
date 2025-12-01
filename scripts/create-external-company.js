const mongoose = require('mongoose');
require('dotenv').config();
// Import ExternalCompany model - handle both CommonJS and ES modules
let ExternalCompany;
try {
  ExternalCompany = require('../models/ExternalCompany').default;
} catch (e) {
  const mongoose = require('mongoose');
  const crypto = require('crypto');
  const externalCompanySchema = new mongoose.Schema({
    companyName: String,
    apiKey: String,
    apiSecret: String,
    isActive: Boolean,
    lastUsed: Date
  }, { timestamps: true });
  
  externalCompanySchema.methods.generateApiKey = function() {
    return `ribh_${crypto.randomBytes(32).toString('hex')}`;
  };
  
  externalCompanySchema.methods.generateApiSecret = function() {
    return crypto.randomBytes(64).toString('hex');
  };
  
  ExternalCompany = mongoose.models.ExternalCompany || mongoose.model('ExternalCompany', externalCompanySchema);
}

async function createExternalCompany() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get company name from command line argument
    const companyName = process.argv[2] || 'Default Company';

    // Check if company already exists
    const existing = await ExternalCompany.findOne({ companyName });

    if (existing) {
      console.log('\n⚠️  Company already exists:');
      console.log(`   Company Name: ${existing.companyName}`);
      console.log(`   API Key: ${existing.apiKey}`);
      console.log(`   API Secret: ${existing.apiSecret}`);
      console.log(`   Active: ${existing.isActive}`);
      process.exit(0);
    }

    // Create new company
    const company = new ExternalCompany({
      companyName
    });

    // Generate API Key and Secret
    company.apiKey = company.generateApiKey();
    company.apiSecret = company.generateApiSecret();

    await company.save();

    console.log('\n✅ External Company Created Successfully!');
    console.log('\n📋 Company Details:');
    console.log(`   Company Name: ${company.companyName}`);
    console.log(`   API Key: ${company.apiKey}`);
    console.log(`   API Secret: ${company.apiSecret}`);
    console.log(`   Active: ${company.isActive}`);
    console.log('\n⚠️  IMPORTANT: Save the API Key and Secret securely!');
    console.log('   The API Secret will not be shown again.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  if (!process.argv[2]) {
    console.log('Usage: node create-external-company.js "Company Name"');
    process.exit(1);
  }
  createExternalCompany();
}

module.exports = { createExternalCompany };

