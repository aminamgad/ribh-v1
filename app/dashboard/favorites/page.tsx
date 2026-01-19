'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useCart } from '@/components/providers/CartProvider';
import { Heart, ShoppingCart, Trash2, Package, Store } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Use cache hook for favorites
  const { data: favoritesData, loading, refresh } = useDataCache<{
    favorites: Product[];
  }>({
    key: 'favorites',
    fetchFn: async () => {
      const response = await fetch('/api/favorites');
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false,
    onError: () => {
      toast.error('حدث خطأ أثناء جلب المفضلة');
    }
  });

  const favorites = favoritesData?.favorites || [];

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
      // No toast here - header button already shows notification
    };

    window.addEventListener('refresh-favorites', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-favorites', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchFavorites for backward compatibility
  const fetchFavorites = async () => {
    refresh();
  };

  const removeFromFavorites = async (productId: string) => {
    try {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        refresh(); // Refresh cache after removal
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
          <Heart className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">لا توجد منتجات في المفضلة</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">المفضلة</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{favorites.length} منتج في قائمة المفضلة</p>
        </div>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((product) => (
          <div 
            key={product._id} 
            className="card hover:shadow-medium transition-shadow relative cursor-pointer"
            onClick={() => router.push(`/dashboard/products/${product._id}`)}
          >
            {/* Remove from favorites button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromFavorites(product._id);
              }}
              className="absolute top-2 left-2 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow z-10 flex items-center justify-center"
            >
              <Heart className="w-5 h-5 text-danger-600 fill-current" />
            </button>

            {/* Product Image */}
            <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
              <MediaThumbnail
                media={product.images || []}
                alt={product.name}
                className="w-full h-full"
                showTypeBadge={false}
                fallbackIcon={<Package className="w-12 h-12 text-gray-400" />}
              />
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{product.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-[#FF9800] dark:text-[#FF9800]">
                    {user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice} ₪
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {product.stockQuantity > 0 ? `متوفر: ${product.stockQuantity}` : 'غير متوفر'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="btn-secondary-solid flex-1 text-sm py-2 text-center">
                  عرض التفاصيل
                </div>
                
                {product.stockQuantity > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    <ShoppingCart className="w-4 h-4 ml-1" />
                    أضف للسلة
                  </button>
                )}
              </div>

              {/* Added date */}
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                أضيف في {new Date(product.addedAt).toLocaleDateString('en-US')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 