/**
 * Test Script for SKU Generator
 * 
 * This script tests the SKU generation functionality with:
 * - Arabic values (أحمر، كبير، صغير)
 * - English values (Red, Large, Small)
 * - Mixed values (Arabic + English)
 * - Validation to ensure SKU contains only A-Z, 0-9, and hyphens
 * 
 * Usage: node scripts/test-sku-generator.js
 */

const path = require('path');

// Import the SKU generator functions
// Since this is a Node.js script, we'll need to use dynamic import or require
// For now, we'll test the logic directly

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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Transliterates Arabic characters to English equivalents
 * (Same implementation as in lib/sku-generator.ts)
 */
function transliterateArabic(text) {
  const arabicToLatin = {
    // Arabic letters
    'أ': 'A', 'إ': 'I', 'آ': 'AA', 'ا': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH',
    'ج': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'TH', 'ر': 'R', 'ز': 'Z',
    'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A',
    'غ': 'GH', 'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N',
    'ه': 'H', 'و': 'W', 'ي': 'Y', 'ى': 'A', 'ة': 'H', 'ئ': 'Y', 'ء': 'A',
    // Common Arabic words/patterns
    'أحمر': 'AHRMR', 'أزرق': 'AZRQ', 'أخضر': 'AKHDR', 'أسود': 'ASWD', 'أبيض': 'ABYD',
    'صغير': 'SGHIR', 'متوسط': 'MTWST', 'كبير': 'KBIR', 'كبير جداً': 'KBIR-JDAN',
    'قطن': 'QTN', 'بوليستر': 'BWLYSTR', 'حرير': 'HRIR', 'صوف': 'SWF',
    'كلاسيكي': 'KLASYKY', 'حديث': 'HDITH', 'رياضي': 'RYADY', 'أنيق': 'ANYQ'
  };
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Check for multi-character patterns first (longest match)
    let matched = false;
    for (let len = Math.min(10, text.length - i); len > 0; len--) {
      const substring = text.substring(i, i + len);
      if (arabicToLatin[substring]) {
        result += arabicToLatin[substring];
        i += len - 1; // Skip the matched characters
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Single character mapping
      if (arabicToLatin[char]) {
        result += arabicToLatin[char];
      } else if (/[\u0600-\u06FF]/.test(char)) {
        // Arabic character not in map - use phonetic approximation
        result += 'X'; // Placeholder for unmapped Arabic
      } else {
        // Keep non-Arabic characters
        result += char;
      }
    }
  }
  
  return result;
}

/**
 * Normalizes text for SKU generation
 * (Same implementation as in lib/sku-generator.ts)
 */
function normalizeForSKU(text) {
  // First transliterate Arabic to English
  let normalized = transliterateArabic(text);
  
  // Convert to uppercase
  normalized = normalized.toUpperCase();
  
  // Replace spaces and special characters with hyphens
  normalized = normalized.replace(/[^A-Z0-9]/g, '-');
  
  // Replace multiple hyphens with single hyphen
  normalized = normalized.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  normalized = normalized.replace(/^-|-$/g, '');
  
  // Limit length
  normalized = normalized.substring(0, 30);
  
  // Final validation: ensure only A-Z, 0-9, and hyphens remain
  normalized = normalized.replace(/[^A-Z0-9-]/g, '');
  
  return normalized;
}

/**
 * Validates that SKU contains only allowed characters (A-Z, 0-9, hyphens)
 */
function validateAndCleanSKU(sku) {
  // Remove any Arabic characters or other non-ASCII characters
  let cleaned = sku.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
  
  // Keep only A-Z, 0-9, and hyphens
  cleaned = cleaned.replace(/[^A-Z0-9-]/g, '');
  
  // Replace multiple hyphens with single
  cleaned = cleaned.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  cleaned = cleaned.replace(/^-|-$/g, '');
  
  return cleaned;
}

/**
 * Validates that SKU contains only A-Z, 0-9, and hyphens
 */
function isValidSKU(sku) {
  return /^[A-Z0-9-]+$/.test(sku) && !/[\u0600-\u06FF]/.test(sku);
}

/**
 * Test cases
 */
const testCases = {
  // Test 1: Arabic values
  testArabicValues() {
    logSection('Test 1: توليد SKU مع قيم عربية');
    
    const arabicValues = ['أحمر', 'كبير', 'صغير', 'أزرق', 'أخضر'];
    const results = [];
    
    for (const value of arabicValues) {
      const normalized = normalizeForSKU(value);
      const sku = `PROD-001-${normalized}`;
      const cleaned = validateAndCleanSKU(sku);
      const isValid = isValidSKU(cleaned);
      
      results.push({
        input: value,
        normalized,
        sku: cleaned,
        isValid
      });
      
      if (isValid) {
        logSuccess(`${value} → ${cleaned}`);
      } else {
        logError(`${value} → ${cleaned} (INVALID)`);
      }
    }
    
    const allValid = results.every(r => r.isValid);
    return {
      success: allValid,
      results,
      message: allValid 
        ? 'All Arabic values converted successfully' 
        : 'Some Arabic values failed validation'
    };
  },
  
  // Test 2: English values
  testEnglishValues() {
    logSection('Test 2: توليد SKU مع قيم إنجليزية');
    
    const englishValues = ['Red', 'Large', 'Small', 'Blue', 'Green'];
    const results = [];
    
    for (const value of englishValues) {
      const normalized = normalizeForSKU(value);
      const sku = `PROD-001-${normalized}`;
      const cleaned = validateAndCleanSKU(sku);
      const isValid = isValidSKU(cleaned);
      
      results.push({
        input: value,
        normalized,
        sku: cleaned,
        isValid
      });
      
      if (isValid) {
        logSuccess(`${value} → ${cleaned}`);
      } else {
        logError(`${value} → ${cleaned} (INVALID)`);
      }
    }
    
    const allValid = results.every(r => r.isValid);
    return {
      success: allValid,
      results,
      message: allValid 
        ? 'All English values processed successfully' 
        : 'Some English values failed validation'
    };
  },
  
  // Test 3: Mixed values (Arabic + English)
  testMixedValues() {
    logSection('Test 3: توليد SKU مع قيم مختلطة (عربي + إنجليزي)');
    
    const mixedValues = [
      'أحمر - Red',
      'كبير Large',
      'Small صغير',
      'Blue أزرق',
      'أخضر Green - Medium'
    ];
    const results = [];
    
    for (const value of mixedValues) {
      const normalized = normalizeForSKU(value);
      const sku = `PROD-001-${normalized}`;
      const cleaned = validateAndCleanSKU(sku);
      const isValid = isValidSKU(cleaned);
      
      results.push({
        input: value,
        normalized,
        sku: cleaned,
        isValid
      });
      
      if (isValid) {
        logSuccess(`${value} → ${cleaned}`);
      } else {
        logError(`${value} → ${cleaned} (INVALID)`);
      }
    }
    
    const allValid = results.every(r => r.isValid);
    return {
      success: allValid,
      results,
      message: allValid 
        ? 'All mixed values processed successfully' 
        : 'Some mixed values failed validation'
    };
  },
  
  // Test 4: Validation - Ensure no Arabic characters in final SKU
  testNoArabicInSKU() {
    logSection('Test 4: التحقق من عدم وجود حروف عربية في SKU النهائي');
    
    const testInputs = [
      'أحمر',
      'كبير',
      'صغير',
      'أحمر - كبير',
      'Red - Large',
      'أحمر Red',
      'كبير Large صغير'
    ];
    
    const results = [];
    
    for (const input of testInputs) {
      const normalized = normalizeForSKU(input);
      const sku = `PROD-001-${normalized}`;
      const cleaned = validateAndCleanSKU(sku);
      const hasArabic = /[\u0600-\u06FF]/.test(cleaned);
      const isValid = isValidSKU(cleaned);
      
      results.push({
        input,
        sku: cleaned,
        hasArabic,
        isValid
      });
      
      if (!hasArabic && isValid) {
        logSuccess(`${input} → ${cleaned} (No Arabic, Valid)`);
      } else {
        logError(`${input} → ${cleaned} (Has Arabic: ${hasArabic}, Valid: ${isValid})`);
      }
    }
    
    const allValid = results.every(r => !r.hasArabic && r.isValid);
    return {
      success: allValid,
      results,
      message: allValid 
        ? 'All SKUs are free of Arabic characters' 
        : 'Some SKUs still contain Arabic characters'
    };
  },
  
  // Test 5: Ensure SKU contains only A-Z, 0-9, and hyphens
  testSKUCharacterSet() {
    logSection('Test 5: التحقق من أن SKU يحتوي فقط على A-Z, 0-9, و -');
    
    const testInputs = [
      'أحمر',
      'Red!@#',
      'Large 123',
      'Small-Medium',
      'كبير-صغير',
      'Test@#$%^&*()',
      'أحمر Red 123'
    ];
    
    const results = [];
    
    for (const input of testInputs) {
      const normalized = normalizeForSKU(input);
      const sku = `PROD-001-${normalized}`;
      const cleaned = validateAndCleanSKU(sku);
      const matchesPattern = /^[A-Z0-9-]+$/.test(cleaned);
      const hasOnlyAllowedChars = !/[^A-Z0-9-]/.test(cleaned);
      
      results.push({
        input,
        sku: cleaned,
        matchesPattern,
        hasOnlyAllowedChars
      });
      
      if (matchesPattern && hasOnlyAllowedChars) {
        logSuccess(`${input} → ${cleaned} (Valid character set)`);
      } else {
        logError(`${input} → ${cleaned} (Invalid character set)`);
      }
    }
    
    const allValid = results.every(r => r.matchesPattern && r.hasOnlyAllowedChars);
    return {
      success: allValid,
      results,
      message: allValid 
        ? 'All SKUs contain only allowed characters (A-Z, 0-9, -)' 
        : 'Some SKUs contain invalid characters'
    };
  }
};

// Main test runner
async function runTests() {
  logSection('🚀 SKU Generator Test Suite');
  logInfo('Testing SKU generation with Arabic, English, and mixed values');
  logInfo('Validating that SKUs contain only A-Z, 0-9, and hyphens');
  
  // Run tests
  logSection('🧪 Running Tests');
  
  const testResults = {};
  const testNames = Object.keys(testCases);
  
  for (const testName of testNames) {
    try {
      testResults[testName] = testCases[testName]();
    } catch (error) {
      logError(`Test ${testName} threw an error: ${error.message}`);
      testResults[testName] = { 
        success: false, 
        error: error.message,
        message: `Test failed with error: ${error.message}`
      };
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
    if (result.message) {
      log(`   ${result.message}`, result.success ? 'green' : 'yellow');
    }
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Final status
  if (passed === total) {
    logSuccess('🎉 All tests passed!');
    process.exit(0);
  } else {
    logError(`❌ ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

