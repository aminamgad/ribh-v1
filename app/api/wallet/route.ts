import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Wallet from '@/models/Wallet';
import SystemSettings from '@/models/SystemSettings';

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
    const settings = await SystemSettings.getCurrentSettings();
    const minimumWithdrawal = settings?.minimumWithdrawal || 100;
    const maximumWithdrawal = settings?.maximumWithdrawal || 10000;
    const withdrawalFee = settings?.withdrawalFee || 0;
    
    // Calculate available and pending balance
    const availableBalance = Math.max(0, wallet.balance - wallet.totalWithdrawals);
    const pendingBalance = wallet.totalEarnings - wallet.balance;
    
    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        availableBalance,
        pendingBalance,
        // Include withdrawal settings from system
        withdrawalSettings: {
          minimumWithdrawal,
          maximumWithdrawal,
          withdrawalFee,
          canWithdraw: availableBalance >= minimumWithdrawal,
          maxWithdrawable: Math.min(availableBalance, maximumWithdrawal)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب بيانات المحفظة' },
      { status: 500 }
    );
  }
}

// POST /api/wallet - Request withdrawal
async function requestWithdrawal(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { amount, bankDetails } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'مبلغ السحب غير صحيح' },
        { status: 400 }
      );
    }
    
    // Get system settings
    const settings = await SystemSettings.getCurrentSettings();
    const minimumWithdrawal = settings?.minimumWithdrawal || 100;
    const maximumWithdrawal = settings?.maximumWithdrawal || 10000;
    const withdrawalFee = settings?.withdrawalFee || 0;
    
    // Get user wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: 'المحفظة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Validate withdrawal amount
    const availableBalance = Math.max(0, wallet.balance - wallet.totalWithdrawals);
    
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
        bankDetails,
        status: 'pending'
      }
    );

    // Send notification to admins about withdrawal request
    try {
      // Get all admin users
      const User = (await import('@/models/User')).default;
      const adminUsers = await User.find({ role: 'admin' }).select('_id name').lean();
      
      // Create notification for each admin
      const Notification = (await import('@/models/Notification')).default;
      const notificationPromises = adminUsers.map(admin => 
        Notification.create({
          userId: admin._id,
          title: 'طلب سحب جديد',
          message: `طلب سحب جديد بقيمة ${amount} ₪ من ${user.name}`,
          type: 'info',
          actionUrl: '/dashboard/wallet',
          metadata: { 
            userId: user._id,
            userName: user.name,
            withdrawalAmount: amount,
            feeAmount,
            totalAmount: totalWithdrawal,
            transactionId: transaction._id
          }
        })
      );
      
      await Promise.all(notificationPromises);
      console.log(`✅ Notifications sent to ${adminUsers.length} admin users for withdrawal request: ${amount} ₪`);
      
    } catch (error) {
      console.error('❌ Error sending notifications to admins:', error);
    }
    
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
    console.error('Error requesting withdrawal:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إرسال طلب السحب' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getWallet);
export const POST = withAuth(requestWithdrawal); 