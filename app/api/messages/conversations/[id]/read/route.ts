import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import User from '@/models/User'; // Import User model for population
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/messages/conversations/[id]/read - Mark messages as read
async function markMessagesAsRead(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const conversationId = params.id;
    
    // Parse conversation ID to get the two user IDs
    const [userId1, userId2] = conversationId.split('-');
    
    if (!userId1 || !userId2) {
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة غير صحيح' },
        { status: 400 }
      );
    }
    
    // Verify that the current user is part of this conversation
    if (userId1 !== user._id.toString() && userId2 !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' },
        { status: 403 }
      );
    }
    
    // Mark all unread messages in this conversation as read
    const result = await Message.updateMany(
      {
        $or: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ],
        receiverId: user._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );
    
    logger.debug('Messages marked as read', {
      conversationId,
      modifiedCount: result.modifiedCount,
      userId: user._id.toString()
    });
    
    logger.apiResponse('POST', `/api/messages/conversations/${params.id}/read`, 200);
    
    return NextResponse.json({
      success: true,
      message: `تم تحديث ${result.modifiedCount} رسالة كمقروءة`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Error marking messages as read', error, {
      conversationId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء تحديث حالة الرسائل');
  }
}

export const POST = withAuth(markMessagesAsRead); 