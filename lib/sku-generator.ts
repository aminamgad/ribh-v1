import { connectDB } from './database';
import Counter from '@/models/Counter';
import Product from '@/models/Product';
import { logger } from './logger';
// Import client-side utilities (these don't depend on Mongoose)
import { transliterateArabic, normalizeForSKU, validateAndCleanSKU } from './sku-utils';

/**
 * Generates a unique SKU for a product
 * Format: PROD-001, PROD-002, etc.
 */
export async function generateProductSKU(): Promise<string> {
  try {
    await connectDB();
    
    // Get or create counter for products
    const counter = await Counter.findByIdAndUpdate(
      'product_sku',
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true, setOnInsert: { sequence_value: 1 } }
    );
    
    const sequenceNumber = counter.sequence_value;
    const sku = `PROD-${String(sequenceNumber).padStart(6, '0')}`;
    
    // Verify SKU is unique (double check)
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      // If SKU exists, try again with incremented counter
      logger.warn('SKU collision detected, regenerating', { sku });
      return await generateProductSKU();
    }
    
    logger.debug('Generated product SKU', { sku, sequenceNumber });
    return sku;
  } catch (error) {
    logger.error('Error generating product SKU', error);
    // Fallback: use timestamp-based SKU
    const fallbackSKU = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    logger.warn('Using fallback SKU generation', { fallbackSKU });
    return fallbackSKU;
  }
}

/**
 * Generates a unique SKU for a product variant option
 * Format: PROD-001-RED-L, PROD-001-BLUE-M, etc.
 * 
 * @param productSKU - The base product SKU
 * @param variantValue - The variant value string (e.g., "أحمر - كبير" or "RED - L")
 */
export async function generateVariantSKU(
  productSKU: string,
  variantValue: string
): Promise<string> {
  try {
    if (!productSKU || !variantValue || variantValue.trim().length === 0) {
      throw new Error('Product SKU and variant value are required');
    }
    
    // Normalize variant value: transliterate Arabic to English, then normalize
    let normalized = normalizeForSKU(variantValue.trim());
    
    // Additional validation: ensure no Arabic characters remain
    if (/[\u0600-\u06FF]/.test(normalized)) {
      logger.warn('Arabic characters detected in normalized SKU, cleaning again', { normalized, variantValue });
      normalized = validateAndCleanSKU(normalized);
    }
    
    // Final validation: ensure only A-Z, 0-9, and hyphens
    if (!/^[A-Z0-9-]*$/.test(normalized)) {
      logger.warn('Invalid characters in normalized SKU, cleaning', { normalized, variantValue });
      normalized = validateAndCleanSKU(normalized);
    }
    
    if (normalized.length === 0) {
      // If normalization results in empty string, use hash
      const hash = Math.random().toString(36).substr(2, 6).toUpperCase();
      const variantSKU = `${productSKU}-${hash}`;
      return await ensureUniqueVariantSKU(variantSKU);
    }
    
    const variantSKU = `${productSKU}-${normalized}`;
    // ensureUniqueVariantSKU will also validate and clean, but we do it here too for safety
    return await ensureUniqueVariantSKU(variantSKU);
  } catch (error) {
    logger.error('Error generating variant SKU', error, { productSKU, variantValue });
    // Fallback: use timestamp-based SKU
    const fallbackSKU = `${productSKU}-${Date.now().toString(36).toUpperCase()}`;
    logger.warn('Using fallback variant SKU generation', { fallbackSKU });
    return await ensureUniqueVariantSKU(fallbackSKU);
  }
}

// validateAndCleanSKU is now imported from sku-utils.ts

/**
 * Ensures a variant SKU is unique by checking database and appending counter if needed
 */
async function ensureUniqueVariantSKU(baseSKU: string): Promise<string> {
  // Validate and clean SKU first
  baseSKU = validateAndCleanSKU(baseSKU);
  
  // If SKU is empty after cleaning, generate fallback
  if (!baseSKU || baseSKU.length === 0) {
    const hash = Math.random().toString(36).substr(2, 6).toUpperCase();
    baseSKU = `VAR-${hash}`;
  }
  
  await connectDB();
  
  const existingProduct = await Product.findOne({ sku: baseSKU });
  const existingVariant = await Product.findOne({ 
    'variantOptions.sku': baseSKU 
  });
  
  if (!existingProduct && !existingVariant) {
    logger.debug('Generated unique variant SKU', { baseSKU });
    return baseSKU;
  }
  
  // If SKU exists, append a number
  logger.warn('Variant SKU collision detected, appending number', { baseSKU });
  let counter = 1;
  let uniqueVariantSKU = `${baseSKU}-${counter}`;
  
  while (counter <= 1000) {
    const exists = await Product.findOne({ 
      $or: [
        { sku: uniqueVariantSKU },
        { 'variantOptions.sku': uniqueVariantSKU }
      ]
    });
    
    if (!exists) {
      logger.debug('Generated unique variant SKU after collision', { uniqueVariantSKU, baseSKU, counter });
      return uniqueVariantSKU;
    }
    
    counter++;
    uniqueVariantSKU = `${baseSKU}-${counter}`;
  }
  
  throw new Error('Unable to generate unique variant SKU after 1000 attempts');
}

/**
 * Validates if a SKU is unique
 * @param sku - The SKU to validate
 * @param excludeProductId - Optional product ID to exclude from check (for updates)
 */
export async function isSKUUnique(
  sku: string,
  excludeProductId?: string
): Promise<boolean> {
  try {
    if (!sku || sku.trim().length === 0) {
      return true; // Empty SKU is considered valid (will be auto-generated)
    }
    
    await connectDB();
    
    const query: any = {
      $or: [
        { sku: sku.trim() },
        { 'variantOptions.sku': sku.trim() }
      ]
    };
    
    // Exclude current product if updating
    if (excludeProductId) {
      query._id = { $ne: excludeProductId };
    }
    
    const existing = await Product.findOne(query);
    return !existing;
  } catch (error) {
    logger.error('Error checking SKU uniqueness', error, { sku });
    return false; // On error, assume not unique to be safe
  }
}

/**
 * Generates SKUs for all variant options of a product
 * @param productSKU - The base product SKU
 * @param variantOptions - Array of variant option objects
 */
export async function generateVariantOptionSKUs(
  productSKU: string,
  variantOptions: Array<{
    variantId: string;
    variantName: string;
    value: string;
    sku?: string;
    [key: string]: any;
  }>
): Promise<Array<{ variantId: string; sku: string }>> {
  try {
    if (!productSKU || !variantOptions || variantOptions.length === 0) {
      return [];
    }
    
    const skuMap: Array<{ variantId: string; sku: string }> = [];
    
    // Generate SKU for each variant option based on its value
    for (const option of variantOptions) {
      // If SKU already exists and is not empty, use it
      if (option.sku && option.sku.trim().length > 0) {
        // Verify it's unique
        const isUnique = await isSKUUnique(option.sku);
        if (isUnique) {
          skuMap.push({
            variantId: option.variantId,
            sku: option.sku.trim()
          });
          continue;
        }
        // If not unique, generate new one
        logger.warn('Variant option SKU is not unique, generating new one', { 
          variantId: option.variantId, 
          existingSKU: option.sku 
        });
      }
      
      // Generate SKU based on variant value
      // Use the value field which contains the combination (e.g., "أحمر - كبير")
      const variantSKU = await generateVariantSKU(productSKU, option.value);
      
      skuMap.push({
        variantId: option.variantId,
        sku: variantSKU
      });
    }
    
    return skuMap;
  } catch (error) {
    logger.error('Error generating variant option SKUs', error, { productSKU, variantOptions });
    return [];
  }
}

