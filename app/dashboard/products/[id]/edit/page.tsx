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

const productSchema = z.object({
  name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
  nameEn: z.string().optional(),
  description: z.string().min(10, 'وصف المنتج يجب أن يكون 10 أحرف على الأقل'),
  categoryId: z.string().min(1, 'يجب اختيار فئة'),
  marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0'),
  wholesalePrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0'),
  costPrice: z.number().min(0.01, 'سعر التكلفة يجب أن يكون أكبر من 0'),
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
      nameEn: '',
      description: '',
      categoryId: '',
      marketerPrice: 0,
      wholesalePrice: 0,
      costPrice: 0,
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
        setValue('nameEn', data.product.nameEn || '');
        setValue('description', data.product.description);
        setValue('categoryId', data.product.categoryId);
        setValue('marketerPrice', data.product.marketerPrice);
        setValue('wholesalePrice', data.product.wholesalePrice);
        setValue('costPrice', data.product.costPrice);
        setValue('stockQuantity', data.product.stockQuantity);
        setValue('sku', data.product.sku || '');
        setValue('weight', data.product.weight);
        setValue('dimensions', data.product.dimensions);
        setValue('tags', data.product.tags || []);
        setValue('specifications', data.product.specifications || {});
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
    if (data.marketerPrice <= data.costPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من سعر التكلفة');
      return;
    }

    if (data.wholesalePrice <= data.costPrice) {
      toast.error('سعر الجملة يجب أن يكون أكبر من سعر التكلفة');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        ...data,
        images,
        isActive: product.isActive,
        isApproved: user?.role === 'admin' ? product.isApproved : product.isApproved
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

  const profitMargin = ((watchedValues.marketerPrice - watchedValues.costPrice) / watchedValues.costPrice * 100).toFixed(1);

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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  اسم المنتج بالإنجليزية
                </label>
                <input
                  type="text"
                  {...register('nameEn')}
                  className="input-field"
                  placeholder="Product Name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  وصف المنتج *
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
                  الفئة *
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سعر التكلفة *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('costPrice', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0.00"
                />
                {errors.costPrice && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.costPrice.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سعر المسوق *
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  سعر الجملة *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('wholesalePrice', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0.00"
                />
                {errors.wholesalePrice && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.wholesalePrice.message}</p>
                )}
              </div>
            </div>

            {/* Profit Margin Display */}
            {watchedValues.costPrice > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">هامش الربح: {profitMargin}%</p>
              </div>
            )}
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

          {/* Images */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">الصور</h2>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-slate-400">
                    {uploading ? 'جاري رفع الصور...' : 'اضغط لرفع الصور'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-500">الحد الأقصى 5 ميجابايت لكل صورة</p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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