'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Save, Package, ImageIcon, DollarSign, Layers, AlertCircle, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useProductForm } from './useProductForm';
import type { ProductFormMode } from './useProductForm';
import MediaUpload from '@/components/ui/MediaUpload';
import ProductVariants from '@/components/ui/ProductVariants';
import Tooltip from '@/components/ui/Tooltip';

export interface ProductFormProps {
  mode: ProductFormMode;
  productId?: string;
  user: { role?: string } | null;
}

export default function ProductForm({ mode, productId, user }: ProductFormProps) {
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const {
    form: { register, watch, setValue, handleSubmit, errors },
    state: state,
    refs: refs,
    handlers,
    isAdmin,
    isSupplier,
  } = useProductForm({
    mode,
    productId,
    user,
  });

  const {
    categories,
    filteredCategories,
    categorySearch,
    setCategorySearch,
    showCategoryDropdown,
    setShowCategoryDropdown,
    suppliers,
    filteredSuppliers,
    supplierSearch,
    setSupplierSearch,
    showSupplierDropdown,
    setShowSupplierDropdown,
    selectedSupplierId,
    setSelectedSupplierId,
    images,
    setImages,
    primaryImageIndex,
    setPrimaryImageIndex,
    uploading,
    setUploading,
    loading,
    saving,
    hasVariants,
    setHasVariants,
    variants,
    setVariants,
    variantOptions,
    setVariantOptions,
    hasUnsavedChanges,
    showErrors,
    setShowErrors,
    suggestedSku,
    skuError,
    duplicateWarning,
    similarProducts,
    isMarketerPriceAutoCalculated,
    isMarketerPriceManuallyAdjusted,
    setIsMarketerPriceManuallyAdjusted,
    isSaving,
  } = state;

  const {
    generateSKU,
    checkSKU,
    handleVariantsChange,
    removeImage,
    handleImageReorder,
    saveDraft,
    onError,
    onSubmit,
  } = handlers;

  const supplierPrice = watch('supplierPrice') || 0;
  const marketerPrice = watch('marketerPrice') || 0;
  const minimumSellingPrice = watch('minimumSellingPrice') || 0;
  const isMinimumPriceMandatory = watch('isMinimumPriceMandatory') || false;

  const handleBackOrCancel = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        if (mode === 'create') localStorage.removeItem('product-draft');
        else if (productId) localStorage.removeItem(`product-edit-draft-${productId}`);
        window.history.back();
      });
      setShowUnsavedModal(true);
    } else {
      if (mode === 'create') localStorage.removeItem('product-draft');
      else if (productId) localStorage.removeItem(`product-edit-draft-${productId}`);
      window.history.back();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8" />
      </div>
    );
  }

  if (loading && mode === 'edit') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            aria-label="العودة"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {mode === 'edit' ? 'تعديل بيانات المنتج' : 'أضف منتجك الجديد في صفحة واحدة'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <div className="loading-spinner w-4 h-4" />
              جاري حفظ المسودة...
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(onSubmit, onError)()}
            disabled={saving || uploading}
            className="btn-primary flex items-center gap-2 min-h-[44px] px-4"
          >
            {saving ? (
              <>
                <div className="loading-spinner w-5 h-5" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mode === 'edit' ? 'تحديث المنتج' : 'حفظ المنتج'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Errors summary */}
      {showErrors && Object.keys(errors).length > 0 && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-900 dark:text-red-100">
                يوجد {Object.keys(errors).length} خطأ في النموذج
              </span>
            </div>
            <button type="button" onClick={() => setShowErrors(false)} className="text-red-600 dark:text-red-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
            {Object.entries(errors).map(([key, err]: [string, any]) => (
              <li key={key}>{err?.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            المعلومات الأساسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="text-red-500 mr-1">*</span> اسم المنتج
              </label>
              <input
                type="text"
                {...register('name')}
                className={`input-field min-h-[44px] ${
                  errors.name ? 'border-red-500' : watch('name')?.length >= 3 ? 'border-green-500 dark:border-green-500' : ''
                }`}
                placeholder="أدخل اسم المنتج"
              />
              {errors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
              {duplicateWarning && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-300 text-xs flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3 h-3" />
                    {duplicateWarning}
                  </p>
                  {similarProducts.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-400">
                      {similarProducts.slice(0, 3).map((p: any, i: number) => (
                        <li key={i}>{p.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {!isSupplier && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفئة (اختياري)</label>
                  <Tooltip content="اختر فئة المنتج لتسهيل البحث والتصنيف" icon />
                </div>
                <div className="relative" ref={refs.categoryDropdownRef}>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={categorySearch || (watch('categoryId') ? categories.find(c => c._id === watch('categoryId'))?.name || '' : '')}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      if (!e.target.value.trim()) {
                        setValue('categoryId', '');
                        setShowCategoryDropdown(false);
                      } else setShowCategoryDropdown(true);
                    }}
                    onFocus={() => filteredCategories.length > 0 && setShowCategoryDropdown(true)}
                    placeholder="ابحث أو اختر فئة..."
                    className="input-field min-h-[44px] pr-10"
                  />
                  {showCategoryDropdown && filteredCategories.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredCategories.map(cat => (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => {
                            setValue('categoryId', cat._id);
                            setCategorySearch(cat.name);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                            watch('categoryId') === cat._id ? 'bg-primary-50 dark:bg-primary-900/20 font-medium' : ''
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <select {...register('categoryId')} className="hidden">
                    <option value="" />
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المورد (اختياري)</label>
                <div className="relative" ref={refs.supplierDropdownRef}>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={supplierSearch || (selectedSupplierId ? suppliers.find(s => s._id === selectedSupplierId)?.companyName || suppliers.find(s => s._id === selectedSupplierId)?.name || '' : '')}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      if (!e.target.value.trim()) setSelectedSupplierId('');
                      setShowSupplierDropdown(!!e.target.value.trim());
                    }}
                    onFocus={() => filteredSuppliers.length > 0 && setShowSupplierDropdown(true)}
                    placeholder="ابحث عن مورد..."
                    className="input-field min-h-[44px] pr-10"
                  />
                  {showSupplierDropdown && filteredSuppliers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredSuppliers.map(sup => (
                        <button
                          key={sup._id}
                          type="button"
                          onClick={() => {
                            setSelectedSupplierId(sup._id);
                            setSupplierSearch(sup.companyName || sup.name);
                            setShowSupplierDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                            selectedSupplierId === sup._id ? 'bg-primary-50 dark:bg-primary-900/20 font-medium' : ''
                          }`}
                        >
                          {sup.companyName || sup.name} {sup.email ? `(${sup.email})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوصف (اختياري)</label>
              <textarea
                {...register('description')}
                rows={4}
                maxLength={2000}
                className="input-field min-h-[100px]"
                placeholder="وصف المنتج (حد أقصى 2000 حرف)"
              />
              <p className="text-xs text-gray-500 mt-1">{watch('description')?.length || 0} / 2000</p>
            </div>
          </div>
        </div>

        {/* Section 2: Media */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            وسائط المنتج
          </h2>
          {images.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">أضف صورة واحدة على الأقل للمنتج</p>
          )}
          <MediaUpload
            onUpload={urls => setImages(prev => [...prev, ...urls])}
            uploadedMedia={images}
            onRemove={removeImage}
            uploading={uploading}
            setUploading={setUploading}
            accept="both"
            maxFiles={10}
            maxSize={100}
            title=""
            onReorder={handleImageReorder}
            onSetPrimary={setPrimaryImageIndex}
            primaryIndex={primaryImageIndex}
            showPrimaryOption
          />
        </div>

        {/* Section 3: Pricing & Stock */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            الأسعار والمخزون
          </h2>

          {/* الأسعار */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">الأسعار</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="text-red-500 mr-1">*</span> سعر المورد
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('supplierPrice', { valueAsNumber: true })}
                    className={`input-field min-h-[44px] pr-8 ${errors.supplierPrice ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₪</span>
                </div>
                {errors.supplierPrice && <p className="text-red-600 text-xs mt-1">{errors.supplierPrice.message}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر المسوق</label>
                  {isAdmin && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={isMarketerPriceManuallyAdjusted}
                        onChange={e => setIsMarketerPriceManuallyAdjusted(e.target.checked)}
                        className="rounded"
                      />
                      تعديل يدوي
                    </label>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('marketerPrice', { valueAsNumber: true })}
                    readOnly={isMarketerPriceAutoCalculated && supplierPrice > 0 && !isMarketerPriceManuallyAdjusted}
                    className={`input-field min-h-[44px] pr-8 ${
                      isMarketerPriceAutoCalculated && supplierPrice > 0 && !isMarketerPriceManuallyAdjusted ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                    }`}
                    placeholder="سيتم الحساب تلقائياً"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₪</span>
                </div>
              </div>
            </div>
          </div>

          {/* المخزون */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">المخزون</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الكمية المتوفرة</label>
                <input
                  type="number"
                  min="0"
                  {...register('stockQuantity', { valueAsNumber: true })}
                  disabled={hasVariants === true || (mode === 'edit' && loading)}
                  className={`input-field min-h-[44px] ${hasVariants === true || (mode === 'edit' && loading) ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : ''}`}
                  placeholder="0"
                />
                {(hasVariants === true || (mode === 'edit' && loading)) && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {loading ? 'جاري التحميل...' : 'يتم حساب المخزون من المتغيرات'}
                  </p>
                )}
                {errors.stockQuantity && <p className="text-red-600 text-xs mt-1">{errors.stockQuantity.message}</p>}
              </div>
              {!isSupplier && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU (اختياري)</label>
                  <button type="button" onClick={generateSKU} className="btn-secondary text-xs px-3 py-1.5">
                    توليد SKU
                  </button>
                </div>
                <input
                  type="text"
                  {...register('sku')}
                  onChange={e => {
                    setValue('sku', e.target.value);
                    checkSKU(e.target.value);
                  }}
                  className={`input-field min-h-[44px] ${skuError ? 'border-red-500' : ''}`}
                  placeholder="أدخل SKU أو اضغط توليد"
                />
                {skuError && <p className="text-red-600 text-xs mt-1">{skuError}</p>}
                {suggestedSku && !skuError && watch('sku') === suggestedSku && (
                  <p className="text-green-600 text-xs mt-1">SKU متاح</p>
                )}
              </div>
            )}
            </div>
          </div>

          {/* السعر الأدنى للبيع - اختياري بالكامل */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">السعر الأدنى للبيع <span className="text-xs font-normal">(اختياري — اترك 0 إذا لا تحتاجه)</span></h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isMinimumPriceMandatory"
                  {...register('isMinimumPriceMandatory')}
                  className="w-5 h-5 rounded mt-0.5"
                />
                <label htmlFor="isMinimumPriceMandatory" className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                  جعل السعر الأدنى للبيع إلزامياً على المسوق
                </label>
              </div>
              <div className="max-w-xs">
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('minimumSellingPrice', { valueAsNumber: true })}
                    className={`input-field min-h-[44px] pr-8 ${
                      minimumSellingPrice > 0 && marketerPrice >= minimumSellingPrice ? 'border-red-500' : ''
                    }`}
                    placeholder="0 — يعني لا حد أدنى"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₪</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">يمكنك تركه 0 أو فارغاً — لن يظهر أي تحذير</p>
                {minimumSellingPrice > 0 && marketerPrice >= minimumSellingPrice && (
                  <p className="text-red-600 text-xs mt-1">يجب أن يكون أكبر من سعر المسوق إذا أدخلت قيمة</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Variants */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            متغيرات المنتج
          </h2>
          {hasVariants === null && (
            <div className="py-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">هل المنتج له متغيرات (مثل أحجام أو ألوان)؟</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setHasVariants(true)}
                  className="btn-primary px-6 py-3"
                >
                  نعم، له متغيرات
                </button>
                <button
                  type="button"
                  onClick={() => setHasVariants(false)}
                  className="btn-secondary px-6 py-3"
                >
                  لا، منتج بسيط
                </button>
              </div>
            </div>
          )}
          {hasVariants !== null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {hasVariants ? 'المنتج له متغيرات' : 'منتج بسيط بدون متغيرات'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHasVariants(null);
                    setVariants([]);
                    setVariantOptions([]);
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  تغيير
                </button>
              </div>
              {hasVariants === true && (
                <ProductVariants
                  hasVariants={hasVariants}
                  variants={variants}
                  variantOptions={variantOptions}
                  onVariantsChange={handleVariantsChange}
                  marketerPrice={watch('marketerPrice') || 0}
                />
              )}
              {hasVariants === false && (
                <p className="text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  يمكنك إضافة الكمية في قسم الأسعار والمخزون أعلاه.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleBackOrCancel} className="btn-secondary min-h-[44px] px-4">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="btn-primary flex items-center gap-2 min-h-[44px] px-4 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="loading-spinner w-5 h-5" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mode === 'edit' ? 'تحديث المنتج' : 'حفظ المنتج'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Unsaved changes modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">تغييرات غير محفوظة</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">هل تريد الخروج دون حفظ التغييرات؟</p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowUnsavedModal(false); setPendingAction(null); }} className="btn-secondary px-4 py-2">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingAction?.();
                  setShowUnsavedModal(false);
                  setPendingAction(null);
                }}
                className="btn-primary px-4 py-2"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
