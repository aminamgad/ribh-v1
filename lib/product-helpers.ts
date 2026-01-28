/**
 * Helper functions for product operations
 */

/**
 * Calculate total stock quantity from variant options
 */
export function calculateVariantStockQuantity(variantOptions?: Array<{ stockQuantity: number }>): number {
  if (!variantOptions || variantOptions.length === 0) {
    return 0;
  }
  return variantOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
}

/**
 * Get stock display text with variant count
 */
export function getStockDisplayText(
  stockQuantity: number,
  hasVariants?: boolean,
  variantOptions?: Array<any>
): string {
  if (hasVariants && variantOptions && variantOptions.length > 0) {
    const variantCount = variantOptions.length;
    const totalStock = calculateVariantStockQuantity(variantOptions);
    return `${totalStock} قطعة لعدد ${variantCount} متغير${variantCount > 1 ? 'ات' : ''}`;
  }
  return stockQuantity > 0 ? `${stockQuantity} قطعة` : 'غير متوفر';
}

/**
 * Get stock badge text (short version for badges)
 */
export function getStockBadgeText(
  stockQuantity: number,
  hasVariants?: boolean,
  variantOptions?: Array<any>
): string {
  if (hasVariants && variantOptions && variantOptions.length > 0) {
    const variantCount = variantOptions.length;
    const totalStock = calculateVariantStockQuantity(variantOptions);
    return `متوفر (${totalStock}) - ${variantCount} متغير${variantCount > 1 ? 'ات' : ''}`;
  }
  return stockQuantity > 0 ? `متوفر (${stockQuantity})` : 'غير متوفر';
}

