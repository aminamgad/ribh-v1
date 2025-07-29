import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Order from '@/models/Order';

// POST /api/orders/[id]/fulfill - Fulfill order (for suppliers)
export const POST = withAuth(async (req: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    
    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      );
    }
    
    // Check if user is supplier and owns this order
    if (user.role !== 'supplier' || order.supplierId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ هذا الطلب' },
        { status: 403 }
      );
    }
    
    // Update order status to processing
    order.status = 'processing';
    order.updatedAt = new Date();
    
    await order.save();
    
    return NextResponse.json({
      success: true,
      message: 'تم بدء تنفيذ الطلب بنجاح'
    });
  } catch (error) {
    console.error('Error fulfilling order:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تنفيذ الطلب' },
      { status: 500 }
    );
  }
}); 