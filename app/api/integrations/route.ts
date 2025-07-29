import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import { UserRole } from '@/models/User';

// Define UserRole constants for backward compatibility
const UserRoleConstants = {
  ADMIN: 'admin' as const,
  SUPPLIER: 'supplier' as const,
  MARKETER: 'marketer' as const,
  WHOLESALER: 'wholesaler' as const,
};

// Validation schema
const createIntegrationSchema = z.object({
  type: z.enum(['easy_orders', 'youcan']),
  storeName: z.string().min(1, 'اسم المتجر مطلوب'),
  storeUrl: z.string().url('رابط المتجر غير صالح').optional(),
  apiKey: z.string().min(10, 'مفتاح API مطلوب'),
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
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Only marketers and wholesalers can have store integrations
    if (user.role !== UserRoleConstants.MARKETER && user.role !== UserRoleConstants.WHOLESALER) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول إلى التكاملات' },
        { status: 403 }
      );
    }

    await connectDB();

    const integrations = await StoreIntegration.findByUser(user.id);

    // Mask sensitive data
    const safeIntegrations = integrations.map(integration => ({
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
      updatedAt: integration.updatedAt
    }));

    return NextResponse.json({
      success: true,
      integrations: safeIntegrations
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب التكاملات' },
      { status: 500 }
    );
  }
});

// POST /api/integrations - Create new store integration
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Only marketers and wholesalers can create store integrations
    if (user.role !== UserRoleConstants.MARKETER && user.role !== UserRoleConstants.WHOLESALER) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإنشاء تكاملات' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = createIntegrationSchema.parse(body);

    await connectDB();

    // Check if user already has an integration of this type
    const existingIntegration = await StoreIntegration.findOne({
      userId: user.id,
      type: validatedData.type
    });

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'لديك بالفعل تكامل مع هذه المنصة' },
        { status: 400 }
      );
    }

    // Create new integration
    const integration = await StoreIntegration.create({
      userId: user.id,
      type: validatedData.type as IntegrationType,
      storeName: validatedData.storeName,
      storeUrl: validatedData.storeUrl,
      apiKey: validatedData.apiKey,
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إنشاء التكامل' },
      { status: 500 }
    );
  }
}); 