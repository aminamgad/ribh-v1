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
    
    // Get wallet statistics
    const wallets = await Wallet.find();
    const totalWalletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalEarnings = wallets.reduce((sum, wallet) => sum + wallet.totalEarnings, 0);
    const totalWithdrawals = wallets.reduce((sum, wallet) => sum + wallet.totalWithdrawals, 0);
    
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
        totalWalletBalance,
        totalEarnings,
        totalWithdrawals
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

// POST /api/admin/earnings - Update commission settings
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const body = await req.json();
    const { commissionRates } = body;
    
    // Validate commission rates
    if (!commissionRates || !Array.isArray(commissionRates)) {
      return NextResponse.json(
        { success: false, message: 'نسب العمولة مطلوبة' },
        { status: 400 }
      );
    }
    
    // Validate each rate
    for (const rate of commissionRates) {
      if (!rate.minPrice || !rate.maxPrice || !rate.rate) {
        return NextResponse.json(
          { success: false, message: 'جميع حقول نسبة العمولة مطلوبة' },
          { status: 400 }
        );
      }
      
      if (rate.rate < 0 || rate.rate > 100) {
        return NextResponse.json(
          { success: false, message: 'نسبة العمولة يجب أن تكون بين 0 و 100' },
          { status: 400 }
        );
      }
    }
    
    // Check for overlapping ranges
    const sortedRates = [...commissionRates].sort((a, b) => a.minPrice - b.minPrice);
    for (let i = 0; i < sortedRates.length - 1; i++) {
      if (sortedRates[i].maxPrice >= sortedRates[i + 1].minPrice) {
        return NextResponse.json(
          { success: false, message: 'نطاقات العمولة متداخلة' },
          { status: 400 }
        );
      }
    }
    
    // Update system settings
    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { 
        commissionRates,
        updatedBy: user._id
      },
      { new: true, upsert: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث نسب العمولة بنجاح',
      settings: {
        commissionRates: settings.commissionRates
      }
    });
    
    logger.business('Commission settings updated', { adminId: user._id });
    logger.apiResponse('POST', '/api/admin/earnings', 200);
  } catch (error) {
    logger.error('Error updating commission settings', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث نسب العمولة');
  }
}); 