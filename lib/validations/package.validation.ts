import { z } from 'zod';

/**
 * Validation schema for creating a package via external company API
 */
export const createPackageSchema = z.object({
  to_name: z.string()
    .min(2, 'اسم المستلم يجب أن يكون حرفين على الأقل')
    .max(200, 'اسم المستلم لا يمكن أن يتجاوز 200 حرف')
    .trim(),
  
  to_phone: z.string()
    .min(7, 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل')
    .max(20, 'رقم الهاتف طويل جداً')
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف غير صحيح')
    .trim(),
  
  alter_phone: z.string()
    .min(7, 'رقم الهاتف البديل يجب أن يكون 7 أرقام على الأقل')
    .max(20, 'رقم الهاتف البديل طويل جداً')
    .regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف البديل غير صحيح')
    .trim(),
  
  description: z.string()
    .min(3, 'الوصف يجب أن يكون 3 أحرف على الأقل')
    .max(1000, 'الوصف لا يمكن أن يتجاوز 1000 حرف')
    .trim(),
  
  package_type: z.string()
    .min(1, 'نوع الطرد مطلوب')
    .max(50, 'نوع الطرد لا يمكن أن يتجاوز 50 حرف')
    .trim(),
  
  village_id: z.union([
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        throw new Error('معرف القرية يجب أن يكون رقماً');
      }
      return num;
    }),
    z.number().int().positive('معرف القرية يجب أن يكون رقماً موجباً')
  ]),
  
  street: z.string()
    .min(5, 'عنوان الشارع يجب أن يكون 5 أحرف على الأقل')
    .max(500, 'عنوان الشارع لا يمكن أن يتجاوز 500 حرف')
    .trim(),
  
  total_cost: z.union([
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) {
        throw new Error('التكلفة الإجمالية يجب أن تكون رقماً');
      }
      if (num < 0) {
        throw new Error('التكلفة الإجمالية يجب أن تكون أكبر من أو تساوي صفر');
      }
      return num;
    }),
    z.number().min(0, 'التكلفة الإجمالية يجب أن تكون أكبر من أو تساوي صفر')
  ]),
  
  note: z.string()
    .max(1000, 'الملاحظات لا يمكن أن تتجاوز 1000 حرف')
    .trim()
    .optional(),
  
  barcode: z.string()
    .min(1, 'الباركود مطلوب')
    .max(100, 'الباركود لا يمكن أن يتجاوز 100 حرف')
    .trim()
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

