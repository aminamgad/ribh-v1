import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import { UserRole } from '@/types';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Validation schema
const createIntegrationSchema = z.object({
  type: z.enum(['easy_orders']),
  storeName: z.string().min(1, 'اسم المتجر مطلوب'),
  storeUrl: z.string().url('رابط المتجر غير صالح').optional(),
  apiKey: z.string().min(10, 'مفتاح API مطلوب').optional(), // Optional for EasyOrders (only created via callback)
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url('رابط Webhook غير صالح').optional(),
  settings: z.object({
    syncProducts: z.boolean().default(true),
    syncOrders: z.boolean().default(true),
    syncInventory: z.boolean().default(true),
    autoFulfillment: z.boolean().default(false),
    priceMarkup: z.number().min(0).max(100).default(0),
    defaultCategory: z.string().optional()
  }).optional()
});

// GET /api/integrations - Get user's store integrations
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can have store integrations
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول إلى التكاملات' },
        { status: 403 }
      );
    }

    await connectDB();

    const integrations = await StoreIntegration.findByUser(user._id.toString());

    // Mask sensitive data
    const safeIntegrations = integrations.map(integration => ({
      id: integration._id,
      type: integration.type,
      status: integration.status,
      storeName: integration.storeName,
      storeUrl: integration.storeUrl,
      storeId: (integration as any).storeId, // EasyOrders store ID
      shippingSynced: (integration as any).shippingSynced,
      lastShippingSync: (integration as any).lastShippingSync,
      settings: integration.settings,
      lastSync: integration.lastSync,
      syncErrors: integration.syncErrors,
      isActive: integration.isActive,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt
    }));

    return NextResponse.json({
      success: true,
      integrations: safeIntegrations
    });
    
    logger.apiResponse('GET', '/api/integrations', 200);
  } catch (error) {
    logger.error('Error fetching integrations', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في جلب التكاملات');
  }
});

// POST /api/integrations - Create new store integration
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can create store integrations
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بإنشاء تكاملات' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = createIntegrationSchema.parse(body);

    // For EasyOrders, only allow creation via callback (automatic connection)
    // Manual creation via API is not allowed
    if (validatedData.type === 'easy_orders' && !validatedData.apiKey) {
      return NextResponse.json(
        { error: 'يجب استخدام الربط التلقائي لإنشاء تكامل EasyOrders. يرجى استخدام زر "ربط تلقائي مع EasyOrders" في صفحة التكاملات.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already has an integration of this type
    const existingIntegration = await StoreIntegration.findOne({
      userId: user._id,
      type: validatedData.type
    });

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'لديك بالفعل تكامل مع هذه المنصة' },
        { status: 400 }
      );
    }

    // Create new integration
      // Note: For EasyOrders, apiKey should always be provided (from callback for new integrations, or when updating existing integrations)
    const integration = await StoreIntegration.create({
      userId: user._id,
      type: validatedData.type as IntegrationType,
      storeName: validatedData.storeName,
      storeUrl: validatedData.storeUrl,
      apiKey: validatedData.apiKey || '', // Should not be empty due to validation above
      apiSecret: validatedData.apiSecret,
      webhookUrl: validatedData.webhookUrl,
      settings: validatedData.settings || {
        syncProducts: true,
        syncOrders: true,
        syncInventory: true,
        autoFulfillment: false,
        priceMarkup: 0
      }
    });

    // Test the connection
    const isConnected = await integration.testConnection();
    if (isConnected) {
      await integration.updateStatus(IntegrationStatus.ACTIVE);
    } else {
      await integration.updateStatus(IntegrationStatus.ERROR, 'فشل الاتصال بالمتجر');
    }

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
        createdAt: integration.createdAt
      }
    }, { status: 201 });
    
    logger.business('Store integration created', {
      integrationId: (integration as any)._id?.toString() || String((integration as any)._id),
      userId: user._id,
      type: (integration as any).type
    });
    logger.apiResponse('POST', '/api/integrations', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Integration creation validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating integration', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في إنشاء التكامل');
  }
}); 