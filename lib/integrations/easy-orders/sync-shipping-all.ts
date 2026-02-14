/**
 * مزامنة مدن الشحن لجميع تكاملات Easy Orders النشطة.
 * يُستدعى في الخلفية عند إضافة/تعديل/حذف منطقة شحن من إعدادات الأدمن.
 */

import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { syncShippingForIntegration } from '@/lib/integrations/easy-orders/sync-shipping';
import { logger } from '@/lib/logger';

const DELAY_BETWEEN_SYNCS_MS = 300;

export interface SyncShippingAllResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ integrationId: string; error: string }>;
}

/**
 * مزامنة مدن الشحن لجميع المسوقين المرتبطين بـ Easy Orders.
 * يُنفّذ بالتسلسل مع تأخير بسيط بين كل طلب لتقليل احتمال تجاوز حد الطلبات (Rate Limit).
 */
export async function syncShippingForAllEasyOrdersIntegrations(): Promise<SyncShippingAllResult> {
  const result: SyncShippingAllResult = { total: 0, succeeded: 0, failed: 0, errors: [] };

  try {
    await connectDB();

    const integrations = await StoreIntegration.find({
      type: IntegrationType.EASY_ORDERS,
      isActive: true,
      apiKey: { $exists: true, $ne: '' }
    })
      .select('_id apiKey userId storeId settings')
      .lean();

    // استبعاد التكاملات التي عُطّلت لها مزامنة الشحن — القيمة false تُحفظ صراحةً عند إلغاء التفعيل
    const integrationsToSync = integrations.filter((int) => {
      const enabled = (int as any).settings?.syncShippingEnabled;
      return enabled !== false; // undefined أو true = مزامنة مفعّلة
    });
    result.total = integrationsToSync.length;

    if (integrationsToSync.length === 0) {
      logger.info('No Easy Orders integrations with syncShippingEnabled to sync — تأكد من ربط متجر Easy Orders وتفعيل مزامنة الشحن');
      return result;
    }

    logger.business('Starting shipping sync for all Easy Orders integrations', {
      count: integrationsToSync.length
    });

    for (const integration of integrationsToSync) {
      const integrationId = (integration._id as any)?.toString?.() || '';
      try {
        const syncResult = await syncShippingForIntegration({
          _id: integration._id,
          apiKey: integration.apiKey as string,
          userId: integration.userId,
          storeId: integration.storeId as string | undefined
        });

        if (syncResult.success) {
          result.succeeded++;
        } else {
          result.failed++;
          result.errors.push({ integrationId, error: syncResult.error || 'فشل غير معروف' });
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          integrationId,
          error: err?.message || 'حدث خطأ في مزامنة الشحن'
        });
        logger.error('EasyOrders shipping sync failed for integration', err, { integrationId });
      }

      if (integrationsToSync.length > 1 && DELAY_BETWEEN_SYNCS_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SYNCS_MS));
      }
    }

    logger.business('Shipping sync for all Easy Orders completed', {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed
    });

    return result;
  } catch (err: any) {
    logger.error('Error in syncShippingForAllEasyOrdersIntegrations', err);
    throw err;
  }
}
