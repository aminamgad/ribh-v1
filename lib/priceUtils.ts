/**
 * Utility functions for price display and formatting
 */

export interface PriceDisplayConfig {
  isMandatory: boolean;
  hasMinimumPrice: boolean;
  minimumPrice?: number;
  marketerPrice?: number;
}

/**
 * Get the color classes for price display based on mandatory status
 * @param config Price display configuration
 * @returns Object with text and background color classes
 */
export function getPriceColorClasses(config: PriceDisplayConfig) {
  const { isMandatory, hasMinimumPrice } = config;
  
  if (isMandatory && hasMinimumPrice) {
    return {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-500 dark:border-orange-500',
      focusRing: 'focus:ring-orange-500 dark:focus:ring-orange-500',
      badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    };
  }
  
  return {
    text: 'text-primary-600 dark:text-primary-400',
    bg: '',
    border: '',
    focusRing: '',
    badge: ''
  };
}

/**
 * Get the mandatory badge component props
 * @param config Price display configuration
 * @returns Badge props or null if not mandatory
 */
export function getMandatoryBadgeProps(config: PriceDisplayConfig) {
  const { isMandatory, hasMinimumPrice } = config;
  
  if (isMandatory && hasMinimumPrice) {
    return {
      text: 'إلزامي',
      className: 'text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full'
    };
  }
  
  return null;
}

/**
 * Format currency value
 * @param value Currency value
 * @param currency Currency symbol (default: ₪)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | undefined | null, currency: string = '₪'): string {
  if (value === undefined || value === null || isNaN(value)) {
    return `0.00 ${currency}`;
  }
  
  return `${value.toFixed(2)} ${currency}`;
}

/**
 * Check if price is mandatory
 * @param product Product object with price information
 * @returns True if price is mandatory
 */
export function isPriceMandatory(product: {
  isMinimumPriceMandatory?: boolean;
  minimumSellingPrice?: number;
}): boolean {
  return !!(product.isMinimumPriceMandatory && product.minimumSellingPrice && product.minimumSellingPrice > 0);
}

