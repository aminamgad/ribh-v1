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
  marketingText: z.string().optional(),
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

interface Supplier {
  _id: string;
  name: string;
  companyName?: string;
  email: string;
}

export default function NewProductPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
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
      marketingText: '',
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
    // Fetch suppliers if user is admin
    if (user?.role === 'admin') {
      fetchSuppliers();
    }
  }, [user]);

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

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=supplier&status=active&limit=100');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.users || []);
      } else {
        console.error('Failed to fetch suppliers');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
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
        marketingText: data.marketingText?.trim() || '',
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
        variantOptions: hasVariants ? variantOptions : [],
        // Supplier selection for admin
        ...(user?.role === 'admin' && selectedSupplierId ? { supplierId: selectedSupplierId } : {})
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">إضافة منتج جديد</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">أضف منتجك الجديد إلى المنصة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">المعلومات الأساسية</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="أدخل اسم المنتج"
                  />
                  {errors.name && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    الفئة (اختياري)
                  </label>
                  <select {...register('categoryId')} className="input-field text-sm sm:text-base min-h-[44px]">
                    <option value="">اختر الفئة</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.categoryId.message}</p>
                  )}
                </div>

                {/* Supplier Selection - Only for Admin */}
                {user?.role === 'admin' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      المورد (اختياري)
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="input-field text-sm sm:text-base min-h-[44px]"
                    >
                      <option value="">اختر المورد (اختياري - سيتم إضافة المنتج باسمك إذا لم تختر)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.companyName || supplier.name} {supplier.email ? `(${supplier.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      يمكنك اختيار مورد محدد لإضافة المنتج باسمه. إذا لم تختر، سيتم إضافة المنتج باسمك كإدارة.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  وصف المنتج (اختياري)
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field text-sm sm:text-base min-h-[120px]"
                  placeholder="أدخل وصف المنتج"
                />
                {errors.description && (
                  <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  النص التسويقي (اختياري)
                </label>
                <textarea
                  {...register('marketingText')}
                  rows={4}
                  className="input-field text-sm sm:text-base min-h-[120px]"
                  placeholder="أدخل نص تسويقي للمنتج"
                />
                {errors.marketingText && (
                  <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.marketingText.message}</p>
                )}
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  هذا النص سيظهر في صفحة المنتج مع زر نسخ للمسوقين والتجار
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">الأسعار</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    سعر الجملة (للتجار) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('wholesalerPrice', { valueAsNumber: true })}
                      className="input-field text-sm sm:text-base pr-8 min-h-[44px]"
                      placeholder="0.00"
                    />
                    <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">₪</span>
                  </div>
                  {errors.wholesalerPrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.wholesalerPrice.message}</p>
                  )}
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                    سعر ثابت للتجار - لا يتغير عند الطلب
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    سعر المسوق (السعر الأساسي) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('marketerPrice', { valueAsNumber: true })}
                      className="input-field text-sm sm:text-base pr-8 min-h-[44px]"
                      placeholder="0.00"
                    />
                    <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">₪</span>
                  </div>
                  {errors.marketerPrice && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.marketerPrice.message}</p>
                  )}
                  {marketerPrice <= wholesalerPrice && marketerPrice > 0 && wholesalerPrice > 0 && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">
                      يجب أن يكون أكبر من سعر الجملة
                    </p>
                  )}
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                    السعر الأساسي للمسوق - يحدد ربحه عند الطلب
                  </p>
                </div>
              </div>

              {/* Minimum Selling Price Section */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">السعر الأدنى للبيع</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-2 sm:space-x-3 space-x-reverse min-h-[44px]">
                    <input
                      type="checkbox"
                      id="isMinimumPriceMandatory"
                      {...register('isMinimumPriceMandatory')}
                      className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 sm:mt-1 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 flex-shrink-0"
                    />
                    <label htmlFor="isMinimumPriceMandatory" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      إلزامي - المسوق يجب أن يبيع بسعر لا يقل عن السعر المحدد
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      السعر الأدنى للبيع
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register('minimumSellingPrice', { valueAsNumber: true })}
                        className="input-field text-sm sm:text-base pr-8 min-h-[44px]"
                        placeholder="0.00"
                      />
                      <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">₪</span>
                    </div>
                    {errors.minimumSellingPrice && (
                      <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.minimumSellingPrice.message}</p>
                    )}
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                      إذا كان إلزامي، المسوق لا يمكنه بيع المنتج بأقل من هذا السعر. المسوق يحدد ربحه عند الطلب
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">المخزون والمواصفات</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    الكمية المتوفرة
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('stockQuantity', { valueAsNumber: true })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="0"
                  />
                  {errors.stockQuantity && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.stockQuantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('weight', { valueAsNumber: true })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="0.00"
                  />
                  {errors.weight && (
                    <p className="text-danger-600 dark:text-danger-400 text-xs sm:text-sm mt-1">{errors.weight.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    SKU (اختياري)
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="SKU-001"
                  />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  الأبعاد (سم) - اختياري
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.length', { valueAsNumber: true })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="الطول"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.width', { valueAsNumber: true })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="العرض"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('dimensions.height', { valueAsNumber: true })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                    placeholder="الارتفاع"
                  />
                </div>
              </div>
            </div>

            {/* Product Variants */}
            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">متغيرات المنتج</h2>
              <ProductVariants
                hasVariants={hasVariants}
                variants={variants}
                variantOptions={variantOptions}
                onVariantsChange={handleVariantsChange}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
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
            <div className="card p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">معاينة المنتج</h2>
              
              <div className="space-y-2.5 sm:space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">اسم المنتج:</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-medium">{watch('name') || 'غير محدد'}</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">الأسعار:</label>
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">الجملة (للتجار): {wholesalerPrice} ₪</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">المسوق (الأساسي): {marketerPrice} ₪</p>
                    {minimumSellingPrice > 0 && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        السعر الأدنى: {minimumSellingPrice} ₪ {isMinimumPriceMandatory ? '(إلزامي)' : '(اختياري)'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">المخزون:</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100">{watch('stockQuantity') || 0} قطعة</p>
                </div>
                
                {user?.role === 'admin' && selectedSupplierId && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">المورد المحدد:</label>
                    <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      {suppliers.find(s => s._id === selectedSupplierId)?.companyName || 
                       suppliers.find(s => s._id === selectedSupplierId)?.name || 
                       'غير محدد'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 space-y-2 sm:space-y-0 space-y-reverse sm:space-x-3 sm:space-x-reverse sticky bottom-0 bg-white dark:bg-slate-900 p-3 sm:p-4 -mx-3 sm:-mx-4 md:-mx-6 border-t border-gray-200 dark:border-slate-700 safe-area-bottom">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || uploading || images.length === 0}
            className="btn-primary min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="loading-spinner w-4 h-4 ml-1.5 sm:ml-2"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" />
                حفظ المنتج
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 