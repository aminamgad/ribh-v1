import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierPrice: z.number().min(0.01, 'سعر المورد يجب أن يكون أكبر من 0'),
  marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0').optional(),
  wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0').nullish(),
  minimumSellingPrice: z.preprocess(
    (val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val)) ? 0 : val),
    z.number().min(0, 'السعر الأدنى للبيع لا يمكن أن يكون سالباً').optional()
  ),
  isMinimumPriceMandatory: z.boolean().default(false),
  stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
  sku: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

export const productFormDefaultValues: ProductFormData = {
  name: '',
  description: '',
  categoryId: '',
  stockQuantity: 0,
  supplierPrice: 0,
  marketerPrice: 0,
  wholesalerPrice: undefined,
  minimumSellingPrice: 0,
  isMinimumPriceMandatory: false,
  sku: '',
};
