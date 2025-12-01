import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Chat from '@/models/Chat';
import connectDB from '@/lib/database';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
    }

    await connectDB();

    const chatId = params.id;

    // التحقق من وجود المحادثة
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ success: false, message: 'المحادثة غير موجودة' }, { status: 404 });
    }

    // التحقق من أن المستخدم مشارك في المحادثة
    const isParticipant = chat.participants.some((p: any) => p._id.toString() === user._id.toString());
    if (!isParticipant) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }

    // استخدام method الموجود في Chat model لتحديد الرسائل كمقرؤة
    await chat.markAsRead(user._id.toString());

    // حساب عداد الرسائل غير المقروءة المحدث بعد التحديث
    const unreadCount = chat.getUnreadCount(user._id.toString());
    
    logger.debug('Chat messages marked as read', {
      chatId,
      userId: user._id.toString(),
      unreadCount
    });

    logger.apiResponse('POST', `/api/chat/${params.id}/read`, 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة القراءة بنجاح',
      unreadCount: unreadCount
    });

  } catch (error) {
    logger.error('Error marking chat as read', error, {
      chatId: params.id
    });
    return handleApiError(error, 'خطأ في تحديث حالة القراءة');
  }
} 