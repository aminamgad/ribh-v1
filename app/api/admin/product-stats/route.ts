import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';

export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'معرف المنتج مطلوب' },
        { status: 400 }
      );
    }

    // Convert productId string to ObjectId
    let productObjectId;
    try {
      productObjectId = new mongoose.Types.ObjectId(productId);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'معرف المنتج غير صحيح' },
        { status: 400 }
      );
    }

    // Validate product exists
    const product = await Product.findById(productObjectId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // Calculate date range
    let endDateObj = new Date();
    let startDateObj = new Date();
    
    if (startDate && endDate) {
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      // Default to last 30 days
      startDateObj.setDate(endDateObj.getDate() - 30);
    }

    const dateFilter = {
      createdAt: { $gte: startDateObj, $lte: endDateObj }
    };

    console.log('🔍 Product Stats Debug:', {
      productId: productId,
      productObjectId: productObjectId.toString(),
      dateFilter,
      productName: product.name
    });

    // Get orders containing this product
    const ordersWithProduct = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.productId': productObjectId
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.productId': productObjectId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: '$customer'
      }
    ]);

    console.log('📊 Orders found:', ordersWithProduct.length);

    // Calculate basic statistics
    const totalOrders = ordersWithProduct.length;
    const totalQuantity = ordersWithProduct.reduce((sum, order) => sum + order.items.quantity, 0);
    const totalRevenue = ordersWithProduct.reduce((sum, order) => sum + (order.items.totalPrice || 0), 0);
    const totalCost = ordersWithProduct.reduce((sum, order) => {
      // Calculate cost based on product's cost price
      const costPrice = product.costPrice || 0;
      return sum + (costPrice * order.items.quantity);
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : '0';

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.productId': productObjectId
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.productId': productObjectId
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          quantity: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Daily sales trend
    const dailySales = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.productId': productObjectId
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.productId': productObjectId
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          orders: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $project: {
          date: '$_id',
          orders: 1,
          quantity: 1,
          revenue: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Top customers for this product
    const topCustomers = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.productId': productObjectId
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.productId': productObjectId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: '$customer'
      },
      {
        $group: {
          _id: '$customerId',
          customerName: { $first: '$customer.name' },
          customerEmail: { $first: '$customer.email' },
          customerRole: { $first: '$customer.role' },
          orders: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $project: {
          customerName: 1,
          customerEmail: 1,
          customerRole: 1,
          orders: 1,
          quantity: 1,
          revenue: 1,
          _id: 0
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Product performance comparison (this product vs others in same category)
    const categoryProducts = await Product.find({
      categoryId: product.categoryId,
      _id: { $ne: productObjectId }
    });

    const categoryProductIds = categoryProducts.map(p => p._id);

    const categoryStats = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.productId': { $in: categoryProductIds }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.productId': { $in: categoryProductIds }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      }
    ]);

    const categoryTotalOrders = categoryStats[0]?.totalOrders || 0;
    const categoryTotalQuantity = categoryStats[0]?.totalQuantity || 0;
    const categoryTotalRevenue = categoryStats[0]?.totalRevenue || 0;

    // Calculate market share
    const marketShare = categoryTotalOrders > 0 
      ? ((totalOrders / categoryTotalOrders) * 100).toFixed(2) 
      : '0';

    console.log('📈 Final Stats:', {
      totalOrders,
      totalQuantity,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      marketShare
    });

    console.log('🖼️ Product data being returned:', {
      productName: product.name,
      productImages: product.images,
      imageCount: product.images?.length || 0,
      firstImage: product.images?.[0]
    });

    // Return comprehensive statistics
    return NextResponse.json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        images: product.images,
        price: product.price,
        wholesalePrice: product.wholesalePrice,
        costPrice: product.costPrice,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        isApproved: product.isApproved
      },
      statistics: {
        totalOrders,
        totalQuantity,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: parseFloat(profitMargin as string),
        marketShare: parseFloat(marketShare as string),
        averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
        averageQuantityPerOrder: totalOrders > 0 ? (totalQuantity / totalOrders).toFixed(2) : 0
      },
      ordersByStatus,
      dailySales,
      topCustomers,
      categoryComparison: {
        categoryTotalOrders,
        categoryTotalQuantity,
        categoryTotalRevenue,
        categoryProductCount: categoryProducts.length
      },
      dateRange: {
        start: startDateObj,
        end: endDateObj
      }
    });

  } catch (error) {
    console.error('Error fetching product statistics:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب إحصائيات المنتج' },
      { status: 500 }
    );
  }
});
