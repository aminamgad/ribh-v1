import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';

// POST /api/messages/[id]/read - Mark message as read
async function markMessageAsRead(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const messageId = params.id;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'الرسالة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Verify that the current user is the receiver
    if (message.receiverId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتمييز هذه الرسالة كمقروءة' },
        { status: 403 }
      );
    }
    
    // Mark as read
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
    
    console.log(`Message ${messageId} marked as read by user ${user.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'تم تمييز الرسالة كمقروءة'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تمييز الرسالة كمقروءة' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(markMessageAsRead); 