import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';

// Helper function to add profit to marketer's wallet
async function addProfitToWallet(userId: string, profit: number, orderId: string, orderNumber: string) {
  try {
    console.log(`💰 إضافة ربح المسوق للمحفظة:`, {
      userId,
      profit,
      orderId,
      orderNumber
    });

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      console.log(`📝 إنشاء محفظة جديدة للمستخدم: ${userId}`);
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        minimumWithdrawal: 100,
        canWithdraw: false
      });
    }
    
    if (profit > 0) {
      console.log(`💳 إضافة رصيد للمحفظة: ${profit}₪`);
      
      // Update wallet balance and total earnings
      wallet.balance = (wallet.balance || 0) + profit;
      wallet.totalEarnings = (wallet.totalEarnings || 0) + profit;
      wallet.canWithdraw = wallet.balance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      console.log(`✅ تم إضافة ${profit}₪ لربح المسوق بنجاح`);
      console.log(`💰 الرصيد الجديد: ${wallet.balance}₪`);
    } else {
      console.log(`ℹ️ لا يوجد ربح لإضافة للمسوق`);
    }
    
    return wallet;
  } catch (error) {
    console.error('❌ خطأ في إضافة ربح المسوق للمحفظة:', error);
    throw error;
  }
}

// Helper function to add profit to admin wallet
async function addAdminProfit(profit: number, orderId: string, orderNumber: string) {
  try {
    console.log(`💰 إضافة عمولة الإدارة:`, {
      profit,
      orderId,
      orderNumber
    });

    // Find admin user (assuming first admin or specific admin ID)
    const adminUser = await (await import('@/models/User')).default.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️ لم يتم العثور على مستخدم إدارة لتوزيع الأرباح');
      return;
    }

    console.log(`👤 تم العثور على مستخدم الإدارة: ${adminUser.name} (${adminUser._id})`);

    let wallet = await Wallet.findOne({ userId: adminUser._id });
    
    if (!wallet) {
      console.log(`📝 إنشاء محفظة جديدة للإدارة: ${adminUser._id}`);
      wallet = await Wallet.create({
        userId: adminUser._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        minimumWithdrawal: 100,
        canWithdraw: false
      });
    }
    
    if (profit > 0) {
      console.log(`💳 إضافة عمولة للإدارة: ${profit}₪`);
      
      // Update wallet balance and total earnings
      wallet.balance = (wallet.balance || 0) + profit;
      wallet.totalEarnings = (wallet.totalEarnings || 0) + profit;
      wallet.canWithdraw = wallet.balance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      console.log(`✅ تم إضافة ${profit}₪ لعمولة الإدارة بنجاح`);
      console.log(`💰 رصيد الإدارة الجديد: ${wallet.balance}₪`);
    } else {
      console.log(`ℹ️ لا توجد عمولة لإضافة للإدارة`);
    }
    
    return wallet;
  } catch (error) {
    console.error('❌ خطأ في إضافة عمولة الإدارة للمحفظة:', error);
    throw error;
  }
}

// PUT /api/orders/[id] - Update order status
export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    const body = await req.json();
    const { status, trackingNumber, shippingCompany, notes } = body;
    
    console.log(`🔄 تحديث حالة الطلب ${params.id} إلى: ${status}`);
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    console.log(`📦 تفاصيل الطلب:`, {
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      newStatus: status,
      customerRole: order.customerRole,
      marketerProfit: order.marketerProfit,
      commission: order.commission
    });

    // Check permissions
    const actualSupplierId = order.supplierId._id || order.supplierId;
    
    if (
      user.role === 'supplier' && actualSupplierId.toString() !== user._id.toString()
      || (user.role === 'marketer' || user.role === 'wholesaler')
    ) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذا الطلب' },
        { status: 403 }
      );
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': []
    };

    const currentStatus = order.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `لا يمكن تغيير حالة الطلب من ${currentStatus} إلى ${status}` },
        { status: 400 }
      );
    }

    // Update order status and related fields
    order.status = status;
    order.updatedAt = new Date();

    // Add status-specific data
    switch (status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        order.confirmedBy = user._id;
        break;
      case 'processing':
        order.processingAt = new Date();
        order.processedBy = user._id;
        break;
      case 'shipped':
        order.shippedAt = new Date();
        order.shippedBy = user._id;
        order.trackingNumber = trackingNumber;
        order.shippingCompany = shippingCompany;
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        order.deliveredBy = user._id;
        order.actualDelivery = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.cancelledBy = user._id;
        break;
      case 'returned':
        order.returnedAt = new Date();
        order.returnedBy = user._id;
        break;
    }

    // Add notes if provided
    if (notes) {
      order.adminNotes = notes;
    }

    // Handle profit distribution when order is delivered
    if (status === 'delivered') {
      console.log(`🎉 تم تسليم الطلب! توزيع الأرباح...`);
      
      try {
        // Add marketer profit if applicable
        if (order.marketerProfit > 0 && order.customerRole === 'marketer') {
          console.log(`💸 إضافة ربح المسوق: ${order.marketerProfit}₪`);
          await addProfitToWallet(
            order.customerId._id || order.customerId,
            order.marketerProfit,
            order._id,
            order.orderNumber
          );
        } else {
          console.log(`ℹ️ لا يوجد ربح لإضافة للمسوق:`, {
            marketerProfit: order.marketerProfit,
            customerRole: order.customerRole
          });
        }

        // Add admin profit (commission)
        if (order.commission > 0) {
          console.log(`💸 إضافة عمولة الإدارة: ${order.commission}₪`);
          await addAdminProfit(order.commission, order._id, order.orderNumber);
        } else {
          console.log(`ℹ️ لا توجد عمولة لإضافة للإدارة`);
        }

        console.log('✅ تم توزيع الأرباح بنجاح:', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          marketerProfit: order.marketerProfit,
          adminCommission: order.commission,
          customerRole: order.customerRole
        });
      } catch (error) {
        console.error('❌ خطأ في توزيع الأرباح:', error);
        // Continue with order update even if profit distribution fails
        // But return an error response to inform the user
        return NextResponse.json(
          { 
            success: false,
            message: 'تم تحديث حالة الطلب ولكن حدث خطأ في إضافة الأرباح',
            error: error instanceof Error ? error.message : 'خطأ غير معروف'
          },
          { status: 500 }
        );
      }
    }

    await order.save();
    console.log(`✅ تم تحديث الطلب بنجاح: ${order.orderNumber}`);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
        trackingNumber: order.trackingNumber,
        shippingCompany: order.shippingCompany,
        adminNotes: order.adminNotes
      }
    });
  } catch (error) {
    console.error('خطأ في تحديث الطلب:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الطلب' },
      { status: 500 }
    );
  }
});

// GET /api/orders/[id] - Get order details
export const GET = withAuth(async (req: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    
    const order = await Order.findById(params.id)
      .populate('items.productId', 'name images marketerPrice wholesalePrice costPrice')
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email phone');
    
    console.log('تم العثور على الطلب:', {
      orderId: params.id,
      orderSupplierId: order?.supplierId,
      orderCustomerId: order?.customerId,
      orderStatus: order?.status
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }

    // Check permissions
    const actualSupplierId = order.supplierId._id || order.supplierId;
    const actualCustomerId = order.customerId._id || order.customerId;
    
    console.log('فحص الصلاحية:', {
      userRole: user.role,
      userId: user._id,
      orderSupplierId: actualSupplierId,
      orderCustomerId: actualCustomerId,
      supplierMatch: user.role === 'supplier' ? actualSupplierId.toString() === user._id.toString() : null,
      customerMatch: (user.role === 'marketer' || user.role === 'wholesaler') ? actualCustomerId.toString() === user._id.toString() : null
    });
    
    if (
      user.role === 'supplier' && actualSupplierId.toString() !== user._id.toString()
      || (user.role === 'marketer' || user.role === 'wholesaler') && actualCustomerId.toString() !== user._id.toString()
    ) {
      console.log('تم الوصول إلى الوصول ممنوع للمستخدم:', user._id, 'الدور:', user.role);
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض هذا الطلب' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('خطأ في جلب تفاصيل الطلب:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب تفاصيل الطلب' },
      { status: 500 }
    );
  }
}); 