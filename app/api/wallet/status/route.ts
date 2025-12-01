import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Wallet from '@/models/Wallet';
import Order from '@/models/Order';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/wallet/status - Get wallet status and earnings
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    logger.apiRequest('GET', '/api/wallet/status', { userId: user._id, role: user.role });
    
    await connectDB();
    
    // Get user's wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    
    if (!wallet) {
      logger.debug('Creating new wallet for user', { userId: user._id });
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
    
    logger.debug('Current wallet status', {
      userId: user._id,
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
    
    logger.debug('User orders found', { userId: user._id, ordersCount: userOrders.length });
    
    // Calculate earnings from delivered orders
    const deliveredOrders = userOrders.filter(order => order.status === 'delivered');
    const pendingEarnings = userOrders.filter(order => 
      ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)
    );
    
    logger.debug('Order status breakdown', {
      userId: user._id,
      deliveredCount: deliveredOrders.length,
      pendingCount: pendingEarnings.length
    });
    
    let totalEarned = 0;
    let pendingEarningsAmount = 0;
    
    if (user.role === 'marketer') {
      // For marketers, calculate marketer profit
      deliveredOrders.forEach(order => {
        if (order.customerRole === 'marketer') {
          totalEarned += order.marketerProfit || 0;
        }
      });
      
      pendingEarnings.forEach(order => {
        if (order.customerRole === 'marketer') {
          pendingEarningsAmount += order.marketerProfit || 0;
        }
      });
    } else if (user.role === 'admin') {
      // For admins, calculate commission
      deliveredOrders.forEach(order => {
        totalEarned += order.commission || 0;
      });
      
      pendingEarnings.forEach(order => {
        pendingEarningsAmount += order.commission || 0;
      });
    }
    
    logger.debug('Earnings calculated', {
      userId: user._id,
      role: user.role,
      totalEarned,
      pendingEarningsAmount
    });
    
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
    
    // Calculate available balance (balance minus pending withdrawals)
    const pendingWithdrawals = wallet.pendingWithdrawals || 0;
    const availableBalance = Math.max(0, (wallet.balance || 0) - pendingWithdrawals);
    const canWithdraw = availableBalance >= (wallet.minimumWithdrawal || 100);
    
    const response = {
      success: true,
      wallet: {
        balance: wallet.balance || 0,
        pendingWithdrawals: pendingWithdrawals,
        totalEarnings: wallet.totalEarnings || 0,
        totalWithdrawals: wallet.totalWithdrawals || 0,
        availableBalance: availableBalance,
        canWithdraw: canWithdraw,
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
    
    logger.apiResponse('GET', '/api/wallet/status', 200);
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching wallet status', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب حالة المحفظة');
  }
}); 