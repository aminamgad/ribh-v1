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
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';

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

  // Prefetch images for visible favorites (first 8 products)
  useEffect(() => {
    if (favorites.length > 0) {
      const visibleProducts = favorites.slice(0, 8);
      
      visibleProducts.forEach((product) => {
        if (product.images && product.images.length > 0) {
          const imageUrl = product.images[0];
          if (isCloudinaryUrl(imageUrl)) {
            const thumbnailUrl = getCloudinaryThumbnailUrl(imageUrl, { 
              width: 300, 
              height: 300, 
              crop: 'fill', 
              quality: 'auto:good',
              format: 'auto',
              dpr: 'auto'
            });
            
            // Prefetch using link preload
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = thumbnailUrl;
            document.head.appendChild(link);
          }
        }
      });
      
      // Cleanup on unmount
      return () => {
        const prefetchLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
        prefetchLinks.forEach(link => {
          if (visibleProducts.some(p => p.images?.[0] && link.getAttribute('href')?.includes(p.images[0]))) {
            link.remove();
          }
        });
      };
    }
  }, [favorites]);

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
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">لا توجد منتجات في المفضلة</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد</p>
          <Link href="/dashboard/products" className="btn-primary min-h-[44px] text-sm sm:text-base px-4 sm:px-6 inline-flex items-center justify-center">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">المفضلة</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">{favorites.length} منتج في قائمة المفضلة</p>
        </div>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {favorites.map((product) => (
          <div 
            key={product._id} 
            className="card hover:shadow-medium transition-shadow relative cursor-pointer active:scale-[0.98] p-3 sm:p-4"
            onClick={() => router.push(`/dashboard/products/${product._id}`)}
          >
            {/* Remove from favorites button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromFavorites(product._id);
              }}
              className="absolute top-2 left-2 p-1.5 sm:p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow z-10 flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-danger-600 fill-current" />
            </button>

            {/* Product Image */}
            <div className="aspect-square bg-gray-200 dark:bg-slate-700 rounded-lg mb-3 sm:mb-4 overflow-hidden">
              <MediaThumbnail
                media={product.images || []}
                alt={product.name}
                className="w-full h-full"
                showTypeBadge={false}
                width={300}
                height={300}
                priority={favorites.indexOf(product) < 4} // Priority for first 4 visible products
                fallbackIcon={<Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />}
              />
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{product.description}</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base sm:text-lg font-bold text-[#FF9800] dark:text-[#FF9800]">
                    {user?.role === 'wholesaler' ? product.wholesalePrice : product.marketerPrice} ₪
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {product.stockQuantity > 0 ? `متوفر: ${product.stockQuantity}` : 'غير متوفر'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/products/${product._id}`);
                  }}
                  className="btn-secondary-solid flex-1 text-xs sm:text-sm py-2 sm:py-2.5 text-center min-h-[44px]"
                >
                  عرض التفاصيل
                </button>
                
                {product.stockQuantity > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="btn-primary flex-1 text-xs sm:text-sm py-2 sm:py-2.5 min-h-[44px] flex items-center justify-center"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    أضف للسلة
                  </button>
                )}
              </div>

              {/* Added date */}
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 text-center">
                أضيف في {new Date(product.addedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 