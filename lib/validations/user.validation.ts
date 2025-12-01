import { z } from 'zod';

/**
 * Validation schemas for User API
 */

// Schema for user registration
export const registerSchema = z.object({
  name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم لا يمكن أن يتجاوز 100 حرف'),
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .min(5, 'البريد الإلكتروني قصير جداً')
    .max(255, 'البريد الإلكتروني طويل جداً'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(100, 'كلمة المرور لا يمكن أن تتجاوز 100 حرف')
    .regex(/[A-Za-z]/, 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),
  phone: z.string()
    .min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل')
    .max(20, 'رقم الهاتف طويل جداً')
    .optional(),
  role: z.enum(['marketer', 'supplier', 'wholesaler'], {
    errorMap: () => ({ message: 'الدور يجب أن يكون: marketer, supplier, أو wholesaler' })
  }),
  companyName: z.string()
    .max(200, 'اسم الشركة لا يمكن أن يتجاوز 200 حرف')
    .optional(),
  taxId: z.string()
    .max(50, 'الرقم الضريبي لا يمكن أن يتجاوز 50 حرف')
    .optional()
});

// Schema for user login
export const loginSchema = z.object({
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .min(1, 'البريد الإلكتروني مطلوب'),
  password: z.string()
    .min(1, 'كلمة المرور مطلوبة')
});

// Schema for updating user profile
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم لا يمكن أن يتجاوز 100 حرف')
    .optional(),
  phone: z.string()
    .min(10, 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل')
    .max(20, 'رقم الهاتف طويل جداً')
    .optional(),
  companyName: z.string()
    .max(200, 'اسم الشركة لا يمكن أن يتجاوز 200 حرف')
    .optional(),
  taxId: z.string()
    .max(50, 'الرقم الضريبي لا يمكن أن يتجاوز 50 حرف')
    .optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    governorate: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional()
  }).optional()
});

