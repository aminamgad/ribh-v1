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
    
    // Calculate commission based on product prices (using adminProfitMargins only)
    let commission = 0;
    let commissionRate = 0;
    
    if (items && Array.isArray(items) && items.length > 0) {
      // Use adminProfitMargins: calculate profit based on individual product prices
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
      // If items not provided, estimate using average margin (5% default)
      // This is a fallback only - should not happen in normal flow
      logger.warn('calculate-profits called without items, using default margin', {
        orderTotal,
        customerRole
      });
      commissionRate = 5; // Default margin
      commission = (orderTotal * commissionRate) / 100;
    }
    
    // Calculate profits for each party
    let marketerProfit = 0;
    let supplierProfit = 0;
    
    if (customerRole === 'marketer') {
      // For marketers: profit is calculated based on price difference (handled in order creation)
      // Here we calculate estimated profit (10% of order total as fallback)
      marketerProfit = (orderTotal * 10) / 100;
      // Supplier gets: subtotal - commission - marketerProfit
      supplierProfit = orderTotal - marketerProfit - commission;
    } else if (customerRole === 'wholesaler') {
      // For wholesalers: no marketer profit
      marketerProfit = 0;
      // Supplier gets: subtotal - commission
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