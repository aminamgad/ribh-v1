/**
 * Input sanitization utilities
 * Prevents XSS attacks and validates/sanitizes user input
 */

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize HTML content (removes all HTML tags)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Remove all HTML tags
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize HTML with allowed tags (for rich text editors)
 * Note: For production, consider using DOMPurify library
 */
export function sanitizeRichText(html: string, allowedTags: string[] = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li']): string {
  if (!html) return '';
  
  // Create regex pattern for allowed tags
  const allowedPattern = allowedTags.map(tag => `<${tag}[^>]*>|</${tag}>`).join('|');
  const tagRegex = new RegExp(`<(?!(${allowedPattern}))[^>]+>`, 'gi');
  
  // Remove disallowed tags
  let sanitized = html.replace(tagRegex, '');
  
  // Remove script and style tags completely
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitize string input (remove HTML, trim, limit length)
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Convert to lowercase and trim
  const sanitized = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('البريد الإلكتروني غير صحيح');
  }
  
  return sanitized;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let sanitized = phone.replace(/[^\d+]/g, '');
  
  // Remove leading zeros if not international format
  if (!sanitized.startsWith('+')) {
    sanitized = sanitized.replace(/^0+/, '');
  }
  
  return sanitized.trim();
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('البروتوكول غير مسموح');
    }
    
    return urlObj.toString();
  } catch (error) {
    throw new Error('رابط غير صحيح');
  }
}

/**
 * Sanitize number (ensure it's a valid number)
 */
export function sanitizeNumber(input: any, min?: number, max?: number): number {
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  
  if (isNaN(num)) {
    throw new Error('قيمة رقمية غير صحيحة');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`القيمة يجب أن تكون أكبر من أو تساوي ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`القيمة يجب أن تكون أقل من أو تساوي ${max}`);
  }
  
  return num;
}

/**
 * Sanitize integer
 */
export function sanitizeInteger(input: unknown, min?: number, max?: number): number {
  const num = sanitizeNumber(input, min, max);
  
  if (!Number.isInteger(num)) {
    throw new Error('القيمة يجب أن تكون رقماً صحيحاً');
  }
  
  return num;
}

/**
 * Sanitize object (recursively sanitize all string values)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T, maxStringLength?: number): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, maxStringLength) as T[Extract<keyof T, string>];
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item, maxStringLength) : item
        ) as T[Extract<keyof T, string>];
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value as Record<string, unknown>, maxStringLength) as T[Extract<keyof T, string>];
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Remove SQL injection patterns (basic protection)
 */
export function removeSqlInjection(input: string): string {
  if (!input) return '';
  
  // Remove common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\bUNION\s+SELECT\b)/gi
  ];
  
  let sanitized = input;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }
  
  return sanitized.trim();
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id: string): string {
  if (!id) {
    throw new Error('المعرف مطلوب');
  }
  
  // MongoDB ObjectId format: 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdRegex.test(id)) {
    throw new Error('معرف غير صحيح');
  }
  
  return id;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (!query) return '';
  
  // Remove HTML
  let sanitized = sanitizeString(query, maxLength);
  
  // Remove SQL injection patterns
  sanitized = removeSqlInjection(sanitized);
  
  // Remove special regex characters that could cause issues
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  return sanitized;
}

