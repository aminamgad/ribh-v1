'use client';

import { useState, useEffect, memo } from 'react';
import { Eye, Edit, BarChart3, CheckCircle, XCircle, LayoutGrid, List, RotateCw, Clock } from 'lucide-react';
import Link from 'next/link';
import MediaThumbnail from '@/components/ui/MediaThumbnail';
import { Package } from 'lucide-react';
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';
import { getStockDisplayText } from '@/lib/product-helpers';

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  supplierPrice?: number;
  marketerPrice: number | undefined;
  wholesalerPrice: number | undefined;
  minimumSellingPrice?: number;
  isMinimumPriceMandatory?: boolean;
  stockQuantity: number;
  isActive: boolean;
  isApproved: boolean;
  isRejected?: boolean;
  supplierName?: string;
  categoryName?: string;
  isLocked?: boolean;
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

interface AdminProductsTableViewProps {
  products: Product[];
  onApprove?: (productId: string) => void;
  onReject?: (productId: string) => void;
  onResubmit?: (productId: string) => void;
  onReview?: (productId: string) => void;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}

const AdminProductsTableView = memo(function AdminProductsTableView({
  products,
  onApprove,
  onReject,
  onResubmit,
  onReview,
  viewMode = 'list',
  onViewModeChange
}: AdminProductsTableViewProps) {
  
  // Prefetch critical images (first 5 products in list view, first 8 in grid view)
  useEffect(() => {
    const criticalCount = viewMode === 'list' ? 5 : 8;
    const criticalProducts = products.slice(0, criticalCount);
    
    criticalProducts.forEach((product) => {
      if (product.images && product.images.length > 0) {
        const imageUrl = product.images[0];
        const thumbnailUrl = isCloudinaryUrl(imageUrl) && viewMode === 'list'
          ? getCloudinaryThumbnailUrl(imageUrl, { 
              width: 64, 
              height: 64, 
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
  }, [products, viewMode]);
  
  // Calculate profits
  const calculateMarketerProfit = (marketerPrice: number | undefined, minimumSellingPrice: number | undefined) => {
    // Marketer profit is the difference between selling price and marketer price (base price)
    // For display, we show potential profit if selling at minimum price
    const marketer = marketerPrice ?? 0;
    const minPrice = minimumSellingPrice ?? 0;
    if (minPrice > marketer) {
      return minPrice - marketer;
    }
    return 0; // No profit if selling at base price
  };

  const calculateAdminProfit = (supplierPrice: number | undefined, marketerPrice: number | undefined) => {
    // Admin profit = marketerPrice - supplierPrice
    // This is the profit margin added to supplier price
    const supplier = supplierPrice ?? 0;
    const marketer = marketerPrice ?? 0;
    return marketer - supplier;
  };

  const getStatusBadge = (product: Product) => {
    if (product.isApproved) {
      return <span className="badge badge-success">معتمد</span>;
    } else if (product.isRejected ?? false) {
      return <span className="badge badge-danger">مرفوض</span>;
    } else {
      return <span className="badge badge-warning">قيد المراجعة</span>;
    }
  };

  const getStockStatus = (product: Product) => {
    const totalStock = product.hasVariants && product.variantOptions && product.variantOptions.length > 0
      ? product.variantOptions.reduce((sum, opt) => sum + (opt.stockQuantity || 0), 0)
      : product.stockQuantity;
    
    const displayText = getStockDisplayText(
      product.stockQuantity,
      product.hasVariants,
      product.variantOptions
    );
    
    if (totalStock > 10) {
      return <span className="text-green-600 dark:text-green-400 font-medium">{displayText}</span>;
    } else if (totalStock > 0) {
      return <span className="text-yellow-600 dark:text-yellow-400 font-medium">{displayText}</span>;
    } else {
      return <span className="text-red-600 dark:text-red-400 font-medium">غير متوفر</span>;
    }
  };

  if (viewMode === 'grid') {
    // Grid view
    return (
      <div className="space-y-4">
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex justify-end mb-4">
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('list')}
                className="px-3 py-1.5 rounded-md transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              >
                <List className="w-4 h-4 inline ml-1" />
                قائمة
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className="px-3 py-1.5 rounded-md transition-colors bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm"
              >
                <LayoutGrid className="w-4 h-4 inline ml-1" />
                شبكة
              </button>
            </div>
          </div>
        )}

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const marketerProfit = calculateMarketerProfit(product.marketerPrice, product.minimumSellingPrice);
            const adminProfit = calculateAdminProfit(product.supplierPrice, product.marketerPrice);

            return (
              <div
                key={product._id}
                className="card hover:shadow-medium transition-shadow"
              >
                {/* Product Image */}
                <div className="relative mb-4">
                  <MediaThumbnail
                    media={product.images || []}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                    showTypeBadge={false}
                    width={300}
                    height={192}
                    priority={products.indexOf(product) < 4}
                    fallbackIcon={<Package className="w-12 h-12 text-gray-400 dark:text-slate-500" />}
                  />
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-2">
                    {product.name}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">المورد: </span>
                      <span className="font-medium">{product.supplierName || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-slate-400">الحالة:</span>
                      {getStatusBadge(product)}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">المخزون: </span>
                      {getStockStatus(product)}
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">سعر المورد: </span>
                      <span className="font-medium">{(product.supplierPrice ?? 0).toFixed(2)} ₪</span>
                    </div>
                    <div className="p-2">
                      <span className="text-gray-600 dark:text-slate-400">سعر المسوق: </span>
                      <span className={`font-bold text-lg ${
                        product.isMinimumPriceMandatory && product.minimumSellingPrice
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-slate-100'
                      }`}>
                        {(product.marketerPrice ?? 0).toFixed(2)} ₪
                      </span>
                      {product.minimumSellingPrice && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          السعر الأدنى: {(product.minimumSellingPrice ?? 0).toFixed(2)} ₪
                        </div>
                      )}
                      <div className={`text-xs font-semibold mt-1 ${
                        product.isMinimumPriceMandatory && product.minimumSellingPrice
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        ربح المسوق: {marketerProfit.toFixed(2)} ₪
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-slate-400">ربح الإدارة: </span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {adminProfit.toFixed(2)} ₪
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                    <Link
                      href={`/dashboard/products/${product._id}`}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center"
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      عرض
                    </Link>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Link
                        href={`/dashboard/products/${product._id}/edit`}
                        className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/dashboard/admin/product-stats?productId=${product._id}`}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        title="إحصائيات"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                      {!product.isApproved && !(product.isRejected ?? false) && onApprove && (
                        <button
                          onClick={() => onApprove(product._id)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                          title="قبول"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {!product.isApproved && !(product.isRejected ?? false) && onReject && (
                        <button
                          onClick={() => onReject(product._id)}
                          className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                          title="رفض"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {product.isApproved && onReview && (
                        <button
                          onClick={() => onReview(product._id)}
                          className="text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00]"
                          title="إعادة النظر"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      {(product.isRejected ?? false) && onResubmit && (
                        <button
                          onClick={() => onResubmit(product._id)}
                          className="text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00]"
                          title="إعادة تقديم"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // List/Table view
  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex justify-end mb-4">
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('list')}
              className="px-3 py-1.5 rounded-md transition-colors bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm"
            >
              <List className="w-4 h-4 inline ml-1" />
              قائمة
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className="px-3 py-1.5 rounded-md transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
            >
              <LayoutGrid className="w-4 h-4 inline ml-1" />
              شبكة
            </button>
          </div>
        </div>
      )}

      {/* Table View - Google Sheets style */}
      <div className="card overflow-hidden p-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 border-b-2 border-gray-300 dark:border-slate-600">
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  الصورة
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600 min-w-[200px]">
                  اسم المنتج
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600 min-w-[150px]">
                  المورد
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  حالة المنتج
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  المخزون
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  سعر المورد
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  السعر للمسوق
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider border-r border-gray-300 dark:border-slate-600">
                  ربح الإدارة
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {products.map((product, index) => {
                const marketerProfit = calculateMarketerProfit(product.marketerPrice, product.minimumSellingPrice);
                const adminProfit = calculateAdminProfit(product.supplierPrice, product.marketerPrice);

                return (
                  <tr
                    key={product._id}
                    className={`hover:bg-blue-50 dark:hover:bg-slate-800/70 transition-colors border-b border-gray-200 dark:border-slate-700 ${
                      index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/30 dark:bg-slate-800/30'
                    }`}
                  >
                    {/* Image */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className="w-16 h-16 rounded border border-gray-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
                        <MediaThumbnail
                          media={product.images || []}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          showTypeBadge={false}
                          width={64}
                          height={64}
                          priority={index < 10}
                          fallbackIcon={<Package className="w-8 h-8 text-gray-400 dark:text-slate-500" />}
                        />
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-slate-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100 max-w-xs">
                        {product.name}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className="text-sm text-gray-900 dark:text-slate-100">
                        {product.supplierName || 'غير محدد'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      {getStatusBadge(product)}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className="text-sm">
                        {getStockStatus(product)}
                      </div>
                    </td>

                    {/* Supplier Price */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {(product.supplierPrice ?? 0).toFixed(2)} ₪
                      </div>
                      {product.supplierPrice && product.marketerPrice && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ربح الإدارة: {((product.marketerPrice - product.supplierPrice) / product.supplierPrice * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>

                    {/* Marketer Price with Profit */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className={`text-sm font-bold ${
                        product.isMinimumPriceMandatory && product.minimumSellingPrice
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-900 dark:text-slate-100'
                      }`}>
                        {(product.marketerPrice ?? 0).toFixed(2)} ₪
                      </div>
                      {product.minimumSellingPrice && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          السعر الأدنى: {(product.minimumSellingPrice ?? 0).toFixed(2)} ₪
                        </div>
                      )}
                      <div className={`text-xs font-semibold mt-1 pt-1 border-t-2 ${
                        product.isMinimumPriceMandatory && product.minimumSellingPrice
                          ? 'text-blue-600 dark:text-blue-400 border-blue-400 dark:border-blue-600'
                          : 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
                      }`}>
                        ربح المسوق: {marketerProfit.toFixed(2)} ₪
                      </div>
                    </td>

                    {/* Admin Profit */}
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-200 dark:border-slate-700">
                      <div className="text-sm font-bold text-primary-700 dark:text-primary-300">
                        {adminProfit.toFixed(2)} ₪
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Link
                          href={`/dashboard/products/${product._id}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="عرض المنتج"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/products/${product._id}/edit`}
                          className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/admin/product-stats?productId=${product._id}`}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                          title="إحصائيات"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        {!product.isApproved && !(product.isRejected ?? false) && onApprove && (
                          <button
                            onClick={() => onApprove(product._id)}
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            title="قبول"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {!product.isApproved && !(product.isRejected ?? false) && onReject && (
                          <button
                            onClick={() => onReject(product._id)}
                            className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                            title="رفض"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {product.isApproved && onReview && (
                          <button
                            onClick={() => onReview(product._id)}
                            className="text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00]"
                            title="إعادة النظر"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {(product.isRejected ?? false) && onResubmit && (
                          <button
                            onClick={() => onResubmit(product._id)}
                            className="text-[#FF9800] dark:text-[#FF9800] hover:text-[#F57C00] dark:hover:text-[#F57C00]"
                            title="إعادة تقديم"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default AdminProductsTableView;

