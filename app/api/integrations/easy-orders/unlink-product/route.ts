import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import { isProductExportedToIntegration } from '@/lib/integrations/easy-orders/product-exports';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

/**
 * POST /api/integrations/easy-orders/unlink-product
 * إلغاء ربط المنتج بـ Easy Orders (مثلاً بعد حذف المستخدم للمنتج من حسابه على Easy Orders).
 * يمسح metadata التصدير في المنتج فيرجع زر "تصدير" للظهور.
 */
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بهذه العملية' },
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

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // المسوق/تاجر الجملة يصدّر منتجات الموردين؛ التأكد أن المنتج معتمد (لا نتحقق من ملكية المنتج)
    if (!product.isApproved) {
      return NextResponse.json(
        { error: 'المنتج غير معتمد' },
        { status: 400 }
      );
    }

    if (!isProductExportedToIntegration(product, integrationId)) {
      return NextResponse.json({
        success: true,
        message: 'المنتج غير مرتبط مسبقاً بهذا التكامل'
      });
    }

    (product as any).metadata = (product as any).metadata || {};
    const meta = (product as any).metadata;
    const exportsArray = Array.isArray(meta.easyOrdersExports) ? meta.easyOrdersExports : [];
    const newExports = exportsArray.filter((e: any) => String(e?.integrationId) !== String(integrationId));
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

    logger.business('Product unlinked from EasyOrders', {
      productId,
      integrationId,
      userId: user._id
    });

    return NextResponse.json({
      success: true,
      message: 'تم إلغاء ربط المنتج بـ Easy Orders. يمكنك تصديره مرة أخرى.'
    });
  } catch (error) {
    logger.error('Error unlinking product from EasyOrders', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في إلغاء الربط');
  }
});
