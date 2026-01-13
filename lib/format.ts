/**
 * Format utilities for numbers, currency, and dates
 * All numbers are formatted using English numerals (en-US locale)
 */

/**
 * Format a number with English numerals
 */
export function formatNumber(value: number | string, options?: Intl.NumberFormatOptions): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(num);
}

/**
 * Format a number with English numerals (simple version, no decimals)
 */
export function formatNumberSimple(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format currency with English numerals
 */
export function formatCurrency(amount: number | string, currency: string = 'ILS'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency === 'ILS' ? '₪' : currency}`;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format currency with custom symbol (for ₪)
 */
export function formatCurrencyWithSymbol(amount: number | string, options?: Intl.NumberFormatOptions): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₪';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(num);
  
  return `${formatted} ₪`;
}

/**
 * Format date with English numerals
 * Note: Date names will still be in Arabic if using Arabic locale, but numbers will be English
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    // Use en-US for numbers, but keep Arabic date format
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(dateObj);
  } catch (e) {
    return date.toString();
  }
}

/**
 * Format date and time with English numerals
 */
export function formatDateTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj);
  } catch (e) {
    return date.toString();
  }
}

/**
 * Format date in short format (DD/MM/YYYY) with English numerals
 */
export function formatDateShort(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return date.toString();
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  } catch (e) {
    return date.toString();
  }
}

