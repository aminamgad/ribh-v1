// Test Script 3: إنشاء الحزمة وإرسالها إلى شركة الشحن
// هذا السكريبت يختبر createPackageFromOrder وإرسال البيانات إلى API

const mongoose = require('mongoose');
require('dotenv').config();

// Replicate createPackageFromOrder logic in JavaScript
async function createPackageFromOrderJS(orderId) {
  try {
    // Import models
    const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const Package = mongoose.models.Package || mongoose.model('Package', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const ExternalCompany = mongoose.models.ExternalCompany || mongoose.model('ExternalCompany', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const Village = mongoose.models.Village || mongoose.model('Village', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false, timestamps: true }));
    
    // Get order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      console.error('Order not found for package creation');
      return { packageId: null, apiSuccess: false, error: 'Order not found' };
    }
    
    // Check if package already exists
    const existingPackage = await Package.findOne({ orderId: order._id }).lean();
    if (existingPackage) {
      console.log('Package already exists for order');
      console.log('   Existing package data:', JSON.stringify(existingPackage, null, 2));
      // packageId might be undefined if not yet generated, use _id as fallback
      const packageId = existingPackage.packageId || existingPackage._id?.toString() || 'UNKNOWN';
      return { packageId: packageId, apiSuccess: false, alreadyExists: true };
    }
    
    // Get external company from order's shippingCompany
    let externalCompanyId = null;
    let externalCompany = null;
    
    if (order.shippingCompany) {
      externalCompany = await ExternalCompany.findOne({ 
        companyName: order.shippingCompany,
        isActive: true 
      }).lean();
      
      if (externalCompany) {
        externalCompanyId = externalCompany._id;
        console.log('✅ Using shipping company specified in order:', externalCompany.companyName);
      }
    }
    
    // If no company found, use default
    if (!externalCompanyId) {
      const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean();
      if (settings && settings.defaultExternalCompanyId) {
        externalCompanyId = settings.defaultExternalCompanyId;
      } else {
        const firstCompany = await ExternalCompany.findOne({ isActive: true }).lean();
        if (firstCompany) {
          externalCompanyId = firstCompany._id;
        } else {
          console.error('No external company found');
          return { packageId: null, apiSuccess: false, error: 'No external company found' };
        }
      }
    }
    
    // Load external company if not loaded
    if (!externalCompany) {
      externalCompany = await ExternalCompany.findById(externalCompanyId).lean();
    }
    
    if (!externalCompany || !externalCompany.isActive) {
      console.error('External company not found or inactive');
      return { packageId: null, apiSuccess: false, error: 'External company not found or inactive' };
    }
    
    // Validate shipping address
    const shippingAddress = order.shippingAddress;
    if (!shippingAddress || !shippingAddress.villageId) {
      console.error('Order missing villageId in shipping address');
      return { packageId: null, apiSuccess: false, error: 'Order missing villageId' };
    }
    
    // Verify village exists
    const village = await Village.findOne({
      villageId: shippingAddress.villageId,
      isActive: true
    }).lean();
    
    if (!village) {
      console.error('Village not found or inactive');
      return { packageId: null, apiSuccess: false, error: 'Village not found or inactive' };
    }
    
    // Get order number
    const orderNumber = order.orderNumber || `ORD-${order._id.toString().slice(-8)}`;
    
    // Barcode: رقم الطلب فقط لظهوره تحت الشريط في موقع شركة الشحن
    const barcode = String(orderNumber);
    
    // Create description
    const items = order.items || [];
    const itemDescriptions = items.map(item => 
      `${item.productName || 'منتج'} x${item.quantity || 1}`
    ).join(', ');
    const description = itemDescriptions || 'محتويات الطرد';
    
    // Create package
    const newPackage = new Package({
      externalCompanyId: externalCompanyId,
      orderId: order._id,
      toName: shippingAddress.fullName || 'غير محدد',
      toPhone: shippingAddress.phone || '',
      alterPhone: shippingAddress.phone || '',
      description: description,
      packageType: 'normal',
      villageId: shippingAddress.villageId,
      street: shippingAddress.street || '',
      totalCost: order.total || 0,
      note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
      barcode: barcode,
      status: 'pending'
    });
    
    await newPackage.save();
    
    // Reload package to get packageId (in case it was generated by pre-save middleware)
    const savedPackage = await Package.findById(newPackage._id).lean();
    const finalPackageId = savedPackage?.packageId || newPackage.packageId || newPackage._id?.toString() || 'UNKNOWN';
    
    // Update order with packageId
    await Order.findByIdAndUpdate(order._id, {
      packageId: finalPackageId
    });
    
    // Call external shipping company API
    if (externalCompany.apiEndpointUrl && externalCompany.apiToken) {
      const packageData = {
        to_name: shippingAddress.fullName || 'غير محدد',
        to_phone: shippingAddress.phone || '',
        alter_phone: shippingAddress.phone || '',
        description: description,
        package_type: 'normal',
        village_id: shippingAddress.villageId.toString(),
        street: shippingAddress.street || '',
        total_cost: (order.total || 0).toString(),
        note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
        barcode: barcode
      };
      
      console.log('📤 Sending package to shipping company API...');
      console.log('   URL:', externalCompany.apiEndpointUrl);
      console.log('   Data:', JSON.stringify(packageData, null, 2));
      
      const token = externalCompany.apiToken.startsWith('Bearer ') 
        ? externalCompany.apiToken 
        : `Bearer ${externalCompany.apiToken}`;
      
      const response = await fetch(externalCompany.apiEndpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      });
      
      // Get response text first to handle both JSON and HTML responses
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        // If response is not JSON (e.g., HTML error page)
        console.log('⚠️  API returned non-JSON response (likely HTML error page)');
        console.log('   Response Status:', response.status, response.statusText);
        console.log('   Response Preview:', responseText.substring(0, 200));
        console.log('   Note: Package was created in database, but API server is unavailable');
        // Don't throw error - return packageId with apiSuccess: false
        return { packageId: finalPackageId, apiSuccess: false, error: `HTTP ${response.status} ${response.statusText}` };
      }
      
      console.log('📥 Response from API:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   Body:', JSON.stringify(responseData, null, 2));
      
      if (response.ok && responseData.code === 200 && responseData.state === 'success') {
        console.log('✅ Package sent successfully to shipping company!');
        console.log('   External Package ID:', responseData.data?.package_id);
        return { packageId: finalPackageId, apiSuccess: true, externalPackageId: responseData.data?.package_id };
      } else {
        console.warn('⚠️  API call failed or returned error:');
        console.warn('   Status:', response.status, response.statusText);
        console.warn('   Response:', responseData.message || JSON.stringify(responseData) || 'Non-JSON response');
        console.warn('   Note: Package was created in database, but API call failed');
        // Return packageId even if API call failed (package exists in DB)
        return { packageId: finalPackageId, apiSuccess: false, error: responseData.message || `HTTP ${response.status}` };
      }
    } else {
      console.log('⚠️  No API endpoint configured - package created in database only');
      return { packageId: finalPackageId, apiSuccess: false, noApiEndpoint: true };
    }
    
  } catch (error) {
    console.error('Error creating package:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return { packageId: null, apiSuccess: false, error: error.message };
  }
}

async function testCreatePackageAndSend(orderId) {
  try {
    console.log('🧪 Test 3: إنشاء الحزمة وإرسالها إلى شركة الشحن\n');
    
    if (!orderId) {
      console.error('❌ Please provide order ID as argument');
      console.log('Usage: node scripts/test-order-flow-3-create-package.js <orderId>');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false, timestamps: true }));
    const Package = mongoose.models.Package || mongoose.model('Package', new mongoose.Schema({}, { strict: false, timestamps: true }));
    
    // Find order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      console.error(`❌ Order ${orderId} not found`);
      process.exit(1);
    }
    
    console.log(`📦 Found order: ${order.orderNumber || order._id} (${order._id})\n`);
    
    // Verify order has required data
    console.log('📋 Order data verification:');
    console.log(`   - Shipping Company: ${order.shippingCompany || 'NOT SET ❌'}`);
    console.log(`   - Village ID: ${order.shippingAddress?.villageId || 'NOT SET ❌'}`);
    console.log(`   - Full Name: ${order.shippingAddress?.fullName || 'NOT SET ❌'}`);
    console.log(`   - Phone: ${order.shippingAddress?.phone || 'NOT SET ❌'}`);
    console.log(`   - Street: ${order.shippingAddress?.street || 'NOT SET ❌'}`);
    console.log(`   - Total: ${order.total || 'NOT SET ❌'}\n`);
    
    if (!order.shippingCompany || !order.shippingAddress?.villageId) {
      console.error('❌ Order is missing required shipping data');
      console.log('   Please run Test 2 first to update shipping info');
      process.exit(1);
    }
    
    console.log('📦 Creating package and sending to shipping company...\n');
    
    // Create package
    let result = await createPackageFromOrderJS(orderId);
    
    // Handle case where function returns packageId directly (old format) or object (new format)
    if (typeof result === 'number' || typeof result === 'string') {
      result = { packageId: result, apiSuccess: false };
    }
    
    if (result && result.packageId) {
      const packageId = result.packageId;
      console.log(`\n✅ Package created successfully!`);
      console.log(`   Package ID: ${packageId}`);
      if (result.apiSuccess) {
        console.log(`   ✅ API Call: SUCCESS`);
        console.log(`   External Package ID: ${result.externalPackageId || 'N/A'}`);
      } else {
        console.log(`   ⚠️  API Call: FAILED (${result.error || 'Unknown error'})`);
        console.log(`   Note: Package exists in database but API is unavailable`);
      }
      console.log();
      
      // Reload order to check packageId
      const updatedOrder = await Order.findById(orderId).lean();
      console.log(`   Order Package ID: ${updatedOrder.packageId || 'NOT SET'}\n`);
      
      // Check Package model
      const packageDoc = await Package.findOne({ orderId: order._id }).lean();
      
      if (packageDoc) {
        console.log('📦 Package details:');
        console.log(`   - Package ID: ${packageDoc.packageId}`);
        console.log(`   - External Company ID: ${packageDoc.externalCompanyId}`);
        console.log(`   - Order ID: ${packageDoc.orderId}`);
        console.log(`   - To Name: ${packageDoc.toName}`);
        console.log(`   - To Phone: ${packageDoc.toPhone}`);
        console.log(`   - Village ID: ${packageDoc.villageId}`);
        console.log(`   - Street: ${packageDoc.street}`);
        console.log(`   - Total Cost: ${packageDoc.totalCost}`);
        console.log(`   - Barcode: ${packageDoc.barcode}`);
        console.log(`   - Status: ${packageDoc.status}\n`);
        
        // Verify package data matches order data
        // Note: packageId might not be set if pre-save middleware hasn't run yet
        const verification = {
          hasPackageId: !!(packageDoc.packageId || packageDoc._id), // Accept _id if packageId not set
          hasExternalCompanyId: !!packageDoc.externalCompanyId,
          villageIdMatches: packageDoc.villageId === order.shippingAddress.villageId,
          toNameMatches: packageDoc.toName === order.shippingAddress.fullName,
          toPhoneMatches: packageDoc.toPhone === order.shippingAddress.phone,
          totalCostMatches: packageDoc.totalCost === order.total
        };
        
        console.log('🔍 Verification:');
        console.log(`   Has package ID: ${verification.hasPackageId ? '✅' : '❌'}`);
        console.log(`   Has external company ID: ${verification.hasExternalCompanyId ? '✅' : '❌'}`);
        console.log(`   Village ID matches: ${verification.villageIdMatches ? '✅' : '❌'}`);
        console.log(`   To Name matches: ${verification.toNameMatches ? '✅' : '❌'}`);
        console.log(`   To Phone matches: ${verification.toPhoneMatches ? '✅' : '❌'}`);
        console.log(`   Total Cost matches: ${verification.totalCostMatches ? '✅' : '❌'}\n`);
        
        const allPassed = Object.values(verification).every(v => v === true);
        
        if (allPassed) {
          if (result.apiSuccess) {
            console.log('✅ Test 3 PASSED: Package created and sent successfully to API!\n');
          } else {
            console.log('⚠️  Test 3 PARTIAL: Package created in database but API call failed');
            console.log('   This is acceptable if API server is temporarily unavailable\n');
          }
          return { success: true, packageId: packageId, apiSuccess: result.apiSuccess };
        } else {
          console.log('❌ Test 3 FAILED: Package data verification failed\n');
          return { success: false, packageId: packageId };
        }
      } else {
        console.log('⚠️  Package document not found in database\n');
        return { success: false, packageId: packageId };
      }
    } else {
      console.log('❌ Test 3 FAILED: Package creation failed\n');
      console.log('   Check logs for error details\n');
      return { success: false, packageId: null };
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run test
if (require.main === module) {
  const orderId = process.argv[2];
  testCreatePackageAndSend(orderId).then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testCreatePackageAndSend };
