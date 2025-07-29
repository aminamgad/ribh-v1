'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Package, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  stockQuantity: number;
  costPrice: number;
  isApproved: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  supplierName?: string;
}

export default function TestFulfillmentPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const approvedProducts = products.filter(p => p.isApproved && !p.isRejected);
  const rejectedProducts = products.filter(p => p.isRejected);
  const pendingProducts = products.filter(p => !p.isApproved && !p.isRejected);
  const eligibleForStorage = approvedProducts.filter(p => p.stockQuantity > 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
        اختبار نظام طلبات التخزين
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 ml-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">معتمد</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {approvedProducts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 ml-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">مرفوض</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {rejectedProducts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 ml-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">قيد المراجعة</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {pendingProducts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400 ml-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">مؤهل للتخزين</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {eligibleForStorage.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approved Products */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-2" />
            المنتجات المعتمدة ({approvedProducts.length})
          </h2>
        </div>
        <div className="p-4">
          {approvedProducts.length === 0 ? (
            <p className="text-gray-600 dark:text-slate-400 text-center py-4">
              لا توجد منتجات معتمدة
            </p>
          ) : (
            <div className="space-y-3">
              {approvedProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {product.supplierName} • المخزون: {product.stockQuantity} قطعة
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {product.costPrice} ₪
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stockQuantity > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {product.stockQuantity > 0 ? 'مؤهل للتخزين' : 'لا يوجد مخزون'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejected Products */}
      {rejectedProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 ml-2" />
              المنتجات المرفوضة ({rejectedProducts.length})
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {rejectedProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      سبب الرفض: {product.rejectionReason || 'غير محدد'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      لا يمكن التخزين
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Products */}
      {pendingProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
              المنتجات قيد المراجعة ({pendingProducts.length})
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {pendingProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      في انتظار الموافقة من الإدارة
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                      لا يمكن التخزين
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2" />
            التوصيات
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {rejectedProducts.length > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              ⚠️ يوجد {rejectedProducts.length} منتج مرفوض لا يمكن تخزينه
            </p>
          )}
          {pendingProducts.length > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⏳ يوجد {pendingProducts.length} منتج قيد المراجعة
            </p>
          )}
          {eligibleForStorage.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              ℹ️ لا توجد منتجات مؤهلة للتخزين حالياً
            </p>
          )}
          {eligibleForStorage.length > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ يوجد {eligibleForStorage.length} منتج مؤهل للتخزين
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 