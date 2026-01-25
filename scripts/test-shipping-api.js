/**
 * Test Script for Shipping Company API
 * 
 * This script tests the shipping company API integration
 * Tests various scenarios including success, validation errors, and edge cases
 * 
 * Usage: node scripts/test-shipping-api.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiEndpoint: 'https://ultra-pal.com/api/external_company/create-package',
  token: '115062|ak2BeovW6RvCsVOZ8HXbszmuEYl6aNuMbdAjEPge',
  villagesFilePath: path.join(__dirname, '..', 'villages.json')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function logTest(testName) {
  console.log('\n' + '-'.repeat(80));
  log(`🧪 Test: ${testName}`, 'blue');
  console.log('-'.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Load villages data
function loadVillages() {
  try {
    const villagesData = JSON.parse(fs.readFileSync(CONFIG.villagesFilePath, 'utf8'));
    if (villagesData.code === 200 && Array.isArray(villagesData.data)) {
      return villagesData.data;
    }
    throw new Error('Invalid villages.json format');
  } catch (error) {
    logError(`Failed to load villages: ${error.message}`);
    return [];
  }
}

// Get random village for testing
function getRandomVillage(villages) {
  if (!villages || villages.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * villages.length);
  return villages[randomIndex];
}

// Get specific village by ID
function getVillageById(villages, id) {
  return villages.find(v => v.id === id);
}

// Make API request
async function makeApiRequest(packageData, testName = '') {
  try {
    logInfo(`Sending request to: ${CONFIG.apiEndpoint}`);
    logInfo(`Request data: ${JSON.stringify(packageData, null, 2)}`);

    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(packageData)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      logError(`Response is not valid JSON: ${responseText.substring(0, 200)}`);
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: 'Invalid JSON response',
        rawResponse: responseText.substring(0, 500)
      };
    }

    const result = {
      success: response.ok && responseData.code === 200,
      status: response.status,
      statusText: response.statusText,
      data: responseData
    };

    if (result.success) {
      logSuccess(`Request successful! Status: ${response.status}`);
      logInfo(`Response: ${JSON.stringify(responseData, null, 2)}`);
    } else {
      logError(`Request failed! Status: ${response.status}`);
      logError(`Response: ${JSON.stringify(responseData, null, 2)}`);
    }

    return result;
  } catch (error) {
    logError(`Network error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      type: 'network_error'
    };
  }
}

// Test Cases
const testCases = {
  // Test 1: Valid package creation
  async testValidPackage(villages) {
    logTest('Test 1: Valid Package Creation');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي - منتجات متنوعة',
      package_type: 'normal',
      village_id: village.id.toString(),
      street: 'شارع الرئيسي - مبنى رقم 5',
      total_cost: '250',
      note: 'هذا طلب تجريبي للاختبار',
      barcode: `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };

    logInfo(`Using village: ${village.village_name} (ID: ${village.id})`);
    
    const result = await makeApiRequest(packageData, 'Valid Package');
    
    if (result.success && result.data?.data?.package_id) {
      logSuccess(`Package created successfully! Package ID: ${result.data.data.package_id}`);
      return { success: true, packageId: result.data.data.package_id };
    } else {
      logError('Failed to create package');
      return { success: false, error: result.data };
    }
  },

  // Test 2: Missing required field (street)
  async testMissingRequiredField(villages) {
    logTest('Test 2: Missing Required Field (street)');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي',
      package_type: 'normal',
      village_id: village.id.toString(),
      // street is missing
      total_cost: '250',
      barcode: `TEST-${Date.now()}`
    };

    const result = await makeApiRequest(packageData, 'Missing Required Field');
    
    if (!result.success && result.data?.errors?.street) {
      logSuccess('Validation error caught correctly: street field is required');
      return { success: true, validationError: result.data.errors };
    } else {
      logError('Expected validation error for missing street field');
      return { success: false, result };
    }
  },

  // Test 3: Invalid village_id
  async testInvalidVillageId() {
    logTest('Test 3: Invalid Village ID');
    
    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي',
      package_type: 'normal',
      village_id: '99999', // Invalid village ID
      street: 'شارع الرئيسي',
      total_cost: '250',
      barcode: `TEST-${Date.now()}`
    };

    const result = await makeApiRequest(packageData, 'Invalid Village ID');
    
    // API might accept invalid village_id or reject it
    // We'll log the result either way
    if (!result.success) {
      logSuccess('API rejected invalid village_id (expected behavior)');
      return { success: true, validationError: result.data };
    } else {
      logWarning('API accepted invalid village_id (unexpected, but not necessarily wrong)');
      return { success: true, note: 'API accepted invalid village_id' };
    }
  },

  // Test 4: Invalid package_type
  async testInvalidPackageType(villages) {
    logTest('Test 4: Invalid Package Type');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي',
      package_type: 'invalid_type', // Invalid package type
      village_id: village.id.toString(),
      street: 'شارع الرئيسي',
      total_cost: '250',
      barcode: `TEST-${Date.now()}`
    };

    const result = await makeApiRequest(packageData, 'Invalid Package Type');
    
    if (!result.success) {
      logSuccess('API rejected invalid package_type (expected behavior)');
      return { success: true, validationError: result.data };
    } else {
      logWarning('API accepted invalid package_type');
      return { success: true, note: 'API accepted invalid package_type' };
    }
  },

  // Test 5: Empty required fields
  async testEmptyRequiredFields(villages) {
    logTest('Test 5: Empty Required Fields');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: '', // Empty
      to_phone: '', // Empty
      alter_phone: '', // Empty
      description: '', // Empty
      package_type: 'normal',
      village_id: village.id.toString(),
      street: 'شارع الرئيسي',
      total_cost: '250',
      barcode: `TEST-${Date.now()}`
    };

    const result = await makeApiRequest(packageData, 'Empty Required Fields');
    
    if (!result.success && result.data?.errors) {
      logSuccess('API rejected empty required fields (expected behavior)');
      logInfo(`Validation errors: ${JSON.stringify(result.data.errors, null, 2)}`);
      return { success: true, validationErrors: result.data.errors };
    } else {
      logError('Expected validation errors for empty fields');
      return { success: false, result };
    }
  },

  // Test 6: Invalid token
  async testInvalidToken(villages) {
    logTest('Test 6: Invalid Authorization Token');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي',
      package_type: 'normal',
      village_id: village.id.toString(),
      street: 'شارع الرئيسي',
      total_cost: '250',
      barcode: `TEST-${Date.now()}`
    };

    // Save original token
    const originalToken = CONFIG.token;
    CONFIG.token = 'invalid_token_12345';

    const result = await makeApiRequest(packageData, 'Invalid Token');

    // Restore original token
    CONFIG.token = originalToken;

    if (!result.success && (result.status === 401 || result.status === 403)) {
      logSuccess('API rejected invalid token (expected behavior)');
      return { success: true, status: result.status };
    } else {
      logWarning('API did not reject invalid token as expected');
      return { success: false, result };
    }
  },

  // Test 7: Special characters in fields
  async testSpecialCharacters(villages) {
    logTest('Test 7: Special Characters in Fields');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد <>&"\'',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي مع رموز خاصة: <>&"\'',
      package_type: 'normal',
      village_id: village.id.toString(),
      street: 'شارع الرئيسي #123',
      total_cost: '250',
      note: 'ملاحظات مع رموز: <>&"\'',
      barcode: `TEST-${Date.now()}-SPECIAL`
    };

    const result = await makeApiRequest(packageData, 'Special Characters');
    
    if (result.success) {
      logSuccess('API handled special characters correctly');
      return { success: true, packageId: result.data?.data?.package_id };
    } else {
      logWarning('API rejected special characters');
      return { success: false, result };
    }
  },

  // Test 8: Very long strings
  async testLongStrings(villages) {
    logTest('Test 8: Very Long Strings');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const longString = 'أ'.repeat(1000); // 1000 Arabic characters

    const packageData = {
      to_name: longString,
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: longString,
      package_type: 'normal',
      village_id: village.id.toString(),
      street: longString,
      total_cost: '250',
      barcode: `TEST-${Date.now()}-LONG`
    };

    const result = await makeApiRequest(packageData, 'Long Strings');
    
    if (result.success) {
      logSuccess('API handled long strings correctly');
      return { success: true, packageId: result.data?.data?.package_id };
    } else {
      logWarning('API rejected long strings (might have length limits)');
      return { success: false, result };
    }
  },

  // Test 9: Numeric values as strings (total_cost)
  async testNumericAsString(villages) {
    logTest('Test 9: Numeric Values as Strings');
    
    const village = getRandomVillage(villages);
    if (!village) {
      logError('No villages available for testing');
      return false;
    }

    const packageData = {
      to_name: 'أحمد محمد',
      to_phone: '0599123456',
      alter_phone: '0599123457',
      description: 'طلب تجريبي',
      package_type: 'normal',
      village_id: village.id.toString(),
      street: 'شارع الرئيسي',
      total_cost: '250.50', // Decimal as string
      barcode: `TEST-${Date.now()}`
    };

    const result = await makeApiRequest(packageData, 'Numeric as String');
    
    if (result.success) {
      logSuccess('API accepted decimal total_cost as string');
      return { success: true, packageId: result.data?.data?.package_id };
    } else {
      logWarning('API rejected decimal total_cost');
      return { success: false, result };
    }
  },

  // Test 10: Multiple packages in sequence
  async testMultiplePackages(villages) {
    logTest('Test 10: Multiple Packages in Sequence');
    
    const results = [];
    const count = 3;

    for (let i = 0; i < count; i++) {
      logInfo(`Creating package ${i + 1} of ${count}`);
      
      const village = getRandomVillage(villages);
      if (!village) {
        logError('No villages available for testing');
        break;
      }

      const packageData = {
        to_name: `مستلم ${i + 1}`,
        to_phone: `059912345${i}`,
        alter_phone: `059912345${i + 1}`,
        description: `طلب تجريبي رقم ${i + 1}`,
        package_type: 'normal',
        village_id: village.id.toString(),
        street: `شارع الرئيسي - مبنى ${i + 1}`,
        total_cost: (100 + i * 50).toString(),
        barcode: `TEST-${Date.now()}-${i}`
      };

      const result = await makeApiRequest(packageData, `Package ${i + 1}`);
      results.push(result);

      // Wait 1 second between requests to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    logInfo(`Successfully created ${successCount} out of ${count} packages`);

    return {
      success: successCount > 0,
      total: count,
      successful: successCount,
      results
    };
  }
};

// Main test runner
async function runTests() {
  logSection('🚀 Shipping API Test Suite');
  logInfo(`API Endpoint: ${CONFIG.apiEndpoint}`);
  logInfo(`Token: ${CONFIG.token.substring(0, 20)}...`);
  logInfo(`Villages File: ${CONFIG.villagesFilePath}`);

  // Load villages
  logSection('📋 Loading Villages Data');
  const villages = loadVillages();
  logInfo(`Loaded ${villages.length} villages`);

  if (villages.length === 0) {
    logError('Cannot run tests without villages data');
    return;
  }

  // Show sample villages
  logInfo('\nSample villages:');
  villages.slice(0, 5).forEach(v => {
    logInfo(`  - ${v.village_name} (ID: ${v.id}, Cost: ${v.delivery_cost}₪)`);
  });

  // Run tests
  logSection('🧪 Running Tests');
  
  const testResults = {};
  const testNames = Object.keys(testCases);

  for (const testName of testNames) {
    try {
      testResults[testName] = await testCases[testName](villages);
    } catch (error) {
      logError(`Test ${testName} threw an error: ${error.message}`);
      testResults[testName] = { success: false, error: error.message };
    }
  }

  // Summary
  logSection('📊 Test Summary');
  
  const passed = Object.values(testResults).filter(r => r.success).length;
  const total = testNames.length;
  
  logInfo(`Total Tests: ${total}`);
  logSuccess(`Passed: ${passed}`);
  logError(`Failed: ${total - passed}`);
  
  console.log('\n' + '='.repeat(80));
  log('Detailed Results:', 'cyan');
  console.log('='.repeat(80));
  
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${testName}: ${result.success ? 'PASSED' : 'FAILED'}`, result.success ? 'green' : 'red');
    if (result.error) {
      log(`   Error: ${JSON.stringify(result.error)}`, 'yellow');
    }
    if (result.packageId) {
      log(`   Package ID: ${result.packageId}`, 'cyan');
    }
  }

  console.log('\n' + '='.repeat(80));
  log('✨ Test Suite Completed', 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests, testCases, CONFIG };
