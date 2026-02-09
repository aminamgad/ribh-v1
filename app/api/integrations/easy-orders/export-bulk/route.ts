import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import { convertProductToEasyOrders, sendProductToEasyOrders } from '@/lib/integrations/easy-orders/product-converter';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Rate limit: 40 requests per minute
// We'll process products with delays to respect rate limit
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between requests (40 per minute = 1.5s each)

// POST /api/integrations/easy-orders/export-bulk - Export multiple products to EasyOrders
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can export products
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بتصدير المنتجات' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { productIds, integrationId } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'يجب تحديد منتجات للتصدير' },
        { status: 400 }
      );
    }

    if (!integrationId) {
      return NextResponse.json(
        { error: 'معرف التكامل مطلوب' },
        { status: 400 }
      );
    }

    // Limit batch size to respect rate limits
    const MAX_BATCH_SIZE = 20;
    if (productIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `يمكن تصدير ${MAX_BATCH_SIZE} منتج كحد أقصى في المرة الواحدة` },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the integration
    const integration = await StoreIntegration.findOne({
      _id: integrationId,
      userId: user._id,
      type: IntegrationType.EASY_ORDERS,
      isActive: true
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود أو غير نشط' },
        { status: 404 }
      );
    }

    if (!integration.apiKey) {
      return NextResponse.json(
        { error: 'مفتاح API غير موجود' },
        { status: 400 }
      );
    }

    // Find all products
    const products = await Product.find({
      _id: { $in: productIds },
      isApproved: true,
      isActive: true
    }).populate('categoryId', 'name slug');

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم العثور على منتجات معتمدة للتصدير' },
        { status: 404 }
      );
    }

    // Process products with rate limiting
    const results = {
      success: [] as string[],
      failed: [] as { productId: string; error: string }[],
      skipped: [] as string[]
    };

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        // Validate product before export
        const validationErrors: string[] = [];

        // Check supplierPrice
        if (!product.supplierPrice || product.supplierPrice <= 0) {
          validationErrors.push('سعر المورد مطلوب');
        }

        // Check images
        const images = Array.isArray(product.images) ? product.images : [];
        if (images.length === 0) {
          validationErrors.push('يجب أن يحتوي المنتج على صورة واحدة على الأقل');
        } else if (images.length > 10) {
          validationErrors.push('يجب ألا يزيد عدد الصور عن 10 صور');
        }

        if (validationErrors.length > 0) {
          results.skipped.push(product._id.toString());
          logger.warn('Product skipped due to validation errors', {
            productId: product._id,
            productName: product.name,
            errors: validationErrors
          });
          continue;
        }

        let existingEasyOrdersProductId = (product as any).metadata?.easyOrdersProductId;
        const existingSlug = (product as any).metadata?.easyOrdersSlug;
        const omitSlugForUpdate = !!existingEasyOrdersProductId && !existingSlug;

        let easyOrdersProduct = await convertProductToEasyOrders(
          product,
          integration,
          { includeVariations: true, categoryMapping: new Map(), existingSlug, omitSlugForUpdate }
        );

        let result = await sendProductToEasyOrders(
          easyOrdersProduct,
          integration.apiKey,
          existingEasyOrdersProductId
        );

        if (!result.success && result.statusCode === 404 && existingEasyOrdersProductId) {
          (product as any).metadata = (product as any).metadata || {};
          delete (product as any).metadata.easyOrdersProductId;
          delete (product as any).metadata.easyOrdersStoreId;
          delete (product as any).metadata.easyOrdersIntegrationId;
          delete (product as any).metadata.easyOrdersSlug;
          if (Object.keys((product as any).metadata).length === 0) {
            (product as any).metadata = undefined;
          }
          await product.save();
          existingEasyOrdersProductId = undefined;
          result = await sendProductToEasyOrders(
            easyOrdersProduct,
            integration.apiKey,
            undefined
          );
        }

        if (!result.success && (result as any).slugReserved) {
          easyOrdersProduct = await convertProductToEasyOrders(
            product,
            integration,
            { includeVariations: true, categoryMapping: new Map(), existingSlug, extraSlugSuffix: String(Date.now()) }
          );
          result = await sendProductToEasyOrders(
            easyOrdersProduct,
            integration.apiKey,
            existingEasyOrdersProductId
          );
        }

        if (result.success && result.productId) {
          (product as any).metadata = (product as any).metadata || {};
          (product as any).metadata.easyOrdersProductId = result.productId;
          (product as any).metadata.easyOrdersStoreId = integration.storeId;
          (product as any).metadata.easyOrdersIntegrationId = String(integration._id);
          if (easyOrdersProduct?.slug) {
            (product as any).metadata.easyOrdersSlug = easyOrdersProduct.slug;
          }
          await product.save();

          results.success.push(product._id.toString());
          logger.business('Product exported to EasyOrders (bulk)', {
            productId: product._id,
            easyOrdersProductId: result.productId
          });
        } else if (!result.success) {
          results.failed.push({
            productId: product._id.toString(),
            error: result.error || 'فشل التصدير'
          });
        }

        // Rate limiting: wait between requests (except for the last one)
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

      } catch (error: any) {
        logger.error('Error exporting product in bulk', error, {
          productId: product._id
        });
        
        results.failed.push({
          productId: product._id.toString(),
          error: error.message || 'حدث خطأ غير متوقع'
        });
      }
    }

    // تحديث الحالة: لا نجعل التكامل غير نشط عند الأخطاء، فقط نسجلها
    if (results.failed.length === 0 || results.success.length > 0) {
      await integration.updateStatus(IntegrationStatus.ACTIVE);
    }
    if (results.failed.length > 0) {
      await integration.appendSyncError(
        `فشل تصدير ${results.failed.length} منتج: ${results.failed.map(f => f.error).slice(0, 3).join('؛ ')}${results.failed.length > 3 ? '...' : ''}`
      );
    }

    logger.business('Bulk product export completed', {
      integrationId,
      total: products.length,
      success: results.success.length,
      failed: results.failed.length,
      userId: user._id
    });

    return NextResponse.json({
      success: true,
      message: `تم تصدير ${results.success.length} من ${products.length} منتج بنجاح`,
      results: {
        total: products.length,
        success: results.success.length,
        failedCount: results.failed.length,
        successIds: results.success,
        failed: results.failed
      }
    });

  } catch (error) {
    logger.error('Error in bulk product export', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في التصدير الجماعي');
  }
});


