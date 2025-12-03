import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { distributeOrderProfits, reverseOrderProfits } from '@/lib/wallet-helpers';

// PUT /api/orders/[id] - Update order status
export const PUT = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    logger.apiRequest('PUT', `/api/orders/${params.id}`, { userId: user._id, role: user.role });
    
    const body = await req.json();
    const { status, trackingNumber, shippingCompany, notes } = body;
    
    logger.debug('Updating order status', { orderId: params.id, status, userId: user._id });
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    logger.debug('Order details', {
      orderId: params.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      newStatus: status,
      customerRole: order.customerRole
    });

    // Check permissions
    const actualSupplierId = order.supplierId._id || order.supplierId;
    
    if (
      user.role === 'supplier' && actualSupplierId.toString() !== user._id.toString()
      || (user.role === 'marketer' || user.role === 'wholesaler')
    ) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذا الطلب' },
        { status: 403 }
      );
    }

    // Validate status transition (only for non-admin users)
    if (user.role !== 'admin') {
      const validTransitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'returned'],
        'delivered': ['returned'],
        'cancelled': [],
        'returned': []
      };

      const currentStatus = order.status;
      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `لا يمكن تغيير حالة الطلب من ${currentStatus} إلى ${status}` },
          { status: 400 }
        );
      }
    } else {
      // For admins, validate that the status is one of the valid statuses
      const validStatuses = [
        'pending', 
        'confirmed', 
        'processing', 
        'ready_for_shipping',
        'shipped', 
        'out_for_delivery',
        'delivered', 
        'cancelled', 
        'returned',
        'refunded'
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `حالة غير صالحة: ${status}` },
          { status: 400 }
        );
      }
    }

    // Update order status and related fields
    order.status = status;
    order.updatedAt = new Date();

    // Add status-specific data
    switch (status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        order.confirmedBy = user._id;
        break;
      case 'processing':
        order.processingAt = new Date();
        order.processedBy = user._id;
        break;
      case 'ready_for_shipping':
        order.readyForShippingAt = new Date();
        order.readyForShippingBy = user._id;
        // Automatically create package for shipping company
        try {
          const { createPackageFromOrder } = await import('@/lib/order-to-package');
          const packageId = await createPackageFromOrder(order._id.toString());
          if (packageId) {
            order.packageId = packageId;
            logger.business('✅ ORDER SENT TO SHIPPING COMPANY - Package created automatically when order status changed to ready_for_shipping', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              packageId: packageId,
              previousStatus: order.status,
              newStatus: 'ready_for_shipping',
              timestamp: new Date().toISOString()
            });
            
            logger.info('✅ Package created automatically and sent to shipping company', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              packageId: packageId
            });
          } else {
            logger.warn('⚠️ FAILED TO SEND ORDER TO SHIPPING COMPANY - Failed to create package automatically for order', {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              orderStatus: order.status,
              timestamp: new Date().toISOString(),
              reason: 'Check if external company exists and is active, or if order has valid shipping address with villageId'
            });
          }
        } catch (error) {
          logger.error('Error creating package automatically for order', error, {
            orderId: order._id.toString()
          });
          // Continue with order update even if package creation fails
        }
        break;
      case 'shipped':
        order.shippedAt = new Date();
        order.shippedBy = user._id;
        order.trackingNumber = trackingNumber;
        order.shippingCompany = shippingCompany;
        break;
      case 'out_for_delivery':
        order.outForDeliveryAt = new Date();
        order.outForDeliveryBy = user._id;
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        order.deliveredBy = user._id;
        order.actualDelivery = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.cancelledBy = user._id;
        // Reverse profits if order was already delivered and profits were distributed
        if (order.profitsDistributed && (order.status === 'delivered' || order.status === 'shipped')) {
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
        // Restore product stock if cancelling (only if order was confirmed or processing)
        if (order.status === 'confirmed' || order.status === 'processing') {
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
      case 'returned':
        order.returnedAt = new Date();
        order.returnedBy = user._id;
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
      case 'refunded':
        order.refundedAt = new Date();
        order.refundedBy = user._id;
        break;
    }

    // Add notes if provided
    if (notes) {
      order.adminNotes = notes;
    }

    // Save order first to ensure status is updated
    await order.save();

    // Handle profit distribution when order is delivered
    if (status === 'delivered') {
      try {
        await distributeOrderProfits(order);
        logger.business('Profits distributed successfully', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        });
      } catch (error) {
        logger.error('Error distributing profits', error, {
          orderId: order._id,
          orderNumber: order.orderNumber
        });
        // Continue even if profit distribution fails - order is already saved
        // Log error but don't fail the request
      }
    }

    // Order already saved above if delivered, otherwise save here
    if (status !== 'delivered') {
      await order.save();
    }
    
    logger.business('Order status updated', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      userId: user._id
    });
    logger.apiResponse('PUT', `/api/orders/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
        trackingNumber: order.trackingNumber,
        shippingCompany: order.shippingCompany,
        adminNotes: order.adminNotes
      }
    });
  } catch (error) {
    logger.error('Error updating order', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث الطلب');
  }
});

// GET /api/orders/[id] - Get order details
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    logger.apiRequest('GET', `/api/orders/${params.id}`, { userId: user._id, role: user.role });
    
    const order = await Order.findById(params.id)
      .populate('items.productId', 'name images marketerPrice wholesalerPrice')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email phone');
    
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Check permissions
    const actualSupplierId = order.supplierId._id || order.supplierId;
    const actualCustomerId = order.customerId._id || order.customerId;
    
    logger.debug('Checking order access permissions', {
      userRole: user.role,
      userId: user._id.toString(),
      orderSupplierId: actualSupplierId.toString(),
      orderCustomerId: actualCustomerId.toString()
    });
    
    if (
      user.role === 'supplier' && actualSupplierId.toString() !== user._id.toString()
      || (user.role === 'marketer' || user.role === 'wholesaler') && actualCustomerId.toString() !== user._id.toString()
    ) {
      logger.warn('Unauthorized order access attempt', {
        userId: user._id.toString(),
        userRole: user.role,
        orderId: params.id
      });
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض هذا الطلب' },
        { status: 403 }
      );
    }

    logger.apiResponse('GET', `/api/orders/${params.id}`, 200);
    
    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Error fetching order details', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب تفاصيل الطلب');
  }
}); 