import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Wallet from '@/models/Wallet';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/wallet/transactions - Get user transactions
async function getTransactions(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    let wallet = await Wallet.findOne({ userId: user._id });
    
    if (!wallet) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      });
    }
    
    let query: any = { walletId: wallet._id };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const transactions = await wallet.getTransactions(query, {
      sort: { createdAt: -1 },
      skip,
      limit
    });
    
    const total = await wallet.getTransactionCount(query);
    
    // Transform transactions for frontend
    const transformedTransactions = transactions.map((transaction: any) => ({
      _id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status,
      reference: transaction.reference,
      createdAt: transaction.createdAt
    }));
    
    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
    logger.apiResponse('GET', '/api/wallet/transactions', 200);
  } catch (error) {
    logger.error('Error fetching transactions', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب المعاملات');
  }
}

export const GET = withAuth(getTransactions); 