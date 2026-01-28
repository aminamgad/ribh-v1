/**
 * Client-side SKU utility functions
 * These functions can be used in both client and server components
 * They don't depend on Mongoose or database connections
 * 
 * IMPORTANT: This file must NOT import anything from sku-generator.ts
 * to avoid webpack bundling issues with Mongoose models
 */

/**
 * Transliterates Arabic characters to English equivalents
 * Converts Arabic text to Latin characters for SKU generation
 */
export function transliterateArabic(text: string): string {
  const arabicToLatin: Record<string, string> = {
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
 * Normalizes text for SKU generation: removes Arabic, converts to uppercase, removes special chars
 * @param text - Input text (can contain Arabic or English)
 * @returns Normalized text with only A-Z, 0-9, and hyphens
 */
export function normalizeForSKU(text: string): string {
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
 * Removes any Arabic characters and ensures only A-Z, 0-9, and hyphens remain
 * @param sku - SKU to validate
 * @returns Cleaned SKU with only allowed characters
 */
export function validateAndCleanSKU(sku: string): string {
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

