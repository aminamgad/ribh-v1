'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaUpload from '@/components/ui/MediaUpload';
import ProductVariants from '@/components/ui/ProductVariants';
import { ProductVariant, ProductVariantOption } from '@/types';

const productSchema = z.object({
  name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0'),
  wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0'),
  minimumSellingPrice: z.number().min(0.01, 'السعر الأدنى للبيع يجب أن يكون أكبر من 0').optional(),
  isMinimumPriceMandatory: z.boolean().default(false),
  stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
  sku: z.string().optional(),
  weight: z.number().min(0, 'الوزن يجب أن يكون 0 أو أكثر').optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional()
  }).optional()
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  _id: string;
  name: string;
}

export default function NewProductPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  // Product variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      stockQuantity: 0,
      marketerPrice: 0,
      wholesalerPrice: 0,
      minimumSellingPrice: 0,
      isMinimumPriceMandatory: false,
      weight: 0,
      sku: '',
      dimensions: {
        length: 0,
        width: 0,
        height: 0
      }
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user?.role !== 'supplier' && user?.role !== 'admin') {
      toast.error('غير مصرح لك بإضافة منتجات');
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        toast.error('فشل في جلب الفئات');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب الفئات');
    }
  };

  const handleVariantsChange = (newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
  };


  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    if (images.length === 0) {
      toast.error('يجب إضافة صورة واحدة على الأقل');
      return;
    }

    // Validate pricing logic
    if (data.wholesalerPrice >= data.marketerPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من سعر الجملة');
      return;
    }

    if (data.minimumSellingPrice && data.marketerPrice >= data.minimumSellingPrice) {
      toast.error('السعر الأدنى للبيع يجب أن يكون أكبر من سعر المسوق');
      return;
    }

    setLoading(true);
    try {
      // Prepare clean data
      const productData = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        categoryId: data.categoryId && data.categoryId !== '' ? data.categoryId : null,
        marketerPrice: Number(data.marketerPrice),
        wholesalerPrice: Number(data.wholesalerPrice),
        minimumSellingPrice: data.minimumSellingPrice && data.minimumSellingPrice > 0 ? Number(data.minimumSellingPrice) : null,
        isMinimumPriceMandatory: data.isMinimumPriceMandatory,
        stockQuantity: Number(data.stockQuantity),
        images: images,
        sku: data.sku?.trim() || '',
        weight: data.weight && data.weight > 0 ? Number(data.weight) : null,
        dimensions: (data.dimensions?.length || data.dimensions?.width || data.dimensions?.height) ? {
          length: data.dimensions.length && data.dimensions.length > 0 ? Number(data.dimensions.length) : null,
          width: data.dimensions.width && data.dimensions.width > 0 ? Number(data.dimensions.width) : null,
          height: data.dimensions.height && data.dimensions.height > 0 ? Number(data.dimensions.height) : null
        } : null,
        tags: [],
        specifications: {},
        // Product variants
        hasVariants,
        variants: hasVariants ? variants : [],
        variantOptions: hasVariants ? variantOptions : []
      };

      console.log('Sending product data:', productData);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || 'تم إضافة المنتج بنجاح');
        router.push('/dashboard/products');
      } else {
        console.error('API Error:', result);
        toast.error(result.message || 'حدث خطأ أثناء إضافة المنتج');
        
        // Show validation errors if available
        if (result.errors) {
          result.errors.forEach((error: any) => {
            toast.error(`${error.path}: ${error.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const marketerPrice = watch('marketerPrice') || 0;
  const wholesalerPrice = watch('wholesalerPrice') || 0;
  const minimumSellingPrice = watch('minimumSellingPrice') || 0;
  const isMinimumPriceMandatory = watch('isMinimumPriceMandatory') || false;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">إضافة منتج جديد</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">أضف منتجك الجديد إلى المنصة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">المعلومات الأساسية</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="input-field"
                    placeholder="أدخل اسم المنتج"
                  />
                  {errors.name && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الفئة (اختياري)
                  </label>
                  <select {...register('categoryId')} className="input-field">
                    <option value="">اختر الفئة</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.categoryId.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  وصف المنتج (اختياري)
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field"
                  placeholder="أدخل وصف المنتج"
                />
                {errors.description && (
                  <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">الأسعار</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر الجملة (للتجار) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('wholesalerPrice', { valueAsNumber: true })}
                      className="input-field pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₪</span>
                  </div>
                  {errors.wholesalerPrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.wholesalerPrice.message}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    سعر ثابت للتجار - لا يتغير عند الطلب
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر المسوق (السعر الأساسي) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('marketerPrice', { valueAsNumber: true })}
                      className="input-field pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₪</span>
                  </div>
                  {errors.marketerPrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.marketerPrice.message}</p>
                  )}
                  {marketerPrice <= wholesalerPrice && marketerPrice > 0 && wholesalerPrice > 0 && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                      يجب أن يكون أكبر من سعر الجملة
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    السعر الأساسي للمسوق - يحدد ربحه عند الطلب
                  </p>
                </div>
              </div>

              {/* Minimum Selling Price Section */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">السعر الأدنى للبيع</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      id="isMinimumPriceMandatory"
                      {...register('isMinimumPriceMandatory')}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="isMinimumPriceMandatory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      إلزامي - المسوق يجب أن يبيع بسعر لا يقل عن السعر المحدد
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      السعر الأدنى للبيع
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register('minimumSellingPrice', { valueAsNumber: true })}
                        className="input-field pr-8"
                        placeholder="0.00"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₪</span>
                    </div>
                    {errors.minimumSellingPrice && (
                      <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.minimumSellingPrice.message}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      إذا كان إلزامي، المسوق لا يمكنه بيع المنتج بأقل من هذا السعر. المسوق يحدد ربحه عند الطلب
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">المخزون والمواصفات</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الكمية المتوفرة
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('stockQuantity', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="0"
                  />
                  {errors.stockQuantity && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.stockQuantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('weight', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="0.00"
                  />
                  {errors.weight && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.weight.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SKU (اختياري)
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="input-field"
                    placeholder="SKU-001"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الأبعاد (سم) - اختياري
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.length', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="الطول"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.width', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="العرض"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.height', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="الارتفاع"
                  />
                </div>
              </div>
            </div>

            {/* Product Variants */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">متغيرات المنتج</h2>
              <ProductVariants
                hasVariants={hasVariants}
                variants={variants}
                variantOptions={variantOptions}
                onVariantsChange={handleVariantsChange}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Media Upload */}
            <MediaUpload
              onUpload={(urls) => setImages(prev => [...prev, ...urls])}
              uploadedMedia={images}
              onRemove={removeImage}
              uploading={uploading}
              setUploading={setUploading}
              accept="both"
              maxFiles={10}
              maxSize={100}
              title="وسائط المنتج"
            />

            {/* Preview */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">معاينة المنتج</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المنتج:</label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{watch('name') || 'غير محدد'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الأسعار:</label>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">الجملة (للتجار): {wholesalerPrice} ₪</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">المسوق (الأساسي): {marketerPrice} ₪</p>
                    {minimumSellingPrice > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        السعر الأدنى: {minimumSellingPrice} ₪ {isMinimumPriceMandatory ? '(إلزامي)' : '(اختياري)'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المخزون:</label>
                  <p className="text-gray-900 dark:text-gray-100">{watch('stockQuantity') || 0} قطعة</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 space-x-reverse">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || uploading || images.length === 0}
            className="btn-primary"
          >
            {loading ? (
              <>
                <div className="loading-spinner w-4 h-4 ml-2"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 ml-2" />
                حفظ المنتج
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 