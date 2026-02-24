import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { walletRateLimit } from '@/lib/rate-limiter';
import { withdrawalRequestSchema } from '@/lib/validations/wallet.validation';
import { z } from 'zod';

// GET /api/wallet - Get user wallet
async function getWallet(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    let wallet = await Wallet.findOne({ userId: user._id });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        userId: user._id,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0
      });
    }
    
    // Get system settings for withdrawal limits
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const withdrawalSettings = (settings as any)?.withdrawalSettings;
    const minimumWithdrawal = withdrawalSettings?.minimumWithdrawal || (settings as any)?.minimumWithdrawal || 100;
    const maximumWithdrawal = withdrawalSettings?.maximumWithdrawal || (settings as any)?.maximumWithdrawal || 10000;
    const withdrawalFee = withdrawalSettings?.withdrawalFees || (settings as any)?.withdrawalFee || 0;
    
    // Calculate available balance (balance minus pending withdrawals)
    const pendingWithdrawals = wallet.pendingWithdrawals || 0;
    const availableBalance = Math.max(0, (wallet.balance || 0) - pendingWithdrawals);
    const pendingBalance = wallet.totalEarnings - wallet.balance;
    
    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance || 0,
        pendingWithdrawals: pendingWithdrawals,
        totalEarnings: wallet.totalEarnings || 0,
        totalWithdrawals: wallet.totalWithdrawals || 0,
        availableBalance: availableBalance,
        pendingBalance: pendingBalance,
        // Include withdrawal settings from system
        withdrawalSettings: {
          minimumWithdrawal,
          maximumWithdrawal,
          withdrawalFee,
          canWithdraw: availableBalance >= minimumWithdrawal && availableBalance > 0,
          maxWithdrawable: Math.min(availableBalance, maximumWithdrawal)
        }
      }
    });
    
    logger.apiResponse('GET', '/api/wallet', 200);
  } catch (error) {
    logger.error('Error fetching wallet', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب بيانات المحفظة');
  }
}

// POST /api/wallet - Request withdrawal
async function requestWithdrawal(req: NextRequest, user: any) {
  try {
    await connectDB();
    logger.apiRequest('POST', '/api/wallet', { userId: user._id, role: user.role });
    
    const body = await req.json();
    
    // Validate input using Zod schema
    let validatedData;
    try {
      validatedData = withdrawalRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Withdrawal request validation failed', { errors: error.errors, userId: user._id });
        return NextResponse.json(
          { success: false, message: error.errors[0].message, errors: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }
    
    const { amount, walletNumber, notes } = validatedData;
    
    // Get system settings
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const withdrawalSettings = (settings as any)?.withdrawalSettings;
    const minimumWithdrawal = withdrawalSettings?.minimumWithdrawal || (settings as any)?.minimumWithdrawal || 100;
    const maximumWithdrawal = withdrawalSettings?.maximumWithdrawal || (settings as any)?.maximumWithdrawal || 10000;
    const withdrawalFee = withdrawalSettings?.withdrawalFees || (settings as any)?.withdrawalFee || 0;
    
    // Get user wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: 'المحفظة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Validate withdrawal amount
    // Available balance = total balance - pending withdrawals (not total withdrawals)
    const availableBalance = Math.max(0, (wallet.balance || 0) - (wallet.pendingWithdrawals || 0));
    
    if (amount < minimumWithdrawal) {
      return NextResponse.json(
        { success: false, message: `الحد الأدنى للسحب هو ${minimumWithdrawal} ₪` },
        { status: 400 }
      );
    }
    
    if (amount > maximumWithdrawal) {
      return NextResponse.json(
        { success: false, message: `الحد الأقصى للسحب هو ${maximumWithdrawal} ₪` },
        { status: 400 }
      );
    }
    
    if (amount > availableBalance) {
      return NextResponse.json(
        { success: false, message: 'الرصيد المتاح غير كافي' },
        { status: 400 }
      );
    }
    
    // Calculate fee
    const feeAmount = (amount * withdrawalFee) / 100;
    const totalWithdrawal = amount + feeAmount;
    
    // Check if user can afford the total withdrawal (including fee)
    if (totalWithdrawal > availableBalance) {
      return NextResponse.json(
        { success: false, message: `الرصيد غير كافي لتغطية رسوم السحب (${feeAmount} ₪)` },
        { status: 400 }
      );
    }
    
    // Create withdrawal transaction
    const transaction = await wallet.addTransaction(
      'debit',
      totalWithdrawal,
      `طلب سحب ${amount} ₪${feeAmount > 0 ? ` + رسوم ${feeAmount} ₪` : ''}`,
      `withdrawal_${Date.now()}`,
      {
        withdrawalAmount: amount,
        feeAmount,
        walletNumber,
        notes,
        status: 'pending'
      }
    );

    // Send notification to admins with withdrawals.view permission only
    try {
      const { sendNotificationToAdminsWithPermission } = await import('@/lib/notifications');
      await sendNotificationToAdminsWithPermission(
        'withdrawals.view',
        {
          title: 'طلب سحب جديد',
          message: `طلب سحب جديد بقيمة ${amount} ₪ من ${user.name}`,
          type: 'info',
          actionUrl: '/dashboard/wallet',
          metadata: { 
            userId: user._id.toString(),
            userName: user.name,
            withdrawalAmount: amount,
            feeAmount,
            totalAmount: totalWithdrawal,
            transactionId: transaction._id.toString()
          }
        }
      );
    } catch (error) {
      logger.error('Error sending notifications to admins', error, { userId: user._id });
    }
    
    logger.business('Withdrawal request created', {
      userId: user._id,
      amount,
      feeAmount,
      totalAmount: totalWithdrawal,
      transactionId: transaction._id.toString()
    });
    logger.apiResponse('POST', '/api/wallet', 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب السحب بنجاح',
      withdrawal: {
        id: transaction._id,
        amount,
        feeAmount,
        totalAmount: totalWithdrawal,
        status: 'pending',
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    logger.error('Error requesting withdrawal', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إرسال طلب السحب');
  }
}

// Apply rate limiting and authentication to wallet endpoints
export const GET = walletRateLimit(withAuth(getWallet));
export const POST = walletRateLimit(withAuth(requestWithdrawal)); 