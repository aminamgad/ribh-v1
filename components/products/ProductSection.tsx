'use client';

import { useEffect, memo } from 'react';
import { Package, ShoppingCart, Heart, ArrowLeft, Share2 } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import ButtonLoader from '@/components/ui/ButtonLoader';
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';
import { getStockBadgeText, calculateVariantStockQuantity } from '@/lib/product-helpers';

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  marketerPrice: number;
  wholesalerPrice?: number;
  stockQuantity: number;
  isApproved: boolean;
  categoryId?: string;
  sales?: number;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  isMarketerPriceManuallyAdjusted?: boolean;
  hasVariants?: boolean;
  variantOptions?: Array<{
    variantId: string;
    variantName: string;
    value: string;
    price?: number;
    stockQuantity: number;
    sku?: string;
    images?: string[];
  }>;
  metadata?: { easyOrdersProductId?: string; easyOrdersStoreId?: string; easyOrdersIntegrationId?: string };
}

interface ProductSectionProps {
  title: string;
  icon: React.ReactNode;
  products: Product[];
  onViewAll: () => void;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  /** عرض سعر الجملة للمسوق أو تاجر الجملة */
  userRole?: 'marketer' | 'wholesaler';
  /** عرض زر التصدير إلى Easy Orders للمسوق/تاجر الجملة */
  showExport?: boolean;
  onExport?: (product: Product) => void;
  exportingProductId?: string | null;
  /** إلغاء ربط المنتج من Easy Orders (حذفته من Easy Orders) */
  onUnlinkExport?: (product: Product) => void | Promise<void>;
  unlinkingProductId?: string | null;
}

const ProductSection = memo(function ProductSection({
  title,
  icon,
  products,
  onViewAll,
  onProductClick,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
  userRole = 'marketer',
  showExport = false,
  onExport,
  exportingProductId = null,
  onUnlinkExport,
  unlinkingProductId = null
}: ProductSectionProps) {
  const displayPrice = (p: Product) => userRole === 'wholesaler' ? (p.wholesalerPrice ?? p.marketerPrice) : p.marketerPrice;
  const variantStock = (p: Product) => p.hasVariants && p.variantOptions?.length
    ? calculateVariantStockQuantity(p.variantOptions)
    : p.stockQuantity;
  const inStock = (p: Product) => variantStock(p) > 0;
  const marketerProfit = (p: Product) => {
    const base = userRole === 'wholesaler' ? (p.wholesalerPrice ?? 0) : (p.marketerPrice ?? 0);
    const minP = p.minimumSellingPrice ?? 0;
    return minP > base ? minP - base : 0;
  };

  useEffect(() => {
    const criticalProducts = products.slice(0, 6);
    criticalProducts.forEach((product) => {
      if (product.images?.length) {
        const thumbnailUrl = isCloudinaryUrl(product.images[0])
          ? getCloudinaryThumbnailUrl(product.images[0], { width: 256, height: 256, crop: 'fill', quality: 'auto:good', format: 'auto', dpr: 'auto' })
          : product.images[0];
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbnailUrl;
        document.head.appendChild(link);
      }
    });
    return () => {
      document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
        if (criticalProducts.some(p => p.images?.[0] && link.getAttribute('href')?.includes(p.images[0]))) link.remove();
      });
    };
  }, [products]);

  return (
    <div className="animate-fade-in">
      {/* Section Header - تصميم احترافي */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#FF9800]/15 to-[#F57C00]/10 dark:from-[#FF9800]/20 dark:to-[#F57C00]/15 rounded-xl text-[#FF9800] dark:text-[#FFB74D] shadow-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">{products.length} منتج</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700/80 hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 text-[#FF9800] dark:text-[#FFB74D] font-medium text-sm transition-all hover:shadow-md"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Products Grid - شبكة احترافية كلوحة الإدارة */}
      {products.length === 0 ? (
        <div className="card p-8 text-center rounded-2xl border border-gray-200 dark:border-slate-600">
          <Package className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات في هذا القسم حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className={`group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600/80 shadow-sm hover:shadow-xl hover:border-[#FF9800]/30 dark:hover:border-[#FF9800]/40 transition-all duration-300 cursor-pointer active:scale-[0.99] ${
                product.isMinimumPriceMandatory && product.minimumSellingPrice ? 'ring-2 ring-[#FF9800]/30 dark:ring-[#FF9800]/40' : ''
              }`}
              onClick={() => onProductClick(product)}
            >
              {/* Favorite - ظاهر دائماً مع تأثير hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(product); }}
                className="absolute top-3 left-3 z-10 p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Heart className={`w-5 h-5 ${isFavorite(product._id) ? 'text-red-500 fill-current' : 'text-gray-500 dark:text-slate-400'}`} />
              </button>

              {/* Export to Easy Orders */}
              {showExport && product.isApproved && !product.metadata?.easyOrdersProductId && onExport && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExport(product); }}
                  disabled={!!exportingProductId}
                  className="absolute top-3 right-3 z-10 p-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-md shadow-emerald-500/25 hover:shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-60 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                  title="تصدير إلى Easy Orders"
                >
                  {exportingProductId === product._id ? <ButtonLoader variant="light" size="sm" /> : <Share2 className="w-4 h-4" />}
                </button>
              )}
              {showExport && product.isApproved && product.metadata?.easyOrdersProductId && onUnlinkExport && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUnlinkExport(product); }}
                  disabled={!!unlinkingProductId}
                  className="absolute top-3 right-3 z-10 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="إلغاء الربط"
                >
                  مُصدّر
                </button>
              )}

              {/* Product Image */}
              <div className="relative overflow-hidden bg-gray-100 dark:bg-slate-700/50">
                <div className="aspect-square overflow-hidden">
                  {product.images?.length ? (
                    <MediaThumbnail
                      media={product.images}
                      alt={product.name}
                      className="w-full h-full"
                      showTypeBadge
                      priority={products.indexOf(product) < 6}
                      width={300}
                      height={300}
                      fallbackIcon={<Package className="w-12 h-12 text-gray-400 dark:text-slate-500" />}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400 dark:text-slate-500" />
                    </div>
                  )}
                </div>
                {product.sales && product.sales > 0 && (
                  <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    {product.sales} مبيع
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 sm:p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 min-h-[2.75rem] text-sm sm:text-base">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 line-clamp-2 hidden sm:block">
                    {product.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-lg sm:text-xl font-bold ${product.isMarketerPriceManuallyAdjusted ? 'text-[#FF9800] dark:text-[#FFB74D]' : 'text-primary-600 dark:text-primary-400'}`}>
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(displayPrice(product))} ₪
                    </span>
                    {product.minimumSellingPrice && (
                      <span className={`text-xs ${product.isMinimumPriceMandatory ? 'text-[#FF9800]' : 'text-gray-500'}`}>
                        الأدنى: {product.minimumSellingPrice} ₪
                      </span>
                    )}
                  </div>
                  {marketerProfit(product) > 0 && (
                    <p className="text-xs font-semibold text-[#FF9800] dark:text-[#FFB74D]">
                      ربحك: {marketerProfit(product).toFixed(2)} ₪
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    variantStock(product) > 10 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    variantStock(product) > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                  }`}>
                    {getStockBadgeText(product.stockQuantity, !!product.hasVariants, product.variantOptions)}
                  </span>
                </div>

                {/* Add to Cart - زر واضح واحترافي */}
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                  disabled={!inStock(product) || !product.isApproved}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                    inStock(product) && product.isApproved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {inStock(product) && product.isApproved ? 'إضافة للسلة' : 'غير متوفر'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ProductSection;
