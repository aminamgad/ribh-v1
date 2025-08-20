import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import FulfillmentRequest from '@/models/FulfillmentRequest';
import { z } from 'zod';

const updateFulfillmentSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  warehouseLocation: z.string().optional(),
  expectedDeliveryDate: z.string().optional()
});

// GET /api/fulfillment/[id] - Get specific fulfillment request
async function getFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    console.log('=== Fulfillment Request Debug ===');
    console.log('Request ID:', params.id);
    console.log('User:', {
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });
    
    // Validate ObjectId format
    const mongoose = await import('mongoose');
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.error('Invalid ObjectId format:', params.id);
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
    
    console.log('Found request:', request ? 'Yes' : 'No');
    if (request) {
      console.log('Request supplier ID structure:', {
        hasId: !!request.supplierId._id,
        hasDirectId: !!request.supplierId,
        supplierIdType: typeof request.supplierId,
        supplierIdIdType: typeof request.supplierId._id
      });
    }
    
    if (!request) {
      console.log('Request not found in database');
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
      
      console.log('Comparing supplier IDs:');
      console.log('Request supplier ID:', supplierIdString);
      console.log('User ID:', userIdString);
      console.log('Match:', supplierIdString === userIdString);
      
      if (supplierIdString !== userIdString) {
        console.log('Access denied: supplier trying to access another supplier\'s request');
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول لهذا الطلب' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'admin') {
      // Only suppliers and admins can access fulfillment requests
      console.log('Access denied: user role not authorized');
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذا الطلب' },
        { status: 403 }
      );
    }
    
    console.log('Access granted - returning request data');
    console.log('=== End Debug ===');
    
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
    console.error('Error fetching fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب طلب التخزين' },
      { status: 500 }
    );
  }
}

// PUT /api/fulfillment/[id] - Update fulfillment request (admin only)
async function updateFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
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
              
              console.log(`✅ Updated product ${product.name} stock from ${product.stockQuantity} to ${newStockQuantity} (+${productItem.quantity})`);
              
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
          
          console.log(`✅ Successfully updated inventory for ${successfulUpdates.length} products`);
          
          // Add inventory update info to admin notes
          if (successfulUpdates.length > 0) {
            const inventoryUpdateNote = `\n\nتم تحديث المخزون تلقائياً:\n${successfulUpdates.map(update => 
              `- ${update.productName}: ${update.oldStock} → ${update.newStock} (+${update.addedQuantity})`
            ).join('\n')}`;
            
            request.adminNotes = (request.adminNotes || '') + inventoryUpdateNote;
          }
          
        } catch (error) {
          console.error('❌ Error updating product inventory:', error);
          // Don't fail the entire request if inventory update fails
          // Just log the error and continue
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
              
              console.log(`🔄 Reversed product ${product.name} stock from ${product.stockQuantity} to ${newStockQuantity} (-${productItem.quantity})`);
              
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
          
          console.log(`🔄 Successfully reversed inventory for ${successfulReversals.length} products`);
          
          // Add inventory reversal info to admin notes
          if (successfulReversals.length > 0) {
            const inventoryReversalNote = `\n\nتم عكس تحديث المخزون:\n${successfulReversals.map(reversal => 
              `- ${reversal.productName}: ${reversal.oldStock} → ${reversal.newStock} (-${reversal.removedQuantity})`
            ).join('\n')}`;
            
            request.adminNotes = (request.adminNotes || '') + inventoryReversalNote;
          }
          
        } catch (error) {
          console.error('❌ Error reversing product inventory:', error);
          // Don't fail the entire request if inventory reversal fails
          // Just log the error and continue
        }
      }
    }
    
    await request.save();
    
    await request.populate('supplierId', 'name companyName');
    await request.populate('approvedBy', 'name');
    await request.populate('rejectedBy', 'name');
    await request.populate('products.productId', 'name');
    
    // Send notification to supplier about status change
    try {
      const Notification = (await import('@/models/Notification')).default;
      
      // Get product names for the notification
      const productNames = request.products.map((product: any) => product.productId?.name).filter(Boolean).join(', ');
      
      let notificationMessage = '';
      if (validatedData.status === 'approved') {
        notificationMessage = `تمت الموافقة على طلب التخزين للمنتجات: ${productNames}. تم تحديث المخزون تلقائياً.`;
      } else if (validatedData.status === 'rejected') {
        if (wasApproved) {
          notificationMessage = `تم رفض طلب التخزين للمنتجات: ${productNames}. تم عكس تحديث المخزون. السبب: ${validatedData.rejectionReason}`;
        } else {
          notificationMessage = `تم رفض طلب التخزين للمنتجات: ${productNames}. السبب: ${validatedData.rejectionReason}`;
        }
      }
      
      const notificationData = {
        userId: request.supplierId._id,
        title: validatedData.status === 'approved' ? 'تمت الموافقة على طلب التخزين' : 'تم رفض طلب التخزين',
        message: notificationMessage,
        type: validatedData.status === 'approved' ? 'success' : 'error',
        actionUrl: `/dashboard/fulfillment/${request._id}`,
        metadata: { 
          fulfillmentRequestId: request._id,
          status: validatedData.status,
          adminNotes: validatedData.adminNotes,
          rejectionReason: validatedData.rejectionReason,
          warehouseLocation: validatedData.warehouseLocation,
          expectedDeliveryDate: validatedData.expectedDeliveryDate,
          productNames
        }
      };
      
      await Notification.create(notificationData);
      console.log(`✅ Notification sent to supplier ${request.supplierId.name || request.supplierId.companyName} for fulfillment request ${validatedData.status}`);
      
    } catch (error) {
      console.error('❌ Error sending notification to supplier:', error);
    }
    
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
    
    console.error('Error updating fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث طلب التخزين' },
      { status: 500 }
    );
  }
}

// DELETE /api/fulfillment/[id] - Delete fulfillment request
async function deleteFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
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
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف طلب التخزين بنجاح'
    });
  } catch (error) {
    console.error('Error deleting fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف طلب التخزين' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getFulfillmentRequest);
export const PUT = withRole(['admin'])(updateFulfillmentRequest);
export const DELETE = withAuth(deleteFulfillmentRequest); 