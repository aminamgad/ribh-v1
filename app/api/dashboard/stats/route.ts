import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Favorite from '@/models/Favorite';
import Message from '@/models/Message';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { statsCache, generateCacheKey } from '@/lib/cache';

async function handler(req: NextRequest, user: any) {
  try {
    await connectDB();

    // Generate cache key based on user role and ID
    const cacheKey = generateCacheKey('stats', user.role, user._id.toString());
    
    // Check if cache-busting is requested (for manual refresh)
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('t'); // timestamp query parameter
    
    // Try to get from cache (only if not forcing refresh)
    if (!forceRefresh) {
      const cached = statsCache.get<any>(cacheKey);
      if (cached) {
        logger.debug('Stats served from cache', { cacheKey, userId: user._id });
        return NextResponse.json({
          success: true,
          stats: cached,
          cached: true
        });
      }
    } else {
      logger.debug('Force refresh requested, bypassing cache', { cacheKey, userId: user._id });
    }

    // Get current and previous month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let stats: any = {};

    switch (user.role) {
      case 'admin':
        // Admin sees all stats
        const [
          totalOrders,
          currentMonthOrders,
          previousMonthOrders,
          totalRevenue,
          currentMonthRevenue,
          previousMonthRevenue,
          totalProducts,
          currentMonthProducts,
          previousMonthProducts,
          totalUsers,
          currentMonthUsers,
          previousMonthUsers,
          totalMessages,
          pendingMessages,
          recentOrders,
          topProducts
        ] = await Promise.all([
          Order.countDocuments(),
          Order.countDocuments({
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          Order.countDocuments({
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          Order.aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Product.countDocuments({ isActive: true, isApproved: true }),
          Product.countDocuments({
            isActive: true,
            isApproved: true,
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          Product.countDocuments({
            isActive: true,
            isApproved: true,
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          User.countDocuments({ isActive: true }),
          User.countDocuments({
            isActive: true,
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          User.countDocuments({
            isActive: true,
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          Message.countDocuments(),
          Message.countDocuments({ isApproved: { $ne: true } }),
          Order.find()
            .populate('customerId', 'name')
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          Product.find({ isActive: true, isApproved: true })
            .populate('supplierId', 'name')
            .sort({ sales: -1 })
            .limit(5)
            .lean()
        ]);

        // Calculate percentages
        const ordersPercentage = calculatePercentage(currentMonthOrders, previousMonthOrders);
        const revenuePercentage = calculatePercentage(
          currentMonthRevenue[0]?.total || 0,
          previousMonthRevenue[0]?.total || 0
        );
        const productsPercentage = calculatePercentage(currentMonthProducts, previousMonthProducts);
        const usersPercentage = calculatePercentage(currentMonthUsers, previousMonthUsers);

        stats = {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalProducts,
          totalUsers,
          totalMessages,
          pendingMessages,
          ordersPercentage,
          revenuePercentage,
          productsPercentage,
          usersPercentage,
          recentOrders: recentOrders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            customerName: order.customerId?.name || 'غير محدد',
            supplierName: order.supplierId?.name || 'غير محدد',
            total: order.total,
            status: order.status,
            createdAt: order.createdAt
          })),
          topProducts: topProducts.map(product => ({
            _id: product._id,
            name: product.name,
            supplierName: product.supplierId?.name || 'غير محدد',
            categoryName: 'غير محدد',
            sales: product.sales || 0,
            rating: product.rating?.average || 0,
            marketerPrice: product.marketerPrice,
            wholesalerPrice: product.wholesalerPrice,
            images: product.images || []
          }))
        };
        break;

      case 'supplier':
        // Supplier sees their own stats
        const [
          supplierOrders,
          supplierCurrentMonthOrders,
          supplierPreviousMonthOrders,
          supplierRevenue,
          supplierCurrentMonthRevenue,
          supplierPreviousMonthRevenue,
          supplierProducts,
          supplierActiveProducts,
          supplierCurrentMonthProducts,
          supplierPreviousMonthProducts,
          supplierRecentOrders,
          supplierTopProducts
        ] = await Promise.all([
          Order.countDocuments({ supplierId: user._id }),
          Order.countDocuments({
            supplierId: user._id,
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          Order.countDocuments({
            supplierId: user._id,
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          Order.aggregate([
            { $match: { supplierId: user._id } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { supplierId: user._id, createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { supplierId: user._id, createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Product.countDocuments({ supplierId: user._id, isActive: true }),
          Product.countDocuments({ supplierId: user._id, isActive: true, isApproved: true }),
          Product.countDocuments({
            supplierId: user._id,
            isActive: true,
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          Product.countDocuments({
            supplierId: user._id,
            isActive: true,
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          Order.find({ supplierId: user._id })
            .populate('customerId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          Product.find({ supplierId: user._id, isActive: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
        ]);

        // Calculate percentages for supplier
        const supplierOrdersPercentage = calculatePercentage(supplierCurrentMonthOrders, supplierPreviousMonthOrders);
        const supplierRevenuePercentage = calculatePercentage(
          supplierCurrentMonthRevenue[0]?.total || 0,
          supplierPreviousMonthRevenue[0]?.total || 0
        );
        const supplierProductsPercentage = calculatePercentage(supplierCurrentMonthProducts, supplierPreviousMonthProducts);

        stats = {
          totalOrders: supplierOrders,
          totalRevenue: supplierRevenue[0]?.total || 0,
          totalProducts: supplierProducts,
          activeProducts: supplierActiveProducts,
          totalUsers: 0, // Not relevant for supplier
          ordersPercentage: supplierOrdersPercentage,
          revenuePercentage: supplierRevenuePercentage,
          productsPercentage: supplierProductsPercentage,
          usersPercentage: 0,
          recentOrders: supplierRecentOrders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            customerName: order.customerId?.name || 'غير محدد',
            total: order.total,
            status: order.status,
            createdAt: order.createdAt
          })),
          topProducts: supplierTopProducts.map(product => ({
            _id: product._id,
            name: product.name,
            categoryName: 'غير محدد',
            stockQuantity: product.stockQuantity,
            marketerPrice: product.marketerPrice,
            wholesalerPrice: product.wholesalerPrice,
            isApproved: product.isApproved,
            sales: product.sales || 0,
            images: product.images || []
          }))
        };
        break;

      case 'marketer':
      case 'wholesaler':
        // Marketer/Wholesaler sees available products and their orders
        const [
          customerOrders,
          customerCurrentMonthOrders,
          customerPreviousMonthOrders,
          customerRevenue,
          customerCurrentMonthRevenue,
          customerPreviousMonthRevenue,
          availableProducts,
          customerRecentOrders,
          favoritesCount,
          currentMonthFavorites,
          previousMonthFavorites
        ] = await Promise.all([
          Order.countDocuments({ customerId: user._id }),
          Order.countDocuments({
            customerId: user._id,
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
          }),
          Order.countDocuments({
            customerId: user._id,
            createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
          }),
          Order.aggregate([
            { $match: { customerId: user._id } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { customerId: user._id, createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Order.aggregate([
            { $match: { customerId: user._id, createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]),
          Product.find({ isActive: true, isApproved: true })
            .populate('supplierId', 'name')
            .sort({ sales: -1 })
            .limit(5)
            .lean(),
          Order.find({ customerId: user._id })
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          // إحصائيات المفضلة للمسوق
          user.role === 'marketer' ? 
            Favorite.countDocuments({ userId: user._id }) : Promise.resolve(0),
          user.role === 'marketer' ? 
            Favorite.countDocuments({
              userId: user._id,
              addedAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
            }) : Promise.resolve(0),
          user.role === 'marketer' ? 
            Favorite.countDocuments({
              userId: user._id,
              addedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
            }) : Promise.resolve(0)
        ]);

        // Calculate percentages for customer
        const customerOrdersPercentage = calculatePercentage(customerCurrentMonthOrders, customerPreviousMonthOrders);
        const customerRevenuePercentage = calculatePercentage(
          customerCurrentMonthRevenue[0]?.total || 0,
          customerPreviousMonthRevenue[0]?.total || 0
        );
        const favoritesPercentage = user.role === 'marketer' ? 
          calculatePercentage(currentMonthFavorites, previousMonthFavorites) : 0;

        stats = {
          totalOrders: customerOrders,
          totalRevenue: customerRevenue[0]?.total || 0,
          totalProducts: await Product.countDocuments({ isActive: true, isApproved: true }),
          totalUsers: 0, // Not relevant for customer
          ordersPercentage: customerOrdersPercentage,
          revenuePercentage: customerRevenuePercentage,
          productsPercentage: favoritesPercentage, // استخدام نسبة المفضلة للمسوق
          usersPercentage: 0,
          recentOrders: customerRecentOrders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            supplierName: order.supplierId?.name || 'غير محدد',
            total: order.total,
            status: order.status,
            createdAt: order.createdAt
          })),
          topProducts: availableProducts.map(product => ({
            _id: product._id,
            name: product.name,
            categoryName: 'غير محدد',
            marketerPrice: product.marketerPrice,
            wholesalerPrice: product.wholesalerPrice,
            inStock: product.stockQuantity > 0,
            stockQuantity: product.stockQuantity,
            supplierName: product.supplierId?.name || 'غير محدد',
            images: product.images || []
          })),
          // إضافة إحصائيات خاصة بالمسوق
          favoritesCount: user.role === 'marketer' ? favoritesCount : 0,
          favoritesPercentage: user.role === 'marketer' ? favoritesPercentage : 0
        };
        break;

      default:
        stats = {
          totalOrders: 0,
          totalRevenue: 0,
          totalProducts: 0,
          totalUsers: 0,
          ordersPercentage: 0,
          revenuePercentage: 0,
          productsPercentage: 0,
          usersPercentage: 0,
          recentOrders: [],
          topProducts: []
        };
    }

    // Cache the results
    statsCache.set(cacheKey, stats);
    
    return NextResponse.json({
      success: true,
      stats
    });

    logger.apiResponse('GET', '/api/dashboard/stats', 200);
  } catch (error) {
    logger.error('Dashboard stats error', error, { userId: user?._id, role: user?.role });
    return handleApiError(error, 'حدث خطأ أثناء جلب الإحصائيات');
  }
}

// Helper function to calculate percentage change
function calculatePercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export const GET = withAuth(handler); 