import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';

// POST /api/orders/calculate-profits - Calculate profits for an order
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    const body = await req.json();
    const { orderTotal, customerRole } = body;
    
    console.log('🧮 حساب الأرباح للطلب:', {
      orderTotal,
      customerRole
    });
    
    // Get system settings for commission rates
    const settings = await SystemSettings.findOne();
    const commissionRates = settings?.commissionRates || [
      { minPrice: 0, maxPrice: 1000, rate: 10 },
      { minPrice: 1001, maxPrice: 5000, rate: 8 },
      { minPrice: 5001, maxPrice: 10000, rate: 6 },
      { minPrice: 10001, maxPrice: 999999, rate: 5 }
    ];
    
    // Calculate commission based on order total
    let commissionRate = 5; // Default rate
    for (const rate of commissionRates) {
      if (orderTotal >= rate.minPrice && orderTotal <= rate.maxPrice) {
        commissionRate = rate.rate;
        break;
      }
    }
    
    const commission = (orderTotal * commissionRate) / 100;
    
    // Calculate profits for each party
    let marketerProfit = 0;
    let supplierProfit = 0;
    
    if (customerRole === 'marketer') {
      // For marketers: 10% of order total
      marketerProfit = (orderTotal * 10) / 100;
      // Supplier gets the rest minus commission
      supplierProfit = orderTotal - marketerProfit - commission;
    } else if (customerRole === 'wholesaler') {
      // For wholesalers: no marketer profit
      marketerProfit = 0;
      // Supplier gets the rest minus commission
      supplierProfit = orderTotal - commission;
    }
    
    const profitBreakdown = {
      orderTotal,
      commission,
      commissionRate,
      marketerProfit,
      supplierProfit,
      customerRole
    };
    
    console.log('💰 تفصيل الأرباح:', profitBreakdown);
    
    return NextResponse.json({
      success: true,
      profits: profitBreakdown
    });
    
  } catch (error) {
    console.error('❌ خطأ في حساب الأرباح:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'حدث خطأ في حساب الأرباح',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
}); 