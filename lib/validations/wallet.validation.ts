import { z } from 'zod';

/**
 * Validation schemas for Wallet API
 */

// Schema for withdrawal request
export const withdrawalRequestSchema = z.object({
  walletNumber: z.string().min(1, 'رقم المحفظة مطلوب'),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().max(500, 'ملاحظات السحب لا يمكن أن تتجاوز 500 حرف').optional()
});

// Schema for wallet number (common validation)
export const walletNumberSchema = z.string()
  .min(1, 'رقم المحفظة مطلوب')
  .regex(/^[0-9]+$/, 'رقم المحفظة يجب أن يحتوي على أرقام فقط');

// Schema for amount validation
export const amountSchema = z.number()
  .positive('المبلغ يجب أن يكون أكبر من صفر')
  .min(0.01, 'المبلغ يجب أن يكون 0.01 على الأقل');

