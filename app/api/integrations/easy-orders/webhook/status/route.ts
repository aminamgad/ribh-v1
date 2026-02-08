import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Order from '@/models/Order';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/integrations/easy-orders/webhook/status - Get webhook status and recent orders
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can view webhook status
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض حالة webhook' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get user's EasyOrders integrations
    const integrations = await StoreIntegration.find({
      userId: user._id,
      type: IntegrationType.EASY_ORDERS,
      isActive: true
    }).select('storeName storeId webhookSecret isActive createdAt updatedAt');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/integrations/easy-orders/webhook`;

    // Get recent orders from EasyOrders for each integration
    const integrationsWithStatus = await Promise.all(
      integrations.map(async (integration: any) => {
        // Get recent orders from this integration (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentOrders = await Order.find({
          'metadata.source': 'easy_orders',
          'metadata.integrationId': String(integration._id),
          createdAt: { $gte: sevenDaysAgo }
        })
        .select('orderNumber status createdAt metadata')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

        // Get total orders count
        const totalOrders = await Order.countDocuments({
          'metadata.source': 'easy_orders',
          'metadata.integrationId': integration._id.toString()
        });

        // Get last order
        const lastOrder = await Order.findOne({
          'metadata.source': 'easy_orders',
          'metadata.integrationId': integration._id.toString()
        })
        .select('orderNumber status createdAt metadata')
        .sort({ createdAt: -1 })
        .lean();

        return {
          id: integration._id,
          storeName: integration.storeName,
          storeId: integration.storeId,
          hasWebhookSecret: !!integration.webhookSecret,
          webhookSecretPreview: integration.webhookSecret 
            ? `${integration.webhookSecret.substring(0, 10)}...` 
            : null,
          isActive: integration.isActive,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt,
          webhookConfigured: !!integration.webhookSecret && !!integration.storeId,
          webhookUrl,
          stats: {
            totalOrders,
            recentOrdersCount: recentOrders.length,
            lastOrder: lastOrder ? {
              orderNumber: (lastOrder as any).orderNumber,
              status: (lastOrder as any).status,
              createdAt: (lastOrder as any).createdAt,
              easyOrdersOrderId: (lastOrder as any).metadata?.easyOrdersOrderId
            } : null
          },
          recentOrders: recentOrders.map((order: any) => ({
            orderNumber: order.orderNumber,
            status: order.status,
            createdAt: order.createdAt,
            easyOrdersOrderId: order.metadata?.easyOrdersOrderId
          }))
        };
      })
    );

    // Check if webhook URL is accessible (not localhost)
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

    return NextResponse.json({
      success: true,
      webhookUrl,
      isLocalhost,
      warning: isLocalhost ? 'Webhook URL يستخدم localhost - EasyOrders لن يتمكن من الوصول إليه من الإنترنت. استخدم ngrok أو Vercel للحصول على URL عام.' : null,
      integrations: integrationsWithStatus,
      instructions: {
        step1: 'انسخ Webhook URL أعلاه',
        step2: 'اذهب إلى EasyOrders Dashboard > Public API > Webhooks',
        step3: 'أضف Webhook URL',
        step4: 'انسخ Webhook Secret من EasyOrders',
        step5: 'أضف Webhook Secret في إعدادات التكامل في ربح (إذا لم يتم حفظه تلقائياً)'
      }
    });

  } catch (error) {
    logger.error('Error getting webhook status', error);
    return handleApiError(error, 'حدث خطأ في الحصول على حالة webhook');
  }
});

