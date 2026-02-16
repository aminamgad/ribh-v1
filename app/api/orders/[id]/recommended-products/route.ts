import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { getProductEasyOrdersExports } from '@/lib/integrations/easy-orders/product-exports';
import { logger } from '@/lib/logger';

const RECOMMENDED_LIMIT = 12;

/**
 * GET /api/orders/[id]/recommended-products
 * جلب المنتجات المقترحة (cross-sell) بعد إتمام الطلب.
 * تعرض منتجات من نفس المورد ومرتبطة بـ Easy Orders إن وجدت.
 */
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    logger.apiRequest('GET', `/api/orders/${params.id}/recommended-products`, {
      userId: user._id,
      role: user.role
    });

    const order = await Order.findById(params.id).lean() as any;
    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    // Check access: marketer/wholesaler = customer, supplier = supplier, admin = all
    const customerId = order.customerId?._id?.toString?.() ?? order.customerId?.toString?.();
    const supplierId = order.supplierId?._id?.toString?.() ?? order.supplierId?.toString?.();
    const userId = user._id.toString();

    if (user.role !== 'admin') {
      const isCustomer = (user.role === 'marketer' || user.role === 'wholesaler') && customerId === userId;
      const isSupplier = user.role === 'supplier' && supplierId === userId;
      if (!isCustomer && !isSupplier) {
        return NextResponse.json({ error: 'غير مصرح لك بعرض المنتجات المقترحة لهذا الطلب' }, { status: 403 });
      }
    }

    // Extract product IDs from order items (support populated and raw)
    const orderProductIds = new Set(
      (order.items || [])
        .map((i: any) => (i.productId?._id ?? i.productId)?.toString?.())
        .filter(Boolean)
    );

    // Determine supplier for recommendations (same as order)
    const orderSupplierId = supplierId || null;
    if (!orderSupplierId) {
      return NextResponse.json({ success: true, products: [] });
    }

    // Find user's EasyOrders integration (for marketers - prefer exported products)
    let integrationId: string | null = null;
    if (user.role === 'marketer' || user.role === 'wholesaler') {
      const integration = await StoreIntegration.findOne({
        userId: user._id,
        type: IntegrationType.EASY_ORDERS,
        isActive: true
      }).lean();
      if (integration) {
        integrationId = (integration as any)._id?.toString?.();
      }
    }

    // Query: same supplier, approved, active, has stock, not in order
    const query: Record<string, unknown> = {
      supplierId: orderSupplierId,
      isApproved: true,
      isActive: true,
      stockQuantity: { $gt: 0 },
      _id: { $nin: Array.from(orderProductIds).map((id) => id) }
    };

    const products = await Product.find(query)
      .select('name images marketerPrice wholesalerPrice stockQuantity hasVariants variants variantOptions sku metadata')
      .limit(RECOMMENDED_LIMIT * 2) // fetch more for sorting
      .lean() as any[];

    // Prefer products exported to user's EasyOrders integration (for cross-sell sync)
    const scored = products.map((p) => {
      const exports = getProductEasyOrdersExports(p);
      const exportedToUser = integrationId && exports.some((e) => String(e.integrationId) === String(integrationId));
      return { product: p, exportedToUser: !!exportedToUser };
    });

    // Sort: exported to EO first, then by creation
    scored.sort((a, b) => {
      if (a.exportedToUser && !b.exportedToUser) return -1;
      if (!a.exportedToUser && b.exportedToUser) return 1;
      return 0;
    });

    const recommended = scored.slice(0, RECOMMENDED_LIMIT).map(({ product }) => product);

    logger.apiResponse('GET', `/api/orders/${params.id}/recommended-products`, 200);
    return NextResponse.json({ success: true, products: recommended });
  } catch (error) {
    logger.error('Error fetching recommended products', error, {
      orderId: params.id,
      userId: user._id
    });
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب المنتجات المقترحة' },
      { status: 500 }
    );
  }
});
