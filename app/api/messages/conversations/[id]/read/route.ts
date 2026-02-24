import { NextRequest, NextResponse } from 'next/server';
import { withAuth, userHasAnyPermission } from '@/lib/auth';
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
    
    const parts = conversationId.split('-');
    const userId1 = parts[0];
    const userId2 = parts.slice(1).join('-');
    const isNullReceiver = userId2 === 'null' || !userId2;
    
    if (!userId1) {
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة غير صحيح' },
        { status: 400 }
      );
    }
    
    const isParticipant = isNullReceiver ? userId1 === user._id.toString() : (userId1 === user._id.toString() || userId2 === user._id.toString());
    const isAdminWithPermission = user.role === 'admin' && userHasAnyPermission(user, ['messages.view', 'messages.moderate']);
    
    if (!isParticipant && !isAdminWithPermission) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' },
        { status: 403 }
      );
    }
    
    // Mark all unread messages in this conversation as read (حيث المستخدم الحالي هو المستلم)
    let result: { modifiedCount: number };
    if (isNullReceiver) {
      // رسائل بدون مستلم: لا يمكن للمستخدم الحالي أن يكون مستلماً، لا نحدّث شيئاً
      result = { modifiedCount: 0 };
    } else {
      result = await Message.updateMany(
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
    }
    
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