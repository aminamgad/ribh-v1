import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const EASY_ORDERS_API_BASE = 'https://api.easy-orders.net/api/v1/external-apps';

// POST /api/integrations/easy-orders/sync-shipping - Sync shipping cities to EasyOrders
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only marketers and wholesalers can sync shipping
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

    // Find the integration
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

    if (!integration.apiKey) {
      return NextResponse.json(
        { error: 'مفتاح API غير موجود' },
        { status: 400 }
      );
    }

    // Get shipping regions from system settings
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const shippingRegions = settings?.shippingRegions || [];

    if (shippingRegions.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد مناطق شحن محددة في النظام' },
        { status: 400 }
      );
    }

    // Build cities string in format: city:cost,city:cost
    const citiesArray: string[] = [];
    
    for (const region of shippingRegions) {
      if (!region.isActive) continue;
      
      // Add cities from cityNames array
      if (region.cityNames && region.cityNames.length > 0) {
        for (const cityName of region.cityNames) {
          citiesArray.push(`${cityName}:${region.shippingCost}`);
        }
      }
      
      // Add governorate name if exists
      if (region.governorateName) {
        citiesArray.push(`${region.governorateName}:${region.shippingCost}`);
      }
      
      // Add region name as fallback
      if (!region.cityNames || region.cityNames.length === 0) {
        citiesArray.push(`${region.regionName}:${region.shippingCost}`);
      }
    }

    if (citiesArray.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد مدن نشطة للمزامنة' },
        { status: 400 }
      );
    }

    const citiesString = citiesArray.join(',');

    // Call EasyOrders API to update shipping
    const response = await fetch(`${EASY_ORDERS_API_BASE}/shipping`, {
      method: 'PATCH',
      headers: {
        'Api-Key': integration.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_active: true,
        cities: citiesString
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('EasyOrders shipping sync failed', {
        status: response.status,
        error: errorData,
        integrationId: integration._id
      });

      // Update integration status
      await integration.updateStatus(
        require('@/models/StoreIntegration').IntegrationStatus.ERROR,
        `فشل مزامنة الشحن: ${response.status}`
      );

      return NextResponse.json(
        { error: `فشل مزامنة الشحن: ${response.status}` },
        { status: response.status }
      );
    }

    // Update integration
    integration.shippingSynced = true;
    integration.lastShippingSync = new Date();
    await integration.save();

    logger.business('Shipping synced to EasyOrders', {
      integrationId: integration._id,
      userId: user._id,
      citiesCount: citiesArray.length
    });

    return NextResponse.json({
      success: true,
      message: `تمت مزامنة ${citiesArray.length} مدينة بنجاح`,
      citiesCount: citiesArray.length,
      lastShippingSync: integration.lastShippingSync
    });
  } catch (error) {
    logger.error('Error syncing shipping to EasyOrders', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في مزامنة الشحن');
  }
});



