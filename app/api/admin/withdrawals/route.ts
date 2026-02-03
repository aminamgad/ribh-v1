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
    
    // Get wallet info for each user
    const userIds: any[] = [];
    withdrawalRequests.forEach(req => {
      try {
        const userId = req.userId;
        // Handle both populated and non-populated userId
        if (userId) {
          if (typeof userId === 'object' && '_id' in userId) {
            userIds.push((userId as any)._id);
          } else {
            userIds.push(userId);
          }
        }
      } catch (error) {
        logger.warn('Error extracting userId from withdrawal request', { error, requestId: req._id });
      }
    });
    
    const wallets = userIds.length > 0 
      ? await Wallet.find({ userId: { $in: userIds } }).lean()
      : [];
    const walletMap = new Map(wallets.map((w: any) => [w.userId.toString(), w]));
    
    // Get total count
    const total = await WithdrawalRequest.countDocuments(query);
    
    // Get statistics for all statuses
    const stats = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statistics = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      total: await WithdrawalRequest.countDocuments({})
    };
    
    stats.forEach((stat: any) => {
      if (stat._id in statistics) {
        statistics[stat._id as keyof typeof statistics] = stat.count;
      }
    });
    
    logger.debug('Withdrawal requests found', { count: withdrawalRequests.length, total, status, statistics });
    
    logger.apiResponse('GET', '/api/admin/withdrawals', 200);
    
    return NextResponse.json({
      success: true,
      withdrawals: withdrawalRequests.map(req => {
        try {
          // Extract userId safely
          const userIdObj = req.userId;
          let userId: any = null;
          if (userIdObj) {
            if (typeof userIdObj === 'object' && '_id' in userIdObj) {
              userId = (userIdObj as any)._id;
            } else {
              userId = userIdObj;
            }
          }
          
          // Get wallet info
          const wallet = userId ? walletMap.get(userId.toString()) : null;
          const balance = wallet?.balance || 0;
          const pendingWithdrawals = wallet?.pendingWithdrawals || 0;
          const availableBalance = Math.max(0, balance - pendingWithdrawals);
          
          // Extract user info safely
          const userInfo = userIdObj && typeof userIdObj === 'object' && 'name' in userIdObj
            ? userIdObj as any
            : null;
          
          return {
            _id: req._id?.toString() || '',
            userId: userId ? userId.toString() : null,
            user: {
              _id: userId ? userId.toString() : null,
              name: userInfo?.name || '',
              email: userInfo?.email || '',
              phone: userInfo?.phone || '',
              role: userInfo?.role || ''
            },
            walletNumber: req.walletNumber || '',
            amount: req.amount || 0,
            status: req.status || 'pending',
            requestDate: req.requestDate ? new Date(req.requestDate).toISOString() : new Date().toISOString(),
            processedDate: req.processedDate ? new Date(req.processedDate).toISOString() : undefined,
            notes: req.notes || undefined,
            rejectionReason: req.rejectionReason || undefined,
            processedBy: req.processedBy && typeof req.processedBy === 'object' && 'name' in req.processedBy
              ? (req.processedBy as any).name
              : null,
            walletInfo: {
              balance,
              pendingWithdrawals,
              availableBalance
            }
          };
        } catch (error) {
          logger.error('Error processing withdrawal request', { error, requestId: req._id });
          // Return minimal safe data
          return {
            _id: req._id?.toString() || '',
            userId: null,
            user: {
              _id: null,
              name: '',
              email: '',
              phone: '',
              role: ''
            },
            walletNumber: req.walletNumber || '',
            amount: req.amount || 0,
            status: req.status || 'pending',
            requestDate: req.requestDate ? new Date(req.requestDate).toISOString() : new Date().toISOString(),
            processedDate: req.processedDate ? new Date(req.processedDate).toISOString() : undefined,
            notes: req.notes || undefined,
            rejectionReason: req.rejectionReason || undefined,
            processedBy: null,
            walletInfo: {
              balance: 0,
              pendingWithdrawals: 0,
              availableBalance: 0
            }
          };
        }
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics
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
        amount: withdrawalRequest.amount,
        previousStatus: withdrawalRequest.status
      });
      
      const oldBalance = wallet.balance;
      const oldPendingWithdrawals = wallet.pendingWithdrawals || 0;
      const oldTotalWithdrawals = wallet.totalWithdrawals || 0;
      const previousStatus = withdrawalRequest.status;
      
      // If completing from pending (not approved), we need to deduct from balance
      // If completing from approved, balance was already deducted, just move from pending
      if (previousStatus === 'pending') {
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
        
        // Deduct from balance (amount is being withdrawn)
        wallet.balance = wallet.balance - withdrawalRequest.amount;
        // Add to total withdrawals (no pending withdrawal was created)
        wallet.totalWithdrawals = (wallet.totalWithdrawals || 0) + withdrawalRequest.amount;
        
        logger.info('Deducting amount from balance for pending withdrawal completion', {
          oldBalance,
          newBalance: wallet.balance,
          amount: withdrawalRequest.amount,
          oldTotalWithdrawals,
          newTotalWithdrawals: wallet.totalWithdrawals
        });
      } else if (previousStatus === 'approved') {
        // Balance was already deducted when approved, just verify pending withdrawal exists
        if (oldPendingWithdrawals < withdrawalRequest.amount) {
          logger.warn('Pending withdrawals mismatch', {
            pendingWithdrawals: oldPendingWithdrawals,
            withdrawalAmount: withdrawalRequest.amount,
            withdrawalRequestId: withdrawalRequest._id.toString()
          });
        }
        
        // Move from pending to completed (reduce pending, add to total)
        wallet.pendingWithdrawals = Math.max(0, (wallet.pendingWithdrawals || 0) - withdrawalRequest.amount);
        wallet.totalWithdrawals = (wallet.totalWithdrawals || 0) + withdrawalRequest.amount;
        
        logger.info('Moving approved withdrawal from pending to completed', {
          oldPendingWithdrawals,
          newPendingWithdrawals: wallet.pendingWithdrawals,
          oldTotalWithdrawals,
          newTotalWithdrawals: wallet.totalWithdrawals,
          amount: withdrawalRequest.amount
        });
      }
      
      // Update canWithdraw flag
      const newAvailableBalance = Math.max(0, wallet.balance - wallet.pendingWithdrawals);
      wallet.canWithdraw = newAvailableBalance >= (wallet.minimumWithdrawal || 100);
      
      await wallet.save();
      
      // Add transaction record
      try {
        await wallet.addTransaction(
          'debit',
          withdrawalRequest.amount,
          `طلب سحب مكتمل وتحويل المبلغ: ${withdrawalRequest.amount}₪`,
          `withdrawal_completed_${withdrawalRequest._id}`,
          {
            withdrawalRequestId: withdrawalRequest._id.toString(),
            status: 'completed',
            previousStatus,
            totalWithdrawals: wallet.totalWithdrawals
          }
        );
      } catch (txError) {
        logger.warn('Failed to create transaction record for completed withdrawal', {
          error: txError,
          withdrawalRequestId: withdrawalRequest._id.toString()
        });
      }
      
      logger.business('Wallet balance updated after withdrawal completion', {
        userId: withdrawalRequest.userId._id.toString(),
        previousStatus,
        oldBalance,
        newBalance: wallet.balance,
        oldPendingWithdrawals,
        newPendingWithdrawals: wallet.pendingWithdrawals,
        oldTotalWithdrawals,
        newTotalWithdrawals: wallet.totalWithdrawals,
        completedAmount: withdrawalRequest.amount,
        availableBalance: newAvailableBalance
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