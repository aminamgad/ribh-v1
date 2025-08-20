import connectDB from './database';
import SystemSettings from '@/models/SystemSettings';

// Cache for settings to avoid repeated database calls
let settingsCache: any = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSystemSettings() {
  try {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (settingsCache && (now - lastCacheTime) < CACHE_DURATION) {
      return settingsCache;
    }
    
    await connectDB();
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Return default settings if none exist
      return {
        withdrawalSettings: {
          minimumWithdrawal: 100,
          maximumWithdrawal: 50000,
          withdrawalFees: 0
        },
        commissionRates: [
          { minPrice: 0, maxPrice: 1000, rate: 10 },
          { minPrice: 1001, maxPrice: 5000, rate: 8 },
          { minPrice: 5001, maxPrice: 10000, rate: 6 },
          { minPrice: 10001, maxPrice: 999999, rate: 5 }
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
    }
    
    // Cache the settings
    settingsCache = settings.toObject();
    lastCacheTime = now;
    
    return settingsCache;
  } catch (error) {
    console.error('❌ خطأ في جلب إعدادات النظام:', error);
    return null;
  }
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  settingsCache = null;
  lastCacheTime = 0;
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

export async function calculateShippingCost(orderTotal: number, governorateName?: string) {
  const settings = await getSystemSettings();
  if (!settings) return 0;
  
  // Check for free shipping threshold
  if (orderTotal >= settings.defaultFreeShippingThreshold) {
    return 0; // Free shipping
  }
  
  // If governorate is specified, get shipping cost for that governorate
  if (governorateName && settings.governorates) {
    const governorate = settings.governorates.find((g: any) => g.name === governorateName && g.isActive);
    if (governorate) {
      return governorate.shippingCost;
    }
  }
  
  // Fallback to default shipping cost
  return settings.defaultShippingCost;
}

export async function calculateCommission(orderTotal: number) {
  const settings = await getSystemSettings();
  if (!settings) return 0;
  
  const rate = settings.commissionRates.find(
    (rate: { minPrice: number; maxPrice: number; rate: number }) => orderTotal >= rate.minPrice && orderTotal <= rate.maxPrice
  );
  
  return rate ? (orderTotal * rate.rate / 100) : 0;
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