import { z } from 'zod';

/**
 * Validation schemas for Category API
 */

// Schema for creating a category
export const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'اسم الفئة يجب أن يكون حرفين على الأقل')
    .max(100, 'اسم الفئة لا يمكن أن يتجاوز 100 حرف'),
  description: z.string()
    .max(1000, 'وصف الفئة لا يمكن أن يتجاوز 1000 حرف')
    .optional(),
  parentId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'معرف الفئة الأب غير صحيح')
    .optional()
    .nullable(),
  image: z.string()
    .url('رابط الصورة غير صحيح')
    .optional(),
  icon: z.string()
    .max(50, 'رمز الأيقونة لا يمكن أن يتجاوز 50 حرف')
    .optional(),
  showInMenu: z.boolean().default(true),
  showInHome: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط')
    .max(100, 'الرابط لا يمكن أن يتجاوز 100 حرف')
    .optional()
});

// Schema for updating a category
export const updateCategorySchema = createCategorySchema.partial().extend({
  _id: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'معرف الفئة غير صحيح')
});

// Schema for category ID parameter
export const categoryIdSchema = z.string()
  .regex(/^[0-9a-fA-F]{24}$/, 'معرف الفئة غير صحيح');

