import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Package from '@/models/Package';
import { createPackageFromOrder } from '@/lib/order-to-package';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

/**
 * POST /api/orders/[id]/create-package
 * Manually create a package from an order
 * Admin only
 */
async function createPackageHandler(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const orderId = routeParams.params.id;

  try {
    await connectDB();

    // Check if order exists
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Check if package already exists
    const existingPackage = await Package.findOne({ orderId: (order as any)._id }).lean();
    if (existingPackage) {
      return NextResponse.json(
        {
          success: true,
          packageId: (existingPackage as any).packageId,
          message: 'Package موجود مسبقاً لهذا الطلب',
          alreadyExists: true
        },
        { status: 200 }
      );
    }

    // Validate order has required data
    const shippingAddress = (order as any).shippingAddress;
    if (!shippingAddress || !shippingAddress.villageId) {
      return NextResponse.json(
        {
          success: false,
          message: 'الطلب لا يحتوي على معلومات الشحن الكافية. يرجى التأكد من وجود villageId في shippingAddress.'
        },
        { status: 400 }
      );
    }

    // Create package
    const packageResult = await createPackageFromOrder(orderId);

    if (!packageResult || !packageResult.packageId) {
      return NextResponse.json(
        {
          success: false,
          message: 'فشل إنشاء Package. يرجى التحقق من وجود شركة شحن نشطة وإعدادات النظام.'
        },
        { status: 500 }
      );
    }

    logger.business('Package created manually from order', {
      orderId: orderId,
      orderNumber: (order as any).orderNumber,
      packageId: packageResult.packageId,
      apiSuccess: packageResult.apiSuccess,
      createdBy: user._id.toString()
    });

    return NextResponse.json({
      success: true,
      packageId: packageResult.packageId,
      apiSuccess: packageResult.apiSuccess,
      message: packageResult.apiSuccess 
        ? 'تم إنشاء Package بنجاح وإرساله إلى شركة الشحن' 
        : 'تم إنشاء Package لكن فشل إرساله إلى شركة الشحن',
      error: packageResult.error,
      orderId: orderId,
      orderNumber: (order as any).orderNumber
    });

  } catch (error) {
    logger.error('Error creating package from order manually', error, {
      orderId: orderId,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء إنشاء Package');
  }
}

export const POST = withAuth(requireAdmin(createPackageHandler));

