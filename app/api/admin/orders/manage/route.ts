import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { distributeOrderProfits, reverseOrderProfits } from '@/lib/wallet-helpers';

const orderUpdateSchema = z.object({
  orderIds: z.array(z.string()).min(1, 'يجب اختيار طلب واحد على الأقل'),
  action: z.enum(['confirm', 'process', 'ship', 'deliver', 'cancel', 'return', 'update-shipping']),
  adminNotes: z.string().optional(),
  shippingCompany: z.string().optional(),
  shippingCity: z.string().optional(),
  villageId: z.union([z.number().int().positive(), z.null()]).optional(), // FIXED: Allow null for villageId
  cancellationReason: z.string().optional(),
  returnReason: z.string().optional(),
  updateShippingOnly: z.boolean().optional()
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
    
    // Tracking number is optional for shipping
    
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

    // Handle update-shipping action separately (update shipping only without changing status)
    if (validatedData.action === 'update-shipping') {
      if (!validatedData.shippingCompany || !validatedData.shippingCity) {
        return NextResponse.json(
          { success: false, message: 'شركة الشحن والمدينة مطلوبان' },
          { status: 400 }
        );
      }

      const updatePromises = orders.map(async (order) => {
        const updateData: any = {
          shippingCompany: validatedData.shippingCompany,
        };

        // Update shipping city in shippingAddress
        if (validatedData.shippingCity) {
          if (!order.shippingAddress) {
            order.shippingAddress = {};
          }
          updateData.shippingAddress = {
            ...order.shippingAddress.toObject(),
            city: validatedData.shippingCity
          };
        }
        
        // FIXED: Update villageId if provided
        if (validatedData.villageId !== undefined && validatedData.villageId !== null) {
          const Village = (await import('@/models/Village')).default;
          const village = await Village.findOne({ villageId: validatedData.villageId, isActive: true }).lean();
          if (village) {
            if (!updateData.shippingAddress) {
              updateData.shippingAddress = order.shippingAddress?.toObject() || {};
            }
            updateData.shippingAddress.villageId = validatedData.villageId;
            updateData.shippingAddress.villageName = (village as any).villageName;
            // Also update city if not already set
            if (!validatedData.shippingCity) {
              updateData.shippingAddress.city = (village as any).villageName;
            }
          }
        }

        await Order.findByIdAndUpdate(order._id, updateData, { new: true });
        logger.info('Updated shipping info for order', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          villageId: validatedData.villageId
        });
      });

      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        message: `تم تحديث معلومات الشحن لـ ${orders.length} طلب بنجاح`
      });
    }
    
    // Validate order status transitions for other actions
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
          updateData.shippingCompany = validatedData.shippingCompany;
          // Update shipping city if provided (save to shippingAddress.city)
          if (validatedData.shippingCity) {
            if (!order.shippingAddress) {
              order.shippingAddress = {};
            }
            updateData.shippingAddress = {
              ...order.shippingAddress.toObject(),
              city: validatedData.shippingCity
            };
          }
          
          // Update villageId if provided (admin selecting actual village)
          if (validatedData.villageId !== undefined && validatedData.villageId) {
            if (!order.shippingAddress) {
              order.shippingAddress = {};
            }
            // Find village name from villageId
            const Village = (await import('@/models/Village')).default;
            const village = await Village.findOne({ villageId: validatedData.villageId, isActive: true }).lean();
            if (village) {
              updateData.shippingAddress = {
                ...order.shippingAddress.toObject(),
                villageId: validatedData.villageId,
                villageName: (village as any).villageName
              };
              // Also update city if not already set
              if (!validatedData.shippingCity) {
                updateData.shippingAddress.city = (village as any).villageName;
              }
            }
          }
          
          // IMPORTANT: Save shippingCompany to order FIRST before creating package
          // This ensures createPackageFromOrder can find the correct shipping company
          if (validatedData.shippingCompany) {
            await Order.findByIdAndUpdate(order._id, {
              shippingCompany: validatedData.shippingCompany
            });
            // Update order object in memory so createPackageFromOrder can read it
            order.shippingCompany = validatedData.shippingCompany;
          }
          
          // Ensure package exists before shipping
          if (!order.packageId) {
            try {
              const { createPackageFromOrder } = await import('@/lib/order-to-package');
              const packageResult = await createPackageFromOrder(order._id.toString());
              if (packageResult && packageResult.packageId) {
                updateData.packageId = packageResult.packageId;
                logger.info('Package created automatically before bulk shipping', {
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  packageId: packageResult.packageId,
                  apiSuccess: packageResult.apiSuccess,
                  shippingCompany: validatedData.shippingCompany
                });
              } else {
                logger.warn('Failed to create package before shipping', {
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  shippingCompany: validatedData.shippingCompany,
                  note: 'Package creation failed - check logs for details'
                });
              }
            } catch (error) {
              logger.error('Error creating package before bulk shipping', error, {
                orderId: order._id.toString(),
                shippingCompany: validatedData.shippingCompany
              });
            }
          }
          break;
          
        case 'deliver':
          updateData.deliveredAt = new Date();
          updateData.deliveredBy = user._id;
          // Distribute profits when order is delivered
          // This will be handled after order update to ensure order is saved with delivered status
          break;
          
        case 'cancel':
          updateData.cancelledAt = new Date();
          updateData.cancelledBy = user._id;
          updateData.cancellationReason = validatedData.cancellationReason;
          
          // Reverse profits if order was already delivered and profits were distributed
          if (order.profitsDistributed && (currentStatus === 'delivered' || currentStatus === 'shipped')) {
            try {
              await reverseOrderProfits(order);
              logger.business('Profits reversed for cancelled delivered order', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber
              });
            } catch (error) {
              logger.error('Error reversing profits for cancelled order', error, {
                orderId: order._id.toString()
              });
              // Continue with cancellation even if profit reversal fails
            }
          }
          
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
          
          // Reverse profits if order was delivered and profits were distributed
          if (order.profitsDistributed) {
            try {
              await reverseOrderProfits(order);
              logger.business('Profits reversed for returned order', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber
              });
            } catch (error) {
              logger.error('Error reversing profits for returned order', error, {
                orderId: order._id.toString()
              });
              // Continue with return even if profit reversal fails
            }
          }
          
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
      
      const updatedOrder = await Order.findByIdAndUpdate(order._id, updateData, { new: true });
      
      // Distribute profits if order was delivered
      if (validatedData.action === 'deliver' && updatedOrder) {
        try {
          await distributeOrderProfits(updatedOrder);
          logger.business('Profits distributed for delivered order', {
            orderId: updatedOrder._id.toString(),
            orderNumber: updatedOrder.orderNumber
          });
        } catch (error) {
          logger.error('Error distributing profits for delivered order', error, {
            orderId: updatedOrder._id.toString()
          });
          // Continue even if profit distribution fails - order is already updated
        }
      }
      
      return updatedOrder;
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
    'confirmed': ['processing', 'ready_for_shipping', 'shipped', 'cancelled'], // Allow direct transition to shipped
    'processing': ['ready_for_shipping', 'shipped', 'cancelled'],
    'ready_for_shipping': ['shipped', 'cancelled'],
    'shipped': ['out_for_delivery', 'delivered', 'returned'],
    'out_for_delivery': ['delivered', 'returned'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': [],
    'refunded': []
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