import connectDB from './database';
import SystemSettings from '@/models/SystemSettings';
import { settingsCache, generateCacheKey } from './cache';
import { logger } from './logger';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSystemSettings() {
  try {
    const cacheKey = generateCacheKey('system', 'settings');
    
    // Try to get from cache
    const cached = settingsCache.get(cacheKey);
    if (cached) {
      // Check if cache is still valid (TTL check)
      const cacheTime = (cached as any).__cacheTime || 0;
      const now = Date.now();
      if (now - cacheTime < CACHE_TTL) {
        // Remove cache metadata before returning
        const { __cacheTime, ...cleanCached } = cached as any;
        return cleanCached;
      } else {
        // Cache expired, remove it
        settingsCache.delete(cacheKey);
      }
    }
    
    await connectDB();
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        withdrawalSettings: {
          minimumWithdrawal: 100,
          maximumWithdrawal: 50000,
          withdrawalFees: 0
        },
        // commissionRates deprecated - using adminProfitMargins only
        commissionRates: [],
        adminProfitMargins: [
          { minPrice: 1, maxPrice: 100, margin: 10 },
          { minPrice: 101, maxPrice: 500, margin: 8 },
          { minPrice: 501, maxPrice: 1000, margin: 6 },
          { minPrice: 1001, maxPrice: 999999, margin: 5 }
        ],
        platformName: 'ربح',
        platformDescription: 'منصة التجارة الإلكترونية العربية',
        contactEmail: 'support@ribh.com',
        contactPhone: '+966500000000',
        minimumOrderValue: 50,
        maximumOrderValue: 100000,
        // Updated shipping structure
        shippingEnabled: true,
        defaultShippingCost: 50,
        defaultFreeShippingThreshold: 500,
        governorates: [
          {
            name: 'المملكة العربية السعودية',
            cities: ['الرياض', 'جدة', 'مكة المكرمة', 'الدمام', 'الجبيل', 'الخبر', 'القطيف', 'الطائف', 'المدينة المنورة', 'الباحة', 'الحدود الشمالية', 'الحدود الجنوبية', 'المنطقة الشرقية', 'المنطقة الغربية'],
            shippingCost: 50,
            isActive: true
          }
        ],
        maxProductImages: 10,
        maxProductDescriptionLength: 1000,
        autoApproveProducts: false,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        passwordMinLength: 8,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        termsOfService: 'شروط الخدمة',
        privacyPolicy: 'سياسة الخصوصية',
        refundPolicy: 'سياسة الاسترداد',
        googleAnalyticsId: '',
        facebookPixelId: ''
      };
      
      // Cache default settings with TTL metadata
      const cachedDefault = {
        ...defaultSettings,
        __cacheTime: Date.now()
      };
      settingsCache.set(cacheKey, cachedDefault);
      return defaultSettings;
    }
    
    // Cache the settings with TTL metadata
    const settingsObject = settings.toObject();
    const cachedObject = {
      ...settingsObject,
      __cacheTime: Date.now()
    };
    settingsCache.set(cacheKey, cachedObject);
    
    return settingsObject;
  } catch (error) {
    logger.error('Error fetching system settings', error);
    return null;
  }
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  settingsCache.clearPattern('system:settings');
}

// Helper functions to apply settings
export async function validateOrderValue(orderTotal: number) {
  const settings = await getSystemSettings();
  if (!settings) return { valid: true };
  
  if (orderTotal < settings.minimumOrderValue) {
    return {
      valid: false,
      message: `الحد الأدنى للطلب هو ${settings.minimumOrderValue}₪`
    };
  }
  
  if (orderTotal > settings.maximumOrderValue) {
    return {
      valid: false,
      message: `الحد الأقصى للطلب هو ${settings.maximumOrderValue}₪`
    };
  }
  
  return { valid: true };
}

/**
 * Calculate shipping cost based on order total, village ID, or shipping region
 * Priority: shippingRegions > Village model > default shipping cost
 * @param orderTotal - Total order amount
 * @param villageId - Optional village ID for specific delivery cost
 * @param shippingRegionCode - Optional shipping region code from SystemSettings
 * @returns Shipping cost (0 if free shipping threshold is met)
 */
export async function calculateShippingCost(
  orderTotal: number, 
  villageId?: number,
  shippingRegionCode?: string
) {
  const settings = await getSystemSettings();
  if (!settings) return 0;
  
  let shippingCost = settings.defaultShippingCost;
  let freeShippingThreshold = settings.defaultFreeShippingThreshold;
  
  // Priority 1: Check shipping regions if region code is provided
  if (shippingRegionCode && settings.shippingRegions && settings.shippingRegions.length > 0) {
    const region = settings.shippingRegions.find(
      (r: any) => r.regionCode === shippingRegionCode && r.isActive === true
    );
    
    if (region) {
      shippingCost = region.shippingCost;
      freeShippingThreshold = region.freeShippingThreshold ?? settings.defaultFreeShippingThreshold;
    }
  }
  
  // Priority 2: If villageId is specified and no region found, try Village model
  if (!shippingRegionCode && villageId) {
    try {
      const Village = (await import('@/models/Village')).default;
      const village = await Village.findOne({ 
        villageId: villageId,
        isActive: true 
      }).lean();
      
      if (village) {
        const villageCost = (village as any).deliveryCost;
        if (villageCost !== undefined && villageCost !== null) {
          shippingCost = villageCost;
        }
      }
    } catch (error) {
      logger.warn('Error fetching village for shipping cost', { villageId, error });
      // Fallback to default if village lookup fails
    }
  }
  
  // Check for free shipping threshold
  if (orderTotal >= freeShippingThreshold) {
    return 0; // Free shipping
  }
  
  return shippingCost;
}

/**
 * @deprecated Use calculateShippingCost with villageId instead
 * Legacy function for backward compatibility with governorate-based system
 */
export async function calculateShippingCostLegacy(orderTotal: number, governorateName?: string) {
  const settings = await getSystemSettings();
  if (!settings) return 0;
  
  // Check for free shipping threshold
  if (orderTotal >= settings.defaultFreeShippingThreshold) {
    return 0; // Free shipping
  }
  
  // If governorate is specified, get shipping cost for that governorate (legacy)
  if (governorateName && settings.governorates) {
    const governorate = settings.governorates.find((g: any) => g.name === governorateName && g.isActive);
    if (governorate) {
      return governorate.shippingCost;
    }
  }
  
  // Fallback to default shipping cost
  return settings.defaultShippingCost;
}

// Deprecated: calculateCommission - use calculateAdminProfitForOrder instead
// This function is kept for backward compatibility only
export async function calculateCommission(orderTotal: number) {
  // This function is deprecated - commission is now calculated using adminProfitMargins
  // Return 0 to avoid incorrect calculations
  logger.warn('calculateCommission is deprecated - use calculateAdminProfitForOrder instead', { orderTotal });
  return 0;
}

// Calculate admin profit margin for a product based on its price
export async function getAdminProfitMargin(productPrice: number): Promise<number> {
  const settings = await getSystemSettings();
  logger.debug('Calculating admin profit margin', {
    productPrice,
    hasSettings: !!settings,
    marginsCount: settings?.adminProfitMargins?.length || 0
  });
  
  if (!settings || !settings.adminProfitMargins || settings.adminProfitMargins.length === 0) {
    logger.debug('Using default margin (5%) - no margins defined');
    return 5; // Default margin
  }
  
  // Sort margins by minPrice to ensure correct matching
  const sortedMargins = [...settings.adminProfitMargins].sort((a, b) => a.minPrice - b.minPrice);
  
  for (const margin of sortedMargins) {
    if (productPrice >= margin.minPrice && productPrice <= margin.maxPrice) {
      logger.debug('Profit margin found', {
        productPrice,
        margin: margin.margin,
        range: `${margin.minPrice} - ${margin.maxPrice}`
      });
      return margin.margin;
    }
  }
  
  logger.debug('Using default margin (5%) - no matching range');
  return 5; // Default margin if no match
}

// Calculate admin profit for a single product
export async function calculateAdminProfitForProduct(productPrice: number, quantity: number = 1): Promise<number> {
  const margin = await getAdminProfitMargin(productPrice);
  return (productPrice * margin / 100) * quantity;
}

// Calculate total admin profit for order items (based on product prices, not order total)
export async function calculateAdminProfitForOrder(items: Array<{ unitPrice: number; quantity: number }>): Promise<number> {
  let totalProfit = 0;
  
  logger.debug('Calculating admin profit for order', {
    itemsCount: items.length
  });
  
  for (const item of items) {
    const itemProfit = await calculateAdminProfitForProduct(item.unitPrice, item.quantity);
    logger.debug('Product profit calculated', {
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      profit: itemProfit
    });
    totalProfit += itemProfit;
  }
  
  logger.debug('Total admin profit calculated', { totalProfit });
  return totalProfit;
}

export async function validateWithdrawalAmount(amount: number) {
  const settings = await getSystemSettings();
  if (!settings) return { valid: true };
  
  if (amount < settings.withdrawalSettings.minimumWithdrawal) {
    return {
      valid: false,
      message: `الحد الأدنى للسحب هو ${settings.withdrawalSettings.minimumWithdrawal}₪`
    };
  }
  
  if (amount > settings.withdrawalSettings.maximumWithdrawal) {
    return {
      valid: false,
      message: `الحد الأقصى للسحب هو ${settings.withdrawalSettings.maximumWithdrawal}₪`
    };
  }
  
  return { valid: true };
}

export async function calculateWithdrawalFees(amount: number) {
  const settings = await getSystemSettings();
  if (!settings) return 0;
  
  return (amount * settings.withdrawalSettings.withdrawalFees / 100);
}

export async function validatePassword(password: string) {
  const settings = await getSystemSettings();
  if (!settings) return { valid: true };
  
  if (password.length < settings.passwordMinLength) {
    return {
      valid: false,
      message: `كلمة المرور يجب أن تكون ${settings.passwordMinLength} أحرف على الأقل`
    };
  }
  
  return { valid: true };
}

export async function getPlatformInfo() {
  const settings = await getSystemSettings();
  if (!settings) return {};
  
  return {
    name: settings.platformName,
    description: settings.platformDescription,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone
  };
} 