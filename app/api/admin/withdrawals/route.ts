import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import WithdrawalRequest from '@/models/WithdrawalRequest';
import Wallet from '@/models/Wallet';
import User from '@/models/User';

// GET /api/admin/withdrawals - Get all withdrawal requests (admin only)
export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    console.log('🔍 جلب جميع طلبات السحب للإدارة');
    
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
    
    console.log(`📋 تم العثور على ${withdrawalRequests.length} طلب سحب من أصل ${total}`);
    
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
    console.error('❌ خطأ في جلب طلبات السحب:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'حدث خطأ أثناء جلب طلبات السحب',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
});

// PUT /api/admin/withdrawals/[id] - Update withdrawal request status (admin only)
export const PUT = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    const body = await req.json();
    const { id, status, notes, rejectionReason } = body;
    
    console.log('🔄 تحديث حالة طلب السحب:', {
      requestId: id,
      status,
      adminId: user._id
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
    
    // If status is completed, update wallet balance
    if (status === 'completed') {
      console.log('💰 إكمال طلب السحب وتحديث رصيد المحفظة');
      
      const wallet = await Wallet.findOne({ userId: withdrawalRequest.userId._id });
      if (wallet) {
        // Deduct amount from wallet
        wallet.balance = wallet.balance - withdrawalRequest.amount;
        wallet.totalWithdrawals = wallet.totalWithdrawals + withdrawalRequest.amount;
        wallet.canWithdraw = wallet.balance >= wallet.minimumWithdrawal;
        
        await wallet.save();
        
        console.log('✅ تم تحديث رصيد المحفظة:', {
          userId: withdrawalRequest.userId._id,
          oldBalance: wallet.balance + withdrawalRequest.amount,
          newBalance: wallet.balance,
          withdrawnAmount: withdrawalRequest.amount
        });
      }
    }
    
    await withdrawalRequest.save();
    
    console.log('✅ تم تحديث حالة طلب السحب بنجاح:', {
      requestId: withdrawalRequest._id,
      status: withdrawalRequest.status,
      amount: withdrawalRequest.amount
    });
    
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
    console.error('❌ خطأ في تحديث طلب السحب:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'حدث خطأ أثناء تحديث طلب السحب',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
}); 