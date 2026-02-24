import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { reverseOrderProfits } from '@/lib/wallet-helpers';

const bulkDeleteSchema = z.object({
  orderIds: z.array(z.string()).min(1, 'يجب اختيار طلب واحد على الأقل')
});

// POST /api/admin/orders/bulk-delete - Delete multiple orders (admin only)
async function bulkDeleteOrders(req: NextRequest, user: any) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderIds } = bulkDeleteSchema.parse(body);

    const orders = await Order.find({ _id: { $in: orderIds } });

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { success: false, error: 'بعض الطلبات غير موجودة' },
        { status: 404 }
      );
    }

    const results: { orderId: string; success: boolean; error?: string }[] = [];

    for (const order of orders) {
      const orderId = order._id.toString();
      try {
        // Reverse profits if they were distributed
        if ((order as any).profitsDistributed) {
          await reverseOrderProfits(order);
          logger.business('Profits reversed before bulk order delete', {
            orderId: order._id.toString(),
            orderNumber: (order as any).orderNumber
          });
        }

        // Restore product stock if order was in a state where stock was deducted
        const status = (order as any).status;
        if (['confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
          for (const item of (order as any).items || []) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            if ((product as any).hasVariants && item.variantOption?.variantId) {
              const variantOptions = (product as any).variantOptions || [];
              const variantOptionIndex = variantOptions.findIndex(
                (opt: any) =>
                  opt.variantId === item.variantOption.variantId &&
                  opt.value === item.variantOption.value
              );
              if (variantOptionIndex !== -1) {
                const updatePath = `variantOptions.${variantOptionIndex}.stockQuantity`;
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { [updatePath]: item.quantity, stockQuantity: item.quantity }
                });
              } else {
                await Product.findByIdAndUpdate(item.productId, {
                  $inc: { stockQuantity: item.quantity }
                });
              }
            } else {
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { stockQuantity: item.quantity }
              });
            }
          }
        }

        await Order.findByIdAndDelete(orderId);

        logger.business('Order deleted by admin (bulk)', {
          orderId,
          orderNumber: (order as any).orderNumber,
          adminId: user._id.toString()
        });

        results.push({ orderId, success: true });
      } catch (err: any) {
        logger.error('Error deleting order in bulk', err, { orderId, userId: user._id });
        results.push({
          orderId,
          success: false,
          error: err.message || 'فشل حذف الطلب'
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    if (failedCount > 0) {
      const failedIds = results.filter((r) => !r.success).map((r) => r.orderId);
      return NextResponse.json({
        success: failedCount < orderIds.length,
        message:
          successCount > 0
            ? `تم حذف ${successCount} طلب بنجاح. فشل حذف ${failedCount} طلب.`
            : 'فشل حذف الطلبات',
        deletedCount: successCount,
        failedCount,
        failedOrderIds: failedIds
      });
    }

    logger.apiResponse('POST', '/api/admin/orders/bulk-delete', 200);
    return NextResponse.json({
      success: true,
      message: `تم حذف ${successCount} طلب بنجاح`,
      deletedCount: successCount
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error.errors?.[0]?.message || 'بيانات غير صحيحة' },
        { status: 400 }
      );
    }
    logger.error('Error in bulk delete orders', error, { userId: user?._id });
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف الطلبات' },
      { status: 500 }
    );
  }
}

export const POST = withRole(['admin'])(bulkDeleteOrders);
