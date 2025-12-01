import { z } from 'zod';

/**
 * Validation schemas for System Settings API
 */

// Schema for updating system settings
export const updateSettingsSchema = z.object({
  // Commission settings
  commission: z.number()
    .min(0, 'العمولة يجب أن تكون أكبر من أو تساوي صفر')
    .max(100, 'العمولة لا يمكن أن تتجاوز 100%')
    .optional(),
  marketerCommission: z.number()
    .min(0, 'عمولة المسوق يجب أن تكون أكبر من أو تساوي صفر')
    .max(100, 'عمولة المسوق لا يمكن أن تتجاوز 100%')
    .optional(),
  
  // Profit margin settings
  minProfitMargin: z.number()
    .min(0, 'هامش الربح الأدنى يجب أن يكون أكبر من أو يساوي صفر')
    .max(100, 'هامش الربح الأدنى لا يمكن أن يتجاوز 100%')
    .optional(),
  maxProfitMargin: z.number()
    .min(0, 'هامش الربح الأقصى يجب أن يكون أكبر من أو يساوي صفر')
    .max(100, 'هامش الربح الأقصى لا يمكن أن يتجاوز 100%')
    .optional(),
  
  // Shipping settings
  baseShippingCost: z.number()
    .min(0, 'تكلفة الشحن الأساسية يجب أن تكون أكبر من أو تساوي صفر')
    .optional(),
  shippingCostPerKg: z.number()
    .min(0, 'تكلفة الشحن لكل كيلو يجب أن تكون أكبر من أو تساوي صفر')
    .optional(),
  
  // Withdrawal settings
  minimumWithdrawal: z.number()
    .min(0, 'الحد الأدنى للسحب يجب أن يكون أكبر من أو يساوي صفر')
    .optional(),
  maximumWithdrawal: z.number()
    .min(0, 'الحد الأقصى للسحب يجب أن يكون أكبر من أو يساوي صفر')
    .optional(),
  withdrawalFee: z.number()
    .min(0, 'رسوم السحب يجب أن تكون أكبر من أو تساوي صفر')
    .max(100, 'رسوم السحب لا يمكن أن تتجاوز 100%')
    .optional(),
  
  // Product settings
  maxProductImages: z.number()
    .int()
    .min(1, 'الحد الأقصى لصور المنتج يجب أن يكون 1 على الأقل')
    .max(20, 'الحد الأقصى لصور المنتج لا يمكن أن يتجاوز 20')
    .optional(),
  maxProductDescription: z.number()
    .int()
    .min(100, 'الحد الأقصى لوصف المنتج يجب أن يكون 100 حرف على الأقل')
    .max(10000, 'الحد الأقصى لوصف المنتج لا يمكن أن يتجاوز 10000 حرف')
    .optional(),
  requireProductImages: z.boolean().optional(),
  
  // Order settings
  orderProcessingTime: z.number()
    .int()
    .min(1, 'وقت معالجة الطلب يجب أن يكون يوم واحد على الأقل')
    .max(30, 'وقت معالجة الطلب لا يمكن أن يتجاوز 30 يوم')
    .optional(),
  
  // Other settings
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional()
}).refine(
  (data) => {
    if (data.minProfitMargin !== undefined && data.maxProfitMargin !== undefined) {
      return data.minProfitMargin <= data.maxProfitMargin;
    }
    return true;
  },
  { message: 'هامش الربح الأدنى يجب أن يكون أقل من أو يساوي الأقصى', path: ['minProfitMargin'] }
).refine(
  (data) => {
    if (data.minimumWithdrawal !== undefined && data.maximumWithdrawal !== undefined) {
      return data.minimumWithdrawal <= data.maximumWithdrawal;
    }
    return true;
  },
  { message: 'الحد الأدنى للسحب يجب أن يكون أقل من أو يساوي الأقصى', path: ['minimumWithdrawal'] }
);

