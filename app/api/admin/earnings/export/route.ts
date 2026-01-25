import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';

// GET /api/admin/earnings/export - Export earnings report as CSV
export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month';
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
    const wallets = await Wallet.find().populate('userId', 'name role');
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
    
    // Generate CSV content
    const csvContent = generateCSV({
      period,
      dateRange: {
        start: dateFilter.createdAt?.$gte || new Date(),
        end: dateFilter.createdAt?.$lte || new Date()
      },
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
      orders
    });
    
    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="earnings-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تصدير تقرير الأرباح' },
      { status: 500 }
    );
  }
});

function generateCSV(data: any): string {
  const {
    period,
    dateRange,
    statistics,
    earningsByRole,
    topEarners,
    orders
  } = data;
  
  let csv = '\ufeff'; // BOM for Arabic text
  
  // Header
  csv += 'تقرير الأرباح والعمولات\n';
  csv += `الفترة: ${period}\n`;
  csv += `من: ${new Date(dateRange.start).toLocaleDateString('en-US')}\n`;
  csv += `إلى: ${new Date(dateRange.end).toLocaleDateString('en-US')}\n`;
  csv += `تاريخ التصدير: ${new Date().toLocaleDateString('en-US')}\n\n`;
  
  // Summary Statistics
  csv += 'الإحصائيات العامة\n';
  csv += 'إجمالي الطلبات,إجمالي الإيرادات,عمولة المنصة,أرباح المسوقين,إيرادات الموردين,إجمالي رصيد المحافظ,إجمالي الأرباح,إجمالي السحوبات\n';
  csv += `${statistics.totalOrders},${statistics.totalRevenue},${statistics.totalCommission},${statistics.totalMarketerProfit},${statistics.totalSupplierRevenue},${statistics.totalWalletBalance},${statistics.totalEarnings},${statistics.totalWithdrawals}\n\n`;
  
  // Earnings by Role
  csv += 'الأرباح حسب الدور\n';
  csv += 'الدور,عدد الطلبات,إجمالي الإيرادات,إجمالي الأرباح\n';
  earningsByRole.forEach((role: any) => {
    csv += `${role._id || 'غير محدد'},${role.count},${role.totalRevenue},${role.totalProfit}\n`;
  });
  csv += '\n';
  
  // Top Earners
  csv += 'أعلى الأرباح\n';
  csv += 'الاسم,الدور,الرصيد الحالي,إجمالي الأرباح\n';
  topEarners.forEach((earner: any) => {
    csv += `${earner.name},${earner.role},${earner.balance},${earner.totalEarnings}\n`;
  });
  csv += '\n';
  
  // Detailed Orders
  csv += 'تفاصيل الطلبات\n';
  csv += 'رقم الطلب,اسم العميل,دور العميل,إجمالي الطلب,عمولة المنصة,ربح المسوق,تاريخ الطلب\n';
  orders.forEach((order: any) => {
    csv += `${order._id},${order.customerId?.name || 'غير محدد'},${order.customerId?.role || 'غير محدد'},${order.total},${order.commission},${order.marketerProfit || 0},${new Date(order.createdAt).toLocaleDateString('en-US')}\n`;
  });
  
  return csv;
}
