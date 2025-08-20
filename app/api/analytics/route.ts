import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Category from '@/models/Category';

async function getAnalytics(req: NextRequest, user: any) {
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
    
    // Revenue analytics
    const revenueData = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const monthlyRevenue = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const totalRevenue = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // Calculate growth
    const previousPeriodFilter = {
      ...orderFilter,
      createdAt: {
        $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
        $lt: startDate
      }
    };
    
    const previousRevenue = await Order.aggregate([
      { $match: previousPeriodFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    const currentTotal = totalRevenue[0]?.total || 0;
    const previousTotal = previousRevenue[0]?.total || 0;
    const revenueGrowth = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(2)
      : 0;
    
    // Orders analytics
    const ordersByStatus = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const dailyOrders = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const totalOrders = await Order.countDocuments(orderFilter);
    const previousOrders = await Order.countDocuments(previousPeriodFilter);
    const ordersGrowth = previousOrders > 0
      ? ((totalOrders - previousOrders) / previousOrders * 100).toFixed(2)
      : 0;
    
    // Products analytics
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
    
    const productsByCategory = await Product.aggregate([
      { $match: { ...productFilter, isActive: true } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          category: '$category.name',
          count: 1
        }
      }
    ]);
    
    const totalProducts = await Product.countDocuments({
      ...productFilter,
      isActive: true,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Users analytics (admin only)
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
    
    if (user.role === 'admin') {
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
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب البيانات التحليلية' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAnalytics); 