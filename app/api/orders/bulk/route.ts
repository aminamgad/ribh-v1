import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';
import StoreIntegration, { IntegrationType } from '@/models/StoreIntegration';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/orders/bulk?ids=id1,id2,id3 - Get multiple orders by IDs
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'يرجى تحديد معرفات الطلبات' },
        { status: 400 }
      );
    }

    const orderIds = idsParam.split(',').filter(id => id.trim()).filter(id => {
      // Basic validation: check if ID looks like a MongoDB ObjectId (24 hex characters)
      return id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
    });
    
    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم تحديد أي طلبات صالحة' },
        { status: 400 }
      );
    }
    
    // Limit the number of orders that can be printed at once (prevent abuse)
    if (orderIds.length > 100) {
      return NextResponse.json(
        { error: 'لا يمكن طباعة أكثر من 100 طلب في المرة الواحدة' },
        { status: 400 }
      );
    }

    logger.apiRequest('GET', '/api/orders/bulk', { 
      userId: user._id, 
      orderCount: orderIds.length 
    });

    // Fetch orders with populated fields
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate({
        path: 'items.productId',
        select: 'name images marketerPrice wholesalerPrice',
        model: 'Product'
      })
      .populate('supplierId', 'name companyName')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Pre-fetch marketer integrations for Easy Orders access check
    let userIntegrationIds: Set<string> = new Set();
    if (user.role === 'marketer' || user.role === 'wholesaler') {
      const integrations = await StoreIntegration.find({
        userId: user._id,
        type: IntegrationType.EASY_ORDERS,
        isActive: true
      }).select('_id').lean();
      userIntegrationIds = new Set(integrations.map((i: any) => i._id.toString()));
    }

    // Check permissions for each order
    const accessibleOrders = orders.filter((order: any) => {
      const actualSupplierId = order.supplierId?._id || order.supplierId;
      const actualCustomerId = order.customerId?._id || order.customerId;
      
      // Admin can access all orders
      if (user.role === 'admin') {
        return true;
      }
      
      // Supplier can only access their own orders
      if (user.role === 'supplier') {
        return actualSupplierId?.toString() === user._id.toString();
      }
      
      // Marketer/Wholesaler: طلباته أو طلبات Easy Orders من تكاملاته
      if (user.role === 'marketer' || user.role === 'wholesaler') {
        const isCustomer = actualCustomerId?.toString() === user._id.toString();
        const isEasyOrdersFromMyIntegration =
          order.metadata?.source === 'easy_orders' &&
          order.metadata?.integrationId &&
          userIntegrationIds.has(String(order.metadata.integrationId));
        return !!isCustomer || !!isEasyOrdersFromMyIntegration;
      }
      
      return false;
    });

    if (accessibleOrders.length === 0) {
      logger.warn('No accessible orders found for bulk print', {
        userId: user._id.toString(),
        userRole: user.role,
        requestedCount: orderIds.length
      });
      return NextResponse.json(
        { error: 'غير مصرح لك بعرض هذه الطلبات' },
        { status: 403 }
      );
    }

    // Format orders to ensure items are properly structured
    const finalOrders = accessibleOrders.map((order: any) => {
      // Ensure items array exists and is properly formatted
      if (!order.items || !Array.isArray(order.items)) {
        order.items = [];
      } else {
        // Filter out invalid items first
        const validItems = order.items.filter((item: any) => 
          item !== null && 
          item !== undefined && 
          (item.productName || item.productId || item.quantity > 0)
        );
        
        order.items = validItems.map((item: any) => {
          // Get productName from multiple sources with priority:
          // 1. item.productName (saved in order)
          // 2. item.productId.name (from populated product)
          // 3. Fallback to 'غير محدد'
          let productName = item.productName;
          
          // If productName is missing or empty, try to get it from populated productId
          if (!productName || productName.trim() === '') {
            if (item.productId) {
              if (typeof item.productId === 'object' && item.productId !== null) {
                // Product is populated
                productName = item.productId.name || 'غير محدد';
              } else if (typeof item.productId === 'string') {
                // Product is not populated, just an ID
                // This shouldn't happen if populate worked, but handle it gracefully
                productName = 'غير محدد';
              }
            } else {
              productName = 'غير محدد';
            }
          }
          
          // Ensure productName is never empty
          if (!productName || productName.trim() === '') {
            productName = 'غير محدد';
          }
          
          return {
            ...item,
            productName: productName.trim(),
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || 0,
            priceType: item.priceType || 'marketer',
            // Keep productId for reference (can be object if populated or string if not)
            productId: item.productId
          };
        });
      }
      
      // Ensure shipping address exists
      if (!order.shippingAddress) {
        order.shippingAddress = {
          fullName: '',
          phone: '',
          street: '',
          city: '',
          governorate: '',
          postalCode: '',
          notes: ''
        };
      }
      
      return order;
    });
    
    // Log formatted orders for debugging
    logger.info('Formatted orders for bulk print', {
      orderCount: finalOrders.length,
      ordersWithItems: finalOrders.filter((o: any) => o.items && o.items.length > 0).length,
      totalItems: finalOrders.reduce((sum: number, o: any) => sum + (o.items?.length || 0), 0)
    });

    logger.apiResponse('GET', '/api/orders/bulk', 200);

    return NextResponse.json({
      success: true,
      orders: finalOrders,
      count: finalOrders.length
    });
  } catch (error) {
    logger.error('Error fetching bulk orders', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب الطلبات');
  }
});

