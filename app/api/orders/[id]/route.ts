import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Helper function to add profit to marketer's wallet
async function addProfitToWallet(userId: string, profit: number, orderId: string, orderNumber: string) {
  try {
    logger.business('Adding marketer profit to wallet', {
      userId,
      profit,
      orderId,
      orderNumber
    });

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      logger.debug('Creating new wallet for user', { userId });
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        minimumWithdrawal: 100,
        canWithdraw: false
      });
    }
    
    if (profit > 0) {
      logger.debug('Adding balance to wallet', { userId, profit, orderNumber });
      
      // Update wallet balance and total earnings
      wallet.balance = (wallet.balance || 0) + profit;
      wallet.totalEarnings = (wallet.totalEarnings || 0) + profit;
      wallet.canWithdraw = wallet.balance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      logger.business('Marketer profit added successfully', {
        userId,
        profit,
        newBalance: wallet.balance,
        orderNumber
      });
    } else {
      logger.debug('No marketer profit to add', { userId, orderNumber });
    }
    
    return wallet;
  } catch (error) {
    logger.error('Error adding marketer profit to wallet', error, { userId, orderId, orderNumber });
    throw error;
  }
}

// Helper function to add profit to admin wallet
async function addAdminProfit(profit: number, orderId: string, orderNumber: string) {
  try {
    logger.business('Adding admin commission to wallet', {
      profit,
      orderId,
      orderNumber
    });

    // Find admin user (assuming first admin or specific admin ID)
    const adminUser = await (await import('@/models/User')).default.findOne({ role: 'admin' });
    if (!adminUser) {
      logger.warn('Admin user not found for profit distribution', { orderId, orderNumber });
      return;
    }

    logger.debug('Admin user found', { adminId: adminUser._id, adminName: adminUser.name });

    let wallet = await Wallet.findOne({ userId: adminUser._id });
    
    if (!wallet) {
      logger.debug('Creating new wallet for admin', { adminId: adminUser._id });
      wallet = await Wallet.create({
        userId: adminUser._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        minimumWithdrawal: 100,
        canWithdraw: false
      });
    }
    
    if (profit > 0) {
      logger.debug('Adding commission to admin wallet', { adminId: adminUser._id, profit, orderNumber });
      
      // Update wallet balance and total earnings
      wallet.balance = (wallet.balance || 0) + profit;
      wallet.totalEarnings = (wallet.totalEarnings || 0) + profit;
      wallet.canWithdraw = wallet.balance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      logger.business('Admin commission added successfully', {
        adminId: adminUser._id,
        profit,
        newBalance: wallet.balance,
        orderNumber
      });
    } else {
      logger.debug('No admin commission to add', { orderNumber });
    }
    
    return wallet;
  } catch (error) {
    logger.error('Error adding admin commission to wallet', error, { orderId, orderNumber });
    throw error;
  }
}

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

    // Handle profit distribution when order is delivered
    if (status === 'delivered') {
      logger.info('Order delivered - distributing profits', { orderId: order._id, orderNumber: order.orderNumber });
      
      try {
        // Add marketer profit if applicable
        if (order.marketerProfit > 0 && order.customerRole === 'marketer') {
          logger.debug('Adding marketer profit', { 
            marketerProfit: order.marketerProfit, 
            customerId: order.customerId._id || order.customerId,
            orderNumber: order.orderNumber
          });
          const marketerWallet = await addProfitToWallet(
            order.customerId._id || order.customerId,
            order.marketerProfit,
            order._id,
            order.orderNumber
          );
          try {
            // Create a transaction record as well
            await marketerWallet.addTransaction(
              'credit',
              order.marketerProfit,
              `ربح طلب رقم ${order.orderNumber}`,
              String(order._id),
              { orderNumber: order.orderNumber }
            );
          } catch (txErr) {
            logger.warn('Failed to create wallet transaction', { error: txErr, orderId: order._id });
          }
        } else {
          logger.debug('No marketer profit to add', {
            marketerProfit: order.marketerProfit,
            customerRole: order.customerRole,
            orderNumber: order.orderNumber
          });
        }

        // Add admin profit (commission)
        if (order.commission > 0) {
          logger.debug('Adding admin commission', { commission: order.commission, orderNumber: order.orderNumber });
          await addAdminProfit(order.commission, order._id, order.orderNumber);
        } else {
          logger.debug('No admin commission to add', { orderNumber: order.orderNumber });
        }

        logger.business('Profits distributed successfully', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          marketerProfit: order.marketerProfit,
          adminCommission: order.commission,
          customerRole: order.customerRole
        });
      } catch (error) {
        logger.error('Error distributing profits', error, {
          orderId: order._id,
          orderNumber: order.orderNumber
        });
        // Continue with order update even if profit distribution fails
        // But return an error response to inform the user
        return NextResponse.json(
          { 
            success: false,
            message: 'تم تحديث حالة الطلب ولكن حدث خطأ في إضافة الأرباح',
            error: error instanceof Error ? error.message : 'خطأ غير معروف'
          },
          { status: 500 }
        );
      }
    }

    await order.save();
    
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