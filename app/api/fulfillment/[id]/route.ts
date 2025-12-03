import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import FulfillmentRequest from '@/models/FulfillmentRequest';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

const updateFulfillmentSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  warehouseLocation: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional() // For marking fulfillment as completed
});

// GET /api/fulfillment/[id] - Get specific fulfillment request
async function getFulfillmentRequest(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    logger.apiRequest('GET', `/api/fulfillment/${params.id}`, { userId: user._id, role: user.role });
    
    // Validate ObjectId format
    const mongoose = await import('mongoose');
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      logger.warn('Invalid ObjectId format for fulfillment request', { requestId: params.id, userId: user._id });
      return NextResponse.json(
        { success: false, message: 'معرف طلب التخزين غير صحيح' },
        { status: 400 }
      );
    }
    
    const request = await FulfillmentRequest.findById(params.id)
      .populate('products.productId', 'name costPrice images')
      .populate('supplierId', 'name companyName email phone')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .lean() as any;
    
    if (!request) {
      logger.debug('Fulfillment request not found', { requestId: params.id, userId: user._id });
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Role-based access control
    if (user.role === 'supplier') {
      // Suppliers can only view their own requests
      // Handle both populated and unpopulated supplierId
      const requestSupplierId = request.supplierId._id || request.supplierId;
      const supplierIdString = requestSupplierId.toString();
      const userIdString = user._id.toString();
      
      if (supplierIdString !== userIdString) {
        logger.warn('Supplier tried to access another supplier\'s fulfillment request', {
          requestId: params.id,
          userId: user._id,
          requestSupplierId: supplierIdString
        });
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول لهذا الطلب' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'admin') {
      // Only suppliers and admins can access fulfillment requests
      logger.warn('Unauthorized access attempt to fulfillment request', {
        requestId: params.id,
        userId: user._id,
        role: user.role
      });
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذا الطلب' },
        { status: 403 }
      );
    }
    
    logger.apiResponse('GET', `/api/fulfillment/${params.id}`, 200);
    
    return NextResponse.json({
      success: true,
      request: {
        _id: request._id,
        supplierName: request.supplierId?.name || request.supplierId?.companyName,
        supplierEmail: request.supplierId?.email,
        supplierPhone: request.supplierId?.phone,
        products: request.products.map((product: any) => ({
          productName: product.productId?.name,
          productImages: product.productId?.images,
          quantity: product.quantity,
          currentStock: product.currentStock,
          costPrice: product.productId?.costPrice
        })),
        status: request.status,
        totalValue: request.totalValue,
        totalItems: request.totalItems,
        notes: request.notes,
        adminNotes: request.adminNotes,
        rejectionReason: request.rejectionReason,
        warehouseLocation: request.warehouseLocation,
        expectedDeliveryDate: request.expectedDeliveryDate,
        createdAt: request.createdAt,
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy?.name,
        rejectedAt: request.rejectedAt,
        rejectedBy: request.rejectedBy?.name,
        isOverdue: request.isOverdue
      }
    });
  } catch (error) {
    logger.error('Error fetching fulfillment request', error, { requestId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب طلب التخزين');
  }
}

// PUT /api/fulfillment/[id] - Update fulfillment request (admin only)
async function updateFulfillmentRequest(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = updateFulfillmentSchema.parse(body);
    
    const request = await FulfillmentRequest.findById(params.id);
    if (!request) {
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Only admin can update status
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتحديث حالة الطلب' },
        { status: 403 }
      );
    }
    
    // Check if status is actually changing
    const statusChanged = request.status !== validatedData.status;
    const wasApproved = request.status === 'approved';
    
    // Update request
    request.status = validatedData.status;
    request.adminNotes = validatedData.adminNotes;
    request.warehouseLocation = validatedData.warehouseLocation;
    
    if (validatedData.expectedDeliveryDate) {
      request.expectedDeliveryDate = new Date(validatedData.expectedDeliveryDate);
    }
    
    if (validatedData.status === 'approved') {
      request.approvedAt = new Date();
      request.approvedBy = user._id;
      request.rejectedAt = undefined;
      request.rejectedBy = undefined;
      request.rejectionReason = undefined;
      
      // Update product inventory when request is approved
      if (statusChanged) {
        try {
          const Product = (await import('@/models/Product')).default;
          
          // Update each product's stock quantity
          const updatePromises = request.products.map(async (productItem: any) => {
            const product = await Product.findById(productItem.productId);
            if (product) {
              // Add the requested quantity to the current stock
              const newStockQuantity = product.stockQuantity + productItem.quantity;
              
              await Product.findByIdAndUpdate(productItem.productId, {
                stockQuantity: newStockQuantity,
                updatedAt: new Date()
              });
              
              logger.debug('Product stock updated for fulfillment approval', {
                productId: product._id.toString(),
                productName: product.name,
                oldStock: product.stockQuantity,
                newStock: newStockQuantity,
                addedQuantity: productItem.quantity
              });
              
              return {
                productId: productItem.productId,
                productName: product.name,
                oldStock: product.stockQuantity,
                newStock: newStockQuantity,
                addedQuantity: productItem.quantity
              };
            }
            return null;
          });
          
          const updateResults = await Promise.all(updatePromises);
          const successfulUpdates = updateResults.filter(result => result !== null);
          
          logger.business('Inventory updated for fulfillment approval', {
            fulfillmentRequestId: request._id.toString(),
            updatedProductCount: successfulUpdates.length
          });
          
          // Add inventory update info to admin notes
          if (successfulUpdates.length > 0) {
            const inventoryUpdateNote = `\n\nتم تحديث المخزون تلقائياً:\n${successfulUpdates.map(update => 
              `- ${update.productName}: ${update.oldStock} → ${update.newStock} (+${update.addedQuantity})`
            ).join('\n')}`;
            
            request.adminNotes = (request.adminNotes || '') + inventoryUpdateNote;
          }
          
        } catch (error) {
          logger.error('Error updating product inventory for fulfillment approval', error, {
            fulfillmentRequestId: request._id.toString()
          });
          // Don't fail the entire request if inventory update fails
          // Just log the error and continue
        }
        
        // Update linked orders status when fulfillment is approved
        if (request.orderIds && request.orderIds.length > 0 && statusChanged) {
          try {
            const Order = (await import('@/models/Order')).default;
            
            const orderUpdatePromises = request.orderIds.map(async (orderId: any) => {
              const order = await Order.findById(orderId);
              if (order) {
                // Update order status to processing if it's still pending/confirmed
                const newStatus = ['pending', 'confirmed'].includes(order.status) 
                  ? 'processing' 
                  : order.status;
                
                await Order.findByIdAndUpdate(orderId, {
                  status: newStatus,
                  processingAt: ['pending', 'confirmed'].includes(order.status) ? new Date() : order.processingAt,
                  processedBy: ['pending', 'confirmed'].includes(order.status) ? user._id : order.processedBy,
                  updatedAt: new Date()
                });
                
                logger.business('Order status updated after fulfillment approval', {
                  orderId: orderId.toString(),
                  orderNumber: order.orderNumber,
                  oldStatus: order.status,
                  newStatus: newStatus,
                  fulfillmentRequestId: request._id.toString()
                });
                
                return { orderId: orderId.toString(), oldStatus: order.status, newStatus };
              }
              return null;
            });
            
            const orderUpdates = await Promise.all(orderUpdatePromises);
            const successfulOrderUpdates = orderUpdates.filter(update => update !== null);
            
            logger.info('Orders updated after fulfillment approval', {
              fulfillmentRequestId: request._id.toString(),
              updatedOrderCount: successfulOrderUpdates.length
            });
          } catch (error) {
            logger.error('Error updating orders after fulfillment approval', error, {
              fulfillmentRequestId: request._id.toString()
            });
            // Don't fail the fulfillment approval if order update fails
          }
        }
      }
      
    } else if (validatedData.status === 'rejected') {
      if (!validatedData.rejectionReason) {
        return NextResponse.json(
          { success: false, message: 'يجب إضافة سبب الرفض' },
          { status: 400 }
        );
      }
      request.rejectedAt = new Date();
      request.rejectedBy = user._id;
      request.rejectionReason = validatedData.rejectionReason;
      request.approvedAt = undefined;
      request.approvedBy = undefined;
      
      // Reverse inventory changes if request was previously approved
      if (statusChanged && wasApproved) {
        try {
          const Product = (await import('@/models/Product')).default;
          
          // Reverse each product's stock quantity
          const reversePromises = request.products.map(async (productItem: any) => {
            const product = await Product.findById(productItem.productId);
            if (product) {
              // Subtract the previously added quantity from the current stock
              const newStockQuantity = Math.max(0, product.stockQuantity - productItem.quantity);
              
              await Product.findByIdAndUpdate(productItem.productId, {
                stockQuantity: newStockQuantity,
                updatedAt: new Date()
              });
              
              logger.debug('Product stock reversed for fulfillment rejection', {
                productId: product._id.toString(),
                productName: product.name,
                oldStock: product.stockQuantity,
                newStock: newStockQuantity,
                removedQuantity: productItem.quantity
              });
              
              return {
                productId: productItem.productId,
                productName: product.name,
                oldStock: product.stockQuantity,
                newStock: newStockQuantity,
                removedQuantity: productItem.quantity
              };
            }
            return null;
          });
          
          const reverseResults = await Promise.all(reversePromises);
          const successfulReversals = reverseResults.filter(result => result !== null);
          
          logger.business('Inventory reversed for fulfillment rejection', {
            fulfillmentRequestId: request._id.toString(),
            reversedProductCount: successfulReversals.length
          });
          
          // Add inventory reversal info to admin notes
          if (successfulReversals.length > 0) {
            const inventoryReversalNote = `\n\nتم عكس تحديث المخزون:\n${successfulReversals.map(reversal => 
              `- ${reversal.productName}: ${reversal.oldStock} → ${reversal.newStock} (-${reversal.removedQuantity})`
            ).join('\n')}`;
            
            request.adminNotes = (request.adminNotes || '') + inventoryReversalNote;
          }
          
        } catch (error) {
          logger.error('Error reversing product inventory for fulfillment rejection', error, {
            fulfillmentRequestId: request._id.toString()
          });
          // Don't fail the entire request if inventory reversal fails
          // Just log the error and continue
        }
        
        // Update linked orders when fulfillment is rejected (optional - may want to keep orders as is)
        if (request.orderIds && request.orderIds.length > 0 && statusChanged && wasApproved) {
          try {
            const Order = (await import('@/models/Order')).default;
            
            // Optionally revert order status if needed
            // For now, we'll just log the rejection but keep orders as is
            logger.info('Fulfillment rejected - linked orders remain unchanged', {
              fulfillmentRequestId: request._id.toString(),
              orderCount: request.orderIds.length
            });
          } catch (error) {
            logger.error('Error handling order updates for fulfillment rejection', error, {
              fulfillmentRequestId: request._id.toString()
            });
          }
        }
      }
    }
    
    // Handle actual delivery date (fulfillment completion)
    if (validatedData.actualDeliveryDate) {
      request.actualDeliveryDate = new Date(validatedData.actualDeliveryDate);
      
      // Update linked orders status to ready_for_shipping when fulfillment is completed
      if (request.orderIds && request.orderIds.length > 0) {
        try {
          const Order = (await import('@/models/Order')).default;
          
          const orderUpdatePromises = request.orderIds.map(async (orderId: any) => {
            const order = await Order.findById(orderId);
            if (order && ['processing', 'confirmed'].includes(order.status)) {
              await Order.findByIdAndUpdate(orderId, {
                status: 'ready_for_shipping',
                readyForShippingAt: new Date(),
                readyForShippingBy: user._id,
                updatedAt: new Date()
              });
              
              // Automatically create package for shipping company
              try {
                const { createPackageFromOrder } = await import('@/lib/order-to-package');
                const packageId = await createPackageFromOrder(orderId.toString());
                if (packageId) {
                  await Order.findByIdAndUpdate(orderId, {
                    packageId: packageId
                  });
                  logger.info('Package created automatically after fulfillment completion', {
                    orderId: orderId.toString(),
                    orderNumber: order.orderNumber,
                    packageId: packageId
                  });
                }
              } catch (error) {
                logger.error('Error creating package after fulfillment completion', error, {
                  orderId: orderId.toString()
                });
                // Continue even if package creation fails
              }
              
              logger.business('Order status updated to ready_for_shipping after fulfillment completion', {
                orderId: orderId.toString(),
                orderNumber: order.orderNumber,
                fulfillmentRequestId: request._id.toString()
              });
              
              return { orderId: orderId.toString(), newStatus: 'ready_for_shipping' };
            }
            return null;
          });
          
          const orderUpdates = await Promise.all(orderUpdatePromises);
          const successfulOrderUpdates = orderUpdates.filter(update => update !== null);
          
          logger.info('Orders updated to ready_for_shipping after fulfillment completion', {
            fulfillmentRequestId: request._id.toString(),
            updatedOrderCount: successfulOrderUpdates.length
          });
        } catch (error) {
          logger.error('Error updating orders after fulfillment completion', error, {
            fulfillmentRequestId: request._id.toString()
          });
        }
      }
    }
    
    await request.save();
    
    await request.populate('supplierId', 'name companyName');
    await request.populate('approvedBy', 'name');
    await request.populate('rejectedBy', 'name');
    await request.populate('products.productId', 'name');
    
    // Send notification to supplier about status change using unified system
    try {
      const supplierId = (request.supplierId as any)._id || request.supplierId;
      const supplierIdStr = typeof supplierId === 'object' ? supplierId.toString() : supplierId;
      
      // Get product names for the notification
      const productNames = request.products.map((product: any) => product.productId?.name).filter(Boolean).join(', ');
      
      let notificationMessage = '';
      if (validatedData.status === 'approved') {
        notificationMessage = `تمت الموافقة على طلب التخزين للمنتجات: ${productNames}. تم تحديث المخزون تلقائياً.`;
      } else if (validatedData.status === 'rejected') {
        if (wasApproved) {
          notificationMessage = `تم رفض طلب التخزين للمنتجات: ${productNames}. تم عكس تحديث المخزون. السبب: ${validatedData.rejectionReason || 'غير محدد'}`;
        } else {
          notificationMessage = `تم رفض طلب التخزين للمنتجات: ${productNames}. السبب: ${validatedData.rejectionReason || 'غير محدد'}`;
        }
      }
      
      // Check if supplier is online
      const supplierIsOnline = await isUserOnline(supplierIdStr);
      
      await sendNotificationToUser(
        supplierIdStr,
        {
          title: validatedData.status === 'approved' ? 'تمت الموافقة على طلب التخزين' : 'تم رفض طلب التخزين',
          message: notificationMessage,
          type: validatedData.status === 'approved' ? 'success' : 'error',
          actionUrl: `/dashboard/fulfillment/${request._id}`,
          metadata: { 
            fulfillmentRequestId: request._id.toString(),
            status: validatedData.status,
            adminNotes: validatedData.adminNotes,
            rejectionReason: validatedData.rejectionReason,
            warehouseLocation: validatedData.warehouseLocation,
            expectedDeliveryDate: validatedData.expectedDeliveryDate,
            productNames,
            linkedOrdersCount: request.orderIds?.length || 0
          }
        },
        {
          sendEmail: true, // Always send email for important fulfillment status changes
          sendSocket: true
        }
      );
      
      logger.info('Notification sent to supplier for fulfillment status change', {
        fulfillmentRequestId: request._id.toString(),
        supplierId: supplierIdStr,
        status: validatedData.status,
        supplierIsOnline,
        emailSent: true
      });
      
    } catch (error) {
      logger.error('Error sending notification to supplier', error, {
        fulfillmentRequestId: request._id.toString(),
        supplierId: request.supplierId._id.toString()
      });
    }
    
    logger.business('Fulfillment request updated', {
      fulfillmentRequestId: request._id.toString(),
      oldStatus: request.status,
      newStatus: validatedData.status,
      adminId: user._id.toString()
    });
    logger.apiResponse('PUT', `/api/fulfillment/${params.id}`, 200);
    
    let successMessage = `تم ${validatedData.status === 'approved' ? 'الموافقة على' : validatedData.status === 'rejected' ? 'رفض' : 'تحديث'} طلب التخزين بنجاح`;
    
    if (validatedData.status === 'approved' && statusChanged) {
      successMessage += ' وتم تحديث المخزون تلقائياً';
    } else if (validatedData.status === 'rejected' && statusChanged && wasApproved) {
      successMessage += ' وتم عكس تحديث المخزون';
    }
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      request: {
        _id: request._id,
        status: request.status,
        adminNotes: request.adminNotes,
        rejectionReason: request.rejectionReason,
        warehouseLocation: request.warehouseLocation,
        expectedDeliveryDate: request.expectedDeliveryDate,
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy?.name,
        rejectedAt: request.rejectedAt,
        rejectedBy: request.rejectedBy?.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error updating fulfillment request', error, { requestId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث طلب التخزين');
  }
}

// DELETE /api/fulfillment/[id] - Delete fulfillment request
async function deleteFulfillmentRequest(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const request = await FulfillmentRequest.findById(params.id);
    if (!request) {
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Only supplier can delete their own requests, or admin can delete any
    if (user.role === 'supplier' && request.supplierId.toString() !== user._id) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بحذف هذا الطلب' },
        { status: 403 }
      );
    }
    
    // Cannot delete approved requests
    if (request.status === 'approved') {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف طلب تمت الموافقة عليه' },
        { status: 400 }
      );
    }
    
    await FulfillmentRequest.findByIdAndDelete(params.id);
    
    logger.business('Fulfillment request deleted', {
      fulfillmentRequestId: params.id,
      deletedBy: user._id.toString(),
      role: user.role
    });
    logger.apiResponse('DELETE', `/api/fulfillment/${params.id}`, 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف طلب التخزين بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting fulfillment request', error, { requestId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء حذف طلب التخزين');
  }
}

export const GET = withAuth(getFulfillmentRequest);
export const PUT = withRole(['admin'])(updateFulfillmentRequest);
export const DELETE = withAuth(deleteFulfillmentRequest); 