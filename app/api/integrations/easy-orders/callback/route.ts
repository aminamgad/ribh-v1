import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import EasyOrdersCallback from '@/models/EasyOrdersCallback';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

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
// EasyOrders sends api_key and store_id here via POST request
export const POST = async (req: NextRequest) => {
  try {
    // Log incoming request for debugging
    logger.info('EasyOrders POST callback received', {
      url: req.url,
      method: req.method,
      hasBody: !!req.body,
      origin: req.headers.get('origin'),
      userAgent: req.headers.get('user-agent')
    });

    const body = await req.json();
    const { api_key, store_id } = body;

    if (!api_key || !store_id) {
      logger.warn('EasyOrders callback missing required fields', { body });
      return NextResponse.json(
        { error: 'Missing required fields: api_key and store_id' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get userId from query params (passed in callback_url)
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('user_id');

    if (!userId) {
      logger.warn('EasyOrders callback missing userId in query params', {
        url: req.url,
        hasApiKey: !!api_key,
        hasStoreId: !!store_id
      });
      
      // Store callback data temporarily for later retrieval
      // This happens when callback_url doesn't include userId or EasyOrders doesn't preserve query params
      const callback = await EasyOrdersCallback.create({
        apiKey: api_key,
        storeId: store_id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      logger.info('EasyOrders callback stored temporarily (no userId)', {
        callbackId: (callback._id as any)?.toString(),
        storeId: store_id
      });

      return NextResponse.json({
        success: true,
        message: 'Callback received. Please complete setup via redirect.',
        callbackId: (callback._id as any)?.toString() || ''
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn('EasyOrders callback invalid userId format', { userId });
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // We have userId, complete the integration
    await completeIntegration(userId, api_key, store_id);

    logger.business('EasyOrders integration completed via POST callback', {
      userId,
      storeId: store_id
    });

    // Return success - EasyOrders will redirect to redirect_url
    // The redirect_url will call GET endpoint to finalize
    return NextResponse.json({
      success: true,
      message: 'Integration completed successfully',
      redirect_url: `${req.nextUrl.origin}/api/integrations/easy-orders/callback?user_id=${userId}`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    logger.error('Error handling EasyOrders callback', error, {
      url: req.url,
      hasBody: !!req.body
    });
    return NextResponse.json(
      { 
        error: 'حدث خطأ في معالجة الاستجابة',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
};

// Helper function to complete integration
async function completeIntegration(userId: string, apiKey: string, storeId: string) {
  try {
    await connectDB();

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid userId format: ${userId}`);
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // Check if integration already exists (by storeId and userId, or just storeId for same user)
    const existingIntegration = await StoreIntegration.findOne({
      userId: userIdObjectId,
      storeId: storeId,
      type: IntegrationType.EASY_ORDERS
    });

    if (existingIntegration) {
      // Update existing
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
    } else {
      // Create new integration
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
          priceMarkup: 0
        }
      });

      logger.business('EasyOrders integration created', {
        integrationId: integration._id?.toString() || '',
        userId,
        storeId
      });
    }
  } catch (error) {
    logger.error('Error in completeIntegration', error, {
      userId,
      hasApiKey: !!apiKey,
      hasStoreId: !!storeId
    });
    throw error;
  }
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

    // Try to find unused callback for this user (with userId) or without userId (recent)
    const callback = await EasyOrdersCallback.findOne({
      $or: [
        { userId: userId, used: false },
        { userId: { $exists: false }, used: false }
      ],
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (callback) {
      // If callback doesn't have userId, set it now
      if (!callback.userId) {
        callback.userId = new mongoose.Types.ObjectId(userId);
        await callback.save();
      }

      // Complete the integration
      await completeIntegration(userId, callback.apiKey, callback.storeId);
      
      // Mark callback as used
      callback.used = true;
      await callback.save();

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

