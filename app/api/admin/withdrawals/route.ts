import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { adminRateLimit } from '@/lib/rate-limiter';

// GET /api/admin/withdrawals - Get all withdrawal requests (admin only)
async function getAdminWithdrawalsHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('GET', '/api/admin/withdrawals', { userId: user._id });
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get withdrawal requests with user info
    const withdrawalRequests = await WithdrawalRequest.find(query)
      .populate('userId', 'name email phone role')
      .populate('processedBy', 'name')
      .sort({ requestDate: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await WithdrawalRequest.countDocuments(query);
    
    logger.debug('Withdrawal requests found', { count: withdrawalRequests.length, total, status });
    
    logger.apiResponse('GET', '/api/admin/withdrawals', 200);
    
    return NextResponse.json({
      success: true,
      withdrawals: withdrawalRequests.map(req => ({
        _id: req._id,
        userId: req.userId,
        walletNumber: req.walletNumber,
        amount: req.amount,
        status: req.status,
        requestDate: req.requestDate,
        processedDate: req.processedDate,
        notes: req.notes,
        rejectionReason: req.rejectionReason,
        processedBy: req.processedBy ? req.processedBy.name : null,
        user: {
          name: req.userId.name,
          email: req.userId.email,
          phone: req.userId.phone,
          role: req.userId.role
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching withdrawal requests', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب طلبات السحب');
  }
}

// PUT /api/admin/withdrawals/[id] - Update withdrawal request status (admin only)
async function updateAdminWithdrawalHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    logger.apiRequest('PUT', '/api/admin/withdrawals', { userId: user._id });
    
    const body = await req.json();
    const { id, status, notes, rejectionReason } = body;
    
    logger.debug('Updating withdrawal request status', {
      requestId: id,
      status,
      adminId: user._id.toString()
    });
    
    // Find withdrawal request
    const withdrawalRequest = await WithdrawalRequest.findById(id)
      .populate('userId', 'name email');
    
    if (!withdrawalRequest) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'طلب السحب غير موجود' 
        },
        { status: 404 }
      );
    }
    
    // Update status
    withdrawalRequest.status = status;
    withdrawalRequest.processedDate = new Date();
    withdrawalRequest.processedBy = user._id;
    
    if (notes) {
      withdrawalRequest.notes = notes;
    }
    
    if (rejectionReason) {
      withdrawalRequest.rejectionReason = rejectionReason;
    }
    
    // Update wallet based on status
    const wallet = await Wallet.findOne({ userId: withdrawalRequest.userId._id });
    if (!wallet) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'المحفظة غير موجودة' 
        },
        { status: 404 }
      );
    }
    
    if (status === 'approved') {
      // When approved: reserve the amount in pendingWithdrawals
      logger.info('Approving withdrawal request and reserving amount', {
        requestId: id,
        userId: withdrawalRequest.userId._id.toString(),
        amount: withdrawalRequest.amount
      });
      
      // Check if user has sufficient available balance
      const availableBalance = Math.max(0, (wallet.balance || 0) - (wallet.pendingWithdrawals || 0));
      if (availableBalance < withdrawalRequest.amount) {
        return NextResponse.json(
          { 
            success: false, 
            message: `الرصيد المتاح غير كافي. المتاح: ${availableBalance}₪` 
          },
          { status: 400 }
        );
      }
      
      const oldBalance = wallet.balance;
      const oldPendingWithdrawals = wallet.pendingWithdrawals || 0;
      
      // Reserve the amount in pending withdrawals
      wallet.pendingWithdrawals = (wallet.pendingWithdrawals || 0) + withdrawalRequest.amount;
      
      // Deduct from balance immediately (amount is reserved)
      wallet.balance = wallet.balance - withdrawalRequest.amount;
      
      // Update canWithdraw flag based on available balance
      const newAvailableBalance = Math.max(0, wallet.balance - wallet.pendingWithdrawals);
      wallet.canWithdraw = newAvailableBalance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      // Add transaction record
      try {
        await wallet.addTransaction(
          'debit',
          withdrawalRequest.amount,
          `طلب سحب معتمد - قيد المعالجة: ${withdrawalRequest.amount}₪`,
          `withdrawal_approved_${withdrawalRequest._id}`,
          {
            withdrawalRequestId: withdrawalRequest._id.toString(),
            status: 'approved',
            pendingWithdrawals: wallet.pendingWithdrawals
          }
        );
      } catch (txError) {
        logger.warn('Failed to create transaction record for approved withdrawal', {
          error: txError,
          withdrawalRequestId: withdrawalRequest._id.toString()
        });
      }
      
      logger.business('Wallet balance updated after withdrawal approval', {
        userId: withdrawalRequest.userId._id.toString(),
        oldBalance,
        newBalance: wallet.balance,
        oldPendingWithdrawals,
        newPendingWithdrawals: wallet.pendingWithdrawals,
        reservedAmount: withdrawalRequest.amount,
        availableBalance: newAvailableBalance
      });
      
    } else if (status === 'completed') {
      // When completed: move from pending to totalWithdrawals
      logger.info('Completing withdrawal request and finalizing transaction', {
        requestId: id,
        userId: withdrawalRequest.userId._id.toString(),
        amount: withdrawalRequest.amount
      });
      
      const oldPendingWithdrawals = wallet.pendingWithdrawals || 0;
      const oldTotalWithdrawals = wallet.totalWithdrawals || 0;
      
      // Verify pending withdrawal exists
      if (oldPendingWithdrawals < withdrawalRequest.amount) {
        logger.warn('Pending withdrawals mismatch', {
          pendingWithdrawals: oldPendingWithdrawals,
          withdrawalAmount: withdrawalRequest.amount,
          withdrawalRequestId: withdrawalRequest._id.toString()
        });
      }
      
      // Move from pending to completed
      wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - withdrawalRequest.amount);
      wallet.totalWithdrawals = (wallet.totalWithdrawals || 0) + withdrawalRequest.amount;
      
      // Update canWithdraw flag
      const availableBalance = Math.max(0, wallet.balance - wallet.pendingWithdrawals);
      wallet.canWithdraw = availableBalance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      logger.business('Wallet balance updated after withdrawal completion', {
        userId: withdrawalRequest.userId._id.toString(),
        oldPendingWithdrawals,
        newPendingWithdrawals: wallet.pendingWithdrawals,
        oldTotalWithdrawals,
        newTotalWithdrawals: wallet.totalWithdrawals,
        completedAmount: withdrawalRequest.amount,
        availableBalance
      });
      
    } else if (status === 'rejected' && withdrawalRequest.status === 'approved') {
      // If rejecting an already approved request, restore the amount
      logger.info('Rejecting approved withdrawal request and restoring amount', {
        requestId: id,
        userId: withdrawalRequest.userId._id.toString(),
        amount: withdrawalRequest.amount
      });
      
      const oldBalance = wallet.balance;
      const oldPendingWithdrawals = wallet.pendingWithdrawals || 0;
      
      // Restore the amount from pending withdrawals
      wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - withdrawalRequest.amount);
      
      // Restore balance
      wallet.balance = wallet.balance + withdrawalRequest.amount;
      
      // Update canWithdraw flag
      const availableBalance = Math.max(0, wallet.balance - wallet.pendingWithdrawals);
      wallet.canWithdraw = availableBalance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      // Add transaction record for reversal
      try {
        await wallet.addTransaction(
          'credit',
          withdrawalRequest.amount,
          `إلغاء طلب سحب مرفوض: ${withdrawalRequest.amount}₪`,
          `withdrawal_rejected_${withdrawalRequest._id}`,
          {
            withdrawalRequestId: withdrawalRequest._id.toString(),
            status: 'rejected',
            reason: rejectionReason || 'غير محدد'
          }
        );
      } catch (txError) {
        logger.warn('Failed to create transaction record for rejected withdrawal', {
          error: txError,
          withdrawalRequestId: withdrawalRequest._id.toString()
        });
      }
      
      logger.business('Wallet balance restored after withdrawal rejection', {
        userId: withdrawalRequest.userId._id.toString(),
        oldBalance,
        newBalance: wallet.balance,
        oldPendingWithdrawals,
        newPendingWithdrawals: wallet.pendingWithdrawals,
        restoredAmount: withdrawalRequest.amount,
        availableBalance
      });
    }
    
    await withdrawalRequest.save();
    
    logger.business('Withdrawal request status updated', {
      requestId: withdrawalRequest._id.toString(),
      status: withdrawalRequest.status,
      amount: withdrawalRequest.amount,
      adminId: user._id.toString()
    });
    logger.apiResponse('PUT', '/api/admin/withdrawals', 200);
    
    const statusMessages: Record<string, string> = {
      'approved': 'تم الموافقة على طلب السحب',
      'rejected': 'تم رفض طلب السحب',
      'completed': 'تم إكمال طلب السحب وتحويل المبلغ'
    };
    
    return NextResponse.json({
      success: true,
      message: statusMessages[status as string] || 'تم تحديث حالة طلب السحب',
      withdrawal: {
        _id: withdrawalRequest._id,
        status: withdrawalRequest.status,
        amount: withdrawalRequest.amount,
        processedDate: withdrawalRequest.processedDate
      }
    });
    
  } catch (error) {
    logger.error('Error updating withdrawal request', error, { 
      adminId: user._id 
    });
    return handleApiError(error, 'حدث خطأ أثناء تحديث طلب السحب');
  }
}

// Apply rate limiting and authentication to admin withdrawals endpoints
export const GET = adminRateLimit(withRole(['admin'])(getAdminWithdrawalsHandler));
export const PUT = adminRateLimit(withRole(['admin'])(updateAdminWithdrawalHandler)); 