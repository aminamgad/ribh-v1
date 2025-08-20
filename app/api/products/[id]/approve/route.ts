import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Product from '@/models/Product';
import connectDB from '@/lib/database';

async function approveProductHandler(
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    console.log('🔍 User authentication successful:', {
      userId: user._id,
      userRole: user.role,
      userName: user.name
    });

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ Role check failed - user is not admin:', user.role);
      return NextResponse.json({ message: 'غير مصرح' }, { status: 403 });
    }

    console.log('✅ Admin role verified successfully');

    const { id } = params;
    if (!id) {
      return NextResponse.json({ message: 'معرف المنتج مطلوب' }, { status: 400 });
    }

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ message: 'المنتج غير موجود' }, { status: 404 });
    }

    // Update product approval status
    const updateData: any = {
      isApproved: true,
      isRejected: false,
      rejectionReason: null,
      approvedAt: new Date(),
      approvedBy: user._id,
      adminNotes: `تمت الموافقة بواسطة ${user.name} في ${new Date().toLocaleString('ar-SA')}`
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('supplierId', 'name companyName');

    // Send notification to supplier
    if (updatedProduct.supplierId) {
      try {
        const Notification = (await import('@/models/Notification')).default;
        await Notification.create({
          userId: updatedProduct.supplierId._id,
          title: 'تمت الموافقة على المنتج',
          message: `تمت الموافقة على منتجك "${updatedProduct.name}" من قبل الإدارة`,
          type: 'success',
          actionUrl: `/dashboard/products/${updatedProduct._id}`,
          metadata: { 
            productId: updatedProduct._id,
            productName: updatedProduct.name,
            adminName: user.name
          }
        });
        console.log(`✅ Notification sent to supplier for approved product: ${updatedProduct.name}`);
      } catch (error) {
        console.error('❌ Error sending notification to supplier:', error);
      }
    }

    return NextResponse.json({
      message: 'تمت الموافقة على المنتج بنجاح',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error approving product:', error);
    return NextResponse.json(
      { message: 'حدث خطأ أثناء الموافقة على المنتج' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Starting product approval process');
    
    const user = await getCurrentUser(request);
    if (!user) {
      console.log('❌ Authentication failed - no user found');
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    return await approveProductHandler(request, user, { params });
  } catch (error) {
    console.error('Error in approval route:', error);
    return NextResponse.json(
      { message: 'حدث خطأ أثناء الموافقة على المنتج' },
      { status: 500 }
    );
  }
}

