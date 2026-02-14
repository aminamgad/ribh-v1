/**
 * مساعدات لتتبع تصديرات المنتجات إلى Easy Orders.
 * يدعم التنسيق القديم (easyOrdersProductId واحد) والتنسيق الجديد (easyOrdersExports مصفوفة).
 */

export interface ProductExportEntry {
  integrationId: string;
  easyOrdersProductId: string;
  storeId?: string;
  slug?: string;
}

/**
 * استخراج قائمة جميع التصديرات للمنتج (للتنسيق القديم والجديد).
 */
export function getProductEasyOrdersExports(product: { metadata?: Record<string, unknown> } | null | unknown): ProductExportEntry[] {
  const p = product as { metadata?: Record<string, unknown> } | null;
  const meta = p?.metadata as Record<string, unknown> | undefined;
  if (!meta) return [];

  const exports = meta.easyOrdersExports as ProductExportEntry[] | undefined;
  if (Array.isArray(exports) && exports.length > 0) {
    return exports.filter(
      (e) => e?.integrationId && e?.easyOrdersProductId
    );
  }

  // التنسيق القديم: تصدير واحد
  const productId = meta.easyOrdersProductId as string | undefined;
  const integrationId = meta.easyOrdersIntegrationId as string | undefined;
  if (productId && integrationId) {
    return [
      {
        integrationId: String(integrationId),
        easyOrdersProductId: String(productId),
        storeId: meta.easyOrdersStoreId as string | undefined,
        slug: meta.easyOrdersSlug as string | undefined
      }
    ];
  }

  return [];
}

/**
 * التحقق من تصدير المنتج لتكامل معيّن.
 */
export function isProductExportedToIntegration(
  product: { metadata?: Record<string, unknown> } | null | unknown,
  integrationId: string
): boolean {
  const exports = getProductEasyOrdersExports(product);
  const id = String(integrationId);
  return exports.some((e) => String(e.integrationId) === id);
}

/**
 * التحقق من وجود أي تصدير للمنتج (للتوافق مع الواجهة).
 */
export function hasProductEasyOrdersExport(product: { metadata?: Record<string, unknown> } | null | unknown): boolean {
  return getProductEasyOrdersExports(product).length > 0;
}
