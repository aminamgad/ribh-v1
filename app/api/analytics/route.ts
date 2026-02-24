import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Category from '@/models/Category';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

async function getAnalytics(req: NextRequest, user: any) {
  try {
    await connectDB();

    // صلاحيات التحليلات: الأدمن يحتاج analytics.view، وبيانات الطلبات/المنتجات/المستخدمين حسب الصلاحيات
    if (user.role === 'admin') {
      if (!hasPermission(user, PERMISSIONS.ANALYTICS_VIEW)) {
        return NextResponse.json({ message: 'غير مصرح لك بعرض التحليلات' }, { status: 403 });
      }
    }
    const canOrders = user.role !== 'admin' || hasPermission(user, PERMISSIONS.ORDERS_VIEW) || hasPermission(user, PERMISSIONS.ORDERS_MANAGE);
    const canProducts = user.role !== 'admin' || hasPermission(user, PERMISSIONS.PRODUCTS_VIEW) || hasPermission(user, PERMISSIONS.PRODUCTS_MANAGE);
    const canUsers = user.role === 'admin' && hasPermission(user, PERMISSIONS.USERS_VIEW);
    
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
    
    // Revenue & Orders analytics (فقط بصلاحية orders.view أو orders.manage)
    let revenueData: { _id: string; revenue: number }[] = [];
    let monthlyRevenue: { _id: string; revenue: number }[] = [];
    let currentTotal = 0;
    let revenueGrowth: number = 0;
    let ordersByStatus: { _id: string; count: number }[] = [];
    let dailyOrders: { _id: string; count: number }[] = [];
    let totalOrders = 0;
    let ordersGrowth: number = 0;

    if (canOrders) {
      const revData = await Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
      ]);
      revenueData = revData;
      const monRev = await Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
      ]);
      monthlyRevenue = monRev;
      const totalRevenue = await Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const previousPeriodFilter = {
        ...orderFilter,
        createdAt: { $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), $lt: startDate }
      };
      const previousRevenue = await Order.aggregate([
        { $match: previousPeriodFilter },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      currentTotal = totalRevenue[0]?.total || 0;
      const previousTotal = previousRevenue[0]?.total || 0;
      revenueGrowth = previousTotal > 0 ? Number(((currentTotal - previousTotal) / previousTotal * 100).toFixed(2)) : 0;
      ordersByStatus = await Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      dailyOrders = await Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      totalOrders = await Order.countDocuments(orderFilter);
      const previousOrders = await Order.countDocuments(previousPeriodFilter);
      ordersGrowth = previousOrders > 0 ? Number(((totalOrders - previousOrders) / previousOrders * 100).toFixed(2)) : 0;
    }

    // Products analytics: الأكثر مبيعاً من الطلبات (يحتاج canOrders)، الفئات والعدد (يحتاج canProducts)
    let topSellingProducts: { name: string; sales: number; revenue: number }[] = [];
    let productsByCategory: { category: string; count: number }[] = [];
    let totalProducts = 0;
    if (canOrders) {
      const topAgg = await Order.aggregate([
        { $match: orderFilter },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', sales: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { sales: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', sales: 1, revenue: 1 } }
      ]);
      topSellingProducts = topAgg;
    }
    if (canProducts) {
      productsByCategory = await Product.aggregate([
        { $match: { ...productFilter, isActive: true } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { category: '$category.name', count: 1 } }
      ]);
      totalProducts = await Product.countDocuments({
        ...productFilter,
        isActive: true,
        createdAt: { $gte: startDate, $lte: endDate }
      });
    }
    
    // Users analytics (فقط بصلاحية users.view)
    let usersData: {
      byRole: any[];
      newSignups: any[];
      total: number;
      growth: number;
    } = {
      byRole: [],
      newSignups: [],
      total: 0,
      growth: 0
    };
    
    if (canUsers) {
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            role: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);
      
      const newSignups = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            date: '$_id',
            count: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      const totalUsers = await User.countDocuments();
      const previousUsers = await User.countDocuments({
        createdAt: { $lt: startDate }
      });
      
      const usersGrowth = previousUsers > 0
        ? ((totalUsers - previousUsers) / previousUsers * 100).toFixed(2)
        : 0;
      
      usersData = {
        byRole: usersByRole,
        newSignups,
        total: totalUsers,
        growth: typeof usersGrowth === 'string' ? parseFloat(usersGrowth) : usersGrowth
      };
    }
    
    return NextResponse.json({
      revenue: {
        daily: revenueData.map(item => ({
          date: item._id,
          revenue: item.revenue
        })),
        monthly: monthlyRevenue.map(item => ({
          month: item._id,
          revenue: item.revenue
        })),
        total: currentTotal,
        growth: typeof revenueGrowth === 'string' ? parseFloat(revenueGrowth) : revenueGrowth
      },
      orders: {
        daily: dailyOrders.map(item => ({
          date: item._id,
          count: item.count
        })),
        byStatus: ordersByStatus.map(item => ({
          status: item._id,
          count: item.count
        })),
        total: totalOrders,
        growth: typeof ordersGrowth === 'string' ? parseFloat(ordersGrowth) : ordersGrowth
      },
      products: {
        topSelling: topSellingProducts,
        byCategory: productsByCategory,
        total: totalProducts,
        growth: 0 // Calculate if needed
      },
      users: usersData
    });
    
    logger.apiResponse('GET', '/api/analytics', 200);
  } catch (error) {
    logger.error('Error fetching analytics', error, { userId: user._id, role: user.role });
    return handleApiError(error, 'حدث خطأ أثناء جلب البيانات التحليلية');
  }
}

export const GET = withAuth(getAnalytics); 