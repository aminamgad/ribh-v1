import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import Order from '@/models/Order';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/integrations/easy-orders/webhook/verify - Verify webhook configuration
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can verify webhooks
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بالتحقق من webhook' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { integrationId } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId مطلوب' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find integration
    const integration = await StoreIntegration.findOne({
      _id: integrationId,
      userId: user._id,
      type: IntegrationType.EASY_ORDERS,
      isActive: true
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود أو غير نشط' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/integrations/easy-orders/webhook`;

    // Verification results
    const verification: {
      webhookUrl: string;
      isLocalhost: boolean;
      hasWebhookSecret: boolean;
      hasStoreId: boolean;
      webhookConfigured: boolean;
      recentOrdersCount: number;
      lastOrderDate: Date | null;
      issues: string[];
      recommendations: string[];
    } = {
      webhookUrl,
      isLocalhost: baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'),
      hasWebhookSecret: !!integration.webhookSecret,
      hasStoreId: !!integration.storeId,
      webhookConfigured: !!integration.webhookSecret && !!integration.storeId,
      recentOrdersCount: 0,
      lastOrderDate: null,
      issues: [],
      recommendations: []
    };

    // Check for issues
    if (verification.isLocalhost) {
      verification.issues.push('Webhook URL يستخدم localhost - EasyOrders لن يتمكن من الوصول إليه من الإنترنت');
      verification.recommendations.push('استخدم ngrok أو Vercel للحصول على URL عام');
    }

    if (!verification.hasWebhookSecret) {
      verification.issues.push('Webhook Secret غير محفوظ');
      verification.recommendations.push('انسخ Webhook Secret من EasyOrders Dashboard وأضفه في إعدادات التكامل');
    }

    if (!verification.hasStoreId) {
      verification.issues.push('Store ID غير محفوظ');
      verification.recommendations.push('تأكد من أن التكامل تم إنشاؤه بشكل صحيح');
    }

    // Get recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await Order.find({
      'metadata.source': 'easy_orders',
      'metadata.integrationId': String(integration._id),
      createdAt: { $gte: sevenDaysAgo }
    })
    .select('createdAt')
    .sort({ createdAt: -1 })
    .lean();

    verification.recentOrdersCount = recentOrders.length;

    if (recentOrders.length > 0) {
      verification.lastOrderDate = recentOrders[0].createdAt;
    } else {
      // Check if there are any orders at all
      const anyOrder = await Order.findOne({
        'metadata.source': 'easy_orders',
        'metadata.integrationId': String(integration._id)
      })
      .select('createdAt')
      .sort({ createdAt: -1 })
      .lean();

      if (anyOrder) {
        verification.lastOrderDate = (anyOrder as any).createdAt;
        verification.issues.push('لا توجد طلبات جديدة في آخر 7 أيام');
        verification.recommendations.push('تحقق من أن Webhook مضبوط في EasyOrders Dashboard وأن الطلبات يتم إنشاؤها');
      } else {
        verification.issues.push('لا توجد طلبات من EasyOrders حتى الآن');
        verification.recommendations.push('تأكد من أن Webhook مضبوط في EasyOrders وأنك قمت بإنشاء طلب تجريبي');
      }
    }

    // Test webhook endpoint accessibility (if not localhost)
    if (!verification.isLocalhost) {
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://app.easy-orders.net'
          }
        });

        if (testResponse.status !== 204) {
          verification.issues.push(`Webhook endpoint لا يستجيب بشكل صحيح (Status: ${testResponse.status})`);
          verification.recommendations.push('تحقق من أن الخادم يعمل وأن CORS مضبوط بشكل صحيح');
        }
      } catch (fetchError: any) {
        verification.issues.push(`لا يمكن الوصول إلى Webhook URL: ${fetchError.message}`);
        verification.recommendations.push('تحقق من أن الخادم يعمل وأن URL صحيح');
      }
    }

    const isHealthy = verification.issues.length === 0;

    logger.info('Webhook verification completed', {
      userId: user._id,
      integrationId: integration._id,
      isHealthy,
      issuesCount: verification.issues.length
    });

    return NextResponse.json({
      success: true,
      isHealthy,
      verification,
      integration: {
        id: integration._id,
        storeName: integration.storeName,
        storeId: integration.storeId
      }
    });

  } catch (error) {
    logger.error('Error verifying webhook', error);
    return handleApiError(error, 'حدث خطأ في التحقق من webhook');
  }
});

