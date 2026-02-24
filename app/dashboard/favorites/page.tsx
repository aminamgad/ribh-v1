'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { useCart } from '@/components/providers/CartProvider';
import { Heart, ShoppingCart, Trash2, Package, Store, Share2, RotateCw } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
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
  wholesalerPrice: number;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  addedAt: string;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  isMarketerPriceManuallyAdjusted?: boolean;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();

  // Export to Easy Orders
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingProductId, setExportingProductId] = useState<string | null>(null);
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportLockRef = useRef(false);

  const handleUnlinkExport = async (productId: string) => {
    if (integrations.length === 0) return;
    const integrationId = integrations.length === 1 ? integrations[0].id : selectedIntegrationId || integrations[0]?.id;
    if (!integrationId) return;
    setUnlinkingProductId(productId);
    try {
      const res = await fetch('/api/integrations/easy-orders/unlink-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, integrationId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'تم إلغاء الربط. يمكنك تصدير المنتج مرة أخرى.');
        refresh();
      } else {
        toast.error(data.error || 'فشل إلغاء الربط');
      }
    } catch {
      toast.error('حدث خطأ أثناء إلغاء الربط');
    } finally {
      setUnlinkingProductId(null);
    }
  };

  useEffect(() => {
    if ((user?.role === 'marketer' || user?.role === 'wholesaler')) {
      fetch('/api/integrations')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.integrations) {
            const active = data.integrations.filter((int: any) => int.status === 'active' && int.type === 'easy_orders');
            setIntegrations(active);
            if (active.length === 1) setSelectedIntegrationId(active[0].id);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const handleExportProduct = async (productId: string) => {
    if (exportLockRef.current) return; // منع التصدير المتكرر
    if (integrations.length === 0) {
      toast.error('لا توجد تكاملات نشطة. يرجى إضافة تكامل Easy Orders أولاً');
      router.push('/dashboard/integrations');
      return;
    }
    if (integrations.length === 1) {
      setExportingProductId(productId);
      await performExport(productId, integrations[0].id);
    } else {
      setExportingProductId(productId);
      setShowExportModal(true);
    }
  };

  const performExport = async (productId: string, integrationId: string) => {
    if (exportLockRef.current) return;
    exportLockRef.current = true;
    setExporting(true);
    try {
      const res = await fetch('/api/integrations/easy-orders/export-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, integrationId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('تم تصدير المنتج بنجاح إلى Easy Orders!');
        setShowExportModal(false);
        setExportingProductId(null);
        setSelectedIntegrationId('');
        refresh();
      } else {
        toast.error(data.error || 'فشل في تصدير المنتج');
        setExportingProductId(null);
        setShowExportModal(false);
        setSelectedIntegrationId('');
      }
    } catch {
      toast.error('حدث خطأ أثناء تصدير المنتج');
      setExportingProductId(null);
      setShowExportModal(false);
      setSelectedIntegrationId('');
    } finally {
      setExporting(false);
      exportLockRef.current = false;
    }
  };

  const handleExportFromModal = async () => {
    if (!exportingProductId || !selectedIntegrationId) return;
    await performExport(exportingProductId, selectedIntegrationId);
  };

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

  const favorites = useMemo(() => favoritesData?.favorites || [], [favoritesData?.favorites]);

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
    return <LoadingState message="جاري تحميل المفضلة..." className="min-h-[60vh]" />;
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-[60vh]">
        <EmptyState
          icon={Heart}
          title="لا توجد منتجات في المفضلة"
          description="لم تقم بإضافة أي منتجات إلى قائمة المفضلة بعد"
          action={
            <Link href="/dashboard/products" className="btn-primary min-h-[44px] text-sm sm:text-base px-4 sm:px-6 inline-flex items-center justify-center">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              تصفح المنتجات
            </Link>
          }
        />
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-base sm:text-lg font-bold ${
                      user?.role !== 'wholesaler' && product.isMarketerPriceManuallyAdjusted
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-[#FF9800] dark:text-[#FF9800]'
                    }`}>
                      {user?.role === 'wholesaler' ? product.wholesalerPrice : product.marketerPrice} ₪
                    </p>
                    {user?.role !== 'wholesaler' && product.isMinimumPriceMandatory && product.minimumSellingPrice && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                        إلزامي
                      </span>
                    )}
                  </div>
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
                
                {(user?.role === 'marketer' || user?.role === 'wholesaler') && integrations.length > 0 && product.isApproved && !(product as any).metadata?.easyOrdersProductId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportProduct(product._id);
                    }}
                    disabled={!!exportingProductId}
                    className="btn-export min-h-[44px] px-3 py-2 sm:py-2.5 text-xs sm:text-sm disabled:opacity-60"
                    title="تصدير إلى Easy Orders"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    تصدير
                  </button>
                )}
                {(user?.role === 'marketer' || user?.role === 'wholesaler') && integrations.length > 0 && product.isApproved && (product as any).metadata?.easyOrdersProductId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkExport(product._id);
                    }}
                    disabled={!!unlinkingProductId}
                    className="text-xs sm:text-sm py-2 sm:py-2.5 min-h-[44px] px-3 flex items-center justify-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60"
                    title="حذفته من Easy Orders - إلغاء الربط لتمكين التصدير مرة أخرى"
                  >
                    مُصدّر
                  </button>
                )}
                
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تصدير المنتج إلى Easy Orders</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">اختر التكامل:</p>
            <div className="space-y-2 mb-6">
              {integrations.map((int) => (
                <label
                  key={int.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                    selectedIntegrationId === int.id ? 'border-[#4CAF50] bg-[#4CAF50]/10' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="integration"
                    value={int.id}
                    checked={selectedIntegrationId === int.id}
                    onChange={(e) => setSelectedIntegrationId(e.target.value)}
                    className="w-4 h-4 text-[#4CAF50]"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{int.storeName}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowExportModal(false); setExportingProductId(null); }} className="btn-secondary flex-1" disabled={exporting}>إلغاء</button>
              <button onClick={handleExportFromModal} disabled={exporting || !selectedIntegrationId} className="btn-export flex-1 flex items-center justify-center px-4 py-2.5 text-sm">
                {exporting ? <><RotateCw className="w-4 h-4 ml-2 animate-spin" /> جاري التصدير...</> : <><Share2 className="w-4 h-4 ml-2" /> تصدير</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 