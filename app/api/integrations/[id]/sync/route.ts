import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import StoreIntegration, { IntegrationStatus, IntegrationType } from '@/models/StoreIntegration';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { UserRole } from '@/types';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/integrations/[id]/sync - Trigger sync with external store
export const POST = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  let type: string | undefined;
  try {
    if (user.role !== 'marketer' && user.role !== 'wholesaler') {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ المزامنة' },
        { status: 403 }
      );
    }

    const body = await req.json();
    type = body.type; // 'products', 'orders', or 'all'

    await connectDB();

    const integration = await StoreIntegration.findById(params.id);

    if (!integration) {
      return NextResponse.json(
        { error: 'التكامل غير موجود' },
        { status: 404 }
      );
    }

    // Check ownership
    if (integration.userId.toString() !== user._id.toString()) {
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

    // Clear previous sync errors
    integration.syncErrors = [];
    await integration.save();

    try {
      // Sync products - Export user's products to EasyOrders
      if ((type === 'products' || type === 'all') && integration.settings.syncProducts) {
        if (integration.type === 'easy_orders') {
          // For EasyOrders, export user's products
          const userProducts = await Product.find({
            supplierId: user._id,
            isApproved: true,
            isActive: true
          }).populate('categoryId', 'name slug');

          let exportedCount = 0;
          const syncErrors: string[] = [];

          for (const product of userProducts) {
            try {
              // Validate product before export
              const validationErrors: string[] = [];

              // Check supplierPrice
              if (!product.supplierPrice || product.supplierPrice <= 0) {
                validationErrors.push(`سعر المورد مطلوب - يرجى إضافة سعر المورد للمنتج "${product.name}" (ID: ${product._id})`);
              }

              // Check images
              const images = Array.isArray(product.images) ? product.images : [];
              if (images.length === 0) {
                validationErrors.push(`يجب أن يحتوي المنتج "${product.name}" على صورة واحدة على الأقل`);
              } else if (images.length > 10) {
                validationErrors.push(`يجب ألا يزيد عدد الصور عن 10 صور للمنتج "${product.name}"`);
              }

              if (validationErrors.length > 0) {
                syncErrors.push(...validationErrors);
                continue; // Skip this product
              }

              // Export product using the export-product endpoint logic
              const { convertProductToEasyOrders, sendProductToEasyOrders } = await import('@/lib/integrations/easy-orders/product-converter');
              
              const existingEasyOrdersProductId = (product as any).metadata?.easyOrdersProductId;
              const easyOrdersProduct = await convertProductToEasyOrders(
                product,
                integration,
                {
                  includeVariations: true,
                  categoryMapping: new Map()
                }
              );

              const result = await sendProductToEasyOrders(
                easyOrdersProduct,
                integration.apiKey,
                existingEasyOrdersProductId
              );

              if (result.success && result.productId) {
                // Save EasyOrders product ID
                (product as any).metadata = (product as any).metadata || {};
                (product as any).metadata.easyOrdersProductId = result.productId;
                (product as any).metadata.easyOrdersStoreId = integration.storeId;
                (product as any).metadata.easyOrdersIntegrationId = String(integration._id);
                await product.save();
                exportedCount++;
              } else {
                syncErrors.push(`فشل تصدير المنتج "${product.name}": ${result.error || 'خطأ غير معروف'}`);
              }
            } catch (error: any) {
              logger.error('Error exporting product during sync', error, {
                productId: product._id,
                productName: product.name
              });
              syncErrors.push(`خطأ في تصدير المنتج "${product.name}": ${error.message || 'خطأ غير معروف'}`);
            }
          }

          syncResults.products = exportedCount;
          
          // Save sync errors
          if (syncErrors.length > 0) {
            integration.syncErrors = syncErrors.slice(0, 10); // Keep last 10 errors
            await integration.save();
            syncResults.errors = syncErrors;
          }
        } else {
          // For other integrations, use the default sync method
          const productCount = await integration.syncProducts();
          syncResults.products = productCount;
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
    
    logger.business('Integration sync completed', {
      integrationId: params.id,
      userId: user._id,
      syncType: type,
      results: syncResults
    });
    logger.apiResponse('POST', `/api/integrations/${params.id}/sync`, 200);
  } catch (error) {
    logger.error('Error in sync', error, { integrationId: params.id, userId: user._id, syncType: type });
    return handleApiError(error, 'حدث خطأ في المزامنة');
  }
});

// GET /api/integrations/[id]/sync - Get sync status
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
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
    
    logger.apiResponse('GET', `/api/integrations/${params.id}/sync`, 200);
  } catch (error) {
    logger.error('Error fetching sync status', error, { integrationId: params.id, userId: user.id });
    return handleApiError(error, 'حدث خطأ في جلب حالة المزامنة');
  }
}); 