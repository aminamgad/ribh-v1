'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Package, Plus, X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  costPrice: number;
  stockQuantity: number; // تغيير من currentStock إلى stockQuantity
  images: string[];
  isApproved: boolean;
  isRejected: boolean;
}

interface FulfillmentProduct {
  productId: string;
  quantity: number;
  currentStock: number;
}

export default function NewFulfillmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<FulfillmentProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard/fulfillment');
      return;
    }
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?supplier=true');
      if (response.ok) {
        const data = await response.json();
        // تصفية المنتجات - لا تسمح بالمنتجات المرفوضة أو قيد المراجعة
        const approvedProducts = data.products.filter((product: Product) => 
          product.isApproved && !product.isRejected
        );
        setProducts(approvedProducts);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب المنتجات');
    } finally {
      setProductsLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existingProduct = selectedProducts.find(p => p.productId === product._id);
    if (existingProduct) {
      toast.error('هذا المنتج مضاف بالفعل');
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product._id,
        quantity: 1,
        currentStock: product.stockQuantity // استخدام stockQuantity بدلاً من currentStock
      }
    ]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity } : p
    ));
  };

  const updateProductStock = (productId: string, currentStock: number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, currentStock } : p
    ));
  };

  const getSelectedProduct = (productId: string) => {
    return selectedProducts.find(p => p.productId === productId);
  };

  const getProductById = (productId: string) => {
    return products.find(p => p._id === productId);
  };

  const calculateTotalValue = () => {
    return selectedProducts.reduce((total, item) => {
      const product = getProductById(item.productId);
      return total + (product?.costPrice || 0) * item.quantity;
    }, 0);
  };

  const calculateTotalItems = () => {
    return selectedProducts.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      toast.error('يجب إضافة منتج واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/fulfillment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: selectedProducts,
          notes,
          expectedDeliveryDate: expectedDeliveryDate || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('تم إنشاء طلب التخزين بنجاح');
        router.push('/dashboard/fulfillment');
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء إنشاء طلب التخزين');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء طلب التخزين');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'supplier') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">طلب تخزين جديد</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          أضف المنتجات المعتمدة التي تريد تخزينها في المستودع
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Products Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <Package className="w-5 h-5 ml-2 text-primary-600 dark:text-primary-400" />
              اختيار المنتجات المعتمدة
            </h3>
          </div>
          <div className="p-6">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-slate-400 mt-2">جاري تحميل المنتجات...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات معتمدة متاحة للتخزين</p>
                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
                  يجب أن تكون المنتجات معتمدة من الإدارة قبل إمكانية طلب تخزينها
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const isSelected = selectedProducts.some(p => p.productId === product._id);
                  return (
                    <div
                      key={product._id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                          : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-400 hover:shadow-sm'
                      }`}
                      onClick={() => !isSelected && addProduct(product)}
                    >
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-md mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-slate-700 rounded-md mb-3 flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                        </div>
                      )}
                      <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2">
                        {product.name}
                      </h4>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-700 dark:text-slate-300">
                          <span className="font-medium">سعر التكلفة:</span> {product.costPrice} ₪
                        </p>
                        <p className="text-gray-700 dark:text-slate-300">
                          <span className="font-medium">المخزون الحالي:</span> {product.stockQuantity} قطعة
                        </p>
                      </div>
                      {isSelected && (
                        <div className="mt-3 p-2 bg-primary-100 dark:bg-primary-900/30 rounded-md border border-primary-200 dark:border-primary-700">
                          <p className="text-sm text-primary-800 dark:text-primary-200 font-medium text-center">
                            ✓ تم اختيار هذا المنتج
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Products */}
        {selectedProducts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                <Package className="w-5 h-5 ml-2 text-primary-600 dark:text-primary-400" />
                المنتجات المختارة
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {selectedProducts.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;

                  return (
                    <div key={item.productId} className="border-2 border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 dark:bg-slate-600 rounded-md flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400 dark:text-slate-500" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
                              {product.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-slate-400">
                              سعر التكلفة: {product.costPrice} ₪
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(item.productId)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            الكمية المطلوبة
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateProductQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            المخزون الحالي
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.currentStock}
                            onChange={(e) => updateProductStock(item.productId, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-slate-400 font-medium">القيمة الإجمالية:</span>
                          <span className="font-bold text-primary-600 dark:text-primary-400">
                            {(product.costPrice * item.quantity).toFixed(2)} ₪
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                <h4 className="font-semibold text-primary-900 dark:text-primary-100 mb-3">
                  ملخص الطلب
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">عدد المنتجات:</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100">
                      {selectedProducts.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">إجمالي القطع:</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100">
                      {calculateTotalItems()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">القيمة الإجمالية:</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {calculateTotalValue().toFixed(2)} ₪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <AlertCircle className="w-5 h-5 ml-2 text-warning-600 dark:text-warning-400" />
              معلومات إضافية
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="أضف أي ملاحظات أو تفاصيل إضافية..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                تاريخ التسليم المتوقع (اختياري)
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 space-x-reverse">
          <button
            type="button"
            onClick={() => router.push('/dashboard/fulfillment')}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || selectedProducts.length === 0}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                جاري الإرسال...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 ml-2" />
                إنشاء طلب التخزين
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 