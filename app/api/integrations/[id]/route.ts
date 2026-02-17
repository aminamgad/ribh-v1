import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationStatus, IntegrationType } from '@/models/StoreIntegration';
import EasyOrdersCallback from '@/models/EasyOrdersCallback';
import Product from '@/models/Product';
import { UserRole } from '@/types';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Validation schema for updates
const updateIntegrationSchema = z.object({
  storeName: z.string().min(1).optional(),
  storeUrl: z.string().url().optional(),
  apiKey: z.string().min(10).optional(),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(), // EasyOrders webhook secret
  settings: z.object({
    syncProducts: z.boolean().optional(),
    syncOrders: z.boolean().optional(),
    syncInventory: z.boolean().optional(),
    autoFulfillment: z.boolean().optional(),
    syncShippingEnabled: z.boolean().optional(),
    priceMarkup: z.number().min(0).max(100).optional(),
    defaultCategory: z.string().optional()
  }).optional(),
  isActive: z.boolean().optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/integrations/[id] - Get specific integration
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول إلى هذا التكامل' },
        { status: 403 }
      );
    }

    await connectDB();

    const integration = await StoreIntegration.findById(params.id);

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود' },
        { status: 404 }
      );
    }

    // Check ownership (admin can view all)
    if (user.role !== 'admin' && integration.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول إلى هذا التكامل' },
        { status: 403 }
      );
    }

    // Mask sensitive data for non-owners
    const safeIntegration = {
      id: integration._id,
      type: integration.type,
      status: integration.status,
      storeName: integration.storeName,
      storeUrl: integration.storeUrl,
      settings: integration.settings,
      lastSync: integration.lastSync,
      syncErrors: integration.syncErrors,
      isActive: integration.isActive,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      // Include sensitive data only for owner
      ...(integration.userId.toString() === user._id.toString() && {
        apiKey: integration.apiKey.slice(0, 10) + '...',
        webhookUrl: integration.webhookUrl
      })
    };

    return NextResponse.json({
      success: true,
      integration: safeIntegration
    });
    
    logger.apiResponse('GET', `/api/integrations/${params.id}`, 200);
  } catch (error) {
    logger.error('Error fetching integration', error, { integrationId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ في جلب التكامل');
  }
});

// PUT /api/integrations/[id] - Update integration
export const PUT = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث التكاملات' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = updateIntegrationSchema.parse(body);

    await connectDB();

    const integration = await StoreIntegration.findById(params.id);

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود' },
        { status: 404 }
      );
    }

    // Check ownership
    if (integration.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذا التكامل' },
        { status: 403 }
      );
    }

    // Update integration fields
    if (validatedData.storeName) integration.storeName = validatedData.storeName;
    if (validatedData.storeUrl !== undefined) integration.storeUrl = validatedData.storeUrl;
    if (validatedData.apiKey) integration.apiKey = validatedData.apiKey;
    if (validatedData.apiSecret !== undefined) integration.apiSecret = validatedData.apiSecret;
    if (validatedData.webhookUrl !== undefined) integration.webhookUrl = validatedData.webhookUrl;
    if (validatedData.webhookSecret !== undefined) {
      // Update EasyOrders webhook secret
      (integration as any).webhookSecret = validatedData.webhookSecret;
      logger.info('Webhook secret updated', {
        integrationId: integration._id,
        userId: user._id
      });
    }
    if (validatedData.settings) {
      // Update settings, converting defaultCategory string to ObjectId if provided
      if (validatedData.settings.syncProducts !== undefined) {
        integration.settings.syncProducts = validatedData.settings.syncProducts;
      }
      if (validatedData.settings.syncOrders !== undefined) {
        integration.settings.syncOrders = validatedData.settings.syncOrders;
      }
      if (validatedData.settings.syncInventory !== undefined) {
        integration.settings.syncInventory = validatedData.settings.syncInventory;
      }
      if (validatedData.settings.autoFulfillment !== undefined) {
        integration.settings.autoFulfillment = validatedData.settings.autoFulfillment;
      }
      if (validatedData.settings.syncShippingEnabled !== undefined) {
        const newValue = Boolean(validatedData.settings.syncShippingEnabled);
        (integration.settings as any).syncShippingEnabled = newValue;
        // إجبار الحفظ مباشرةً بالمُعرف الفعلي للمستند (تفادي أي التباس مع params.id)
        const updateResult = await StoreIntegration.updateOne(
          { _id: integration._id },
          { $set: { 'settings.syncShippingEnabled': newValue } }
        );
        logger.info('syncShippingEnabled updated', {
          integrationId: String(integration._id),
          newValue,
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount
        });
        if (updateResult.matchedCount === 0) {
          logger.warn('syncShippingEnabled: updateOne matched 0 documents', { integrationId: integration._id });
        }
      }
      if (validatedData.settings.priceMarkup !== undefined) {
        integration.settings.priceMarkup = validatedData.settings.priceMarkup;
      }
      if (validatedData.settings.defaultCategory !== undefined) {
        integration.settings.defaultCategory = validatedData.settings.defaultCategory 
          ? new mongoose.Types.ObjectId(validatedData.settings.defaultCategory)
          : undefined;
      }
      // Mongoose قد لا يتتبع تغييرات الحقول المتداخلة — إجبار الحفظ لضمان استمرار syncShippingEnabled وغيره
      integration.markModified('settings');
    }
    if (validatedData.isActive !== undefined) integration.isActive = validatedData.isActive;

    // If API credentials changed, test connection again
    if (validatedData.apiKey || validatedData.apiSecret) {
      const isConnected = await integration.testConnection();
      if (isConnected) {
        await integration.updateStatus(IntegrationStatus.ACTIVE);
      } else {
        await integration.appendSyncError('فشل الاتصال بالمتجر');
      }
    }

    await integration.save();

    return NextResponse.json({
      success: true,
      integration: {
        id: integration._id,
        type: integration.type,
        status: integration.status,
        storeName: integration.storeName,
        storeUrl: integration.storeUrl,
        settings: integration.settings,
        isActive: integration.isActive,
        updatedAt: integration.updatedAt
      }
    });
    
    logger.business('Integration updated', {
      integrationId: params.id,
      userId: user._id
    });
    logger.apiResponse('PUT', `/api/integrations/${params.id}`, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Integration update validation failed', { errors: error.errors, userId: user.id });
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error updating integration', error, { integrationId: params.id, userId: user.id });
    return handleApiError(error, 'حدث خطأ في تحديث التكامل');
  }
});

// DELETE /api/integrations/[id] - Delete integration
export const DELETE = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف التكاملات' },
        { status: 403 }
      );
    }

    await connectDB();

    const integration = await StoreIntegration.findById(params.id);

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود' },
        { status: 404 }
      );
    }

    // Check ownership
    if (integration.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف هذا التكامل' },
        { status: 403 }
      );
    }

    // عند حذف تكامل Easy Orders: حذف البيانات المرتبطة (callbacks، تصديرات المنتجات) لمنع تكرار البيانات
    if ((integration as any).type === IntegrationType.EASY_ORDERS) {
      const storeId = (integration as any).storeId;
      const userId = (integration as any).userId;
      const integrationIdStr = params.id;

      if (storeId) {
        const deleted = await EasyOrdersCallback.deleteMany({
          storeId,
          ...(userId ? { userId } : {})
        });
        if (deleted.deletedCount > 0) {
          logger.business('EasyOrders callbacks cleaned up on integration delete', {
            integrationId: params.id,
            storeId,
            deletedCount: deleted.deletedCount
          });
        }
      }

      const products = await Product.find({
        'metadata.easyOrdersExports.integrationId': integrationIdStr
      });
      for (const product of products) {
        const meta = (product as any).metadata || {};
        const exportsArray = Array.isArray(meta.easyOrdersExports) ? meta.easyOrdersExports : [];
        const newExports = exportsArray.filter((e: any) => String(e?.integrationId) !== integrationIdStr);
        if (newExports.length > 0) {
          meta.easyOrdersExports = newExports;
          const primary = newExports[0];
          meta.easyOrdersProductId = primary.easyOrdersProductId;
          meta.easyOrdersStoreId = primary.storeId;
          meta.easyOrdersIntegrationId = primary.integrationId;
          meta.easyOrdersSlug = primary.slug;
        } else {
          delete meta.easyOrdersProductId;
          delete meta.easyOrdersStoreId;
          delete meta.easyOrdersIntegrationId;
          delete meta.easyOrdersSlug;
          delete meta.easyOrdersExports;
          if (Object.keys(meta).length === 0) (product as any).metadata = undefined;
        }
        await product.save();
      }
      if (products.length > 0) {
        logger.business('Product EasyOrders exports cleaned up on integration delete', {
          integrationId: params.id,
          productsUpdated: products.length
        });
      }
    }

    await integration.deleteOne();

    logger.business('Integration deleted', {
      integrationId: params.id,
      userId: user._id
    });
    logger.apiResponse('DELETE', `/api/integrations/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم حذف التكامل بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting integration', error, { integrationId: params.id, userId: user.id });
    return handleApiError(error, 'حدث خطأ في حذف التكامل');
  }
});

// PATCH /api/integrations/[id]/clear-errors - Clear sync errors
export const PATCH = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث التكاملات' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action !== 'clear-errors') {
      return NextResponse.json(
        { error: 'إجراء غير صالح' },
        { status: 400 }
      );
    }

    await connectDB();

    const integration = await StoreIntegration.findById(params.id);

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود' },
        { status: 404 }
      );
    }

    // Check ownership
    if (integration.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذا التكامل' },
        { status: 403 }
      );
    }

    // Clear sync errors
    integration.syncErrors = [];
    await integration.save();

    logger.business('Integration sync errors cleared', {
      integrationId: params.id,
      userId: user._id
    });

    return NextResponse.json({
      success: true,
      message: 'تم مسح أخطاء المزامنة بنجاح'
    });
  } catch (error) {
    logger.error('Error clearing sync errors', error, { integrationId: params.id, userId: user.id });
    return handleApiError(error, 'حدث خطأ في مسح أخطاء المزامنة');
  }
}); 