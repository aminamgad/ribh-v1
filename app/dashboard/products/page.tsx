'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ShoppingCart, 
  Heart, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import SearchFilters from '@/components/search/SearchFilters';
import { useSearchParams } from 'next/navigation';

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  marketerPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  isFulfilled: boolean;
  categoryId: string;
  supplierId: string;
  costPrice: number;
  tags: string[];
  categoryName?: string;
  supplierName?: string;
  sales?: number;
  rating?: number;
  isRejected?: boolean;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryString = searchParams.toString();
      const endpoint = queryString ? `/api/search?${queryString}` : '/api/products';
      
      console.log('🔄 Fetching products from:', endpoint);
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Raw API response:', data);
        console.log('📦 Fetched products:', data.products.map((p: any) => ({
          id: p._id,
          name: p.name,
          isApproved: p.isApproved,
          isRejected: p.isRejected,
          status: p.isApproved ? 'معتمد' : p.isRejected ? 'مرفوض' : 'قيد المراجعة'
        })));
        
        setProducts(data.products);
        console.log('✅ Products state updated with:', data.products.length, 'products');
        
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
        toast.error('حدث خطأ أثناء جلب المنتجات');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المنتج بنجاح');
        fetchProducts();
      } else {
        toast.error('فشل في حذف المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setProcessing(false);
      setShowDeleteModal(false);
      setSelectedProduct(null);
    }
  };

  const handleToggleFavorite = async (product: Product) => {
    if (isFavorite(product._id)) {
      await removeFromFavorites(product._id);
    } else {
      await addToFavorites(product as any);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!product.isApproved) {
      toast.error('المنتج غير معتمد بعد');
      return;
    }

    if (product.stockQuantity <= 0) {
      toast.error('المنتج غير متوفر في المخزون حالياً');
      return;
    }

    try {
      // استخدام المنتج الأصلي بدلاً من إنشاء كائن جديد
      addToCart(product as any);
      
      // إشعار واحد فقط
      toast.success(`تم إضافة ${product.name} إلى السلة بنجاح`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
    }
  };

  const handleApproveProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowApproveModal(true);
    }
  };

  const confirmApprove = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: [selectedProduct._id],
          action: 'approve',
          adminNotes: 'تمت الموافقة من لوحة التحكم'
        }),
      });

      if (response.ok) {
        toast.success('تمت الموافقة على المنتج بنجاح');
        
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          fetchProducts();
        }, 500);
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في الموافقة على المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الموافقة على المنتج');
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
      setSelectedProduct(null);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowRejectModal(true);
    }
  };

  const confirmReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      toast.error('يرجى إدخال سبب الرفض');
      return;
    }
    
    console.log('🚫 Starting rejection process for:', {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      currentStatus: {
        isApproved: selectedProduct.isApproved,
        isRejected: selectedProduct.isRejected
      },
      rejectionReason: rejectionReason.trim()
    });
    
    setProcessing(true);
    try {
      console.log('🚫 Rejecting product:', {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        rejectionReason: rejectionReason.trim()
      });

      const requestBody = {
        productIds: [selectedProduct._id],
        action: 'reject',
        rejectionReason: rejectionReason.trim()
      };
      
      console.log('📤 Sending request body:', requestBody);

      const response = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Rejection result:', result);
        toast.success('تم رفض المنتج بنجاح');
        
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          console.log('🔄 Refreshing products after rejection...');
          fetchProducts();
        }, 500);
      } else {
        const error = await response.json();
        console.error('❌ Rejection error:', error);
        toast.error(error.message || 'فشل في رفض المنتج');
      }
    } catch (error) {
      console.error('❌ Rejection exception:', error);
      toast.error('حدث خطأ أثناء رفض المنتج');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setSelectedProduct(null);
      setRejectionReason('');
    }
  };

  const handleResubmitProduct = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setSelectedProduct(product);
      setShowResubmitModal(true);
    }
  };

  const confirmResubmit = async () => {
    if (!selectedProduct) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRejected: false,
          rejectionReason: undefined,
          rejectedAt: undefined,
          rejectedBy: undefined
        }),
      });

      if (response.ok) {
        toast.success('تم إعادة تقديم المنتج بنجاح');
        fetchProducts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'فشل في إعادة تقديم المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إعادة تقديم المنتج');
    } finally {
      setProcessing(false);
      setShowResubmitModal(false);
      setSelectedProduct(null);
    }
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'إدارة المنتجات';
      case 'supplier':
        return 'منتجاتي';
      case 'marketer':
        return 'المنتجات المعتمدة';
      case 'wholesaler':
        return 'منتجات الجملة';
      default:
        return 'المنتجات';
    }
  };

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'supplier':
        return 'إدارة منتجاتك وإضافة منتجات جديدة';
      case 'admin':
        return 'إدارة جميع المنتجات في المنصة';
      case 'marketer':
        return 'تصفح المنتجات المعتمدة وإنشاء طلبات';
      case 'wholesaler':
        return 'تصفح المنتجات المتاحة للطلب بالجملة';
      default:
        return '';
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{getRoleTitle()}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">{getRoleDescription()}</p>
        </div>

        {(user?.role === 'supplier' || user?.role === 'admin') && (
          <Link href="/dashboard/products/new" className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            إضافة منتج جديد
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <SearchFilters onSearch={() => setLoading(true)} />

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد منتجات</h3>
          <p className="text-gray-600 dark:text-slate-400">
            {searchParams.toString() 
              ? 'لا توجد نتائج مطابقة لبحثك'
              : user?.role === 'supplier'
                ? 'لم تقم بإضافة أي منتجات بعد. ابدأ بإضافة منتجك الأول!'
                : user?.role === 'marketer'
                ? 'لا توجد منتجات معتمدة متاحة حالياً.'
                : 'لا توجد منتجات متاحة حالياً.'
            }
          </p>
          {user?.role === 'supplier' && !searchParams.toString() && (
            <Link href="/dashboard/products/new" className="btn-primary mt-4">
              <Plus className="w-5 h-5 ml-2" />
              إضافة منتج جديد
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="card hover:shadow-medium transition-shadow relative">
                {/* Favorite button for marketers/wholesalers */}
                {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                  <button
                    onClick={() => handleToggleFavorite(product)}
                    className="absolute top-2 left-2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow z-10"
                  >
                    <Heart 
                      className={`w-5 h-5 ${
                        isFavorite(product._id) 
                          ? 'text-danger-600 dark:text-danger-400 fill-current' 
                          : 'text-gray-400 dark:text-slate-500 hover:text-danger-600 dark:hover:text-danger-400'
                      }`} 
                    />
                  </button>
                )}

                {/* Product Image */}
                <div className="aspect-square bg-gray-200 dark:bg-slate-700 rounded-lg mb-4 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{product.description}</p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice} ₪
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        المخزون: {product.stockQuantity}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 space-x-reverse">
                      {(() => {
                        console.log('🎯 Product status check:', {
                          id: product._id,
                          name: product.name,
                          isApproved: product.isApproved,
                          isRejected: product.isRejected,
                          status: product.isApproved ? 'معتمد' : product.isRejected ? 'مرفوض' : 'قيد المراجعة'
                        });
                        
                        if (product.isApproved) {
                          return <span className="badge badge-success">معتمد</span>;
                        } else if (product.isRejected) {
                          return <span className="badge badge-danger">مرفوض</span>;
                        } else {
                          return <span className="badge badge-warning">قيد المراجعة</span>;
                        }
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                    <Link
                      href={`/dashboard/products/${product._id}`}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4 ml-1 inline" />
                      عرض
                    </Link>

                    {/* Actions for Marketer/Wholesaler */}
                    {(user?.role === 'marketer' || user?.role === 'wholesaler') && product.isApproved && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className={`text-sm font-medium ${
                            product.stockQuantity > 0 
                              ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300' 
                              : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          }`}
                          title={product.stockQuantity > 0 ? 'إضافة للسلة' : 'غير متوفر في المخزون'}
                          disabled={product.stockQuantity <= 0}
                        >
                          <ShoppingCart className="w-4 h-4 ml-1 inline" />
                          {product.stockQuantity > 0 ? 'إضافة للسلة' : 'غير متوفر'}
                        </button>
                      </div>
                    )}

                    {/* Actions for Supplier/Admin */}
                    {(user?.role === 'supplier' || user?.role === 'admin') && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Link
                          href={`/dashboard/products/${product._id}/edit`}
                          className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        
                        {user?.role === 'admin' && !product.isApproved && !product.isRejected && (
                          <button
                            onClick={() => handleApproveProduct(product._id)}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            title="اعتماد المنتج"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user?.role === 'admin' && !product.isApproved && !product.isRejected && (
                          <button
                            onClick={() => handleRejectProduct(product._id)}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                            title="رفض المنتج"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user?.role === 'admin' && product.isRejected && (
                          <button
                            onClick={() => handleResubmitProduct(product._id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title="إعادة تقديم"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stock Status for Marketer/Wholesaler */}
                  {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
                    <div className="mt-2">
                      {product.stockQuantity > 0 ? (
                        <div className="flex items-center text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4 ml-1" />
                          متوفر ({product.stockQuantity} قطعة)
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 ml-1" />
                          نفذ المخزون
                        </div>
                      )}
                    </div>
                  )}

                  {/* Supplier Info for Marketer */}
                  {user?.role === 'marketer' && product.supplierName && (
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                      المورد: {product.supplierName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (pagination.page - 1).toString());
                  window.location.search = params.toString();
                }}
                disabled={pagination.page === 1}
                className="btn-secondary"
              >
                السابق
              </button>
              
              <span className="text-sm text-gray-600 dark:text-slate-400">
                صفحة {pagination.page} من {pagination.pages}
              </span>
              
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', (pagination.page + 1).toString());
                  window.location.search = params.toString();
                }}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* إجمالي المنتجات المعتمدة */}
        <div className="card">
          <div className="flex items-center">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
              <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">إجمالي المنتجات</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{pagination.total || products.length}</p>
            </div>
          </div>
        </div>

        {/* المنتجات المتوفرة */}
        <div className="card">
          <div className="flex items-center">
            <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
              <Package className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">متوفر</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {products.filter(p => p.stockQuantity > 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* المنتجات غير المتوفرة */}
        <div className="card">
          <div className="flex items-center">
            <div className="bg-warning-100 dark:bg-warning-900/30 p-2 rounded-lg">
              <Package className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="mr-3">
              <p className="text-sm text-gray-600 dark:text-slate-400">غير متوفر</p>
              <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {products.filter(p => p.stockQuantity <= 0).length}
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات إضافية للمسوق فقط */}
        {(user?.role === 'marketer' || user?.role === 'wholesaler') && (
          <div className="card">
            <div className="flex items-center">
              <div className="bg-info-100 dark:bg-info-900/30 p-2 rounded-lg">
                <Package className="w-5 h-5 text-info-600 dark:text-info-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-gray-600 dark:text-slate-400">المفضلة</p>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {products.filter(p => isFavorite(p._id)).length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* إحصائيات للمورد والإدارة فقط */}
        {(user?.role === 'supplier' || user?.role === 'admin') && (
          <>
            <div className="card">
              <div className="flex items-center">
                <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-success-600 dark:text-success-400" />
                </div>
                <div className="mr-3">
                  <p className="text-sm text-gray-600 dark:text-slate-400">معتمد</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    {products.filter(p => p.isApproved).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-warning-100 dark:bg-warning-900/30 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                </div>
                <div className="mr-3">
                  <p className="text-sm text-gray-600 dark:text-slate-400">قيد المراجعة</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    {products.filter(p => !p.isApproved && !p.isRejected).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-danger-100 dark:bg-danger-900/30 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                </div>
                <div className="mr-3">
                  <p className="text-sm text-gray-600 dark:text-slate-400">مرفوض</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                    {products.filter(p => p.isRejected).length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Resubmit Modal */}
      {showResubmitModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full mr-3">
                <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعادة تقديم المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من إعادة تقديم المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong> للمراجعة؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowResubmitModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmResubmit}
                disabled={processing}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    إعادة تقديم
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {showResubmitModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full mr-3">
                <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">إعادة تقديم المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من إعادة تقديم المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong> للمراجعة؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowResubmitModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmResubmit}
                disabled={processing}
                className="btn-primary flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    إعادة تقديم
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproveModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-success-100 dark:bg-success-900/30 p-2 rounded-full mr-3">
                <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تأكيد الموافقة</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من الموافقة على المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmApprove}
                disabled={processing}
                className="btn-success flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    موافقة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-danger-100 dark:bg-danger-900/30 p-2 rounded-full mr-3">
                <XCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">رفض المنتج</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              هل أنت متأكد من رفض المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                سبب الرفض <span className="text-danger-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض المنتج..."
                className="input-field"
                rows={3}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedProduct(null);
                  setRejectionReason('');
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmReject}
                disabled={processing || !rejectionReason.trim()}
                className="btn-danger flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="bg-danger-100 dark:bg-danger-900/30 p-2 rounded-full mr-3">
                <AlertCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">تأكيد الحذف</h3>
            </div>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              هل أنت متأكد من حذف المنتج <strong className="text-gray-900 dark:text-slate-100">"{selectedProduct.name}"</strong>؟ 
              <br />
              <span className="text-sm text-danger-600 dark:text-danger-400">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProduct(null);
                }}
                disabled={processing}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={processing}
                className="btn-danger flex items-center"
              >
                {processing ? (
                  <>
                    <div className="loading-spinner w-4 h-4 ml-2"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 