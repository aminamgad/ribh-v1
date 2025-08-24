import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import FulfillmentRequest from '@/models/FulfillmentRequest';
import Product from '@/models/Product';
import { z } from 'zod';

const fulfillmentProductSchema = z.object({
  productId: z.string().min(1, 'يجب اختيار منتج'),
  quantity: z.number().min(1, 'الكمية يجب أن تكون 1 على الأقل'),
  currentStock: z.number().min(0, 'المخزون الحالي لا يمكن أن يكون سالب')
});

const fulfillmentRequestSchema = z.object({
  products: z.array(fulfillmentProductSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional()
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
    
    console.log('Fulfillment requests found:', requests.length);
    console.log('Request IDs:', requests.map(r => r._id));
    
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
    
    console.log('Transformed requests:', transformedRequests.map(r => ({ id: r._id, status: r.status })));
    
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
    console.error('Error fetching fulfillment requests:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب طلبات التخزين' },
      { status: 500 }
    );
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
    
    // Create fulfillment request
    const fulfillmentRequest = await FulfillmentRequest.create({
      supplierId: user._id,
      products: validatedData.products,
      notes: validatedData.notes,
      expectedDeliveryDate: validatedData.expectedDeliveryDate ? new Date(validatedData.expectedDeliveryDate) : undefined,
      status: 'pending'
    });
    
    await fulfillmentRequest.populate('products.productId', 'name costPrice');
    await fulfillmentRequest.populate('supplierId', 'name companyName');
    
    // Send notification to admins about new fulfillment request
    try {
      // Get all admin users
      const User = (await import('@/models/User')).default;
      const adminUsers = await User.find({ role: 'admin' }).select('_id name').lean();
      
      // Get product names for the notification
      const productNames = products.map(product => product.name).join(', ');
      
      // Create notification for each admin
      const Notification = (await import('@/models/Notification')).default;
      const notificationPromises = adminUsers.map(admin => 
        Notification.create({
          userId: admin._id,
          title: 'طلب تخزين جديد',
          message: `طلب تخزين جديد من ${user.name || user.companyName} للمنتجات: ${productNames}`,
          type: 'info',
          actionUrl: `/dashboard/fulfillment/${fulfillmentRequest._id}`,
          metadata: { 
            supplierId: user._id,
            supplierName: user.name || user.companyName,
            fulfillmentRequestId: fulfillmentRequest._id,
            productCount: products.length,
            totalValue: fulfillmentRequest.totalValue,
            totalItems: fulfillmentRequest.totalItems,
            notes: validatedData.notes
          }
        })
      );
      
      await Promise.all(notificationPromises);
      console.log(`✅ Notifications sent to ${adminUsers.length} admin users for new fulfillment request from ${user.name || user.companyName}`);
      
    } catch (error) {
      console.error('❌ Error sending notifications to admins:', error);
    }
    
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
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error creating fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إنشاء طلب التخزين' },
      { status: 500 }
    );
  }
}

// Export handlers with role-based access
export const GET = withAuth(getFulfillmentRequests);
export const POST = withRole(['supplier'])(createFulfillmentRequest); 