import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import EasyOrdersCallback from '@/models/EasyOrdersCallback';
import { logger } from '@/lib/logger';
import { syncShippingForIntegration } from '@/lib/integrations/easy-orders/sync-shipping';

// Handle CORS preflight requests
export const OPTIONS = async (req: NextRequest) => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// POST /api/integrations/easy-orders/callback - Handle callback from EasyOrders after user accepts
// EasyOrders sends api_key and store_id here. We MUST return 200 quickly (Vercel cold start + DB
// can cause timeout on their side and show "حدث خطأ ما"). So we only store data and return;
// the GET (redirect_url) will run completeIntegration when the user is redirected.
export const POST = async (req: NextRequest) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await req.json();
    const { api_key, store_id } = body;

    if (!api_key || !store_id) {
      logger.warn('EasyOrders callback missing required fields', { body });
      return NextResponse.json(
        { error: 'Missing required fields: api_key and store_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await EasyOrdersCallback.create({
        apiKey: api_key,
        storeId: store_id,
        userId: new mongoose.Types.ObjectId(userId),
        expiresAt,
      });
      logger.info('EasyOrders callback stored (with userId)', { storeId: store_id });
    } else {
      await EasyOrdersCallback.create({
        apiKey: api_key,
        storeId: store_id,
        expiresAt,
      });
      logger.info('EasyOrders callback stored (no userId)', { storeId: store_id });
    }

    // Return 200 immediately so EasyOrders does not show "حدث خطأ ما برجاء المحاولة لاحقاً"
    return NextResponse.json(
      {
        success: true,
        message: 'Callback received. Setup will complete when user is redirected.',
        redirect_url: req.nextUrl.origin + `/api/integrations/easy-orders/callback?user_id=${userId || ''}`,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Error handling EasyOrders callback', error, { url: req.url });
    return NextResponse.json(
      {
        error: 'حدث خطأ في معالجة الاستجابة',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      { status: 500, headers: corsHeaders }
    );
  }
};

/**
 * Complete Easy Orders integration (create or update). Returns the integration document.
 * We never update order status on Easy Orders from Ribh — only receive orders via webhook.
 */
async function completeIntegration(
  userId: string,
  apiKey: string,
  storeId: string
): Promise<InstanceType<typeof StoreIntegration>> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid userId format: ${userId}`);
  }

  const userIdObjectId = new mongoose.Types.ObjectId(userId);

  const existingIntegration = await StoreIntegration.findOne({
    userId: userIdObjectId,
    storeId: storeId,
    type: IntegrationType.EASY_ORDERS
  });

  if (existingIntegration) {
    existingIntegration.apiKey = apiKey;
    existingIntegration.storeId = storeId;
    existingIntegration.status = IntegrationStatus.ACTIVE;
    existingIntegration.isActive = true;
    await existingIntegration.save();

    logger.business('EasyOrders integration updated', {
      integrationId: existingIntegration._id?.toString() || '',
      userId,
      storeId
    });
    return existingIntegration;
  }

  const integration = await StoreIntegration.create({
    userId: userIdObjectId,
    type: IntegrationType.EASY_ORDERS,
    storeName: `EasyOrders Store ${storeId.substring(0, 8)}`,
    apiKey: apiKey,
    storeId: storeId,
    status: IntegrationStatus.ACTIVE,
    isActive: true,
    settings: {
      syncProducts: true,
      syncOrders: true,
      syncInventory: true,
      autoFulfillment: false,
      syncShippingEnabled: true,
      priceMarkup: 0
    }
  });

  logger.business('EasyOrders integration created', {
    integrationId: integration._id?.toString() || '',
    userId,
    storeId
  });
  return integration;
}

/** Run shipping sync in background so callback response is not delayed (e.g. for EasyOrders timeout). */
function runShippingSyncInBackground(integration: InstanceType<typeof StoreIntegration>) {
  syncShippingForIntegration(integration).then((result) => {
    if (result.success) {
      logger.info('EasyOrders shipping synced at link time', {
        integrationId: integration._id?.toString(),
        citiesCount: result.citiesCount
      });
    } else {
      logger.warn('EasyOrders shipping sync at link time failed (user can sync manually)', {
        integrationId: integration._id?.toString(),
        error: result.error
      });
    }
  }).catch((err) => {
    logger.warn('EasyOrders shipping sync at link time error', {
      integrationId: integration._id?.toString(),
      error: (err as Error)?.message
    });
  });
}

// GET /api/integrations/easy-orders/callback - Handle redirect after authorization
// This is called after EasyOrders redirects back to our app
export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=missing_user', req.url));
    }

    await connectDB();

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn('EasyOrders callback GET: Invalid userId format', { userId });
      return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_user', req.url));
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    // Prefer callback that has this userId (from POST); else use latest without userId
    let callback = await EasyOrdersCallback.findOne({
      userId: userIdObjectId,
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    if (!callback) {
      callback = await EasyOrdersCallback.findOne({
        userId: { $exists: false },
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });
    }

    if (callback) {
      if (!callback.userId) {
        callback.userId = new mongoose.Types.ObjectId(userId);
        await callback.save();
      }

      const integration = await completeIntegration(userId, callback.apiKey, callback.storeId);
      callback.used = true;
      await callback.save();

      if (integration.settings?.syncShippingEnabled !== false) {
        runShippingSyncInBackground(integration);
      }

      logger.business('EasyOrders integration completed via GET callback', {
        userId,
        storeId: callback.storeId
      });

      return NextResponse.redirect(new URL('/dashboard/integrations?easy_orders=connected', req.url));
    }

    // No callback found, redirect to integrations page
    // User should try the automatic connection again
    logger.warn('EasyOrders callback GET: No unused callback found', { userId });
    return NextResponse.redirect(new URL('/dashboard/integrations?easy_orders=pending', req.url));
  } catch (error) {
    logger.error('Error in EasyOrders callback redirect', error);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=callback_failed', req.url));
  }
};

