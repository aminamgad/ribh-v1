import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';

// Helper function to add profit to marketer's wallet
async function addProfitToWallet(userId: string, profit: number, orderId: string) {
  try {
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        userId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0
      });
    }
    
    if (profit > 0) {
      await wallet.addTransaction(
        'credit',
        profit,
        `ربح من الطلب رقم ${orderId}`,
        `order_profit_${orderId}`,
        {
          orderId,
          type: 'marketer_profit',
          source: 'order_completion'
        }
      );
    }
    
    return wallet;
  } catch (error) {
    console.error('Error adding profit to wallet:', error);
    throw error;
  }
}

// PUT /api/orders/[id] - Update order status
export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    const body = await req.json();
    const { status } = body;
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }
    // Only admin or supplier of this order can update
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
    // Update order status
    order.status = status;
    order.updatedAt = new Date();
    // If order is delivered and marketerProfit > 0, add profit to marketer's wallet
    if (status === 'delivered' && order.marketerProfit > 0 && order.customerRole === 'marketer') {
      const Wallet = (await import('@/models/Wallet')).default;
      let wallet = await Wallet.findOne({ userId: order.customerId });
      if (!wallet) {
        wallet = await Wallet.create({ userId: order.customerId, balance: 0, totalEarnings: 0, totalWithdrawals: 0 });
      }
      await wallet.addTransaction(
        'credit',
        order.marketerProfit,
        `ربح من الطلب رقم ${order.orderNumber}`,
        `order_profit_${order._id}`,
        { orderId: order._id, type: 'marketer_profit', source: 'order_completion' }
      );
    }
    await order.save();
    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      order
    });
  } catch (error) {
    console.error('Error updating order:', error);
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
    
    console.log('Order found:', {
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
    // Admin can view all orders
    // Supplier can view orders where they are the supplier
    // Marketer/Wholesaler can view their own orders
    // Get the actual supplier ID (handle both ObjectId and populated object)
    const actualSupplierId = order.supplierId._id || order.supplierId;
    const actualCustomerId = order.customerId._id || order.customerId;
    
    console.log('Permission check:', {
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
      console.log('Access denied for user:', user._id, 'role:', user.role);
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
    console.error('Error getting order:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب تفاصيل الطلب' },
      { status: 500 }
    );
  }
}); 