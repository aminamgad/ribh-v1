'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import ProductVariants from '@/components/ui/ProductVariants';
import ProductVariantSelector from '@/components/ui/ProductVariantSelector';
import { ProductVariant, ProductVariantOption } from '@/types';
import toast from 'react-hot-toast';

export default function TestVariantsCompletePage() {
  const { user } = useAuth();
  const { addToCart, items } = useCart();
  
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [testProduct, setTestProduct] = useState<any>(null);

  useEffect(() => {
    // Create a test product
    setTestProduct({
      _id: 'test-product-123',
      name: 'منتج تجريبي مع متغيرات',
      description: 'منتج تجريبي لاختبار نظام المتغيرات',
      images: ['https://via.placeholder.com/300x300?text=Test+Product'],
      marketerPrice: 50,
      wholesalerPrice: 40,
      stockQuantity: 100,
      isApproved: true,
      isActive: true,
      hasVariants: hasVariants,
      variants: variants,
      variantOptions: variantOptions
    });
  }, [hasVariants, variants, variantOptions]);

  const handleVariantsChange = (newHasVariants: boolean, newVariants: ProductVariant[], newVariantOptions: ProductVariantOption[]) => {
    setHasVariants(newHasVariants);
    setVariants(newVariants);
    setVariantOptions(newVariantOptions);
  };

  const handleVariantChange = (newSelectedVariants: Record<string, string>) => {
    setSelectedVariants(newSelectedVariants);
  };

  const handleAddToCart = () => {
    if (!testProduct) return;

    if (hasVariants && variants.length > 0) {
      const requiredVariants = variants.filter(v => v.isRequired);
      const selectedRequiredVariants = requiredVariants.filter(v => selectedVariants[v.name]);
      
      if (selectedRequiredVariants.length !== requiredVariants.length) {
        toast.error('يرجى تحديد جميع المتغيرات المطلوبة');
        return;
      }
      
      const selectedOption = variantOptions.find(option => {
        const optionVariants = option.variantName.split(' - ');
        return optionVariants.every(opt => {
          const [name, val] = opt.split(': ');
          return selectedVariants[name] === val;
        });
      });
      
      if (!selectedOption) {
        toast.error('الخيار المحدد غير متوفر');
        return;
      }
      
      addToCart(testProduct, 1, selectedVariants, selectedOption);
      toast.success(`تم إضافة ${testProduct.name} (${selectedOption.variantName}) إلى السلة`);
    } else {
      addToCart(testProduct, 1);
      toast.success(`تم إضافة ${testProduct.name} إلى السلة`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            اختبار شامل لنظام المتغيرات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختبار كامل لنظام متغيرات المنتج مع التكامل مع السلة والطلبات
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

          {/* Cart Test */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              اختبار السلة
            </h2>
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                إضافة إلى السلة
              </button>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">المنتجات في السلة:</h3>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">السلة فارغة</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <p className="font-medium">{item.product.name}</p>
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <p className="text-xs text-gray-600">
                            {Object.entries(item.selectedVariants).map(([name, value]) => `${name}: ${value}`).join(' - ')}
                          </p>
                        )}
                        <p className="text-xs">الكمية: {item.quantity} | السعر: {item.price}₪</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto max-h-40">
                {JSON.stringify(variants, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">خيارات المتغيرات:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto max-h-40">
                {JSON.stringify(variantOptions, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">المتغيرات المحددة:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto max-h-40">
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
                <p className="text-sm">
                  <span className="font-medium">المنتجات في السلة:</span> {items.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
