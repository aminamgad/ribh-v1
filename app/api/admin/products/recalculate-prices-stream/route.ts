import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { recalculateAllProductPrices } from '@/lib/recalculate-product-prices';
import { logger } from '@/lib/logger';

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// POST /api/admin/products/recalculate-prices-stream - Recalculate with SSE progress 0-100%
export const POST = withRole(['admin'])(async (req: NextRequest, user: any) => {
  logger.apiRequest('POST', '/api/admin/products/recalculate-prices-stream', { userId: user._id });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await recalculateAllProductPrices({
          onProgress: (processed, total) => {
            const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
            sendSSE(controller, { type: 'progress', processed, total, percent });
          }
        });
        const message = `تم إعادة حساب أسعار ${result.updated} منتج بنجاح${result.skipped > 0 ? ` (تم تخطي ${result.skipped} منتج معدل يدوياً)` : ''}`;
        sendSSE(controller, {
          type: 'done',
          success: true,
          message,
          stats: { total: result.total, updated: result.updated, skipped: result.skipped, errors: result.errors }
        });
      } catch (error) {
        logger.error('Error recalculating product prices (stream)', error);
        sendSSE(controller, {
          type: 'error',
          success: false,
          message: 'حدث خطأ أثناء إعادة حساب أسعار المنتجات'
        });
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
});
