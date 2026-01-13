import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Product from '@/models/Product';
import connectDB from '@/lib/database';
import { productCache, generateCacheKey } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

async function rejectProductHandler(
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    logger.apiRequest('PUT', '/api/products/[id]/reject', { userId: user._id, userRole: user.role });

    // Check if user is admin
    if (user.role !== 'admin') {
      logger.warn('Role check failed - user is not admin', { userRole: user.role, userId: user._id });
      return NextResponse.json({ message: 'غير مصرح' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ message: 'معرف المنتج مطلوب' }, { status: 400 });
    }

    // Get rejection reason from request body
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json({ message: 'سبب الرفض مطلوب' }, { status: 400 });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'المنتج غير موجود' }, { status: 404 });
    }

    // Update product rejection status
    const updateData: any = {
      isApproved: false,
      isRejected: true,
      rejectionReason: rejectionReason.trim(),
      rejectedAt: new Date(),
      rejectedBy: user._id,
      adminNotes: `تم رفض المنتج بواسطة ${user.name} في ${new Date().toLocaleString('en-US')}. السبب: ${rejectionReason.trim()}`
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('supplierId', 'name companyName');

    // Invalidate cache
    productCache.delete(generateCacheKey('product', id, 'admin'));
    productCache.clearPattern('products');
    // Invalidate stats cache
    const { statsCache } = require('@/lib/cache');
    statsCache.clear();

    // Send notification to supplier
    if (updatedProduct.supplierId) {
      try {
        const supplierId = (updatedProduct.supplierId as any)._id || updatedProduct.supplierId;
        const supplierIdStr = supplierId.toString();
        
        // Check if supplier is online
        const supplierIsOnline = await isUserOnline(supplierIdStr);
        
        // Send notification via unified system (Database + Socket.io + Email)
        await sendNotificationToUser(
          supplierIdStr,
          {
            title: 'تم رفض المنتج',
            message: `تم رفض منتجك "${updatedProduct.name}" من قبل الإدارة. السبب: ${rejectionReason.trim()}`,
            type: 'error',
            actionUrl: `/dashboard/products/${updatedProduct._id}`,
            metadata: { 
              productId: updatedProduct._id.toString(),
              productName: updatedProduct.name,
              adminName: user.name,
              rejectionReason: rejectionReason.trim(),
              rejectedAt: new Date().toISOString()
            }
          },
          {
            sendEmail: true, // Always send email for important product rejection notifications
            sendSocket: true
          }
        );
        
        logger.info('Notification sent to supplier for rejected product', {
          productId: updatedProduct._id.toString(),
          productName: updatedProduct.name,
          supplierId: supplierIdStr,
          supplierIsOnline,
          emailSent: true,
          rejectionReason: rejectionReason.trim()
        });
      } catch (error) {
        logger.error('Error sending notification to supplier', error, {
          productId: updatedProduct._id.toString()
        });
        // Don't fail the rejection if notification fails
      }
    }

    logger.business('Product rejected', {
      productId: updatedProduct._id.toString(),
      rejectedBy: user._id.toString(),
      rejectionReason
    });
    logger.apiResponse('PUT', '/api/products/[id]/reject', 200);

    return NextResponse.json({
      message: 'تم رفض المنتج بنجاح',
      product: updatedProduct
    });

  } catch (error) {
    logger.error('Error rejecting product', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء رفض المنتج');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      logger.warn('Authentication failed - no user found', { path: '/api/products/[id]/reject' });
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    return await rejectProductHandler(request, user, { params });
  } catch (error) {
    logger.error('Error in rejection route', error);
    return handleApiError(error, 'حدث خطأ أثناء رفض المنتج');
  }
}

