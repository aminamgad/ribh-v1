'use client';

import { useEffect, memo } from 'react';
import { Package, ShoppingCart, Heart, ArrowLeft } from 'lucide-react';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { OptimizedImage } from '@/components/ui/LazyImage';
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';
import { getStockBadgeText, calculateVariantStockQuantity } from '@/lib/product-helpers';

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  marketerPrice: number;
  stockQuantity: number;
  isApproved: boolean;
  categoryId?: string;
  sales?: number;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
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
}

const ProductSection = memo(function ProductSection({
  title,
  icon,
  products,
  onViewAll,
  onProductClick,
  onAddToCart,
  onToggleFavorite,
  isFavorite
}: ProductSectionProps) {
  // Prefetch critical images (first 6 products - visible on most screens)
  useEffect(() => {
    const criticalProducts = products.slice(0, 6);
    
    criticalProducts.forEach((product) => {
      if (product.images && product.images.length > 0) {
        const imageUrl = product.images[0];
        const thumbnailUrl = isCloudinaryUrl(imageUrl)
          ? getCloudinaryThumbnailUrl(imageUrl, { 
              width: 256, 
              height: 256, 
              crop: 'fill', 
              quality: 'auto:good',
              format: 'auto',
              dpr: 'auto'
            })
          : imageUrl;
        
        // Prefetch using link preload
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbnailUrl;
        document.head.appendChild(link);
      }
    });
    
    // Cleanup
    return () => {
      const prefetchLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      prefetchLinks.forEach(link => {
        if (criticalProducts.some(p => p.images?.[0] && link.getAttribute('href')?.includes(p.images[0]))) {
          link.remove();
        }
      });
    };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4 mr-2" />
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-slate-400">لا توجد منتجات في هذا القسم حالياً</p>
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <div
            key={product._id}
            className="card p-3 hover:shadow-medium transition-shadow relative group cursor-pointer"
            onClick={() => onProductClick(product)}
          >
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product);
              }}
              className="absolute top-2 left-2 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow z-10 opacity-0 group-hover:opacity-100 flex items-center justify-center"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite(product._id)
                    ? 'text-danger-600 dark:text-danger-400 fill-current'
                    : 'text-gray-400 dark:text-slate-500 hover:text-danger-600 dark:hover:text-danger-400'
                }`}
              />
            </button>

            {/* Product Image */}
            <div className="relative mb-3 aspect-square">
              {product.images && product.images.length > 0 ? (
                <OptimizedImage
                  src={product.images[0]}
                  alt={product.name}
                  width={256}
                  height={256}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                  priority={products.indexOf(product) < 6} // Priority for first 6 products
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100 line-clamp-2 min-h-[2.5rem]">
                {product.name}
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-bold ${
                    product.isMinimumPriceMandatory && product.minimumSellingPrice
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-primary-600 dark:text-primary-400'
                  }`}>
                    {product.marketerPrice} ₪
                  </span>
                </div>
                {product.sales && product.sales > 0 && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {product.sales} مبيع
                  </span>
                )}
              </div>

              {/* Stock Info */}
              {product.hasVariants && product.variantOptions && product.variantOptions.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-slate-400 text-center">
                  {getStockBadgeText(product.stockQuantity, product.hasVariants, product.variantOptions)}
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                disabled={
                  (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                    ? calculateVariantStockQuantity(product.variantOptions)
                    : product.stockQuantity) <= 0 || !product.isApproved
                }
                className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                  (product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                    ? calculateVariantStockQuantity(product.variantOptions)
                    : product.stockQuantity) > 0 && product.isApproved
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-4 h-4 ml-1" />
                {(product.hasVariants && product.variantOptions && product.variantOptions.length > 0
                  ? calculateVariantStockQuantity(product.variantOptions)
                  : product.stockQuantity) > 0 && product.isApproved ? 'إضافة للسلة' : 'غير متوفر'}
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

