import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Product from '@/models/Product';
import connectDB from '@/lib/database';
import { productCache, generateCacheKey } from '@/lib/cache';
import { logger, logProductApproval } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

async function approveProductHandler(
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    logger.apiRequest('PUT', '/api/products/[id]/approve', { userId: user._id, userRole: user.role });

    // Check if user is admin
    if (user.role !== 'admin') {
      logger.warn('Role check failed - user is not admin', { userRole: user.role, userId: user._id });
      return NextResponse.json({ message: 'غير مصرح' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ message: 'معرف المنتج مطلوب' }, { status: 400 });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'المنتج غير موجود' }, { status: 404 });
    }

    // Update product approval status
    const updateData: any = {
      isApproved: true,
      isRejected: false,
      rejectionReason: null,
      approvedAt: new Date(),
      approvedBy: user._id,
      adminNotes: `تمت الموافقة بواسطة ${user.name} في ${new Date().toLocaleString('en-US')}`
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
            title: 'تمت الموافقة على المنتج',
            message: `تمت الموافقة على منتجك "${updatedProduct.name}" من قبل الإدارة`,
            type: 'success',
            actionUrl: `/dashboard/products/${updatedProduct._id}`,
            metadata: { 
              productId: updatedProduct._id.toString(),
              productName: updatedProduct.name,
              adminName: user.name,
              approvedAt: new Date().toISOString()
            }
          },
          {
            sendEmail: true, // Always send email for important product approval notifications
            sendSocket: true
          }
        );
        
        logger.info('Notification sent to supplier for approved product', {
          productId: updatedProduct._id.toString(),
          productName: updatedProduct.name,
          supplierId: supplierIdStr,
          supplierIsOnline,
          emailSent: true
        });
      } catch (error) {
        logger.error('Error sending notification to supplier', error, {
          productId: updatedProduct._id.toString()
        });
        // Don't fail the approval if notification fails
      }
    }

    logProductApproval(updatedProduct._id.toString(), user._id.toString());
    logger.apiResponse('PUT', '/api/products/[id]/approve', 200);

    return NextResponse.json({
      message: 'تمت الموافقة على المنتج بنجاح',
      product: updatedProduct
    });

  } catch (error) {
    logger.error('Error approving product', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء الموافقة على المنتج');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      logger.warn('Authentication failed - no user found', { path: '/api/products/[id]/approve' });
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    return await approveProductHandler(request, user, { params });
  } catch (error) {
    logger.error('Error in approval route', error);
    return handleApiError(error, 'حدث خطأ أثناء الموافقة على المنتج');
  }
}

