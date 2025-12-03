import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/admin/earnings - Get earnings statistics
export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // week, month, year
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const now = new Date();
      let start: Date;
      
      switch (period) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      dateFilter = {
        createdAt: {
          $gte: start,
          $lte: now
        }
      };
    }
    
    // Get orders with earnings data
    const orders = await Order.find({
      ...dateFilter,
      status: 'delivered'
    }).populate('customerId', 'name role');
    
    // Calculate earnings
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalCommission = orders.reduce((sum, order) => sum + order.commission, 0);
    const totalMarketerProfit = orders.reduce((sum, order) => sum + (order.marketerProfit || 0), 0);
    const totalSupplierRevenue = totalRevenue - totalCommission;
    
    // Get wallet statistics (actual balances from wallets)
    const wallets = await Wallet.find();
    const totalWalletBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    const totalEarnings = wallets.reduce((sum, wallet) => sum + (wallet.totalEarnings || 0), 0);
    const totalWithdrawals = wallets.reduce((sum, wallet) => sum + (wallet.totalWithdrawals || 0), 0);
    const totalPendingWithdrawals = wallets.reduce((sum, wallet) => sum + (wallet.pendingWithdrawals || 0), 0);
    
    // Get actual distributed profits from orders (only delivered orders with profitsDistributed = true)
    const distributedOrders = await Order.find({
      ...dateFilter,
      status: 'delivered',
      profitsDistributed: true
    });
    
    const actualDistributedMarketerProfit = distributedOrders.reduce(
      (sum, order) => sum + (order.marketerProfit || 0), 
      0
    );
    const actualDistributedAdminCommission = distributedOrders.reduce(
      (sum, order) => sum + (order.commission || 0), 
      0
    );
    
    // Get pending profits (delivered but not distributed)
    const pendingProfitOrders = await Order.find({
      ...dateFilter,
      status: 'delivered',
      profitsDistributed: { $ne: true }
    });
    
    const pendingMarketerProfit = pendingProfitOrders.reduce(
      (sum, order) => sum + (order.marketerProfit || 0), 
      0
    );
    const pendingAdminCommission = pendingProfitOrders.reduce(
      (sum, order) => sum + (order.commission || 0), 
      0
    );
    
    // Get earnings by role
    const earningsByRole = await Order.aggregate([
      { $match: { ...dateFilter, status: 'delivered' } },
      {
        $group: {
          _id: '$customerRole',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalProfit: { $sum: '$marketerProfit' }
        }
      }
    ]);
    
    // Get top earners
    const topEarners = await Wallet.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          role: '$user.role',
          balance: '$balance',
          totalEarnings: '$totalEarnings'
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 }
    ]);
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalOrders: orders.length,
        totalRevenue,
        totalCommission,
        totalMarketerProfit,
        totalSupplierRevenue,
        // Wallet statistics (actual balances)
        totalWalletBalance,
        totalEarnings,
        totalWithdrawals,
        totalPendingWithdrawals,
        // Actual distributed profits
        actualDistributedMarketerProfit,
        actualDistributedAdminCommission,
        // Pending profits (not yet distributed)
        pendingMarketerProfit,
        pendingAdminCommission,
        pendingProfitOrdersCount: pendingProfitOrders.length
      },
      earningsByRole,
      topEarners,
      period,
      dateRange: {
        start: dateFilter.createdAt?.$gte || new Date(),
        end: dateFilter.createdAt?.$lte || new Date()
      }
    });
    
    logger.apiResponse('GET', '/api/admin/earnings', 200);
  } catch (error) {
    logger.error('Error getting earnings', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب إحصائيات الأرباح');
  }
});

// POST /api/admin/earnings - Update admin profit margins (replaces old commission rates)
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const body = await req.json();
    const { adminProfitMargins } = body;
    
    // Validate admin profit margins
    if (!adminProfitMargins || !Array.isArray(adminProfitMargins)) {
      return NextResponse.json(
        { success: false, message: 'هوامش ربح الإدارة مطلوبة' },
        { status: 400 }
      );
    }
    
    // Validate each margin
    for (const margin of adminProfitMargins) {
      if (margin.minPrice === undefined || margin.maxPrice === undefined || margin.margin === undefined) {
        return NextResponse.json(
          { success: false, message: 'جميع حقول هامش الربح مطلوبة' },
          { status: 400 }
        );
      }
      
      if (margin.margin < 0 || margin.margin > 100) {
        return NextResponse.json(
          { success: false, message: 'هامش الربح يجب أن يكون بين 0 و 100' },
          { status: 400 }
        );
      }
      
      if (margin.minPrice < 0 || margin.maxPrice < 0) {
        return NextResponse.json(
          { success: false, message: 'الأسعار يجب أن تكون أكبر من أو تساوي صفر' },
          { status: 400 }
        );
      }
      
      if (margin.minPrice > margin.maxPrice) {
        return NextResponse.json(
          { success: false, message: 'الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى' },
          { status: 400 }
        );
      }
    }
    
    // Check for overlapping ranges
    const sortedMargins = [...adminProfitMargins].sort((a, b) => a.minPrice - b.minPrice);
    for (let i = 0; i < sortedMargins.length - 1; i++) {
      if (sortedMargins[i].maxPrice >= sortedMargins[i + 1].minPrice) {
        return NextResponse.json(
          { success: false, message: 'نطاقات هوامش الربح متداخلة' },
          { status: 400 }
        );
      }
    }
    
    // Update system settings
    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { 
        adminProfitMargins,
        updatedBy: user._id
      },
      { new: true, upsert: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث هوامش ربح الإدارة بنجاح',
      settings: {
        adminProfitMargins: settings.adminProfitMargins
      }
    });
    
    logger.business('Admin profit margins updated', { adminId: user._id });
    logger.apiResponse('POST', '/api/admin/earnings', 200);
  } catch (error) {
    logger.error('Error updating admin profit margins', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث هوامش ربح الإدارة');
  }
}); 