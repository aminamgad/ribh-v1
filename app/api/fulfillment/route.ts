import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import FulfillmentRequest from '@/models/FulfillmentRequest';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const fulfillmentProductSchema = z.object({
  productId: z.string().min(1, 'يجب اختيار منتج'),
  quantity: z.number().min(1, 'الكمية يجب أن تكون 1 على الأقل'),
  currentStock: z.number().min(0, 'المخزون الحالي لا يمكن أن يكون سالب')
});

const fulfillmentRequestSchema = z.object({
  products: z.array(fulfillmentProductSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  orderIds: z.array(z.string()).optional() // Optional: Link to specific orders
});

// GET /api/fulfillment - Get fulfillment requests
async function getFulfillmentRequests(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    
    let query: any = {};
    
    // Role-based filtering
    if (user.role === 'supplier') {
      query.supplierId = user._id;
    }
    
    // Additional filters
    if (status) {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const requests = await FulfillmentRequest.find(query)
      .populate('products.productId', 'name costPrice')
      .populate('supplierId', 'name companyName phone')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await FulfillmentRequest.countDocuments(query);
    
    logger.debug('Fulfillment requests found', { count: requests.length, userId: user._id });
    
    // Transform requests for frontend
    const transformedRequests = requests.map(request => ({
      _id: request._id,
      supplierName: request.supplierId?.name || request.supplierId?.companyName,
      supplierPhone: request.supplierId?.phone,
      products: request.products.map((product: any) => ({
        productName: product.productId?.name,
        quantity: product.quantity,
        currentStock: product.currentStock
      })),
      status: request.status,
      totalValue: request.totalValue,
      totalItems: request.totalItems,
      notes: request.notes,
      adminNotes: request.adminNotes,
      createdAt: request.createdAt,
      approvedAt: request.approvedAt,
      expectedDeliveryDate: request.expectedDeliveryDate,
      isOverdue: request.isOverdue
    }));
    
    logger.apiResponse('GET', '/api/fulfillment', 200);
    
    return NextResponse.json({
      success: true,
      requests: transformedRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching fulfillment requests', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب طلبات التخزين');
  }
}

// POST /api/fulfillment - Create new fulfillment request
async function createFulfillmentRequest(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Validate input
    const validatedData = fulfillmentRequestSchema.parse(body);
    
    // Check if products exist and belong to the supplier
    const productIds = validatedData.products.map(item => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      supplierId: user._id
    });
    
    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, message: 'بعض المنتجات غير موجودة أو لا تنتمي لك' },
        { status: 400 }
      );
    }
    
    // Validate linked orders if provided
    let linkedOrders = [];
    if (validatedData.orderIds && validatedData.orderIds.length > 0) {
      const Order = (await import('@/models/Order')).default;
      const orders = await Order.find({
        _id: { $in: validatedData.orderIds },
        supplierId: user._id,
        status: { $in: ['pending', 'confirmed'] }
      });
      
      if (orders.length !== validatedData.orderIds.length) {
        return NextResponse.json(
          { success: false, message: 'بعض الطلبات غير موجودة أو لا تنتمي لك أو ليست قابلة للربط' },
          { status: 400 }
        );
      }
      
      linkedOrders = orders;
    }
    
    // Create fulfillment request
    const fulfillmentRequest = await FulfillmentRequest.create({
      supplierId: user._id,
      products: validatedData.products,
      notes: validatedData.notes,
      expectedDeliveryDate: validatedData.expectedDeliveryDate ? new Date(validatedData.expectedDeliveryDate) : undefined,
      orderIds: validatedData.orderIds || [],
      status: 'pending'
    });
    
    await fulfillmentRequest.populate('products.productId', 'name costPrice');
    await fulfillmentRequest.populate('supplierId', 'name companyName');
    
    // Link fulfillment to orders and update order status
    if (linkedOrders.length > 0) {
      const Order = (await import('@/models/Order')).default;
      
      for (const order of linkedOrders) {
        await Order.findByIdAndUpdate(order._id, {
          fulfillmentRequestId: fulfillmentRequest._id,
          status: order.status === 'pending' ? 'confirmed' : order.status, // Update to confirmed if pending
          confirmedAt: order.status === 'pending' ? new Date() : order.confirmedAt,
          updatedAt: new Date()
        });
        
        logger.business('Order linked to fulfillment request', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          fulfillmentRequestId: fulfillmentRequest._id.toString(),
          newStatus: order.status === 'pending' ? 'confirmed' : order.status
        });
      }
      
      logger.info('Orders linked to fulfillment request', {
        fulfillmentRequestId: fulfillmentRequest._id.toString(),
        orderCount: linkedOrders.length
      });
    }
    
    // Send notification to admins with products.view permission (fulfillment is product-related)
    try {
      const productNames = products.map(product => product.name).join(', ');
      const { sendNotificationToAdminsWithPermission } = await import('@/lib/notifications');
      await sendNotificationToAdminsWithPermission(
        'products.view',
        {
          title: 'طلب تخزين جديد',
          message: `طلب تخزين جديد من ${user.name || user.companyName} للمنتجات: ${productNames}`,
          type: 'info',
          actionUrl: `/dashboard/fulfillment/${fulfillmentRequest._id}`,
          metadata: { 
            supplierId: user._id.toString(),
            supplierName: user.name || user.companyName,
            fulfillmentRequestId: fulfillmentRequest._id.toString(),
            productCount: products.length,
            totalValue: fulfillmentRequest.totalValue,
            totalItems: fulfillmentRequest.totalItems,
            notes: validatedData.notes,
            linkedOrdersCount: linkedOrders.length
          }
        },
        { sendEmail: false, sendSocket: true }
      );
      
      logger.info('Notifications sent to admins for new fulfillment request', {
        supplierName: user.name || user.companyName,
        fulfillmentRequestId: fulfillmentRequest._id.toString(),
        linkedOrdersCount: linkedOrders.length
      });
      
    } catch (error) {
      logger.error('Error sending notifications to admins', error, { fulfillmentRequestId: fulfillmentRequest._id });
    }
    
    logger.business('Fulfillment request created', {
      fulfillmentRequestId: fulfillmentRequest._id.toString(),
      supplierId: user._id.toString(),
      productCount: products.length
    });
    logger.apiResponse('POST', '/api/fulfillment', 201);
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء طلب التخزين بنجاح',
      request: {
        _id: fulfillmentRequest._id,
        totalValue: fulfillmentRequest.totalValue,
        totalItems: fulfillmentRequest.totalItems,
        status: fulfillmentRequest.status
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Fulfillment request validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error creating fulfillment request', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إنشاء طلب التخزين');
  }
}

// Export handlers with role-based access
export const GET = withAuth(getFulfillmentRequests);
export const POST = withRole(['supplier'])(createFulfillmentRequest); 