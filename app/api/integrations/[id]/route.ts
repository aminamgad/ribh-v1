import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationStatus } from '@/models/StoreIntegration';
import { UserRole } from '@/models/User';

// Define UserRole constants for backward compatibility
const UserRoleConstants = {
  ADMIN: 'admin' as const,
  SUPPLIER: 'supplier' as const,
  MARKETER: 'marketer' as const,
  WHOLESALER: 'wholesaler' as const,
};

// Validation schema for updates
const updateIntegrationSchema = z.object({
  storeName: z.string().min(1).optional(),
  storeUrl: z.string().url().optional(),
  apiKey: z.string().min(10).optional(),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  settings: z.object({
    syncProducts: z.boolean().optional(),
    syncOrders: z.boolean().optional(),
    syncInventory: z.boolean().optional(),
    autoFulfillment: z.boolean().optional(),
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
export const GET = withAuth(async (req: NextRequest, { user, params }: RouteParams & { user: any }) => {
  try {
    if (user.role !== UserRoleConstants.MARKETER && user.role !== UserRoleConstants.WHOLESALER && user.role !== UserRoleConstants.ADMIN) {
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
    if (user.role !== UserRoleConstants.ADMIN && integration.userId.toString() !== user.id) {
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
      ...(integration.userId.toString() === user.id && {
        apiKey: integration.apiKey.slice(0, 10) + '...',
        webhookUrl: integration.webhookUrl
      })
    };

    return NextResponse.json({
      success: true,
      integration: safeIntegration
    });
  } catch (error) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب التكامل' },
      { status: 500 }
    );
  }
});

// PUT /api/integrations/[id] - Update integration
export const PUT = withAuth(async (req: NextRequest, { user, params }: RouteParams & { user: any }) => {
  try {
    if (user.role !== UserRoleConstants.MARKETER && user.role !== UserRoleConstants.WHOLESALER) {
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
    if (integration.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذا التكامل' },
        { status: 403 }
      );
    }

    // Update integration
    Object.assign(integration, validatedData);

    // If API credentials changed, test connection again
    if (validatedData.apiKey || validatedData.apiSecret) {
      const isConnected = await integration.testConnection();
      if (isConnected) {
        await integration.updateStatus(IntegrationStatus.ACTIVE);
      } else {
        await integration.updateStatus(IntegrationStatus.ERROR, 'فشل الاتصال بالمتجر');
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث التكامل' },
      { status: 500 }
    );
  }
});

// DELETE /api/integrations/[id] - Delete integration
export const DELETE = withAuth(async (req: NextRequest, { user, params }: RouteParams & { user: any }) => {
  try {
    if (user.role !== UserRoleConstants.MARKETER && user.role !== UserRoleConstants.WHOLESALER) {
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
    if (integration.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف هذا التكامل' },
        { status: 403 }
      );
    }

    await integration.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'تم حذف التكامل بنجاح'
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف التكامل' },
      { status: 500 }
    );
  }
}); 