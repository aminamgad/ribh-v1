import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';
import User from '@/models/User';

// GET /api/admin/earnings - Get system earnings and commission reports
async function getEarningsReport(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, year
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Calculate date range
    let dateFilter: any = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
            }
          };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { createdAt: { $gte: weekAgo } };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1)
            }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), 0, 1)
            }
          };
          break;
      }
    }
    
    // Get total commission earned
    const commissionStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: '$commission' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageCommission: { $avg: '$commission' }
        }
      }
    ]);
    
    // Get commission by status
    const commissionByStatus = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          commission: { $sum: '$commission' },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ]);
    
    // Get top suppliers by commission
    const topSuppliers = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$supplierId',
          totalCommission: { $sum: '$commission' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { totalCommission: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate supplier names
    const supplierIds = topSuppliers.map(s => s._id);
    const suppliers = await User.find({ _id: { $in: supplierIds } }, 'name email companyName');
    const supplierMap = suppliers.reduce((map, supplier) => {
      map[supplier._id.toString()] = supplier;
      return map;
    }, {} as any);
    
    const topSuppliersWithNames = topSuppliers.map(supplier => ({
      ...supplier,
      supplier: supplierMap[supplier._id.toString()]
    }));
    
    // Get system owner's wallet balance
    const systemOwner = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    let systemWalletBalance = 0;
    
    if (systemOwner) {
      const systemWallet = await Wallet.findOne({ userId: systemOwner._id });
      if (systemWallet) {
        systemWalletBalance = systemWallet.balance;
      }
    }
    
    // Get recent commission transactions
    const recentCommissions = await Order.find(dateFilter)
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name')
      .select('orderNumber commission total status createdAt supplierId customerId')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const stats = commissionStats[0] || {
      totalCommission: 0,
      totalOrders: 0,
      totalRevenue: 0,
      averageCommission: 0
    };
    
    return NextResponse.json({
      success: true,
      report: {
        period,
        dateRange: dateFilter,
        summary: {
          totalCommission: stats.totalCommission,
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          averageCommission: stats.averageCommission,
          systemWalletBalance
        },
        commissionByStatus,
        topSuppliers: topSuppliersWithNames,
        recentCommissions
      }
    });
    
  } catch (error) {
    console.error('Error generating earnings report:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إنشاء تقرير الأرباح' },
      { status: 500 }
    );
  }
}

export const GET = withRole(['admin'])(getEarningsReport); 