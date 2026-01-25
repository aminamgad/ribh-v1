import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Package from '@/models/Package';
import ExternalCompany from '@/models/ExternalCompany';
import { callExternalShippingCompanyAPI } from '@/lib/order-to-package';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

/**
 * POST /api/orders/[id]/resend-package
 * Resend a package to shipping company API
 * Admin only
 */
async function resendPackageHandler(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const orderId = routeParams.params.id;

  try {
    await requireAdmin(user);
    await connectDB();

    // Get order
    const order = await Order.findById(orderId).lean() as any;
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Check if package exists
    const existingPackage = await Package.findOne({ orderId: order._id }).lean() as any;
    if (!existingPackage) {
      return NextResponse.json(
        { success: false, message: 'لا يوجد طرد لهذا الطلب. يرجى إنشاء طرد أولاً.' },
        { status: 400 }
      );
    }

    // Get external company
    let externalCompany = null;
    if (order.shippingCompany) {
      externalCompany = await ExternalCompany.findOne({
        companyName: order.shippingCompany,
        isActive: true
      }).lean() as any;
    }

    if (!externalCompany) {
      // Try default company
      const SystemSettings = (await import('@/models/SystemSettings')).default;
      const settings = await SystemSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
      if (settings?.defaultExternalCompanyId) {
        externalCompany = await ExternalCompany.findById(settings.defaultExternalCompanyId).lean() as any;
      }
    }

    if (!externalCompany || !externalCompany.apiEndpointUrl || !externalCompany.apiToken) {
      return NextResponse.json(
        { success: false, message: 'شركة الشحن غير متاحة أو غير مكونة بشكل صحيح' },
        { status: 400 }
      );
    }

    // Prepare package data
    const shippingAddress = order.shippingAddress || {};
    const orderNumber = order.orderNumber || 'غير محدد';
    const itemsDescription = (order.items || [])
      .map((item: any) => `${item.productName || item.name || 'منتج'} x${item.quantity || 1}`)
      .join(', ');
    const description = `طلب رقم ${orderNumber}: ${itemsDescription}`;
    const packageType = 'normal';
    const barcode = `ربح - ribh | ${orderNumber} | ${shippingAddress.fullName || 'غير محدد'}`;

    const packageData = {
      to_name: shippingAddress.fullName || 'غير محدد',
      to_phone: shippingAddress.phone || '',
      alter_phone: shippingAddress.phone || '',
      description: description,
      package_type: packageType,
      village_id: (existingPackage.villageId || shippingAddress.villageId || '').toString(),
      street: shippingAddress.street || '',
      total_cost: (order.total || 0).toString(),
      note: order.deliveryNotes || shippingAddress.notes || `طلب رقم ${orderNumber}`,
      barcode: barcode
    };

    // Call external API
    logger.info('🔄 Resending package to shipping company API', {
      orderId: order._id.toString(),
      orderNumber: orderNumber,
      packageId: existingPackage.packageId,
      companyName: externalCompany.companyName,
      apiEndpoint: externalCompany.apiEndpointUrl
    });

    const apiResponse = await callExternalShippingCompanyAPI(
      externalCompany.apiEndpointUrl,
      externalCompany.apiToken,
      packageData
    );

    if (apiResponse.success) {
      // Update package status to 'confirmed'
      await Package.findByIdAndUpdate(existingPackage._id, {
        status: 'confirmed'
      });

      logger.business('✅ PACKAGE RESENT TO SHIPPING COMPANY API - Package resent successfully', {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        packageId: existingPackage.packageId,
        externalPackageId: apiResponse.packageId,
        externalCompanyName: externalCompany.companyName,
        apiEndpoint: externalCompany.apiEndpointUrl,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'تم إعادة إرسال الطرد بنجاح',
        packageId: existingPackage.packageId,
        status: 'confirmed'
      });
    } else {
      // Keep package status as 'pending'
      logger.warn('⚠️ FAILED TO RESEND PACKAGE TO SHIPPING COMPANY API', {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
        packageId: existingPackage.packageId,
        externalCompanyName: externalCompany.companyName,
        apiEndpoint: externalCompany.apiEndpointUrl,
        error: apiResponse.error,
        timestamp: new Date().toISOString()
      });

      // Provide more user-friendly error message
      let userMessage = apiResponse.error || 'خطأ غير معروف';
      
      // Check if error message indicates server unavailability
      if (userMessage.includes('503') || userMessage.includes('Service Unavailable')) {
        userMessage = 'خادم شركة الشحن غير متاح مؤقتاً. يرجى المحاولة مرة أخرى بعد قليل.';
      } else if (userMessage.includes('502') || userMessage.includes('504') || userMessage.includes('Gateway')) {
        userMessage = 'خطأ في خادم شركة الشحن. يرجى المحاولة مرة أخرى لاحقاً.';
      }
      
      // Determine if error is retryable based on error message
      const isRetryable = userMessage.includes('غير متاح مؤقتاً') || userMessage.includes('خطأ في خادم');
      
      return NextResponse.json({
        success: false,
        message: `فشل إعادة الإرسال: ${userMessage}`,
        packageId: existingPackage.packageId,
        status: 'pending',
        error: apiResponse.error,
        canRetry: isRetryable
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error resending package to shipping company', error, {
      orderId: orderId
    });
    return handleApiError(error, 'حدث خطأ أثناء إعادة إرسال الطرد');
  }
}

export const POST = withAuth(resendPackageHandler);

