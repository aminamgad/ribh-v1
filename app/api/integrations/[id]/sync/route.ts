import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationStatus } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { UserRole } from '@/types';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/integrations/[id]/sync - Trigger sync with external store
export const POST = withAuth(async (req: NextRequest, { user, params }: RouteParams & { user: any }) => {
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ المزامنة' },
        { status: 403 }
      );
    }

    const { type } = await req.json(); // 'products', 'orders', or 'all'

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
        { error: 'غير مصرح لك بتنفيذ المزامنة لهذا التكامل' },
        { status: 403 }
      );
    }

    // Check if integration is active
    if (integration.status !== IntegrationStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'التكامل غير نشط. يرجى التحقق من الإعدادات' },
        { status: 400 }
      );
    }

    let syncResults = {
      products: 0,
      orders: 0,
      errors: [] as string[]
    };

    try {
      // Sync products
      if ((type === 'products' || type === 'all') && integration.settings.syncProducts) {
        const productCount = await integration.syncProducts();
        syncResults.products = productCount;
        
        // In a real implementation, we would:
        // 1. Fetch products from external API
        // 2. Map them to our Product model
        // 3. Create/update products in our database
        // For now, we'll simulate creating some products
        if (productCount > 0) {
          // Simulate creating products
          for (let i = 0; i < Math.min(productCount, 5); i++) {
            const externalProductId = `${integration.type}_${Date.now()}_${i}`;
            const existingProduct = await Product.findOne({
              'metadata.externalId': externalProductId,
              supplierId: user.id
            });

            if (!existingProduct) {
              await Product.create({
                name: `منتج مستورد ${i + 1}`,
                description: `منتج تم استيراده من ${integration.storeName}`,
                supplierId: user.id,
                categoryId: integration.settings.defaultCategory || null,
                marketerPrice: 100 + (i * 10),
                wholesalePrice: 80 + (i * 10),
                costPrice: 70 + (i * 10),
                stockQuantity: 50,
                images: [],
                metadata: {
                  source: integration.type,
                  externalId: externalProductId,
                  storeUrl: integration.storeUrl
                }
              });
            }
          }
        }
      }

      // Sync orders
      if ((type === 'orders' || type === 'all') && integration.settings.syncOrders) {
        const orderCount = await integration.syncOrders();
        syncResults.orders = orderCount;
        
        // In a real implementation, we would:
        // 1. Fetch orders from external API
        // 2. Map them to our Order model
        // 3. Create orders in our database
        // 4. Handle inventory updates
      }

      // Update last sync time
      integration.lastSync = new Date();
      await integration.save();

      return NextResponse.json({
        success: true,
        message: 'تمت المزامنة بنجاح',
        results: syncResults
      });
    } catch (syncError: any) {
      // Update integration status to error
      await integration.updateStatus(IntegrationStatus.ERROR, syncError.message);
      
      return NextResponse.json(
        { 
          error: 'فشلت المزامنة',
          details: syncError.message,
          results: syncResults
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in sync:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في المزامنة' },
      { status: 500 }
    );
  }
});

// GET /api/integrations/[id]/sync - Get sync status
export const GET = withAuth(async (req: NextRequest, { user, params }: RouteParams & { user: any }) => {
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض حالة المزامنة' },
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
    if (user.role !== 'admin' && integration.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض حالة المزامنة لهذا التكامل' },
        { status: 403 }
      );
    }

    // Get sync statistics
    const productCount = await Product.countDocuments({
      supplierId: integration.userId,
      'metadata.source': integration.type
    });

    const orderCount = await Order.countDocuments({
      customerId: integration.userId,
      'metadata.source': integration.type
    });

    return NextResponse.json({
      success: true,
      syncStatus: {
        status: integration.status,
        lastSync: integration.lastSync,
        syncErrors: integration.syncErrors || [],
        statistics: {
          totalProducts: productCount,
          totalOrders: orderCount
        },
        settings: integration.settings
      }
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب حالة المزامنة' },
      { status: 500 }
    );
  }
}); 