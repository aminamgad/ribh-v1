import { z } from 'zod';

/**
 * Validation schemas for System Settings API
 * Updated to match current SystemSettings model
 */

// Commission Rate Schema (deprecated - kept for backward compatibility only)
export const commissionRateSchema = z.object({
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  rate: z.number().min(0).max(100)
});

// Admin Profit Margin Schema
export const adminProfitMarginSchema = z.object({
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  margin: z.number().min(0).max(100)
}).refine(
  (data) => data.minPrice <= data.maxPrice,
  { message: 'الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى', path: ['maxPrice'] }
);

// Withdrawal Settings Schema
export const withdrawalSettingsSchema = z.object({
  minimumWithdrawal: z.number().min(0),
  maximumWithdrawal: z.number().min(0),
  withdrawalFees: z.number().min(0).max(100)
}).refine(
  (data) => data.minimumWithdrawal <= data.maximumWithdrawal,
  { message: 'الحد الأدنى للسحب يجب أن يكون أقل من أو يساوي الأقصى', path: ['maximumWithdrawal'] }
);

// Financial Settings Schema
export const financialSettingsSchema = z.object({
  withdrawalSettings: withdrawalSettingsSchema,
  adminProfitMargins: z.array(adminProfitMarginSchema)
    .min(1, 'يجب إضافة هامش ربح واحد على الأقل')
    .refine(
      (margins) => {
        // Check for overlapping ranges
        const sortedMargins = [...margins].sort((a, b) => a.minPrice - b.minPrice);
        
        // Check for overlaps
        for (let i = 0; i < sortedMargins.length; i++) {
          for (let j = i + 1; j < sortedMargins.length; j++) {
            const m1 = sortedMargins[i];
            const m2 = sortedMargins[j];
            
            // Check if ranges overlap
            if (m1.minPrice < m2.maxPrice && m1.maxPrice > m2.minPrice) {
              return false; // Overlapping ranges found
            }
          }
        }
        
        // Check for gaps (optional - can be removed if gaps are allowed)
        // For now, we'll allow gaps but ensure no overlaps
        
        return true;
      },
      { 
        message: 'هناك تداخل في نطاقات هامش الربح. يجب أن تكون النطاقات غير متداخلة',
        path: ['adminProfitMargins']
      }
    )
});

// General Settings Schema
export const generalSettingsSchema = z.object({
  platformName: z.string().min(1, 'اسم المنصة مطلوب').max(100, 'اسم المنصة لا يمكن أن يتجاوز 100 حرف'),
  platformDescription: z.string().max(500, 'وصف المنصة لا يمكن أن يتجاوز 500 حرف'),
  contactEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  contactPhone: z.string().min(1, 'رقم الهاتف مطلوب')
});

// Order Settings Schema
export const orderSettingsSchema = z.object({
  minimumOrderValue: z.number().min(0, 'الحد الأدنى للطلب يجب أن يكون 0 أو أكثر'),
  maximumOrderValue: z.number().min(0, 'الحد الأقصى للطلب يجب أن يكون 0 أو أكثر')
}).refine(
  (data) => data.minimumOrderValue <= data.maximumOrderValue,
  { message: 'الحد الأدنى للطلب يجب أن يكون أقل من أو يساوي الأقصى', path: ['maximumOrderValue'] }
);

// Shipping Settings Schema
export const governorateSchema = z.object({
  name: z.string().min(1, 'اسم المحافظة مطلوب'),
  cities: z.array(z.string()),
  shippingCost: z.number().min(0, 'تكلفة الشحن يجب أن تكون أكبر من أو تساوي صفر'),
  isActive: z.boolean()
});

export const shippingSettingsSchema = z.object({
  shippingEnabled: z.boolean(),
  defaultShippingCost: z.number().min(0, 'التكلفة الافتراضية يجب أن تكون أكبر من أو تساوي صفر'),
  defaultFreeShippingThreshold: z.number().min(0, 'حد الشحن المجاني يجب أن يكون أكبر من أو تساوي صفر'),
  governorates: z.array(governorateSchema)
    .refine(
      (governorates) => {
        // Check for duplicate governorate names
        const names = governorates.map(g => g.name.toLowerCase().trim());
        const uniqueNames = new Set(names);
        return names.length === uniqueNames.size;
      },
      { message: 'يوجد تكرار في أسماء المحافظات', path: ['governorates'] }
    )
    .refine(
      (governorates) => {
        // Check for duplicate cities within same governorate
        for (const gov of governorates) {
          const cityNames = gov.cities.map(c => c.toLowerCase().trim());
          const uniqueCities = new Set(cityNames);
          if (cityNames.length !== uniqueCities.size) {
            return false;
          }
        }
        return true;
      },
      { message: 'يوجد تكرار في أسماء المدن داخل نفس المحافظة', path: ['governorates'] }
    )
});

// Product Settings Schema
export const productSettingsSchema = z.object({
  maxProductImages: z.number().int().min(1, 'الحد الأقصى للصور يجب أن يكون 1 أو أكثر').max(20, 'الحد الأقصى للصور لا يمكن أن يتجاوز 20'),
  maxProductDescriptionLength: z.number().int().min(100, 'الحد الأقصى لوصف المنتج يجب أن يكون 100 أو أكثر').max(5000, 'الحد الأقصى لوصف المنتج لا يمكن أن يتجاوز 5000'),
  autoApproveProducts: z.boolean()
});

// Notification Settings Schema
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean()
});

// Security Settings Schema
export const securitySettingsSchema = z.object({
  passwordMinLength: z.number().int().min(6, 'الحد الأدنى لكلمة المرور يجب أن يكون 6 أو أكثر').max(20, 'الحد الأقصى لكلمة المرور لا يمكن أن يتجاوز 20'),
  sessionTimeout: z.number().int().min(15, 'مهلة الجلسة يجب أن تكون 15 دقيقة أو أكثر').max(1440, 'مهلة الجلسة لا يمكن أن تتجاوز 1440 دقيقة'),
  maxLoginAttempts: z.number().int().min(3, 'الحد الأقصى لمحاولات تسجيل الدخول يجب أن يكون 3 أو أكثر').max(10, 'الحد الأقصى لمحاولات تسجيل الدخول لا يمكن أن يتجاوز 10')
});

// Legal Settings Schema
export const legalSettingsSchema = z.object({
  termsOfService: z.string(),
  privacyPolicy: z.string(),
  refundPolicy: z.string()
});

// Analytics Settings Schema
export const analyticsSettingsSchema = z.object({
  googleAnalyticsId: z.string(),
  facebookPixelId: z.string()
});

// Maintenance Settings Schema
export const maintenanceSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500, 'رسالة الصيانة لا يمكن أن تتجاوز 500 حرف')
});

// Legacy schema for backward compatibility (deprecated - use specific schemas above)
export const updateSettingsSchema = z.object({
  // This schema is deprecated - use specific schemas above
  // Kept for backward compatibility only
}).passthrough();
