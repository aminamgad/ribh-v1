'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Plus, Save } from 'lucide-react';
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
      nameEn: '',
      description: '',
      categoryId: '',
      stockQuantity: 0,
      marketerPrice: 0,
      wholesalePrice: 0,
      costPrice: 0,
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

  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    // Check if user is authenticated
    if (!user || !isAuthenticated) {
      toast.error('يجب تسجيل الدخول أولاً');
      router.push('/auth/login');
      return;
    }

    console.log(`Starting upload for ${files.length} files. User:`, user.email);
    
    setUploading(true);
    const uploadedImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes)`);
        
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

        console.log('Sending upload request...');
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication
          // Don't set Content-Type header, let browser set it with boundary for FormData
        });

        console.log(`Upload response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('Upload response data:', data);
          
          if (data.success && data.url) {
            uploadedImages.push(data.url);
            console.log(`Successfully uploaded: ${file.name} -> ${data.url}`);
          } else {
            const errorMsg = data.message || 'خطأ غير معروف';
            console.error(`Upload failed for ${file.name}:`, errorMsg);
            toast.error(`فشل رفع ${file.name}: ${errorMsg}`);
          }
        } else {
          let errorMessage = `فشل رفع ${file.name}`;
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
            console.error(`Upload error response:`, error);
            
            // Handle specific error cases
            if (response.status === 401) {
              console.warn('Got 401 error, but user appears to be authenticated locally. This might be a token sync issue.');
              errorMessage = 'حدث خطأ في المصادقة. يرجى تحديث الصفحة والمحاولة مرة أخرى';
              toast.error(errorMessage);
              
              // Instead of redirecting immediately, suggest refresh
              toast.error('إذا استمرت المشكلة، يرجى تسجيل الدخول مرة أخرى', { 
                duration: 5000 
              });
              break; // Stop processing more files
            } else if (response.status === 503) {
              errorMessage = 'خدمة رفع الصور غير متاحة. يرجى إعداد Cloudinary';
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
          toast.error(errorMessage);
        }
      }

      if (uploadedImages.length > 0) {
        setImages(prev => [...prev, ...uploadedImages]);
        toast.success(`تم رفع ${uploadedImages.length} صورة بنجاح`);
        console.log(`Successfully uploaded ${uploadedImages.length} images`);
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

  const onSubmit = async (data: ProductFormData) => {
    if (images.length === 0) {
      toast.error('يجب إضافة صورة واحدة على الأقل');
      return;
    }

    // Validate pricing logic
    if (data.marketerPrice <= data.costPrice) {
      toast.error('سعر المسوق يجب أن يكون أكبر من سعر التكلفة');
      return;
    }

    if (data.wholesalePrice <= data.costPrice) {
      toast.error('سعر الجملة يجب أن يكون أكبر من سعر التكلفة');
      return;
    }

    setLoading(true);
    try {
      // Prepare clean data
      const productData = {
        name: data.name.trim(),
        nameEn: data.nameEn?.trim() || '',
        description: data.description.trim(),
        categoryId: data.categoryId,
        marketerPrice: Number(data.marketerPrice),
        wholesalePrice: Number(data.wholesalePrice),
        costPrice: Number(data.costPrice),
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
        specifications: {}
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
  const wholesalePrice = watch('wholesalePrice') || 0;
  const costPrice = watch('costPrice') || 0;

  // Calculate profit margins
  const marketerProfit = costPrice > 0 ? ((marketerPrice - costPrice) / costPrice * 100) : 0;
  const wholesaleProfit = costPrice > 0 ? ((wholesalePrice - costPrice) / costPrice * 100) : 0;

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
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.categoryId.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم المنتج (إنجليزي)
                </label>
                <input
                  type="text"
                  {...register('nameEn')}
                  className="input-field"
                  placeholder="Product name in English"
                  dir="ltr"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  وصف المنتج *
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر التكلفة *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('costPrice', { valueAsNumber: true })}
                      className="input-field pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₪</span>
                  </div>
                  {errors.costPrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.costPrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر المسوق *
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
                  {marketerPrice > costPrice && costPrice > 0 && (
                    <p className="text-success-600 dark:text-success-400 text-sm mt-1">
                      الربح: {marketerProfit.toFixed(1)}%
                    </p>
                  )}
                  {marketerPrice <= costPrice && marketerPrice > 0 && costPrice > 0 && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                      يجب أن يكون أكبر من سعر التكلفة
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    سعر الجملة *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('wholesalePrice', { valueAsNumber: true })}
                      className="input-field pr-8"
                      placeholder="0.00"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">₪</span>
                  </div>
                  {errors.wholesalePrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{errors.wholesalePrice.message}</p>
                  )}
                  {wholesalePrice > costPrice && costPrice > 0 && (
                    <p className="text-success-600 dark:text-success-400 text-sm mt-1">
                      الربح: {wholesaleProfit.toFixed(1)}%
                    </p>
                  )}
                  {wholesalePrice <= costPrice && wholesalePrice > 0 && costPrice > 0 && (
                    <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">
                      يجب أن يكون أكبر من سعر التكلفة
                    </p>
                  )}
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
          </div>

          {/* Images Upload */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">صور المنتج</h2>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">اسحب وأفلت الصور هنا</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">أو</p>
                <label className="btn-primary cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                  اختيار الصور
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  الحد الأقصى: 5 ميجابايت لكل صورة
                </p>
              </div>

              {/* Uploaded Images */}
              {images.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الصور المرفوعة ({images.length}):</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="mt-4 text-center">
                  <div className="loading-spinner w-6 h-6 mx-auto"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">جاري رفع الصور...</p>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">معاينة المنتج</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المنتج:</label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{watch('name') || 'غير محدد'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفئة:</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {categories.find(c => c._id === watch('categoryId'))?.name || 'غير محدد'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الأسعار:</label>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">المسوق: {marketerPrice} ₪</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">الجملة: {wholesalePrice} ₪</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">التكلفة: {costPrice} ₪</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المخزون:</label>
                  <p className="text-gray-900 dark:text-gray-100">{watch('stockQuantity') || 0} قطعة</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الصور:</label>
                  <p className="text-gray-900 dark:text-gray-100">{images.length} صورة</p>
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