import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { convertProductToEasyOrders, sendProductToEasyOrders } from '@/lib/integrations/easy-orders/product-converter';
import { getProductEasyOrdersExports } from '@/lib/integrations/easy-orders/product-exports';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/integrations/easy-orders/export-product - Export a single product to EasyOrders
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
    const { productId, integrationId } = body;

    if (!productId || !integrationId) {
      return NextResponse.json(
        { error: 'معرف المنتج والتكامل مطلوبان' },
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

    // Find the product
    const product = await Product.findById(productId)
      .populate('categoryId', 'name slug');

    if (!product) {
      return NextResponse.json(
        { error: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // Check if product is approved and active
    if (!product.isApproved || !product.isActive) {
      return NextResponse.json(
        { error: 'المنتج غير معتمد أو غير نشط' },
        { status: 400 }
      );
    }

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
      logger.warn('Product validation failed before export', {
        productId,
        errors: validationErrors
      });

      return NextResponse.json(
        { 
          error: 'فشل التحقق من المنتج',
          details: `Product validation failed: ${validationErrors.join(', ')}`,
          validationErrors
        },
        { status: 400 }
      );
    }

    const categoryMapping = new Map<string, string>();
    const exports = getProductEasyOrdersExports(product);
    const exportForThisIntegration = exports.find(
      (e) => String(e.integrationId) === String(integration._id)
    );
    let existingEasyOrdersProductId = exportForThisIntegration?.easyOrdersProductId ?? (product as any).metadata?.easyOrdersProductId;
    const existingSlug = exportForThisIntegration?.slug ?? (product as any).metadata?.easyOrdersSlug;
    const omitSlugForUpdate = !!existingEasyOrdersProductId && !existingSlug;

    let easyOrdersProduct = await convertProductToEasyOrders(
      product,
      integration,
      { includeVariations: true, categoryMapping, existingSlug, omitSlugForUpdate }
    );

    let result = await sendProductToEasyOrders(
      easyOrdersProduct,
      integration.apiKey,
      existingEasyOrdersProductId
    );

    if (!result.success && result.statusCode === 404 && existingEasyOrdersProductId) {
      logger.info('Product no longer exists on EasyOrders, unlinking and re-exporting as new', {
        productId,
        previousEasyOrdersId: existingEasyOrdersProductId
      });
      (product as any).metadata = (product as any).metadata || {};
      const meta = (product as any).metadata;
      const exportsArray = Array.isArray(meta.easyOrdersExports) ? meta.easyOrdersExports : [];
      const newExports = exportsArray.filter((e: any) => String(e?.integrationId) !== String(integration._id));
      if (newExports.length > 0) {
        meta.easyOrdersExports = newExports;
        const primary = newExports[0];
        meta.easyOrdersProductId = primary.easyOrdersProductId;
        meta.easyOrdersStoreId = primary.storeId;
        meta.easyOrdersIntegrationId = primary.integrationId;
        meta.easyOrdersSlug = primary.slug;
      } else {
        delete meta.easyOrdersProductId;
        delete meta.easyOrdersStoreId;
        delete meta.easyOrdersIntegrationId;
        delete meta.easyOrdersSlug;
        delete meta.easyOrdersExports;
        if (Object.keys(meta).length === 0) (product as any).metadata = undefined;
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
        { includeVariations: true, categoryMapping, existingSlug, extraSlugSuffix: String(Date.now()) }
      );
      result = await sendProductToEasyOrders(
        easyOrdersProduct,
        integration.apiKey,
        existingEasyOrdersProductId
      );
    }

    if (!result.success) {
      logger.error('Failed to export product to EasyOrders', {
        productId,
        integrationId,
        error: result.error,
        statusCode: result.statusCode
      });

      // تسجيل الخطأ فقط دون جعل التكامل غير نشط
      await integration.appendSyncError(result.error || 'فشل تصدير المنتج');

      const status = result.statusCode && result.statusCode >= 400 && result.statusCode < 500 ? result.statusCode : 500;
      return NextResponse.json(
        { error: result.error || 'فشل في تصدير المنتج' },
        { status }
      );
    }

    if (result.productId) {
      (product as any).metadata = (product as any).metadata || {};
      const meta = (product as any).metadata;
      const entry = {
        integrationId: String(integration._id),
        easyOrdersProductId: result.productId,
        storeId: integration.storeId,
        slug: easyOrdersProduct?.slug
      };
      let exportsArray = Array.isArray(meta.easyOrdersExports) ? meta.easyOrdersExports : [];
      if (meta.easyOrdersProductId && !meta.easyOrdersExports?.length) {
        // التنسيق القديم: ترحيل إلى مصفوفة
        exportsArray = [{
          integrationId: meta.easyOrdersIntegrationId || String(integration._id),
          easyOrdersProductId: meta.easyOrdersProductId,
          storeId: meta.easyOrdersStoreId,
          slug: meta.easyOrdersSlug
        }];
      }
      const idx = exportsArray.findIndex((e: any) => String(e?.integrationId) === String(integration._id));
      if (idx >= 0) exportsArray[idx] = { ...exportsArray[idx], ...entry };
      else exportsArray.push(entry);
      meta.easyOrdersExports = exportsArray;
      meta.easyOrdersProductId = result.productId;
      meta.easyOrdersStoreId = integration.storeId;
      meta.easyOrdersIntegrationId = String(integration._id);
      if (easyOrdersProduct?.slug) meta.easyOrdersSlug = easyOrdersProduct.slug;
      await product.save();
    }

    logger.business('Product exported to EasyOrders', {
      productId,
      integrationId,
      easyOrdersProductId: result.productId,
      userId: user._id
    });

    return NextResponse.json({
      success: true,
      message: existingEasyOrdersProductId ? 'تم تحديث المنتج بنجاح' : 'تم تصدير المنتج بنجاح',
      productId: result.productId
    });

  } catch (error) {
    logger.error('Error exporting product to EasyOrders', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في تصدير المنتج');
  }
});


