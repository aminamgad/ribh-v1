'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { 
  ArrowLeft, 
  Package, 
  Store, 
  Heart, 
  ShoppingCart, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Tag,
  Scale,
  Ruler,
  User,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  nameEn?: string;
  description: string;
  images: string[];
  marketerPrice: number;
  wholesalePrice: number;
  costPrice: number;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  isFulfilled: boolean;
  categoryName?: string;
  supplierName?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags?: string[];
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isRejected?: boolean; // Added for rejection status
  rejectionReason?: string; // Added for rejection reason
  adminNotes?: string; // Added for admin notes
  approvedAt?: string; // Added for approval date
  approvedBy?: string; // Added for approval user
  rejectedAt?: string; // Added for rejection date
  rejectedBy?: string; // Added for rejection user
  categoryId?: { name: string }; // Added for category ID
  supplierId?: { name: string; companyName: string }; // Added for supplier ID
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Product data received:', {
          id: data.product._id,
          name: data.product.name,
          isApproved: data.product.isApproved,
          isRejected: data.product.isRejected,
          rejectionReason: data.product.rejectionReason,
          status: data.product.isApproved ? 'معتمد' : data.product.isRejected ? 'مرفوض' : 'قيد المراجعة'
        });
        setProduct(data.product);
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

  const handleDeleteProduct = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المنتج بنجاح');
        router.push('/dashboard/products');
      } else {
        toast.error('فشل في حذف المنتج');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف المنتج');
    }
  };

  const handleToggleFavorite = async () => {
    if (!product) return;
    
    if (isFavorite(product._id)) {
      await removeFromFavorites(product._id);
    } else {
      await addToFavorites(product);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

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
      addToCart(product);
      
      // إشعار واحد فقط
      toast.success(`تم إضافة ${product.name} إلى السلة بنجاح`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج إلى السلة');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
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

  // Transform product for frontend
  const transformedProduct = {
    _id: product._id,
    name: product.name,
    nameEn: product.nameEn,
    description: product.description,
    images: product.images,
    marketerPrice: product.marketerPrice,
    wholesalePrice: product.wholesalePrice,
    costPrice: product.costPrice,
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    isApproved: product.isApproved,
    isRejected: product.isRejected,
    rejectionReason: product.rejectionReason,
    adminNotes: product.adminNotes,
    approvedAt: product.approvedAt,
    approvedBy: product.approvedBy,
    rejectedAt: product.rejectedAt,
    rejectedBy: product.rejectedBy,
    isFulfilled: product.isFulfilled,
    categoryName: product.categoryId?.name,
    supplierName: product.supplierId?.name || product.supplierId?.companyName,
    sku: product.sku,
    weight: product.weight,
    dimensions: product.dimensions,
    tags: product.tags,
    specifications: product.specifications,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };

  const currentPrice = user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice;
  const profitMargin = ((currentPrice - product.costPrice) / product.costPrice * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link 
              href="/dashboard/products"
              className="btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للمنتجات
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تفاصيل المنتج</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {(user?.role === 'marketer' || user?.role === 'wholesaler') && product.stockQuantity > 0 && (
              <button 
                onClick={handleAddToCart}
                className="btn-primary"
              >
                <ShoppingCart className="w-4 h-4 ml-2" />
                أضف للسلة
              </button>
            )}

            <button 
              onClick={handleToggleFavorite}
              className={`p-2 rounded-full border ${
                isFavorite(product._id) 
                  ? 'bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-700 text-danger-600 dark:text-danger-400' 
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:text-danger-600 dark:hover:text-danger-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite(product._id) ? 'fill-current' : ''}`} />
            </button>

            {(user?.role === 'supplier' || user?.role === 'admin') && (
              <>
                <Link
                  href={`/dashboard/products/${product._id}/edit`}
                  className="btn-secondary"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل
                </Link>
                <button
                  onClick={handleDeleteProduct}
                  className="btn-danger"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400 dark:text-slate-500" />
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2 space-x-reverse overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-primary-500' : 'border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{product.name}</h2>
                  {product.nameEn && (
                    <p className="text-gray-600 dark:text-slate-400 text-lg">{product.nameEn}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  {(() => {
                    console.log('🎯 Product status check:', {
                      id: product._id,
                      name: product.name,
                      isApproved: product.isApproved,
                      isRejected: product.isRejected,
                      rejectionReason: product.rejectionReason,
                      status: product.isApproved ? 'معتمد' : product.isRejected ? 'مرفوض' : 'قيد المراجعة'
                    });
                    
                    if (product.isApproved) {
                      return (
                        <span className="badge badge-success">
                          <CheckCircle className="w-4 h-4 ml-1" />
                          معتمد
                        </span>
                      );
                    } else if (product.isRejected) {
                      return (
                        <span className="badge badge-danger">
                          <XCircle className="w-4 h-4 ml-1" />
                          مرفوض
                        </span>
                      );
                    } else {
                      return (
                        <span className="badge badge-warning">
                          <Clock className="w-4 h-4 ml-1" />
                          قيد المراجعة
                        </span>
                      );
                    }
                  })()}
                  {product.isFulfilled && (
                    <span className="badge badge-info">
                      <Package className="w-4 h-4 ml-1" />
                      مخزن
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-700 dark:text-slate-300 leading-relaxed mb-4">{product.description}</p>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">سعر المسوق</p>
                  <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{product.marketerPrice} ₪</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">سعر الجملة</p>
                  <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{product.wholesalePrice} ₪</p>
                </div>
              </div>

              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">سعر التكلفة</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{product.costPrice} ₪</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">هامش الربح: {profitMargin}%</p>
              </div>
            </div>

            {/* Stock & Status */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">المخزون والحالة</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">الكمية المتوفرة</p>
                  <p className={`text-xl font-bold ${product.stockQuantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {product.stockQuantity}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-slate-400">الحالة</p>
                  <p className={`text-sm font-semibold ${product.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {product.isActive ? 'نشط' : 'غير نشط'}
                  </p>
                </div>
              </div>
              
              {/* Rejection Reason */}
              {product.isRejected && product.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 ml-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">سبب الرفض:</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">{product.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">تفاصيل المنتج</h3>
              <div className="space-y-3">
                {product.sku && (
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">SKU:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.sku}</span>
                  </div>
                )}
                
                {product.weight && (
                  <div className="flex items-center">
                    <Scale className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">الوزن:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.weight} كجم</span>
                  </div>
                )}

                {product.dimensions && (
                  <div className="flex items-center">
                    <Ruler className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">الأبعاد:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                      {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} سم
                    </span>
                  </div>
                )}

                <div className="flex items-center">
                  <Store className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">الفئة:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.categoryName}</span>
                </div>

                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">المورد:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">{product.supplierName}</span>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-2" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">تاريخ الإضافة:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 mr-2">
                    {new Date(product.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">العلامات</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="badge badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">المواصفات</h3>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                      <span className="text-sm text-gray-600 dark:text-slate-400">{key}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 