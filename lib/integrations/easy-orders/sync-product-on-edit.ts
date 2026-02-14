/**
 * مزامنة تلقائية لمنتج مُصدَّر إلى Easy Orders عند تعديله في ربح.
 * يُستدعى في الخلفية بعد نجاح PUT /api/products/[id].
 */

import connectDB from '@/lib/database';
import Product from '@/models/Product';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { convertProductToEasyOrders, sendProductToEasyOrders } from '@/lib/integrations/easy-orders/product-converter';
import { logger } from '@/lib/logger';

export interface SyncProductOnEditResult {
  success: boolean;
  error?: string;
}

/**
 * مزامنة منتج واحد مع Easy Orders بعد تعديله (PATCH على Easy Orders).
 * لا يرمي أخطاء — يُسجّل الفشل في الـ logger فقط.
 */
export async function syncProductToEasyOrdersOnEdit(productId: string): Promise<SyncProductOnEditResult> {
  try {
    await connectDB();

    const product = await Product.findById(productId).populate('categoryId', 'name slug').lean();
    if (!product) {
      logger.warn('syncProductToEasyOrdersOnEdit: product not found', { productId });
      return { success: false, error: 'المنتج غير موجود' };
    }

    const meta = (product as any).metadata;
    const easyOrdersProductId = meta?.easyOrdersProductId;
    const integrationId = meta?.easyOrdersIntegrationId;

    if (!easyOrdersProductId || !integrationId) {
      return { success: true };
    }

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
      return { success: false, error: 'التكامل غير موجود أو غير نشط' };
    }

    const existingSlug = meta?.easyOrdersSlug;
    const omitSlugForUpdate = !existingSlug;

    const categoryMapping = new Map<string, string>();
    const productData = await convertProductToEasyOrders(
      product,
      integration,
      { includeVariations: true, categoryMapping, existingSlug, omitSlugForUpdate }
    );

    const result = await sendProductToEasyOrders(
      productData,
      (integration as any).apiKey,
      easyOrdersProductId
    );

    if (!result.success) {
      logger.warn('syncProductToEasyOrdersOnEdit: Easy Orders PATCH failed', {
        productId,
        easyOrdersProductId,
        error: result.error,
        statusCode: result.statusCode
      });
      return { success: false, error: result.error || 'فشل التحديث على Easy Orders' };
    }

    if (result.productId && productData?.slug) {
      await Product.updateOne(
        { _id: productId },
        { $set: { 'metadata.easyOrdersSlug': productData.slug } }
      ).catch(() => {});
    }

    logger.business('Product synced to Easy Orders on edit', {
      productId,
      easyOrdersProductId: result.productId
    });

    return { success: true };
  } catch (err: any) {
    logger.error('syncProductToEasyOrdersOnEdit failed', err, { productId });
    return { success: false, error: err?.message || 'حدث خطأ في المزامنة' };
  }
}
