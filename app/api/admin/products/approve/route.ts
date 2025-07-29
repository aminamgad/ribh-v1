import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { z } from 'zod';

const approvalSchema = z.object({
  productIds: z.array(z.string()).min(1, 'يجب اختيار منتج واحد على الأقل'),
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional()
});

// POST /api/admin/products/approve - Approve or reject products
async function approveProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = approvalSchema.parse(body);
    
    // Validate rejection reason if rejecting
    if (validatedData.action === 'reject' && !validatedData.rejectionReason) {
      return NextResponse.json(
        { success: false, message: 'يجب إضافة سبب الرفض' },
        { status: 400 }
      );
    }
    
    // Find products
    const products = await Product.find({
      _id: { $in: validatedData.productIds }
    });
    
    if (products.length !== validatedData.productIds.length) {
      return NextResponse.json(
        { success: false, message: 'بعض المنتجات غير موجودة' },
        { status: 404 }
      );
    }
    
    // Update products
    const updateData: any = {
      isApproved: validatedData.action === 'approve',
      isRejected: validatedData.action === 'reject',
      adminNotes: validatedData.adminNotes
    };
    
    console.log('🔄 Updating products with data:', {
      action: validatedData.action,
      productIds: validatedData.productIds,
      updateData: updateData
    });
    
    if (validatedData.action === 'reject') {
      updateData.rejectionReason = validatedData.rejectionReason;
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = user._id;
      updateData.approvedAt = undefined;
      updateData.approvedBy = undefined;
      updateData.isApproved = false; // تأكد من تعيين isApproved إلى false
      updateData.isRejected = true;  // تأكد من تعيين isRejected إلى true
    } else {
      updateData.approvedAt = new Date();
      updateData.approvedBy = user._id;
      updateData.rejectedAt = undefined;
      updateData.rejectedBy = undefined;
      updateData.rejectionReason = undefined;
      updateData.isApproved = true;  // تأكد من تعيين isApproved إلى true
      updateData.isRejected = false; // تأكد من تعيين isRejected إلى false
    }
    
    console.log('🔧 Final update data:', updateData);
    
    const result = await Product.updateMany(
      { _id: { $in: validatedData.productIds } },
      updateData
    );
    
    console.log('✅ Update result:', {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
    
    // Get updated products for response
    const updatedProducts = await Product.find({
      _id: { $in: validatedData.productIds }
    })
    .populate('supplierId', 'name companyName')
    .populate('categoryId', 'name')
    .lean();

    // Send notifications to suppliers
    for (const product of updatedProducts) {
      console.log(`Processing notification for product: ${product.name}, supplierId: ${product.supplierId}`);
      
      if (product.supplierId) {
        const supplierId = typeof product.supplierId === 'object' ? product.supplierId._id : product.supplierId;
        const supplierName = typeof product.supplierId === 'object' ? (product.supplierId.name || product.supplierId.companyName) : 'المورد';
        
        console.log(`Supplier ID: ${supplierId}, Supplier Name: ${supplierName}`);
        
        // Create notification in database
        try {
          const notificationData = {
            userId: supplierId,
            title: validatedData.action === 'approve' ? 'تمت الموافقة على المنتج' : 'تم رفض المنتج',
            message: validatedData.action === 'approve' 
              ? `تمت الموافقة على منتجك "${product.name}" من قبل الإدارة`
              : `تم رفض منتجك "${product.name}" من قبل الإدارة. السبب: ${validatedData.rejectionReason}`,
            type: validatedData.action === 'approve' ? 'success' : 'error',
            actionUrl: '/dashboard/products',
            metadata: { 
              productId: product._id,
              productName: product.name,
              adminNotes: validatedData.adminNotes,
              rejectionReason: validatedData.rejectionReason
            }
          };
          
          // Save to database
          const Notification = (await import('@/models/Notification')).default;
          await Notification.create(notificationData);
          console.log(`✅ Notification saved to database for supplier ${supplierId}`);
          
        } catch (error) {
          console.error(`❌ Error saving notification to database:`, error);
        }
      } else {
        console.log(`No supplierId found for product ${product.name}`);
      }
    }
    
    console.log('📤 Returning updated products:', updatedProducts.map(product => ({
      id: product._id,
      name: product.name,
      isApproved: product.isApproved,
      isRejected: product.isRejected,
      status: product.isApproved ? 'معتمد' : product.isRejected ? 'مرفوض' : 'قيد المراجعة'
    })));
    
    return NextResponse.json({
      success: true,
      message: `تم ${validatedData.action === 'approve' ? 'الموافقة على' : 'رفض'} ${result.modifiedCount} منتج بنجاح`,
      products: updatedProducts.map(product => ({
        _id: product._id,
        name: product.name,
        isApproved: product.isApproved,
        isRejected: product.isRejected,
        adminNotes: product.adminNotes,
        rejectionReason: product.rejectionReason,
        approvedAt: product.approvedAt,
        approvedBy: product.approvedBy,
        rejectedAt: product.rejectedAt,
        rejectedBy: product.rejectedBy,
        supplierName: product.supplierId?.name || product.supplierId?.companyName,
        categoryName: product.categoryId?.name
      }))
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error approving products:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء معالجة المنتجات' },
      { status: 500 }
    );
  }
}

export const POST = withRole(['admin'])(approveProducts); 