'use client';

import { useState } from 'react';
import ProductVariants from '@/components/ui/ProductVariants';
import ProductVariantSelector from '@/components/ui/ProductVariantSelector';
import { ProductVariant, ProductVariantOption } from '@/types';

export default function TestVariantsPage() {
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const handleVariantsChange = (newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
  };

  const handleVariantChange = (newSelectedVariants: Record<string, string>) => {
    setSelectedVariants(newSelectedVariants);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            اختبار متغيرات المنتج
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            صفحة اختبار لعرض وتجربة نظام متغيرات المنتج
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Variants Manager */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              إدارة متغيرات المنتج
            </h2>
            <ProductVariants
              hasVariants={hasVariants}
              variants={variants}
              variantOptions={variantOptions}
              onVariantsChange={handleVariantsChange}
            />
          </div>

          {/* Product Variant Selector */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              اختيار متغيرات المنتج
            </h2>
            {hasVariants && variants.length > 0 ? (
              <ProductVariantSelector
                variants={variants}
                variantOptions={variantOptions}
                onVariantChange={handleVariantChange}
                selectedVariants={selectedVariants}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>قم بتفعيل متغيرات المنتج أولاً</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            معلومات التصحيح
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">المتغيرات:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(variants, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">خيارات المتغيرات:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(variantOptions, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">المتغيرات المحددة:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(selectedVariants, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">الحالة:</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">متغيرات مفعلة:</span> {hasVariants ? 'نعم' : 'لا'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">عدد المتغيرات:</span> {variants.length}
                </p>
                <p className="text-sm">
                  <span className="font-medium">عدد الخيارات:</span> {variantOptions.length}
                </p>
                <p className="text-sm">
                  <span className="font-medium">المتغيرات المحددة:</span> {Object.keys(selectedVariants).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
