import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/integrations/easy-orders/webhook/test - Test webhook endpoint
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can test webhooks
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك باختبار webhooks' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get user's EasyOrders integrations
    const integrations = await StoreIntegration.find({
      userId: user._id,
      type: IntegrationType.EASY_ORDERS,
      isActive: true
    });

    if (integrations.length === 0) {
      return NextResponse.json(
        { error: 'لا يوجد تكامل EasyOrders نشط' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { integrationId, testData } = body;

    // Find integration
    let integration;
    if (integrationId) {
      integration = integrations.find((i: any) => i._id.toString() === integrationId);
      if (!integration) {
        return NextResponse.json(
          { error: 'التكامل غير موجود أو غير نشط' },
          { status: 404 }
        );
      }
    } else {
      // Use first integration if no ID provided
      integration = integrations[0];
    }

    // Default test data
    const defaultTestData = {
      id: `test-order-${Date.now()}`,
      store_id: integration.storeId || 'test-store-id',
      cost: 100,
      shipping_cost: 20,
      total_cost: 120,
      status: 'pending',
      full_name: 'أحمد محمد (اختبار)',
      phone: '0501234567',
      government: 'الرياض',
      address: 'شارع الملك فهد - طلب تجريبي',
      payment_method: 'cod',
      cart_items: [
        {
          id: 'item-1',
          product_id: 'prod-123',
          variant_id: null,
          price: 100,
          quantity: 1,
          product: {
            id: 'prod-123',
            name: 'منتج تجريبي',
            price: 100,
            sku: 'TEST-SKU-123',
            taager_code: 'TEST-SKU-123'
          },
          variant: null
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testPayload = testData || defaultTestData;

    // Simulate webhook call
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/integrations/easy-orders/webhook`;
    
    logger.info('Testing EasyOrders webhook', {
      userId: user._id,
      integrationId: integration._id,
      webhookUrl,
      hasWebhookSecret: !!integration.webhookSecret
    });

    // Check if webhook secret exists
    if (!integration.webhookSecret) {
      return NextResponse.json({
        success: false,
        error: 'Webhook Secret غير محفوظ',
        details: 'يجب حفظ Webhook Secret من EasyOrders Dashboard أولاً',
        webhookUrl,
        integration: {
          id: integration._id,
          storeName: integration.storeName,
          storeId: integration.storeId,
          hasWebhookSecret: false
        }
      }, { status: 400 });
    }

    // Make actual webhook call
    try {
      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'secret': integration.webhookSecret
        },
        body: JSON.stringify(testPayload),
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      logger.info('Webhook test completed', {
        userId: user._id,
        integrationId: integration._id,
        status: response.status,
        responseTime,
        success: response.ok
      });

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        responseTime: `${responseTime}ms`,
        response: responseData,
        testPayload: {
          ...testPayload,
          // Don't send full payload in response
          cart_items: testPayload.cart_items?.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
          }))
        },
        webhookUrl,
        integration: {
          id: integration._id,
          storeName: integration.storeName,
          storeId: integration.storeId,
          hasWebhookSecret: !!integration.webhookSecret
        },
        timestamp: new Date().toISOString()
      });
    } catch (fetchError: any) {
      logger.error('Error testing webhook', fetchError, {
        userId: user._id,
        integrationId: integration._id,
        errorName: fetchError.name,
        errorMessage: fetchError.message
      });

      // Check if it's a timeout error
      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'انتهت مهلة الاتصال',
          details: 'Webhook endpoint لم يستجب في الوقت المحدد. تحقق من أن الخادم يعمل.',
          webhookUrl
        }, { status: 504 });
      }

      // Check if it's a network error
      if (fetchError.message?.includes('fetch failed') || fetchError.message?.includes('ECONNREFUSED')) {
        return NextResponse.json({
          success: false,
          error: 'فشل الاتصال بالخادم',
          details: 'لا يمكن الوصول إلى Webhook URL. تحقق من أن الخادم يعمل وأن URL صحيح.',
          webhookUrl
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        error: 'فشل في إرسال webhook',
        details: fetchError.message,
        webhookUrl
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('Error in webhook test endpoint', error);
    return handleApiError(error, 'حدث خطأ في اختبار webhook');
  }
});

// GET /api/integrations/easy-orders/webhook/test - Get test information
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can view webhook info
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض معلومات webhook' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get user's EasyOrders integrations
    const integrations = await StoreIntegration.find({
      userId: user._id,
      type: IntegrationType.EASY_ORDERS,
      isActive: true
    }).select('storeName storeId webhookSecret isActive createdAt');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/integrations/easy-orders/webhook`;

    return NextResponse.json({
      success: true,
      webhookUrl,
      integrations: integrations.map((integration: any) => ({
        id: integration._id,
        storeName: integration.storeName,
        storeId: integration.storeId,
        hasWebhookSecret: !!integration.webhookSecret,
        webhookSecretPreview: integration.webhookSecret 
          ? `${integration.webhookSecret.substring(0, 10)}...` 
          : null,
        isActive: integration.isActive,
        createdAt: integration.createdAt,
        webhookConfigured: !!integration.webhookSecret && !!integration.storeId
      })),
      instructions: {
        step1: 'انسخ Webhook URL أعلاه',
        step2: 'اذهب إلى EasyOrders Dashboard > Public API > Webhooks',
        step3: 'أضف Webhook URL',
        step4: 'انسخ Webhook Secret من EasyOrders',
        step5: 'أضف Webhook Secret في إعدادات التكامل في ربح'
      }
    });

  } catch (error) {
    logger.error('Error getting webhook test info', error);
    return handleApiError(error, 'حدث خطأ في الحصول على معلومات webhook');
  }
});

