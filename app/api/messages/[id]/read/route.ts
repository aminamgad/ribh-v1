import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/messages/[id]/read - Mark message as read
async function markMessageAsRead(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
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
    
    logger.debug('Message marked as read', {
      messageId,
      userId: user._id.toString(),
      userName: user.name
    });
    
    logger.apiResponse('POST', `/api/messages/${params.id}/read`, 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم تمييز الرسالة كمقروءة'
    });
  } catch (error) {
    logger.error('Error marking message as read', error, {
      messageId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء تمييز الرسالة كمقروءة');
  }
}

export const POST = withAuth(markMessageAsRead); 