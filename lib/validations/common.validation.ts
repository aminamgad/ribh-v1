import { z } from 'zod';

/**
 * Common validation schemas used across multiple APIs
 */

// Schema for MongoDB ObjectId validation
export const objectIdSchema = z.string()
  .min(24, 'معرف غير صحيح')
  .max(24, 'معرف غير صحيح')
  .regex(/^[0-9a-fA-F]{24}$/, 'معرف غير صحيح - يجب أن يكون ObjectId صالح');

// Schema for pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

// Schema for date range
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }
);

// Schema for status enum (common statuses)
export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'ready_for_shipping',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
]);

export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed']);

export const fulfillmentStatusSchema = z.enum(['pending', 'approved', 'rejected']);

// Schema for address (shipping/billing)
export const addressSchema = z.object({
  fullName: z.string()
    .min(2, 'الاسم الكامل يجب أن يكون حرفين على الأقل')
    .max(200, 'الاسم الكامل لا يمكن أن يتجاوز 200 حرف'),
  phone: z.string()
    .min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل')
    .max(20, 'رقم الهاتف طويل جداً'),
  street: z.string()
    .min(5, 'عنوان الشارع يجب أن يكون 5 أحرف على الأقل')
    .max(300, 'عنوان الشارع لا يمكن أن يتجاوز 300 حرف'),
  city: z.string()
    .min(2, 'المدينة يجب أن تكون حرفين على الأقل')
    .max(100, 'المدينة لا يمكن أن تتجاوز 100 حرف'),
  governorate: z.string()
    .min(2, 'المحافظة يجب أن تكون حرفين على الأقل')
    .max(100, 'المحافظة لا يمكن أن تتجاوز 100 حرف'),
  postalCode: z.string()
    .max(20, 'الرمز البريدي لا يمكن أن يتجاوز 20 حرف')
    .optional(),
  notes: z.string()
    .max(500, 'ملاحظات التوصيل لا يمكن أن تتجاوز 500 حرف')
    .optional()
});

