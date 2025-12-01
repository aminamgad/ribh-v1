import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import { settingsManager } from '@/lib/settings-manager';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/orders/calculate-profits - Calculate profits for an order
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    logger.apiRequest('POST', '/api/orders/calculate-profits');
    
    const body = await req.json();
    const { orderTotal, customerRole, items } = body; // items should contain unitPrice and quantity
    
    logger.debug('Calculating order profits', {
      orderTotal,
      customerRole,
      itemsCount: items?.length
    });
    
    // Calculate commission based on product prices (new system)
    let commission = 0;
    let commissionRate = 0;
    if (items && Array.isArray(items) && items.length > 0) {
      // Use new system: calculate profit based on individual product prices
      commission = await settingsManager.calculateAdminProfitForOrder(
        items.map((item: any) => ({
          unitPrice: item.unitPrice || item.price || 0,
          quantity: item.quantity || 1
        }))
      );
      // Calculate average commission rate for display
      if (orderTotal > 0) {
        commissionRate = (commission / orderTotal) * 100;
      }
    } else {
      // Fallback to old system if items not provided
      const settings = await (await import('@/models/SystemSettings')).default.findOne();
      const commissionRates = settings?.commissionRates || [
        { minPrice: 0, maxPrice: 1000, rate: 10 },
        { minPrice: 1001, maxPrice: 5000, rate: 8 },
        { minPrice: 5001, maxPrice: 10000, rate: 6 },
        { minPrice: 10001, maxPrice: 999999, rate: 5 }
      ];
      
      commissionRate = 5;
      for (const rate of commissionRates) {
        if (orderTotal >= rate.minPrice && orderTotal <= rate.maxPrice) {
          commissionRate = rate.rate;
          break;
        }
      }
      commission = (orderTotal * commissionRate) / 100;
    }
    
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
    
    logger.debug('Profit breakdown calculated', profitBreakdown);
    logger.apiResponse('POST', '/api/orders/calculate-profits', 200);
    
    return NextResponse.json({
      success: true,
      profits: profitBreakdown
    });
    
  } catch (error) {
    logger.error('Error calculating order profits', error);
    return handleApiError(error, 'حدث خطأ في حساب الأرباح');
  }
}); 