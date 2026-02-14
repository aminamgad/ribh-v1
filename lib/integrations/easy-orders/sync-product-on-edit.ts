/**
 * مزامنة تلقائية لمنتج مُصدَّر إلى Easy Orders عند تعديله في ربح.
 * يُستدعى في الخلفية بعد نجاح PUT /api/products/[id].
 * يزامن إلى جميع التكاملات التي صُدّر لها المنتج (عدة مسوقين).
 */

import connectDB from '@/lib/database';
import Product from '@/models/Product';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { convertProductToEasyOrders, sendProductToEasyOrders } from '@/lib/integrations/easy-orders/product-converter';
import { getProductEasyOrdersExports } from '@/lib/integrations/easy-orders/product-exports';
import { logger } from '@/lib/logger';

const DELAY_BETWEEN_SYNCS_MS = 200;

export interface SyncProductOnEditResult {
  success: boolean;
  synced: number;
  failed: number;
  error?: string;
}

/**
 * مزامنة منتج واحد مع Easy Orders بعد تعديله — لجميع التكاملات المُصدَّر لها.
 * يُستدعى في الخلفية ولا يرمي أخطاء — يُسجّل الفشل في الـ logger فقط.
 */
export async function syncProductToEasyOrdersOnEdit(productId: string): Promise<SyncProductOnEditResult> {
  const result: SyncProductOnEditResult = { success: true, synced: 0, failed: 0 };

  logger.info('syncProductToEasyOrdersOnEdit: start', { productId });

  try {
    await connectDB();

    const product = await Product.findById(productId).populate('categoryId', 'name slug').lean();
    if (!product) {
      logger.warn('syncProductToEasyOrdersOnEdit: product not found', { productId });
      return { ...result, success: false, error: 'المنتج غير موجود' };
    }

    const meta = (product as any).metadata;
    const exports = getProductEasyOrdersExports(product);

    logger.info('syncProductToEasyOrdersOnEdit: product loaded', {
      productId,
      hasMetadata: !!meta,
      metadataKeys: meta ? Object.keys(meta) : [],
      exportsCount: exports.length,
      exportsSummary: exports.map((e) => ({ integrationId: e.integrationId, easyOrdersProductId: e.easyOrdersProductId }))
    });

    if (exports.length === 0) {
      logger.info('syncProductToEasyOrdersOnEdit: no exports to sync', { productId });
      return result;
    }

    const easyOrdersExports = Array.isArray(meta?.easyOrdersExports) ? [...meta.easyOrdersExports] : [];

    for (let i = 0; i < exports.length; i++) {
      const exp = exports[i];
      const integrationId = exp.integrationId;
      const easyOrdersProductId = exp.easyOrdersProductId;

      logger.info('syncProductToEasyOrdersOnEdit: syncing to integration', {
        productId,
        integrationId,
        easyOrdersProductId,
        index: i + 1,
        total: exports.length
      });

      const integration = await StoreIntegration.findOne({
        _id: integrationId,
        type: IntegrationType.EASY_ORDERS,
        isActive: true,
        apiKey: { $exists: true, $ne: '' }
      }).lean();

      if (!integration) {
        logger.warn('syncProductToEasyOrdersOnEdit: integration not found or inactive', {
          productId,
          integrationId
        });
        result.failed++;
        continue;
      }

      const existingSlug = exp.slug;
      const omitSlugForUpdate = !existingSlug;
      const categoryMapping = new Map<string, string>();

      try {
        const productData = await convertProductToEasyOrders(
          product,
          integration,
          { includeVariations: true, categoryMapping, existingSlug, omitSlugForUpdate }
        );

        const syncResult = await sendProductToEasyOrders(
          productData,
          (integration as any).apiKey,
          easyOrdersProductId
        );

        logger.info('syncProductToEasyOrdersOnEdit: Easy Orders API result', {
          productId,
          integrationId,
          easyOrdersProductId,
          success: syncResult.success,
          error: syncResult.error,
          statusCode: syncResult.statusCode
        });

        if (syncResult.success && productData?.slug) {
          // تحديث slug في التنسيق الجديد (مصفوفة) أو القديم
          const exportEntry = easyOrdersExports.find(
            (e: any) => String(e?.integrationId) === String(integrationId)
          );
          if (exportEntry) {
            exportEntry.slug = productData.slug;
          } else {
            // التنسيق القديم: تحديث metadata مباشرة
            await Product.updateOne(
              { _id: productId },
              { $set: { 'metadata.easyOrdersSlug': productData.slug } }
            ).catch(() => {});
          }
          result.synced++;
        } else {
          logger.warn('syncProductToEasyOrdersOnEdit: Easy Orders PATCH failed', {
            productId,
            integrationId,
            easyOrdersProductId,
            error: syncResult.error
          });
          result.failed++;
        }
      } catch (err: any) {
        logger.error('syncProductToEasyOrdersOnEdit: sync error for integration', err, {
          productId,
          integrationId
        });
        result.failed++;
      }

      if (i < exports.length - 1 && DELAY_BETWEEN_SYNCS_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SYNCS_MS));
      }
    }

    if (result.synced > 0 && easyOrdersExports.length > 0) {
      await Product.updateOne(
        { _id: productId },
        { $set: { 'metadata.easyOrdersExports': easyOrdersExports } }
      ).catch(() => {});
    }

    if (result.synced > 0) {
      logger.business('Product synced to Easy Orders on edit', {
        productId,
        syncedCount: result.synced,
        failedCount: result.failed
      });
    }

    return result;
  } catch (err: any) {
    logger.error('syncProductToEasyOrdersOnEdit failed', err, {
      productId,
      message: err?.message,
      stack: err?.stack
    });
    return {
      ...result,
      success: false,
      error: err?.message || 'حدث خطأ في المزامنة'
    };
  } finally {
    logger.info('syncProductToEasyOrdersOnEdit: end', {
      productId,
      synced: result.synced,
      failed: result.failed
    });
  }
}
