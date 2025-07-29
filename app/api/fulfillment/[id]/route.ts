import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import FulfillmentRequest from '@/models/FulfillmentRequest';
import { z } from 'zod';

const updateFulfillmentSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  warehouseLocation: z.string().optional(),
  expectedDeliveryDate: z.string().optional()
});

// GET /api/fulfillment/[id] - Get specific fulfillment request
async function getFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const request = await FulfillmentRequest.findById(params.id)
      .populate('products.productId', 'name costPrice images')
      .populate('supplierId', 'name companyName email phone')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .lean() as any;
    
    if (!request) {
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Role-based access control
    if (user.role === 'supplier' && request.supplierId._id.toString() !== user._id) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذا الطلب' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      request: {
        _id: request._id,
        supplierName: request.supplierId?.name || request.supplierId?.companyName,
        supplierEmail: request.supplierId?.email,
        supplierPhone: request.supplierId?.phone,
        products: request.products.map((product: any) => ({
          productName: product.productId?.name,
          productImages: product.productId?.images,
          quantity: product.quantity,
          currentStock: product.currentStock,
          costPrice: product.productId?.costPrice
        })),
        status: request.status,
        totalValue: request.totalValue,
        totalItems: request.totalItems,
        notes: request.notes,
        adminNotes: request.adminNotes,
        rejectionReason: request.rejectionReason,
        warehouseLocation: request.warehouseLocation,
        expectedDeliveryDate: request.expectedDeliveryDate,
        createdAt: request.createdAt,
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy?.name,
        rejectedAt: request.rejectedAt,
        rejectedBy: request.rejectedBy?.name,
        isOverdue: request.isOverdue
      }
    });
  } catch (error) {
    console.error('Error fetching fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب طلب التخزين' },
      { status: 500 }
    );
  }
}

// PUT /api/fulfillment/[id] - Update fulfillment request (admin only)
async function updateFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = updateFulfillmentSchema.parse(body);
    
    const request = await FulfillmentRequest.findById(params.id);
    if (!request) {
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Only admin can update status
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتحديث حالة الطلب' },
        { status: 403 }
      );
    }
    
    // Update request
    request.status = validatedData.status;
    request.adminNotes = validatedData.adminNotes;
    request.warehouseLocation = validatedData.warehouseLocation;
    
    if (validatedData.expectedDeliveryDate) {
      request.expectedDeliveryDate = new Date(validatedData.expectedDeliveryDate);
    }
    
    if (validatedData.status === 'approved') {
      request.approvedAt = new Date();
      request.approvedBy = user._id;
      request.rejectedAt = undefined;
      request.rejectedBy = undefined;
      request.rejectionReason = undefined;
    } else if (validatedData.status === 'rejected') {
      if (!validatedData.rejectionReason) {
        return NextResponse.json(
          { success: false, message: 'يجب إضافة سبب الرفض' },
          { status: 400 }
        );
      }
      request.rejectedAt = new Date();
      request.rejectedBy = user._id;
      request.rejectionReason = validatedData.rejectionReason;
      request.approvedAt = undefined;
      request.approvedBy = undefined;
    }
    
    await request.save();
    
    await request.populate('supplierId', 'name companyName');
    await request.populate('approvedBy', 'name');
    await request.populate('rejectedBy', 'name');
    
    return NextResponse.json({
      success: true,
      message: `تم ${validatedData.status === 'approved' ? 'الموافقة على' : validatedData.status === 'rejected' ? 'رفض' : 'تحديث'} طلب التخزين بنجاح`,
      request: {
        _id: request._id,
        status: request.status,
        adminNotes: request.adminNotes,
        rejectionReason: request.rejectionReason,
        warehouseLocation: request.warehouseLocation,
        expectedDeliveryDate: request.expectedDeliveryDate,
        approvedAt: request.approvedAt,
        approvedBy: request.approvedBy?.name,
        rejectedAt: request.rejectedAt,
        rejectedBy: request.rejectedBy?.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error updating fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث طلب التخزين' },
      { status: 500 }
    );
  }
}

// DELETE /api/fulfillment/[id] - Delete fulfillment request
async function deleteFulfillmentRequest(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const request = await FulfillmentRequest.findById(params.id);
    if (!request) {
      return NextResponse.json(
        { success: false, message: 'طلب التخزين غير موجود' },
        { status: 404 }
      );
    }
    
    // Only supplier can delete their own requests, or admin can delete any
    if (user.role === 'supplier' && request.supplierId.toString() !== user._id) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بحذف هذا الطلب' },
        { status: 403 }
      );
    }
    
    // Cannot delete approved requests
    if (request.status === 'approved') {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف طلب تمت الموافقة عليه' },
        { status: 400 }
      );
    }
    
    await FulfillmentRequest.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف طلب التخزين بنجاح'
    });
  } catch (error) {
    console.error('Error deleting fulfillment request:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف طلب التخزين' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getFulfillmentRequest);
export const PUT = withRole(['admin'])(updateFulfillmentRequest);
export const DELETE = withAuth(deleteFulfillmentRequest); 