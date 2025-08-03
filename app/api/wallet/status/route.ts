import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Wallet from '@/models/Wallet';
import Order from '@/models/Order';

// GET /api/wallet/status - Get wallet status and earnings
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    console.log('🔍 جلب حالة المحفظة للمستخدم:', user._id, user.role);
    
    await connectDB();
    
    // Get user's wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    
    if (!wallet) {
      console.log('📝 إنشاء محفظة جديدة للمستخدم:', user._id);
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        userId: user._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
        minimumWithdrawal: 100,
        canWithdraw: false
      });
    }
    
    console.log('💰 المحفظة الحالية:', {
      balance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      totalWithdrawals: wallet.totalWithdrawals
    });
    
    // Get user's orders for earnings calculation
    const userOrders = await Order.find({
      $or: [
        { customerId: user._id },
        { supplierId: user._id }
      ]
    }).select('status marketerProfit commission total createdAt customerRole');
    
    console.log(`📦 عدد الطلبات للمستخدم: ${userOrders.length}`);
    
    // Calculate earnings from delivered orders
    const deliveredOrders = userOrders.filter(order => order.status === 'delivered');
    const pendingEarnings = userOrders.filter(order => 
      ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)
    );
    
    console.log(`✅ الطلبات المكتملة: ${deliveredOrders.length}`);
    console.log(`⏳ الطلبات المعلقة: ${pendingEarnings.length}`);
    
    let totalEarned = 0;
    let pendingEarningsAmount = 0;
    
    if (user.role === 'marketer') {
      // For marketers, calculate marketer profit
      deliveredOrders.forEach(order => {
        if (order.customerRole === 'marketer') {
          totalEarned += order.marketerProfit || 0;
          console.log(`💸 ربح من طلب ${order._id}: ${order.marketerProfit}`);
        }
      });
      
      pendingEarnings.forEach(order => {
        if (order.customerRole === 'marketer') {
          pendingEarningsAmount += order.marketerProfit || 0;
          console.log(`⏳ ربح معلق من طلب ${order._id}: ${order.marketerProfit}`);
        }
      });
    } else if (user.role === 'admin') {
      // For admins, calculate commission
      deliveredOrders.forEach(order => {
        totalEarned += order.commission || 0;
        console.log(`💸 عمولة من طلب ${order._id}: ${order.commission}`);
      });
      
      pendingEarnings.forEach(order => {
        pendingEarningsAmount += order.commission || 0;
        console.log(`⏳ عمولة معلقة من طلب ${order._id}: ${order.commission}`);
      });
    }
    
    console.log(`💰 إجمالي الأرباح المحققة: ${totalEarned}`);
    console.log(`⏳ إجمالي الأرباح المعلقة: ${pendingEarningsAmount}`);
    
    // Get recent transactions (simplified for now)
    const transactions = [];
    
    // Add sample transaction if user has earnings
    if (totalEarned > 0) {
      transactions.push({
        _id: 'transaction-1',
        type: 'credit',
        amount: totalEarned,
        description: 'أرباح من الطلبات المكتملة',
        createdAt: new Date().toISOString()
      });
    }
    
    const response = {
      success: true,
      wallet: {
        balance: wallet.balance || 0,
        totalEarnings: wallet.totalEarnings || 0,
        totalWithdrawals: wallet.totalWithdrawals || 0,
        availableBalance: wallet.balance || 0,
        canWithdraw: (wallet.balance || 0) >= (wallet.minimumWithdrawal || 100),
        minimumWithdrawal: wallet.minimumWithdrawal || 100
      },
      earnings: {
        totalEarned,
        pendingEarnings: pendingEarningsAmount,
        deliveredOrders: deliveredOrders.length,
        pendingOrders: pendingEarnings.length
      },
      recentTransactions: transactions
    };
    
    console.log('📤 إرسال البيانات:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ خطأ في جلب حالة المحفظة:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'حدث خطأ أثناء جلب حالة المحفظة',
        details: error instanceof Error ? error.message : 'خطأ غير معروف' 
      },
      { status: 500 }
    );
  }
}); 