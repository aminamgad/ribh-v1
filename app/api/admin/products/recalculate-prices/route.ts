import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { recalculateAllProductPrices } from '@/lib/recalculate-product-prices';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/admin/products/recalculate-prices - Recalculate marketerPrice for all products
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    logger.apiRequest('POST', '/api/admin/products/recalculate-prices', { userId: user._id });

    const stats = await recalculateAllProductPrices();

    return NextResponse.json({
      success: true,
      message: `تم إعادة حساب أسعار ${stats.updated} منتج بنجاح${stats.skipped > 0 ? ` (تم تخطي ${stats.skipped} منتج معدل يدوياً)` : ''}`,
      stats: {
        total: stats.total,
        updated: stats.updated,
        skipped: stats.skipped,
        errors: stats.errors
      }
    });
  } catch (error) {
    logger.error('Error recalculating product prices', error);
    return handleApiError(error, 'حدث خطأ أثناء إعادة حساب أسعار المنتجات');
  }
});
