/**
 * Shared logic for syncing shipping cities from Ribh (SystemSettings) to Easy Orders store.
 * Used at link time (callback) and for manual sync from dashboard.
 * Does NOT update order status on Easy Orders (we never PATCH orders on Easy Orders from Ribh).
 */

import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType, IntegrationStatus } from '@/models/StoreIntegration';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';

const EASY_ORDERS_API_BASE = 'https://api.easy-orders.net/api/v1/external-apps';

export interface SyncShippingResult {
  success: boolean;
  citiesCount?: number;
  error?: string;
}

/**
 * Sync shipping regions from system settings to an Easy Orders integration.
 * Can be called from API route (with auth) or from callback after link (no auth).
 */
export async function syncShippingForIntegration(
  integration: { _id: any; apiKey: string; userId: any; storeId?: string }
): Promise<SyncShippingResult> {
  try {
    await connectDB();

    if (!integration.apiKey) {
      return { success: false, error: 'مفتاح API غير موجود' };
    }

    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    const shippingRegions = settings?.shippingRegions || [];

    if (shippingRegions.length === 0) {
      return { success: false, error: 'لا توجد مناطق شحن محددة في النظام' };
    }

    const citiesArray: string[] = [];

    for (const region of shippingRegions) {
      if (!region.isActive) continue;

      if (region.cityNames && region.cityNames.length > 0) {
        for (const cityName of region.cityNames) {
          citiesArray.push(`${cityName}:${region.shippingCost}`);
        }
      }
      if (region.governorateName) {
        citiesArray.push(`${region.governorateName}:${region.shippingCost}`);
      }
      if (!region.cityNames || region.cityNames.length === 0) {
        citiesArray.push(`${region.regionName}:${region.shippingCost}`);
      }
    }

    if (citiesArray.length === 0) {
      return { success: false, error: 'لا توجد مدن نشطة للمزامنة' };
    }

    const citiesString = citiesArray.join(',');

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
        integrationId: integration._id?.toString?.()
      });
      return { success: false, error: `فشل مزامنة الشحن: ${response.status}` };
    }

    // Update integration record
    const updated = await StoreIntegration.findOneAndUpdate(
      { _id: integration._id, type: IntegrationType.EASY_ORDERS },
      { $set: { shippingSynced: true, lastShippingSync: new Date(), status: IntegrationStatus.ACTIVE } },
      { new: true }
    ).catch(() => null);

    if (updated?.syncErrors?.length) {
      await StoreIntegration.updateOne(
        { _id: integration._id },
        { $set: { syncErrors: [] } }
      ).catch(() => {});
    }

    logger.business('Shipping synced to EasyOrders', {
      integrationId: integration._id?.toString?.(),
      userId: integration.userId?.toString?.(),
      citiesCount: citiesArray.length
    });

    return { success: true, citiesCount: citiesArray.length };
  } catch (err: any) {
    logger.error('Error in syncShippingForIntegration', err, {
      integrationId: integration._id?.toString?.()
    });
    return { success: false, error: err?.message || 'حدث خطأ في مزامنة الشحن' };
  }
}
