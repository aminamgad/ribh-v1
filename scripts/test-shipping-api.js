// Use built-in fetch (Node.js 18+)

async function testShippingAPI() {
  try {
    const apiEndpointUrl = 'https://ultra-pal.net/api/external_company/create-package';
    const apiToken = '115062|ak2BeovW6RvCsVOZ8HXbszmuEYl6aNuMbdAjEPge';

    const testPackageData = {
      "to_name": "Amin Amgad",
      "to_phone": "0100000000",
      "alter_phone": "0111111111",
      "description": "this is the package description",
      "package_type": "normal",
      "village_id": "1",
      "street": "my street",
      "total_cost": "200",
      "note": "my package notes",
      "barcode": `TEST-${Date.now()}`
    };

    console.log('🧪 Testing Shipping Company API...\n');
    console.log('📤 Request:');
    console.log(`   URL: ${apiEndpointUrl}`);
    console.log(`   Method: POST`);
    console.log(`   Token: ${apiToken.substring(0, 20)}...`);
    console.log(`   Body:`, JSON.stringify(testPackageData, null, 2));

    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPackageData)
    });

    const responseData = await response.json();

    console.log('\n📥 Response:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body:`, JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.code === 200 && responseData.state === 'success') {
      console.log('\n✅ SUCCESS! API is working correctly.');
      console.log(`   Package ID: ${responseData.data?.package_id}`);
      return true;
    } else {
      console.log('\n❌ FAILED! API returned an error.');
      console.log(`   Error: ${responseData.message || JSON.stringify(responseData.errors || responseData)}`);
      return false;
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

// Run test
if (require.main === module) {
  testShippingAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testShippingAPI };

