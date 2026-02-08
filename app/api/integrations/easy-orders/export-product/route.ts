import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { convertProductToEasyOrders, sendProductToEasyOrders } from '@/lib/integrations/easy-orders/product-converter';
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

    // Build category mapping if needed
    const categoryMapping = new Map<string, string>();
    // TODO: Implement category mapping logic if categories need to be synced

    // Convert product to EasyOrders format
    const easyOrdersProduct = await convertProductToEasyOrders(
      product,
      integration,
      {
        includeVariations: true,
        categoryMapping
      }
    );

    // Check if product already exists in EasyOrders (by checking metadata)
    const existingEasyOrdersProductId = (product as any).metadata?.easyOrdersProductId;

    // Send to EasyOrders
    const result = await sendProductToEasyOrders(
      easyOrdersProduct,
      integration.apiKey,
      existingEasyOrdersProductId
    );

    if (!result.success) {
      logger.error('Failed to export product to EasyOrders', {
        productId,
        integrationId,
        error: result.error
      });

      // Update integration status
      await integration.updateStatus(
        require('@/models/StoreIntegration').IntegrationStatus.ERROR,
        result.error || 'فشل تصدير المنتج'
      );

      return NextResponse.json(
        { error: result.error || 'فشل في تصدير المنتج' },
        { status: 500 }
      );
    }

    // Save EasyOrders product ID in product metadata
    if (result.productId) {
      (product as any).metadata = (product as any).metadata || {};
      (product as any).metadata.easyOrdersProductId = result.productId;
      (product as any).metadata.easyOrdersStoreId = integration.storeId;
      (product as any).metadata.easyOrdersIntegrationId = String(integration._id);
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


