import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import { handleApiError } from '@/lib/error-handler';
import { syncShippingForIntegration } from '@/lib/integrations/easy-orders/sync-shipping';

// POST /api/integrations/easy-orders/sync-shipping - Sync shipping cities to EasyOrders
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بمزامنة الشحن' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { integrationId } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'معرف التكامل مطلوب' },
        { status: 400 }
      );
    }

    await connectDB();

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

    const result = await syncShippingForIntegration(integration);

    if (!result.success) {
      await integration.appendSyncError(result.error || 'فشلت مزامنة الشحن');
      if (result.error?.includes('فشل مزامنة الشحن')) {
        const statusMatch = result.error?.match(/(\d+)/);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : 502;
        return NextResponse.json({ error: result.error }, { status });
      }
      return NextResponse.json(
        { error: result.error || 'فشلت مزامنة الشحن' },
        { status: 400 }
      );
    }

    const updated = await StoreIntegration.findById(integration._id).select('lastShippingSync').lean();
    return NextResponse.json({
      success: true,
      message: `تمت مزامنة ${result.citiesCount} مدينة بنجاح`,
      citiesCount: result.citiesCount,
      lastShippingSync: updated?.lastShippingSync
    });
  } catch (error) {
    return handleApiError(error, 'حدث خطأ في مزامنة الشحن');
  }
});



