import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/integrations/easy-orders/authorized-link - Generate Authorized App Link
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can create EasyOrders integrations
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بإنشاء تكاملات' },
        { status: 403 }
      );
    }

    // Base URL must be publicly reachable (EasyOrders calls callback + webhook from their servers).
    // On Vercel: set NEXT_PUBLIC_BASE_URL or we use VERCEL_URL (no protocol in env).
    let baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? (process.env.VERCEL_URL.startsWith('http')
            ? process.env.VERCEL_URL
            : `https://${process.env.VERCEL_URL}`)
        : null) ||
      req.headers.get('origin') ||
      'http://localhost:3000';
    baseUrl = baseUrl.replace(/\/$/, ''); // no trailing slash

    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      logger.warn('EasyOrders integration using localhost URL - EasyOrders cannot reach this from the internet!', {
        baseUrl,
        userId: user._id,
        suggestion: 'Use ngrok or set NEXT_PUBLIC_BASE_URL to a public URL'
      });
    }

    // Build callback URL with userId in query params
    // EasyOrders will send POST to this URL, and we need userId to complete integration
    const callbackUrl = `${baseUrl}/api/integrations/easy-orders/callback?user_id=${user._id}`;
    
    // Build webhook URL for orders
    const ordersWebhookUrl = `${baseUrl}/api/integrations/easy-orders/webhook`;
    
    // Order status webhook: we receive updates from EasyOrders to update our order only.
    // We never PATCH order status on Easy Orders from Ribh.
    const orderStatusWebhookUrl = `${baseUrl}/api/integrations/easy-orders/webhook`;

    // Build redirect URL after authorization (same as callback but GET request)
    const redirectUrl = `${baseUrl}/api/integrations/easy-orders/callback?user_id=${user._id}`;

    // Required permissions for EasyOrders integration
    const permissions = [
      'products:read',
      'products:create',
      'products:update',
      'orders:read',
      'shipping_areas'
    ].join(',');

    // App information
    const appName = encodeURIComponent('منصة ربح - Ribh Platform');
    const appDescription = encodeURIComponent('منصة ربح للتجارة الإلكترونية - ربط متجرك مع EasyOrders');
    const appIcon = `${baseUrl}/logo.png`; // You can customize this

    // Build the authorized app link
    const authorizedAppLink = `https://app.easy-orders.net/#/install-app?` +
      `app_name=${appName}&` +
      `app_description=${appDescription}&` +
      `permissions=${encodeURIComponent(permissions)}&` +
      `app_icon=${encodeURIComponent(appIcon)}&` +
      `callback_url=${encodeURIComponent(callbackUrl)}&` +
      `orders_webhook=${encodeURIComponent(ordersWebhookUrl)}&` +
      `order_status_webhook=${encodeURIComponent(orderStatusWebhookUrl)}&` +
      `redirect_url=${encodeURIComponent(redirectUrl)}`;

    logger.business('Authorized App Link generated', {
      userId: user._id,
      callbackUrl,
      ordersWebhookUrl
    });

    return NextResponse.json({
      success: true,
      authorizedAppLink,
      callbackUrl,
      ordersWebhookUrl,
      orderStatusWebhookUrl,
      redirectUrl
    });
  } catch (error) {
    logger.error('Error generating authorized app link', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في إنشاء رابط التثبيت');
  }
});

