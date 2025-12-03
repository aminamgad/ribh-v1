const mongoose = require('mongoose');
require('dotenv').config();

// Import ExternalCompany model
let ExternalCompany;
try {
  ExternalCompany = require('../models/ExternalCompany').default;
} catch (e) {
  const mongoose = require('mongoose');
  const externalCompanySchema = new mongoose.Schema({
    companyName: String,
    apiKey: String,
    apiSecret: String,
    isActive: Boolean,
    lastUsed: Date,
    apiEndpointUrl: String,
    apiToken: String
  }, { timestamps: true });
  
  ExternalCompany = mongoose.models.ExternalCompany || mongoose.model('ExternalCompany', externalCompanySchema);
}

async function updateExternalCompanyAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get company name from command line argument or use default
    const companyName = process.argv[2] || 'Ultra Pal';
    const apiEndpointUrl = process.argv[3] || 'https://ultra-pal.net/api/external_company/create-package';
    const apiToken = process.argv[4] || '115062|ak2BeovW6RvCsVOZ8HXbszmuEYl6aNuMbdAjEPge';

    // Find company
    let company = await ExternalCompany.findOne({ companyName });

    if (!company) {
      // Create new company if doesn't exist
      console.log(`\n⚠️  Company "${companyName}" not found. Creating new company...`);
      company = new ExternalCompany({
        companyName: companyName,
        apiEndpointUrl: apiEndpointUrl,
        apiToken: apiToken,
        isActive: true
      });

      // Generate API Key and Secret
      const crypto = require('crypto');
      company.apiKey = `ribh_${crypto.randomBytes(32).toString('hex')}`;
      company.apiSecret = crypto.randomBytes(64).toString('hex');

      await company.save();
      console.log(`\n✅ External Company Created Successfully!`);
    } else {
      // Update existing company
      console.log(`\n📝 Updating company "${companyName}"...`);
      company.apiEndpointUrl = apiEndpointUrl;
      company.apiToken = apiToken;
      company.isActive = true;
      await company.save();
      console.log(`\n✅ External Company Updated Successfully!`);
    }

    console.log('\n📋 Company Details:');
    console.log(`   Company Name: ${company.companyName}`);
    console.log(`   API Endpoint URL: ${company.apiEndpointUrl}`);
    console.log(`   API Token: ${company.apiToken ? company.apiToken.substring(0, 20) + '...' : 'Not set'}`);
    console.log(`   Active: ${company.isActive}`);
    console.log(`   Company ID: ${company._id}`);

    // Update system settings to use this company as default
    const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', new mongoose.Schema({}, { strict: false, timestamps: true }));
    await SystemSettings.findOneAndUpdate(
      {},
      { 
        $set: { 
          defaultExternalCompanyId: company._id,
          autoCreatePackages: true,
          createPackageOnOrderCreate: true
        } 
      },
      { upsert: true, new: true }
    );
    console.log('\n✅ System settings updated to use this company as default');
    console.log('✅ Auto-create packages enabled');

    console.log('\n✅ All done! Orders will now be sent to the shipping company API automatically.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  updateExternalCompanyAPI();
}

module.exports = { updateExternalCompanyAPI };

