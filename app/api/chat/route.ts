import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Chat, { ChatStatus } from '@/models/Chat';
import User from '@/models/User';
import Message from '@/models/Message';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

// Validation schema
const createChatSchema = z.object({
  subject: z.string().min(1, 'موضوع المحادثة مطلوب'),
  category: z.string().optional(),
  recipientId: z.string().optional(), // For non-admin users
  message: z.string().min(1, 'الرسالة الأولى مطلوبة')
});

// GET /api/chat - Get user's chats
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};
    
    if (user.role === 'admin') {
      // Admin sees all chats
      if (status) {
        query.status = status;
      }
    } else {
      // Other users see only their chats
      query.participants = user._id;
      if (status) {
        query.status = status;
      }
    }

    // Get chats
    const [chats, total] = await Promise.all([
      (Chat as any).find(query)
        .populate('participants', 'name email role companyName')
        .populate('closedBy', 'name')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      (Chat as any).countDocuments(query)
    ]);

    // Add unread count for each chat
    const chatsWithUnread = chats.map((chat: any) => {
      // حساب الرسائل غير المقروءة بدقة
      const userIdStr = user._id.toString();
      const unreadCount = chat.messages?.filter((message: any) => {
        // التعامل مع senderId كـ ObjectId أو كـ object مأهول
        const senderId = message.senderId?._id || message.senderId;
        const senderIdStr = senderId?.toString() || senderId;
        
        // الرسالة غير مقروءة إذا كانت:
        // 1. ليست من المستخدم الحالي
        // 2. لم يتم قراءتها بعد
        return senderIdStr && senderIdStr !== userIdStr && !message.isRead;
      }).length || 0;
      
      return {
        ...chat,
        unreadCount
      };
    });

    return NextResponse.json({
      success: true,
      chats: chatsWithUnread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
    logger.apiResponse('GET', '/api/chat', 200);
  } catch (error) {
    logger.error('Error fetching chats', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب المحادثات');
  }
});

// POST /api/chat - Create new chat
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const validatedData = createChatSchema.parse(body);

    await connectDB();

    let participants: string[] = [];
    let recipientId: string;

    if (user.role === 'admin') {
      // Admin must specify recipient
      if (!validatedData.recipientId) {
        return NextResponse.json(
          { success: false, message: 'يجب تحديد المستخدم المستهدف' },
          { status: 400 }
        );
      }
      recipientId = validatedData.recipientId;
      participants = [user._id.toString(), recipientId];
    } else {
      // Non-admin users chat with admin
      // Find an available admin
      const admin = await User.findOne({ 
        role: 'admin', 
        isActive: true 
      }).sort({ lastLogin: 1 });
      
      if (!admin) {
        return NextResponse.json(
          { success: false, message: 'لا يوجد مسؤول متاح حالياً' },
          { status: 503 }
        );
      }
      
      recipientId = admin._id.toString();
      participants = [user._id.toString(), recipientId];
    }

    // Check for existing active chat
    const existingChat = await (Chat as any).findOne({
      participants: { $all: participants },
      status: { $ne: ChatStatus.CLOSED }
    });

    let chat;
    
    if (existingChat) {
      // Use existing chat
      chat = existingChat;
      
      // Add the initial message directly to messages array
      (chat as any).messages.push({
        senderId: user._id,
        message: validatedData.message,
        type: 'text' as any,
        isRead: false,
        createdAt: new Date()
      } as any);
      await chat.save();
    } else {
      // Create new chat
      chat = await (Chat as any).createChat(
        participants,
        validatedData.subject,
        validatedData.category
      );
      
      // Add the initial message directly to messages array
      (chat as any).messages.push({
        senderId: user._id,
        message: validatedData.message,
        type: 'text' as any,
        isRead: false,
        createdAt: new Date()
      } as any);
      await chat.save();
    }

    // Populate participants
    await (chat as any).populate('participants', 'name email role companyName');

    // Send notification to recipient
    try {
      // Check if recipient is online
      const recipientIsOnline = await isUserOnline(recipientId);
      
      // Prepare notification message
      const messagePreview = validatedData.message.length > 50 
        ? validatedData.message.substring(0, 50) + '...'
        : validatedData.message;
      
      await sendNotificationToUser(
        recipientId,
        {
          title: 'محادثة جديدة',
          message: `${user.name || 'مستخدم'}: ${messagePreview}`,
          type: 'info',
          actionUrl: `/dashboard/chat?id=${chat._id}`,
          metadata: {
            chatId: chat._id.toString(),
            senderId: user._id.toString(),
            senderName: user.name,
            chatSubject: validatedData.subject,
            category: validatedData.category
          }
        },
        {
          sendEmail: !recipientIsOnline, // Send email if user is offline
          sendSocket: true
        }
      );

      logger.debug('Notification sent for new chat', {
        chatId: chat._id.toString(),
        recipientId,
        senderId: user._id.toString(),
        recipientIsOnline
      });
    } catch (notificationError) {
      // Log error but don't fail chat creation
      logger.warn('Error sending notification for new chat', {
        error: notificationError,
        chatId: chat._id.toString(),
        recipientId,
        senderId: user._id.toString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المحادثة بنجاح',
      chat: {
        _id: chat._id,
        participants: (chat as any).participants,
        subject: (chat as any).subject,
        status: (chat as any).status,
        category: (chat as any).category,
        priority: (chat as any).priority,
        lastMessage: (chat as any).lastMessage,
        lastMessageAt: (chat as any).lastMessageAt,
        unreadCount: 0, // سيتم حسابها من الرسائل غير المقروءة
        createdAt: (chat as any).createdAt
      }
    }, { status: 201 });
  } catch (error) {
    const { handleApiError, safeLogError } = await import('@/lib/error-handler');
    safeLogError(error, 'Create Chat', { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إنشاء المحادثة', { userId: user._id });
  }
}); 