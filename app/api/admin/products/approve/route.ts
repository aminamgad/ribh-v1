import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

const approvalSchema = z.object({
  productIds: z.array(z.string()).min(1, 'يجب اختيار منتج واحد على الأقل'),
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional()
});

// POST /api/admin/products/approve - Approve or reject products
async function approveProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = approvalSchema.parse(body);
    
    // Validate rejection reason if rejecting
    if (validatedData.action === 'reject' && !validatedData.rejectionReason) {
      return NextResponse.json(
        { success: false, message: 'يجب إضافة سبب الرفض' },
        { status: 400 }
      );
    }
    
    // Find products
    const products = await Product.find({
      _id: { $in: validatedData.productIds }
    });
    
    if (products.length !== validatedData.productIds.length) {
      return NextResponse.json(
        { success: false, message: 'بعض المنتجات غير موجودة' },
        { status: 404 }
      );
    }
    
    // Update products
    const updateData: any = {
      isApproved: validatedData.action === 'approve',
      isRejected: validatedData.action === 'reject',
      adminNotes: validatedData.adminNotes
    };
    
    logger.debug('Updating products', {
      action: validatedData.action,
      productIds: validatedData.productIds,
      adminId: user._id.toString()
    });
    
    if (validatedData.action === 'reject') {
      updateData.rejectionReason = validatedData.rejectionReason;
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = user._id;
      updateData.approvedAt = undefined;
      updateData.approvedBy = undefined;
      updateData.isApproved = false;
      updateData.isRejected = true;
    } else {
      updateData.approvedAt = new Date();
      updateData.approvedBy = user._id;
      updateData.rejectedAt = undefined;
      updateData.rejectedBy = undefined;
      updateData.rejectionReason = undefined;
      updateData.isApproved = true;
      updateData.isRejected = false;
    }
    
    const result = await Product.updateMany(
      { _id: { $in: validatedData.productIds } },
      updateData
    );
    
    logger.debug('Products updated', {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      action: validatedData.action
    });
    
    // Get updated products for response
    const updatedProducts = await Product.find({
      _id: { $in: validatedData.productIds }
    })
    .populate('supplierId', 'name companyName')
    .populate('categoryId', 'name')
    .lean();

    // Send notifications to suppliers using unified notification system
    const notificationPromises = [];
    for (const product of updatedProducts) {
      if (product.supplierId) {
        const supplierId = typeof product.supplierId === 'object' ? product.supplierId._id : product.supplierId;
        const supplierIdStr = supplierId.toString();
        
        notificationPromises.push(
          (async () => {
            try {
              // Check if supplier is online
              const supplierIsOnline = await isUserOnline(supplierIdStr);
              
              // Send notification via unified system (Database + Socket.io + Email)
              await sendNotificationToUser(
                supplierIdStr,
                {
                  title: validatedData.action === 'approve' ? 'تمت الموافقة على المنتج' : 'تم رفض المنتج',
                  message: validatedData.action === 'approve' 
                    ? `تمت الموافقة على منتجك "${product.name}" من قبل الإدارة`
                    : `تم رفض منتجك "${product.name}" من قبل الإدارة. السبب: ${validatedData.rejectionReason || 'غير محدد'}`,
                  type: validatedData.action === 'approve' ? 'success' : 'error',
                  actionUrl: `/dashboard/products/${(product as any)._id}`,
                  metadata: { 
                    productId: (product as any)._id?.toString() || String((product as any)._id),
                    productName: product.name,
                    adminNotes: validatedData.adminNotes,
                    rejectionReason: validatedData.rejectionReason,
                    processedAt: new Date().toISOString()
                  }
                },
                {
                  sendEmail: true, // Always send email for important product approval/rejection notifications
                  sendSocket: true
                }
              );
              
              logger.info('Notification sent to supplier for product approval/rejection', {
                productId: (product as any)._id?.toString() || String((product as any)._id),
                productName: product.name,
                supplierId: supplierIdStr,
                action: validatedData.action,
                supplierIsOnline,
                emailSent: true
              });
            } catch (error) {
              logger.error('Error sending notification to supplier', error, {
                productId: (product as any)._id?.toString() || String((product as any)._id),
                supplierId: supplierIdStr
              });
              // Continue with other products even if one notification fails
            }
          })()
        );
      } else {
        logger.warn('No supplierId found for product', {
          productId: (product as any)._id?.toString() || String((product as any)._id),
          productName: product.name
        });
      }
    }
    
    // Wait for all notifications to be sent (in parallel)
    await Promise.all(notificationPromises);
    
    logger.business('Product batch approval/rejection completed', {
      action: validatedData.action,
      productCount: updatedProducts.length,
      notificationsSent: notificationPromises.length
    });
    
    return NextResponse.json({
      success: true,
      message: `تم ${validatedData.action === 'approve' ? 'الموافقة على' : 'رفض'} ${result.modifiedCount} منتج بنجاح`,
      products: updatedProducts.map((product: any) => ({
        _id: product._id,
        name: product.name,
        isApproved: product.isApproved,
        isRejected: product.isRejected,
        adminNotes: product.adminNotes,
        rejectionReason: product.rejectionReason,
        approvedAt: product.approvedAt,
        approvedBy: product.approvedBy,
        rejectedAt: product.rejectedAt,
        rejectedBy: product.rejectedBy,
        supplierName: product.supplierId?.name || product.supplierId?.companyName,
        categoryName: product.categoryId?.name
      }))
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error approving products', error, { adminId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء معالجة المنتجات');
  }
}

export const POST = withRole(['admin'])(approveProducts); 