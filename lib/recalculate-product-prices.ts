/**
 * إعادة حساب أسعار المسوق لجميع المنتجات بناءً على نسبة ربح الإدارة الحالية.
 * يُستدعى عند تغيير إعدادات نسبة ربح الإدارة أو يدوياً من واجهة الأدمن.
 */

import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { settingsManager } from '@/lib/settings-manager';
import { productCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

export interface RecalculateResult {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

export type RecalculateProgressCallback = (processed: number, total: number) => void | Promise<void>;

export interface RecalculateOptions {
  onProgress?: RecalculateProgressCallback;
}

export async function recalculateAllProductPrices(options?: RecalculateOptions): Promise<RecalculateResult> {
  await connectDB();

  const products = await Product.find({}).lean();
  const total = products.length;
  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let processed = 0;
  const onProgress = options?.onProgress;

  if (onProgress && total >= 0) {
    await Promise.resolve(onProgress(0, total));
  }

  for (const product of products) {
    processed++;
    try {
      const p = product as any;
      if (p.isMarketerPriceManuallyAdjusted === true) {
        skippedCount++;
        continue;
      }

      const currentSupplierPrice = p.supplierPrice;
      const currentMarketerPrice = p.marketerPrice;

      if ((!currentSupplierPrice || currentSupplierPrice <= 0) && currentMarketerPrice && currentMarketerPrice > 0) {
        const calculatedSupplierPrice = await settingsManager.calculateSupplierPriceFromMarketerPrice(currentMarketerPrice);
        await Product.findByIdAndUpdate(
          product._id,
          { supplierPrice: calculatedSupplierPrice },
          { runValidators: false }
        );
        updatedCount++;
        continue;
      }

      if (!currentSupplierPrice || currentSupplierPrice <= 0) {
        continue;
      }

      const newMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(currentSupplierPrice);

      if (Math.abs(newMarketerPrice - (currentMarketerPrice || 0)) > 0.01) {
        await Product.findByIdAndUpdate(
          product._id,
          { marketerPrice: newMarketerPrice },
          { runValidators: false }
        );
      }

      if (p.hasVariants && p.variantOptions?.length) {
        const updatedVariantOptions = await Promise.all(
          (p.variantOptions || []).map(async (option: any) => {
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
    } catch (error) {
      errorCount++;
      logger.error('Error recalculating price for product', error, {
        productId: (product as any)._id,
        productName: (product as any).name
      });
    }
    if (onProgress && processed % 5 === 0) {
      await Promise.resolve(onProgress(processed, total));
    }
  }
  if (onProgress && processed > 0) {
    await Promise.resolve(onProgress(processed, total));
  }

  productCache.clearPattern('products');
  productCache.clearPattern('product');

  logger.business('Product prices recalculated', {
    totalProducts: products.length,
    updatedCount,
    skippedCount,
    errorCount
  });

  return {
    total: products.length,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorCount
  };
}
