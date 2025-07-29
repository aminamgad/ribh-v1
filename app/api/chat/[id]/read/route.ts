import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import Chat from '@/models/Chat';
import Message from '@/models/Message';
import connectDB from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await withAuth(request);
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
    const isParticipant = chat.participants.some(p => p._id.toString() === user._id.toString());
    if (!isParticipant) {
      return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 403 });
    }

    // تحديث حالة القراءة لجميع الرسائل في المحادثة
    await Message.updateMany(
      {
        chatId: chatId,
        'senderId._id': { $ne: user._id }, // الرسائل التي ليست من المستخدم الحالي
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    // تحديث عداد الرسائل غير المقروءة في المحادثة
    const unreadCount = await Message.countDocuments({
      chatId: chatId,
      'senderId._id': { $ne: user._id },
      isRead: false
    });

    await Chat.findByIdAndUpdate(chatId, {
      unreadCount: unreadCount
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة القراءة بنجاح',
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('Error marking chat as read:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في تحديث حالة القراءة' },
      { status: 500 }
    );
  }
} 