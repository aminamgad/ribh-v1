'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { Heart, ShoppingCart, Trash2, Package, Store } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  addedAt: string;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب المفضلة');
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (productId: string) => {
    try {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(p => p._id !== productId));
        toast.success('تم إزالة المنتج من المفضلة');
      } else {
        toast.error('فشل في إزالة المنتج من المفضلة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إزالة المنتج من المفضلة');
    }
  };

  const handleAddToCart = (product: Product) => {
    // استخدام المنتج الأصلي بدلاً من إنشاء كائن جديد
    addToCart(product as any);
    
    // إشعار واحد فقط
    toast.success(`تم إضافة ${product.name} إلى السلة بنجاح`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">لا توجد منتجات في المفضلة</h2>
          <p className="text-gray-600 mb-6">لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد</p>
          <Link href="/dashboard/products" className="btn-primary">
            <Store className="w-5 h-5 ml-2" />
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المفضلة</h1>
          <p className="text-gray-600 mt-2">{favorites.length} منتج في قائمة المفضلة</p>
        </div>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((product) => (
          <div key={product._id} className="card hover:shadow-medium transition-shadow relative">
            {/* Remove from favorites button */}
            <button
              onClick={() => removeFromFavorites(product._id)}
              className="absolute top-2 left-2 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow z-10"
            >
              <Heart className="w-5 h-5 text-danger-600 fill-current" />
            </button>

            {/* Product Image */}
            <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-primary-600">
                    {user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice} ₪
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.stockQuantity > 0 ? `متوفر: ${product.stockQuantity}` : 'غير متوفر'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Link
                  href={`/dashboard/products/${product._id}`}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  عرض التفاصيل
                </Link>
                
                {product.stockQuantity > 0 && (
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    <ShoppingCart className="w-4 h-4 ml-1" />
                    أضف للسلة
                  </button>
                )}
              </div>

              {/* Added date */}
              <p className="text-xs text-gray-400 text-center">
                أضيف في {new Date(product.addedAt).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 