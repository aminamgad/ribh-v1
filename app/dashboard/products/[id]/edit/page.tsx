'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Package, 
  Upload, 
  X, 
  Save, 
  Loader2 
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import MediaUpload from '@/components/ui/MediaUpload';
import ProductVariants from '@/components/ui/ProductVariants';
import { ProductVariant, ProductVariantOption } from '@/types';

const productSchema = z.object({
  name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0'),
  wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0'),
  minimumSellingPrice: z.number().min(0.01, 'السعر الأدنى للبيع يجب أن يكون أكبر من 0').optional(),
  isMinimumPriceMandatory: z.boolean().default(false),
  stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
  sku: z.string().optional(),
  weight: z.number().min(0).optional().nullable(),
  dimensions: z.object({
    length: z.number().min(0).optional().nullable(),
    width: z.number().min(0).optional().nullable(),
    height: z.number().min(0).optional().nullable()
  }).optional().nullable(),
  tags: z.array(z.string()).optional(),
  specifications: z.record(z.any()).optional()
});

interface Category {
  _id: string;
  name: string;
  nameEn?: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Product variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      marketerPrice: 0,
      wholesalerPrice: 0,
      minimumSellingPrice: 0,
      isMinimumPriceMandatory: false,
      stockQuantity: 0,
      sku: '',
      weight: null,
      dimensions: null,
      tags: [],
      specifications: {}
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      fetchCategories();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
        setImages(data.product.images || []);
        
        // Set form values
        setValue('name', data.product.name);
        setValue('description', data.product.description || '');
        setValue('categoryId', data.product.categoryId || '');
        setValue('marketerPrice', data.product.marketerPrice);
        setValue('wholesalerPrice', data.product.wholesalerPrice);
        setValue('minimumSellingPrice', data.product.minimumSellingPrice || 0);
        setValue('isMinimumPriceMandatory', data.product.isMinimumPriceMandatory || false);
        setValue('stockQuantity', data.product.stockQuantity);
        setValue('sku', data.product.sku || '');
        setValue('weight', data.product.weight);
        setValue('dimensions', data.product.dimensions);
        setValue('tags', data.product.tags || []);
        setValue('specifications', data.product.specifications || {});
        
        // Load variant data
        setHasVariants(data.product.hasVariants || false);
        setVariants(data.product.variants || []);
        setVariantOptions(data.product.variantOptions || []);
      } else {
        toast.error('المنتج غير موجود');
        router.push('/dashboard/products');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل المنتج');
      router.push('/dashboard/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleVariantsChange = (newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
  };

  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`حجم الملف ${file.name} كبير جداً. الحد الأقصى 5 ميجابايت`);
          continue;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`الملف ${file.name} ليس صورة صالحة`);
          continue;
        }
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.url) {
            uploadedImages.push(data.url);
          } else {
            toast.error(`فشل رفع ${file.name}: ${data.message || 'خطأ غير معروف'}`);
          }
        } else {
          let errorMessage = `فشل رفع ${file.name}`;
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
          }
          toast.error(errorMessage);
        }
      }

      if (uploadedImages.length > 0) {
        setImages(prev => [...prev, ...uploadedImages]);
        toast.success(`تم رفع ${uploadedImages.length} صورة بنجاح`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('حدث خطأ أثناء رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    if (images.length === 0) {
      toast.error('يجب إضافة صورة واحدة على الأقل');
      return;
    }

    // Validate pricing
    if (data.wholesalerPrice >= data.marketerPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من سعر الجملة');
      return;
    }

    if (data.minimumSellingPrice && data.marketerPrice >= data.minimumSellingPrice) {
      toast.error('السعر الأدنى للبيع يجب أن يكون أكبر من سعر المسوق');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        ...data,
        categoryId: data.categoryId && data.categoryId !== '' ? data.categoryId : null,
        images,
        isActive: product.isActive,
        isApproved: user?.role === 'admin' ? product.isApproved : product.isApproved,
        // Product variants
        hasVariants,
        variants: hasVariants ? variants : [],
        variantOptions: hasVariants ? variantOptions : []
      };

      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        toast.success('تم تحديث المنتج بنجاح');
        router.push(`/dashboard/products/${params.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في تحديث المنتج');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">المنتج غير موجود</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-4">المنتج الذي تبحث عنه غير موجود أو تم حذفه</p>
          <Link href="/dashboard/products" className="btn-primary">
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  const marketerProfit = watchedValues.marketerPrice - watchedValues.wholesalerPrice;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href={`/dashboard/products/${params.id}`}
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمنتج
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تعديل المنتج</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">المعلومات الأساسية</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="input-field"
                  placeholder="اسم المنتج"
                />
                {errors.name && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>



              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  وصف المنتج (اختياري)
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field"
                  placeholder="وصف تفصيلي للمنتج"
                />
                {errors.description && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
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
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  {...register('sku')}
                  className="input-field"
                  placeholder="رمز المنتج"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">الأسعار</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سعر الجملة (للتجار) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('wholesalerPrice', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0.00"
                />
                {errors.wholesalerPrice && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.wholesalerPrice.message}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  سعر ثابت للتجار - لا يتغير عند الطلب
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سعر المسوق (السعر الأساسي) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('marketerPrice', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0.00"
                />
                {errors.marketerPrice && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.marketerPrice.message}</p>
                )}
                {watchedValues.marketerPrice <= watchedValues.wholesalerPrice && watchedValues.marketerPrice > 0 && watchedValues.wholesalerPrice > 0 && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                    يجب أن يكون أكبر من سعر الجملة
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  السعر الأساسي للمسوق - يحدد ربحه عند الطلب
                </p>
              </div>
            </div>

            {/* Minimum Selling Price */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <h3 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">السعر الأدنى للبيع</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    السعر الأدنى للبيع (اختياري)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('minimumSellingPrice', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="0.00"
                  />
                  {errors.minimumSellingPrice && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.minimumSellingPrice.message}</p>
                  )}
                  {watchedValues.minimumSellingPrice && watchedValues.marketerPrice >= watchedValues.minimumSellingPrice && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                      يجب أن يكون أكبر من سعر المسوق
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isMinimumPriceMandatory')}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label className="mr-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    إلزامي للمسوقين
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="mt-4 p-3 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 rounded-lg">
              <h4 className="text-sm font-semibold text-[#F57C00] dark:text-[#F57C00] mb-2">معاينة الأسعار:</h4>
              <div className="space-y-1">
                <p className="text-sm text-[#FF9800] dark:text-[#FF9800]">الجملة (للتجار): {watchedValues.wholesalerPrice} ₪</p>
                <p className="text-sm text-[#FF9800] dark:text-[#FF9800]">المسوق (الأساسي): {watchedValues.marketerPrice} ₪</p>
                {watchedValues.minimumSellingPrice > 0 && (
                  <p className="text-sm text-[#FF9800] dark:text-[#FF9800]">
                    السعر الأدنى للبيع: {watchedValues.minimumSellingPrice} ₪ {watchedValues.isMinimumPriceMandatory ? '(إلزامي)' : '(اختياري)'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">المخزون</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                الكمية المتوفرة *
              </label>
              <input
                type="number"
                min="0"
                {...register('stockQuantity', { valueAsNumber: true })}
                className="input-field"
                placeholder="0"
              />
              {errors.stockQuantity && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.stockQuantity.message}</p>
              )}
            </div>
          </div>

          {/* Product Variants */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">متغيرات المنتج</h2>
            <ProductVariants
              hasVariants={hasVariants}
              variants={variants}
              variantOptions={variantOptions}
              onVariantsChange={handleVariantsChange}
            />
          </div>

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

          {/* Submit */}
          <div className="flex justify-end space-x-4 space-x-reverse">
            <Link
              href={`/dashboard/products/${params.id}`}
              className="btn-secondary"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={saving || images.length === 0}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 