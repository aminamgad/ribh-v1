import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import Wallet from '@/models/Wallet';
import { z } from 'zod';
import { settingsManager } from '@/lib/settings-manager';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { walletRateLimit } from '@/lib/rate-limiter';

// Validation schemas
const withdrawalRequestSchema = z.object({
  walletNumber: z.string().min(1, 'رقم المحفظة مطلوب'),
  amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().optional()
});

// POST /api/withdrawals - Create withdrawal request
async function createWithdrawalHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    logger.apiRequest('POST', '/api/withdrawals', { userId: user._id, role: user.role });
    
    const body = await req.json();
    
    // Validate request data
    const requestData = withdrawalRequestSchema.parse(body);
    
    // Get user's wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return NextResponse.json(
        { success: false, message: 'المحفظة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Apply system settings validation
    const withdrawalValidation = await settingsManager.validateWithdrawal(requestData.amount);
    if (!withdrawalValidation.valid) {
      return NextResponse.json(
        { success: false, message: withdrawalValidation.message },
        { status: 400 }
      );
    }
    
    // Calculate withdrawal fees based on settings
    const fees = await settingsManager.calculateWithdrawalFees(requestData.amount);
    const totalAmount = requestData.amount + fees;
    
    // Calculate available balance (balance minus pending withdrawals)
    const availableBalance = Math.max(0, (wallet.balance || 0) - (wallet.pendingWithdrawals || 0));
    
    // Check if user has sufficient available balance (considering pending withdrawals)
    if (availableBalance < totalAmount) {
      const pendingInfo = wallet.pendingWithdrawals > 0 
        ? ` (يوجد ${wallet.pendingWithdrawals}₪ قيد السحب)` 
        : '';
      return NextResponse.json(
        { 
          success: false, 
          message: `الرصيد المتاح غير كافي${pendingInfo}. المتاح: ${availableBalance}₪، المطلوب: ${totalAmount}₪` 
        },
        { status: 400 }
      );
    }
    
    // Create withdrawal request
    const withdrawalRequest = await WithdrawalRequest.create({
      userId: user._id,
      walletNumber: requestData.walletNumber,
      amount: requestData.amount,
      fees: fees,
      totalAmount: totalAmount,
      status: 'pending',
      notes: requestData.notes
    });
    
    logger.business('Withdrawal request created', {
      requestId: withdrawalRequest._id.toString(),
      userId: user._id.toString(),
      amount: requestData.amount,
      fees: fees,
      total: totalAmount
    });
    logger.apiResponse('POST', '/api/withdrawals', 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب السحب بنجاح',
      withdrawalRequest: withdrawalRequest
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Withdrawal request validation failed', { errors: error.errors, userId: user._id });
      const messages = error.errors.map(err => err.message);
      return NextResponse.json(
        { success: false, message: 'بيانات الطلب غير صحيحة', errors: messages },
        { status: 400 }
      );
    }
    
    logger.error('Error creating withdrawal request', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في إنشاء طلب السحب');
  }
}

// GET /api/withdrawals - Get user's withdrawal requests
async function getWithdrawalsHandler(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('GET', '/api/withdrawals', { userId: user._id, role: user.role });
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = { userId: user._id };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Get withdrawal requests with pagination
    const withdrawalRequests = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await WithdrawalRequest.countDocuments(query);
    
    logger.apiResponse('GET', '/api/withdrawals', 200);
    
    return NextResponse.json({
      success: true,
      withdrawalRequests: withdrawalRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching withdrawal requests', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في جلب طلبات السحب');
  }
}

// Apply rate limiting and authentication to withdrawals endpoints
export const POST = walletRateLimit(withRole(['marketer', 'supplier', 'admin'])(createWithdrawalHandler));
export const GET = walletRateLimit(withRole(['marketer', 'supplier', 'admin'])(getWithdrawalsHandler));
