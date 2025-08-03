import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import Wallet from '@/models/Wallet';
import { z } from 'zod';
import { settingsManager } from '@/lib/settings-manager';

// Validation schemas
const withdrawalRequestSchema = z.object({
  walletNumber: z.string().min(1, 'رقم المحفظة مطلوب'),
  amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().optional()
});

// POST /api/withdrawals - Create withdrawal request
export const POST = withRole(['marketer', 'supplier', 'admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    const body = await req.json();
    
    console.log('💰 إنشاء طلب سحب جديد:', { userId: user._id, amount: body.amount });
    
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
    
    // Check if user has sufficient balance
    if (wallet.balance < requestData.amount) {
      return NextResponse.json(
        { success: false, message: 'الرصيد غير كافي' },
        { status: 400 }
      );
    }
    
    // Calculate withdrawal fees based on settings
    const fees = await settingsManager.calculateWithdrawalFees(requestData.amount);
    const totalAmount = requestData.amount + fees;
    
    // Check if user can withdraw (including fees)
    if (wallet.balance < totalAmount) {
      return NextResponse.json(
        { success: false, message: `الرصيد غير كافي (المطلوب: ${totalAmount}₪ مع الرسوم)` },
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
    
    console.log('✅ تم إنشاء طلب السحب بنجاح:', { 
      requestId: withdrawalRequest._id, 
      amount: requestData.amount,
      fees: fees,
      total: totalAmount 
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب السحب بنجاح',
      withdrawalRequest: withdrawalRequest
    });
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء طلب السحب:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as any;
      const messages = zodError.errors.map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: 'بيانات الطلب غير صحيحة', errors: messages },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في إنشاء طلب السحب' },
      { status: 500 }
    );
  }
});

// GET /api/withdrawals - Get user's withdrawal requests
export const GET = withRole(['marketer', 'supplier', 'admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
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
    console.error('❌ خطأ في جلب طلبات السحب:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في جلب طلبات السحب' },
      { status: 500 }
    );
  }
}); 