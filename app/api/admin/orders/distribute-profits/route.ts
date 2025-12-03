import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { distributeOrderProfits } from '@/lib/wallet-helpers';

// POST /api/admin/orders/distribute-profits - Distribute profits for pending orders
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    logger.apiRequest('POST', '/api/admin/orders/distribute-profits', { userId: user._id });
    
    const body = await req.json();
    const { orderIds, distributeAll } = body;
    
    // Validate input
    if (!distributeAll && (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'يجب تحديد الطلبات المراد توزيع أرباحها أو اختيار توزيع الكل' },
        { status: 400 }
      );
    }
    
    // Find orders to process
    let orders;
    if (distributeAll) {
      // Get all delivered orders that haven't had profits distributed
      orders = await Order.find({
        status: 'delivered',
        profitsDistributed: { $ne: true }
      }).populate('customerId', 'name role');
    } else {
      // Get specific orders
      orders = await Order.find({
        _id: { $in: orderIds },
        status: 'delivered',
        profitsDistributed: { $ne: true }
      }).populate('customerId', 'name role');
    }
    
    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, message: 'لا توجد طلبات مسلمة تحتاج إلى توزيع الأرباح' },
        { status: 404 }
      );
    }
    
    logger.business('Starting bulk profit distribution', {
      adminId: user._id.toString(),
      ordersCount: orders.length,
      distributeAll
    });
    
    // Distribute profits for each order
    const results = {
      success: [] as string[],
      failed: [] as { orderId: string; orderNumber: string; error: string }[]
    };
    
    for (const order of orders) {
      try {
        await distributeOrderProfits(order);
        results.success.push(order.orderNumber);
        
        logger.business('Profit distributed for order', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        results.failed.push({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          error: errorMessage
        });
        
        logger.error('Error distributing profits for order', error, {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        });
      }
    }
    
    logger.business('Bulk profit distribution completed', {
      adminId: user._id.toString(),
      successCount: results.success.length,
      failedCount: results.failed.length
    });
    logger.apiResponse('POST', '/api/admin/orders/distribute-profits', 200);
    
    return NextResponse.json({
      success: true,
      message: `تم توزيع الأرباح لـ ${results.success.length} طلب بنجاح${results.failed.length > 0 ? `، فشل ${results.failed.length} طلب` : ''}`,
      results: {
        total: orders.length,
        success: results.success.length,
        failed: results.failed.length,
        successOrders: results.success,
        failedOrders: results.failed
      }
    });
    
  } catch (error) {
    logger.error('Error in bulk profit distribution', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء توزيع الأرباح');
  }
});

// GET /api/admin/orders/distribute-profits - Get pending profit orders
export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    logger.apiRequest('GET', '/api/admin/orders/distribute-profits', { userId: user._id });
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Find delivered orders without distributed profits
    const orders = await Order.find({
      status: 'delivered',
      profitsDistributed: { $ne: true }
    })
      .populate('customerId', 'name email role')
      .populate('supplierId', 'name companyName')
      .sort({ deliveredAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments({
      status: 'delivered',
      profitsDistributed: { $ne: true }
    });
    
    // Calculate total pending profits
    const allPendingOrders = await Order.find({
      status: 'delivered',
      profitsDistributed: { $ne: true }
    });
    
    const totalPendingMarketerProfit = allPendingOrders.reduce(
      (sum, order) => sum + (order.marketerProfit || 0), 
      0
    );
    const totalPendingAdminCommission = allPendingOrders.reduce(
      (sum, order) => sum + (order.commission || 0), 
      0
    );
    
    logger.apiResponse('GET', '/api/admin/orders/distribute-profits', 200);
    
    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: {
          name: (order.customerId as any)?.name,
          role: (order.customerId as any)?.role
        },
        supplier: {
          name: (order.supplierId as any)?.name || (order.supplierId as any)?.companyName
        },
        total: order.total,
        marketerProfit: order.marketerProfit || 0,
        commission: order.commission || 0,
        deliveredAt: order.deliveredAt
      })),
      summary: {
        totalPendingOrders: total,
        totalPendingMarketerProfit,
        totalPendingAdminCommission,
        totalPendingAmount: totalPendingMarketerProfit + totalPendingAdminCommission
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching pending profit orders', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب الطلبات المعلقة');
  }
});

