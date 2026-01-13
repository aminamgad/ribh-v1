import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';

// GET /api/analytics/export - Export analytics report as CSV
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'month';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    
    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();
    
    if (customStartDate && customEndDate) {
      // Use custom date range
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Use predefined ranges
      switch (range) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
    }
    
    // Role-based data filtering
    let orderFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    let productFilter: any = {};
    
    if (user.role === 'supplier') {
      orderFilter.supplierId = user._id;
      productFilter.supplierId = user._id;
    } else if (user.role === 'marketer' || user.role === 'wholesaler') {
      orderFilter.customerId = user._id;
    }
    
    // Get orders data
    const orders = await Order.find(orderFilter).populate('customerId', 'name role');
    
    // Get products data
    const products = await Product.find({
      ...productFilter,
      isActive: true,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Get users data (admin only)
    let usersData: any = { total: 0, byRole: [] };
    if (user.role === 'admin') {
      const users = await User.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      usersData.total = users.length;
      
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);
      usersData.byRole = usersByRole;
    }
    
    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const totalProducts = products.length;
    
    // Get top selling products
    const topSellingProducts = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          sales: 1,
          revenue: 1
        }
      }
    ]);
    
    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Generate CSV content
    const csvContent = generateCSV({
      range,
      dateRange: {
        start: startDate,
        end: endDate
      },
      userRole: user.role,
      statistics: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalUsers: usersData.total
      },
      topSellingProducts,
      ordersByStatus,
      usersByRole: usersData.byRole,
      orders,
      products
    });
    
    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-report-${range}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تصدير التقرير التحليلي' },
      { status: 500 }
    );
  }
});

function generateCSV(data: any): string {
  const {
    range,
    dateRange,
    userRole,
    statistics,
    topSellingProducts,
    ordersByStatus,
    usersByRole,
    orders,
    products
  } = data;
  
  let csv = '\ufeff'; // BOM for Arabic text
  
  // Header
  csv += 'التقرير التحليلي المتقدم\n';
  csv += `الفترة: ${range}\n`;
  csv += `من: ${new Date(dateRange.start).toLocaleDateString('en-US')}\n`;
  csv += `إلى: ${new Date(dateRange.end).toLocaleDateString('en-US')}\n`;
  csv += `دور المستخدم: ${userRole}\n`;
  csv += `تاريخ التصدير: ${new Date().toLocaleDateString('en-US')}\n\n`;
  
  // Summary Statistics
  csv += 'الإحصائيات العامة\n';
  csv += 'إجمالي الإيرادات,إجمالي الطلبات,إجمالي المنتجات';
  if (userRole === 'admin') {
    csv += ',إجمالي المستخدمين';
  }
  csv += '\n';
  csv += `${statistics.totalRevenue},${statistics.totalOrders},${statistics.totalProducts}`;
  if (userRole === 'admin') {
    csv += `,${statistics.totalUsers}`;
  }
  csv += '\n\n';
  
  // Orders by Status
  csv += 'الطلبات حسب الحالة\n';
  csv += 'الحالة,العدد\n';
  ordersByStatus.forEach((status: any) => {
    csv += `${status._id},${status.count}\n`;
  });
  csv += '\n';
  
  // Top Selling Products
  csv += 'المنتجات الأكثر مبيعاً\n';
  csv += 'اسم المنتج,عدد المبيعات,الإيرادات\n';
  topSellingProducts.forEach((product: any) => {
    csv += `${product.name},${product.sales},${product.revenue}\n`;
  });
  csv += '\n';
  
  // Users by Role (admin only)
  if (userRole === 'admin' && usersByRole.length > 0) {
    csv += 'المستخدمون حسب الدور\n';
    csv += 'الدور,العدد\n';
    usersByRole.forEach((role: any) => {
      csv += `${role._id},${role.count}\n`;
    });
    csv += '\n';
  }
  
  // Detailed Orders
  csv += 'تفاصيل الطلبات\n';
  csv += 'رقم الطلب,اسم العميل,دور العميل,إجمالي الطلب,الحالة,تاريخ الطلب\n';
  orders.forEach((order: any) => {
    csv += `${order._id},${order.customerId?.name || 'غير محدد'},${order.customerId?.role || 'غير محدد'},${order.total},${order.status},${new Date(order.createdAt).toLocaleDateString('en-US')}\n`;
  });
  csv += '\n';
  
  // Products List
  csv += 'قائمة المنتجات\n';
  csv += 'اسم المنتج,السعر,الحالة,تاريخ الإنشاء\n';
  products.forEach((product: any) => {
    csv += `${product.name},${product.price},${product.isActive ? 'نشط' : 'غير نشط'},${new Date(product.createdAt).toLocaleDateString('en-US')}\n`;
  });
  
  return csv;
}
