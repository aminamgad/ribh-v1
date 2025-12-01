import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Wallet from '@/models/Wallet';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Helper function to add profit to marketer's wallet
async function addProfitToWallet(userId: string, profit: number, orderId: string, orderNumber: string) {
  try {
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0
      });
    }
    
    if (profit > 0) {
      await wallet.addTransaction(
        'credit',
        profit,
        `ربح من الطلب رقم ${orderNumber}`,
        `order_profit_${orderId}`,
        {
          orderId,
          type: 'marketer_profit',
          source: 'order_completion'
        }
      );
    }
    
    return wallet;
  } catch (error) {
    logger.error('Error adding profit to wallet', error, { userId, orderId, orderNumber });
    throw error;
  }
}

// Helper function to add profit to admin wallet
async function addAdminProfit(profit: number, orderId: string, orderNumber: string) {
  try {
    const adminUser = await (await import('@/models/User')).default.findOne({ role: 'admin' });
    if (!adminUser) {
      logger.warn('No admin user found for profit distribution', { orderId, orderNumber });
      return;
    }

    let wallet = await Wallet.findOne({ userId: adminUser._id });
    
    if (!wallet) {
      wallet = await Wallet.create({
        userId: adminUser._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0
      });
    }
    
    if (profit > 0) {
      await wallet.addTransaction(
        'credit',
        profit,
        `ربح إداري من الطلب رقم ${orderNumber}`,
        `admin_profit_${orderId}`,
        {
          orderId,
          type: 'admin_profit',
          source: 'order_completion'
        }
      );
    }
    
    return wallet;
  } catch (error) {
    logger.error('Error adding admin profit to wallet', error, { orderId, orderNumber });
    throw error;
  }
}

// POST /api/orders/[id]/fulfill - Fulfill order (for suppliers)
export const POST = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const body = await req.json();
    const { action, trackingNumber, shippingCompany, notes } = body;
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }
    
    // Check if user is supplier and owns this order
    if (user.role !== 'supplier' || order.supplierId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ هذا الطلب' },
        { status: 403 }
      );
    }

    // Validate action and current status
    const validActions: Record<string, string[]> = {
      'confirm': ['pending'],
      'process': ['confirmed'],
      'ship': ['processing'],
      'deliver': ['shipped'],
      'cancel': ['pending', 'confirmed', 'processing'],
      'return': ['shipped', 'delivered']
    };

    const currentStatus = order.status;
    if (!validActions[action]?.includes(currentStatus)) {
      return NextResponse.json(
        { error: `لا يمكن تنفيذ ${action} على الطلب في حالة ${currentStatus}` },
        { status: 400 }
      );
    }

    // Update order based on action
    let newStatus = '';
    let updateData: any = {};

    switch (action) {
      case 'confirm':
        newStatus = 'confirmed';
        updateData = {
          status: newStatus,
          confirmedAt: new Date(),
          confirmedBy: user._id,
          updatedAt: new Date()
        };
        break;

      case 'process':
        newStatus = 'processing';
        updateData = {
          status: newStatus,
          processingAt: new Date(),
          processedBy: user._id,
          updatedAt: new Date()
        };
        break;

      case 'ship':
        if (!trackingNumber) {
          return NextResponse.json(
            { error: 'رقم التتبع مطلوب عند شحن الطلب' },
            { status: 400 }
          );
        }
        newStatus = 'shipped';
        updateData = {
          status: newStatus,
          shippedAt: new Date(),
          shippedBy: user._id,
          trackingNumber,
          shippingCompany,
          updatedAt: new Date()
        };
        break;

      case 'deliver':
        newStatus = 'delivered';
        updateData = {
          status: newStatus,
          deliveredAt: new Date(),
          deliveredBy: user._id,
          actualDelivery: new Date(),
          updatedAt: new Date()
        };
        break;

      case 'cancel':
        newStatus = 'cancelled';
        updateData = {
          status: newStatus,
          cancelledAt: new Date(),
          cancelledBy: user._id,
          updatedAt: new Date()
        };
        // Restore product stock if cancelling (only if order was confirmed or processing)
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
        newStatus = 'returned';
        updateData = {
          status: newStatus,
          returnedAt: new Date(),
          returnedBy: user._id,
          updatedAt: new Date()
        };
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

    // Add notes if provided
    if (notes) {
      updateData.adminNotes = notes;
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      updateData,
      { new: true }
    );

    // Handle profit distribution when order is delivered
    if (action === 'deliver') {
      try {
        // Add marketer profit if applicable
        if (order.marketerProfit > 0 && order.customerRole === 'marketer') {
          await addProfitToWallet(
            order.customerId._id || order.customerId,
            order.marketerProfit,
            order._id,
            order.orderNumber
          );
        }

        // Add admin profit (commission)
        if (order.commission > 0) {
          await addAdminProfit(order.commission, order._id, order.orderNumber);
        }

        logger.business('Profits distributed successfully', {
          orderId: order._id.toString(),
          marketerProfit: order.marketerProfit,
          adminCommission: order.commission,
          customerRole: order.customerRole
        });
      } catch (error) {
        logger.error('Error distributing profits', error, { orderId: order._id });
        // Continue with order update even if profit distribution fails
      }
    }

    logger.business('Order fulfilled', {
      orderId: params.id,
      action,
      newStatus,
      userId: user._id.toString()
    });
    logger.apiResponse('POST', `/api/orders/${params.id}/fulfill`, 200);

    const actionMessages = {
      'confirm': 'تم تأكيد الطلب بنجاح',
      'process': 'تم بدء معالجة الطلب بنجاح',
      'ship': 'تم شحن الطلب بنجاح',
      'deliver': 'تم تسليم الطلب بنجاح',
      'cancel': 'تم إلغاء الطلب بنجاح',
      'return': 'تم إرجاع الطلب بنجاح'
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action as keyof typeof actionMessages] || 'تم تنفيذ الطلب بنجاح',
      order: {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        trackingNumber: updatedOrder.trackingNumber,
        shippingCompany: updatedOrder.shippingCompany,
        adminNotes: updatedOrder.adminNotes
      }
    });
  } catch (error) {
    logger.error('Error fulfilling order', error, { orderId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تنفيذ الطلب');
  }
}); 