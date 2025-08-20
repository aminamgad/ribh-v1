import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import Product from '@/models/Product'; // Import Product model for population
import User from '@/models/User'; // Import User model for population

// PUT /api/admin/messages/[id]/reject - Reject a message
async function rejectMessage(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const messageId = params.id;
    const body = await req.json();
    const { adminNotes } = body;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'الرسالة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        isApproved: false,
        adminNotes: adminNotes || message.adminNotes,
        approvedAt: new Date(),
        approvedBy: user._id
      },
      { new: true }
    ).populate('senderId', 'name role')
     .populate('receiverId', 'name role')
     .populate('productId', 'name images')
     .populate('approvedBy', 'name');
    
    return NextResponse.json({
      success: true,
      message: 'تم رفض الرسالة بنجاح',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Error rejecting message:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء رفض الرسالة' },
      { status: 500 }
    );
  }
}

export const PUT = withRole(['admin'])(rejectMessage);
