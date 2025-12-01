import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const orderUpdateSchema = z.object({
  orderIds: z.array(z.string()).min(1, 'يجب اختيار طلب واحد على الأقل'),
  action: z.enum(['confirm', 'process', 'ship', 'deliver', 'cancel', 'return']),
  adminNotes: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingCompany: z.string().optional(),
  cancellationReason: z.string().optional(),
  returnReason: z.string().optional()
});

// POST /api/admin/orders/manage - Manage order statuses
async function manageOrders(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = orderUpdateSchema.parse(body);
    
    // Validate required fields based on action
    if (validatedData.action === 'cancel' && !validatedData.cancellationReason) {
      return NextResponse.json(
        { success: false, message: 'يجب إضافة سبب الإلغاء' },
        { status: 400 }
      );
    }
    
    if (validatedData.action === 'return' && !validatedData.returnReason) {
      return NextResponse.json(
        { success: false, message: 'يجب إضافة سبب الإرجاع' },
        { status: 400 }
      );
    }
    
    if (validatedData.action === 'ship' && !validatedData.trackingNumber) {
      return NextResponse.json(
        { success: false, message: 'يجب إضافة رقم التتبع' },
        { status: 400 }
      );
    }
    
    // Find orders
    const orders = await Order.find({
      _id: { $in: validatedData.orderIds }
    }).populate('items.productId', 'stockQuantity');
    
    if (orders.length !== validatedData.orderIds.length) {
      return NextResponse.json(
        { success: false, message: 'بعض الطلبات غير موجودة' },
        { status: 404 }
      );
    }
    
    // Validate order status transitions
    for (const order of orders) {
      const currentStatus = order.status;
      const newStatus = getNewStatus(validatedData.action);
      
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        return NextResponse.json(
          { success: false, message: `لا يمكن تغيير حالة الطلب ${order.orderNumber} من ${currentStatus} إلى ${newStatus}` },
          { status: 400 }
        );
      }
    }
    
    // Update orders
    const updatePromises = orders.map(async (order) => {
      const newStatus = getNewStatus(validatedData.action);
      const currentStatus = order.status;
      const updateData: any = {
        status: newStatus,
        adminNotes: validatedData.adminNotes
      };
      
      // Add action-specific data
      switch (validatedData.action) {
        case 'confirm':
          updateData.confirmedAt = new Date();
          updateData.confirmedBy = user._id;
          break;
          
        case 'process':
          updateData.processingAt = new Date();
          updateData.processedBy = user._id;
          break;
          
        case 'ship':
          updateData.shippedAt = new Date();
          updateData.shippedBy = user._id;
          updateData.trackingNumber = validatedData.trackingNumber;
          updateData.shippingCompany = validatedData.shippingCompany;
          break;
          
        case 'deliver':
          updateData.deliveredAt = new Date();
          updateData.deliveredBy = user._id;
          break;
          
        case 'cancel':
          updateData.cancelledAt = new Date();
          updateData.cancelledBy = user._id;
          updateData.cancellationReason = validatedData.cancellationReason;
          
          // Restore product stock if cancelling
          if (currentStatus === 'confirmed' || currentStatus === 'processing') {
            for (const item of order.items) {
              const product = await Product.findById(item.productId);
              if (!product) continue;
              
              // If product has variants and variantOption is selected, restore variant stock
              if (product.hasVariants && item.variantOption?.variantId) {
                const variantOptionIndex = (product.variantOptions as any[] || []).findIndex(
                  (opt: any) => opt.variantId === item.variantOption.variantId && 
                               opt.value === item.variantOption.value
                );
                
                if (variantOptionIndex !== -1) {
                  const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
                  await Product.findByIdAndUpdate(item.productId, {
                    $inc: { 
                      [updatePath]: item.quantity,
                      stockQuantity: item.quantity // Also restore main stock
                    }
                  });
                  logger.dbQuery('UPDATE', 'products', { 
                    productId: item.productId, 
                    variantStock: item.quantity,
                    variantId: item.variantOption.variantId,
                    action: 'restore_stock_cancel'
                  });
                } else {
                  // Fallback: restore main stock only
                  await Product.findByIdAndUpdate(item.productId, {
                    $inc: { stockQuantity: item.quantity }
                  });
                  logger.warn('Variant option not found for stock restoration, restored main stock only', {
                    productId: item.productId,
                    variantId: item.variantOption.variantId
                  });
                }
              } else {
                // Restore main product stock
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stockQuantity: item.quantity }
                });
                logger.dbQuery('UPDATE', 'products', { 
                  productId: item.productId, 
                  quantity: item.quantity,
                  action: 'restore_stock_cancel'
                });
              }
            }
          }
          break;
          
        case 'return':
          updateData.returnedAt = new Date();
          updateData.returnedBy = user._id;
          updateData.returnReason = validatedData.returnReason;
          
          // Restore product stock for returns
          for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            
            // If product has variants and variantOption is selected, restore variant stock
            if (product.hasVariants && item.variantOption?.variantId) {
              const variantOptionIndex = (product.variantOptions as any[] || []).findIndex(
                (opt: any) => opt.variantId === item.variantOption.variantId && 
                             opt.value === item.variantOption.value
              );
              
              if (variantOptionIndex !== -1) {
                const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { 
                    [updatePath]: item.quantity,
                    stockQuantity: item.quantity // Also restore main stock
                  }
                });
                logger.dbQuery('UPDATE', 'products', { 
                  productId: item.productId, 
                  variantStock: item.quantity,
                  variantId: item.variantOption.variantId,
                  action: 'restore_stock_return'
                });
              } else {
                // Fallback: restore main stock only
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stockQuantity: item.quantity }
                });
                logger.warn('Variant option not found for stock restoration, restored main stock only', {
                  productId: item.productId,
                  variantId: item.variantOption.variantId
                });
              }
            } else {
              // Restore main product stock
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: item.quantity }
              });
              logger.dbQuery('UPDATE', 'products', { 
                productId: item.productId, 
                quantity: item.quantity,
                action: 'restore_stock_return'
              });
            }
          }
          break;
      }
      
      return Order.findByIdAndUpdate(order._id, updateData, { new: true });
    });
    
    const updatedOrders = await Promise.all(updatePromises);
    
    return NextResponse.json({
      success: true,
      message: `تم ${getActionMessage(validatedData.action)} ${updatedOrders.length} طلب بنجاح`,
      orders: updatedOrders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        adminNotes: order.adminNotes,
        trackingNumber: order.trackingNumber,
        shippingCompany: order.shippingCompany,
        cancellationReason: order.cancellationReason,
        returnReason: order.returnReason,
        updatedAt: order.updatedAt
      }))
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error managing orders', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إدارة الطلبات' },
      { status: 500 }
    );
  }
}

// Helper functions
function getNewStatus(action: string): string {
  switch (action) {
    case 'confirm': return 'confirmed';
    case 'process': return 'processing';
    case 'ship': return 'shipped';
    case 'deliver': return 'delivered';
    case 'cancel': return 'cancelled';
    case 'return': return 'returned';
    default: return 'pending';
  }
}

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'confirm': return 'تأكيد';
    case 'process': return 'معالجة';
    case 'ship': return 'شحن';
    case 'deliver': return 'توصيل';
    case 'cancel': return 'إلغاء';
    case 'return': return 'إرجاع';
    default: return 'تحديث';
  }
}

export const POST = withRole(['admin'])(manageOrders); 