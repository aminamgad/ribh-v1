import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';

interface RouteParams {
  params: { id: string };
}

// GET /api/admin/users/[id] - Get user details
async function getUserDetail(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    const userDetail = await User.findById(params.id).select('-password').lean();
    
    if (!userDetail) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Get user statistics
    const productCount = await Product.countDocuments({ supplierId: params.id });
    const orderCount = await Order.countDocuments({ 
      $or: [
        { customerId: params.id },
        { supplierId: params.id }
      ]
    });

    // Get recent products (if supplier)
    let recentProducts = [];
    if (userDetail.role === 'supplier') {
      recentProducts = await Product.find({ supplierId: params.id })
        .select('name images marketerPrice isApproved')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    // Get recent orders
    const recentOrders = await Order.find({
      $or: [
        { customerId: params.id },
        { supplierId: params.id }
      ]
    })
    .select('orderNumber total status createdAt')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    // Calculate total revenue (if supplier)
    let totalRevenue = 0;
    if (userDetail.role === 'supplier') {
      const revenueData = await Order.aggregate([
        { $match: { supplierId: params.id, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    }

    const userWithStats = {
      ...userDetail,
      productCount,
      orderCount,
      totalRevenue,
      recentProducts,
      recentOrders
    };

    return NextResponse.json({
      success: true,
      user: userWithStats
    });
  } catch (error) {
    console.error('Error fetching user detail:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب تفاصيل المستخدم' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
async function updateUser(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Check if user exists
    const existingUser = await User.findById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Prevent admin from changing their own role or status
    if (params.id === user._id.toString()) {
      delete body.role;
      delete body.isActive;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: body.role,
        companyName: body.companyName,
        address: body.address,
        taxId: body.taxId,
        isActive: body.isActive,
        isVerified: body.isVerified
      },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث المستخدم' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
async function deleteUser(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    // Check if user exists
    const existingUser = await User.findById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Prevent admin from deleting themselves
    if (params.id === user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'لا يمكنك حذف حسابك الخاص' },
        { status: 400 }
      );
    }

    // Check if user has products or orders
    const productCount = await Product.countDocuments({ supplierId: params.id });
    const orderCount = await Order.countDocuments({ 
      $or: [
        { customerId: params.id },
        { supplierId: params.id }
      ]
    });

    if (productCount > 0 || orderCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'لا يمكن حذف المستخدم لوجود منتجات أو طلبات مرتبطة به',
          productCount,
          orderCount
        },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف المستخدم' },
      { status: 500 }
    );
  }
}

export const GET = withRole(['admin'])(getUserDetail);
export const PUT = withRole(['admin'])(updateUser);
export const DELETE = withRole(['admin'])(deleteUser); 