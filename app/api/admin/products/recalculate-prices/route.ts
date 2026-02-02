import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { settingsManager } from '@/lib/settings-manager';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/admin/products/recalculate-prices - Recalculate marketerPrice for all products
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    logger.apiRequest('POST', '/api/admin/products/recalculate-prices', { userId: user._id });
    
    // Get all products
    const products = await Product.find({}).lean();
    logger.debug('Recalculating prices for products', { count: products.length });
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Recalculate prices for each product
    for (const product of products) {
      try {
        const currentSupplierPrice = (product as any).supplierPrice;
        const currentMarketerPrice = (product as any).marketerPrice;
        
        // If supplierPrice is missing or zero, calculate it from marketerPrice
        if ((!currentSupplierPrice || currentSupplierPrice <= 0) && currentMarketerPrice && currentMarketerPrice > 0) {
          const calculatedSupplierPrice = await settingsManager.calculateSupplierPriceFromMarketerPrice(currentMarketerPrice);
          
          // Update supplierPrice in database
          await Product.findByIdAndUpdate(
            product._id,
            { supplierPrice: calculatedSupplierPrice },
            { runValidators: false }
          );
          
          logger.debug('Updated supplierPrice from marketerPrice', {
            productId: product._id,
            productName: (product as any).name,
            marketerPrice: currentMarketerPrice,
            calculatedSupplierPrice
          });
          
          updatedCount++;
          continue;
        }
        
        // Skip if supplierPrice is not set or invalid
        if (!currentSupplierPrice || currentSupplierPrice <= 0) {
          logger.warn('Skipping product with invalid supplierPrice', {
            productId: product._id,
            productName: (product as any).name,
            supplierPrice: currentSupplierPrice
          });
          continue;
        }
        
        // Calculate new marketerPrice from supplierPrice
        const newMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(currentSupplierPrice);
        
        // Only update if marketerPrice changed significantly (more than 0.01 difference)
        if (Math.abs(newMarketerPrice - (currentMarketerPrice || 0)) > 0.01) {
          // Update product
          await Product.findByIdAndUpdate(
            product._id,
            { marketerPrice: newMarketerPrice },
            { runValidators: false } // Skip validation to avoid issues with existing data
          );
        }
        
        // Also update variant option prices if product has variants
        if ((product as any).hasVariants && (product as any).variantOptions) {
          const updatedVariantOptions = await Promise.all(
            ((product as any).variantOptions || []).map(async (option: any) => {
              if (option.price && option.price > 0) {
                const variantMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(currentSupplierPrice);
                return { ...option, price: variantMarketerPrice };
              }
              return option;
            })
          );
          
          await Product.findByIdAndUpdate(
            product._id,
            { variantOptions: updatedVariantOptions },
            { runValidators: false }
          );
        }
        
        updatedCount++;
        
        logger.debug('Product price recalculated', {
          productId: product._id,
          productName: (product as any).name,
          supplierPrice: currentSupplierPrice,
          oldMarketerPrice: currentMarketerPrice,
          newMarketerPrice
        });
      } catch (error) {
        errorCount++;
        logger.error('Error recalculating price for product', error, {
          productId: product._id,
          productName: (product as any).name
        });
      }
    }
    
    // Clear product cache
    const { productCache } = require('@/lib/cache');
    productCache.clearPattern('products');
    productCache.clearPattern('product');
    
    logger.business('Product prices recalculated', {
      userId: user._id,
      totalProducts: products.length,
      updatedCount,
      errorCount
    });
    
    return NextResponse.json({
      success: true,
      message: `تم إعادة حساب أسعار ${updatedCount} منتج بنجاح`,
      stats: {
        total: products.length,
        updated: updatedCount,
        errors: errorCount
      }
    });
  } catch (error) {
    logger.error('Error recalculating product prices', error);
    return handleApiError(error, 'حدث خطأ أثناء إعادة حساب أسعار المنتجات');
  }
});

