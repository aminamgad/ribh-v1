import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Chat, { ChatStatus, MessageType } from '@/models/Chat';
import { UserRole } from '@/types';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sendNotificationToUser, isUserOnline } from '@/lib/notifications';

// Validation schemas
const sendMessageSchema = z.object({
  message: z.string().min(1, 'الرسالة مطلوبة'),
  type: z.enum(['text', 'image', 'file']).default('text'),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string()
  })).optional()
});

const updateChatSchema = z.object({
  status: z.enum(['active', 'closed', 'pending']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional()
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/chat/[id] - Get chat details with messages
export const GET = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    await connectDB();

    const chat = await Chat.findById(params.id)
      .populate('participants', 'name email role companyName')
      .populate('messages.senderId', 'name email role')
      .populate('closedBy', 'name');

    if (!chat) {
      return NextResponse.json(
        { error: 'المحادثة غير موجودة' },
        { status: 404 }
      );
    }

    // Check access
    if (user.role !== 'admin' && !chat.participants.some((p: any) => p._id.toString() === user._id.toString())) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول إلى هذه المحادثة' },
        { status: 403 }
      );
    }

    // حساب عداد الرسائل غير المقروءة (دون تحديث حالة القراءة)
    // لا نحدد الرسائل كمقرؤة تلقائياً - فقط عند استدعاء /read endpoint
    const unreadCount = chat.getUnreadCount(user._id.toString());

    return NextResponse.json({
      success: true,
      chat: {
        ...chat.toObject(),
        unreadCount
      }
    });
    
    logger.apiResponse('GET', `/api/chat/${params.id}`, 200);
  } catch (error) {
    logger.error('Error fetching chat', error, { chatId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ في جلب المحادثة');
  }
});

// POST /api/chat/[id] - Send message in chat
export const POST = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    const body = await req.json();
    const validatedData = sendMessageSchema.parse(body);

    await connectDB();

    const chat = await Chat.findById(params.id);

    if (!chat) {
      return NextResponse.json(
        { error: 'المحادثة غير موجودة' },
        { status: 404 }
      );
    }

    // Check access
    if (!chat.participants.some((p: any) => p._id.toString() === user._id.toString())) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإرسال رسائل في هذه المحادثة' },
        { status: 403 }
      );
    }

    // Check if chat is closed
    if (chat.status === ChatStatus.CLOSED) {
      return NextResponse.json(
        { error: 'هذه المحادثة مغلقة' },
        { status: 400 }
      );
    }

    // Add message
    const message = await chat.addMessage(
      user._id.toString(),
      validatedData.message,
      validatedData.type as MessageType,
      validatedData.attachments
    );

    // Populate sender info
    await Chat.populate(message, {
      path: 'senderId',
      select: 'name email role'
    });

    // Send notifications to other participants
    try {
      const otherParticipants = chat.participants.filter(
        (p: any) => p.toString() !== user._id.toString()
      );

      // Get sender info for notification
      const sender = message.senderId as any;
      const senderName = sender?.name || user.name || 'مستخدم';

      // Prepare notification message (truncate if too long)
      const messagePreview = validatedData.message.length > 50 
        ? validatedData.message.substring(0, 50) + '...'
        : validatedData.message;

      // Get chat subject for notification
      const chatSubject = (chat as any).subject || 'محادثة';

      for (const participantId of otherParticipants) {
        const participantIdStr = participantId.toString();
        
        // Check if user is online
        const userIsOnline = await isUserOnline(participantIdStr);
        
        // Send notification
        // If user is offline, also send email
        await sendNotificationToUser(
          participantIdStr,
          {
            title: 'رسالة جديدة',
            message: `${senderName}: ${messagePreview}`,
            type: 'info',
            actionUrl: `/dashboard/chat?id=${chat._id}`,
            metadata: {
              chatId: chat._id.toString(),
              senderId: user._id.toString(),
              senderName,
              chatSubject,
              messageType: validatedData.type
            }
          },
          {
            sendEmail: !userIsOnline, // Send email if user is offline
            sendSocket: true
          }
        );

        logger.debug('Notification sent for chat message', {
          chatId: params.id,
          recipientId: participantIdStr,
          senderId: user._id.toString(),
          userIsOnline
        });
      }

      logger.business('Notifications sent for chat message', {
        chatId: params.id,
        participantCount: otherParticipants.length,
        senderId: user._id.toString()
      });
    } catch (notificationError) {
      // Log error but don't fail the message sending
      logger.warn('Error sending chat notifications', {
        error: notificationError,
        chatId: params.id,
        userId: user._id.toString()
      });
    }

    return NextResponse.json({
      success: true,
      message
    }, { status: 201 });
    
    logger.business('Message sent in chat', {
      chatId: params.id,
      userId: user._id.toString(),
      messageType: validatedData.type
    });
    logger.apiResponse('POST', `/api/chat/${params.id}`, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Chat message validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error sending message in chat', error, { chatId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ في إرسال الرسالة');
  }
});

// PUT /api/chat/[id] - Update chat (status, priority, etc.)
export const PUT = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    const body = await req.json();
    const validatedData = updateChatSchema.parse(body);

    await connectDB();

    const chat = await Chat.findById(params.id);

    if (!chat) {
      return NextResponse.json(
        { error: 'المحادثة غير موجودة' },
        { status: 404 }
      );
    }

    // Check access
    const isParticipant = chat.participants.some((p: any) => p._id.toString() === user._id.toString());
    const isAdmin = user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتحديث هذه المحادثة' },
        { status: 403 }
      );
    }

    // Update status
    if (validatedData.status) {
      if (validatedData.status === 'closed') {
        await chat.closeChat(user._id.toString());
      } else if (validatedData.status === 'active' && chat.status === ChatStatus.CLOSED) {
        await chat.reopenChat();
      } else {
        chat.status = validatedData.status as ChatStatus;
      }
    }

    // Update priority (admin only)
    if (validatedData.priority && isAdmin) {
      chat.priority = validatedData.priority;
    }

    // Update rating and feedback (participant only, when closing)
    if (validatedData.rating && isParticipant && chat.status === ChatStatus.CLOSED) {
      chat.rating = validatedData.rating;
      if (validatedData.feedback) {
        chat.feedback = validatedData.feedback;
      }
    }

    await chat.save();

    // Notify participants of status change
    if (validatedData.status) {
      let io;
      try {
        io = require('@/lib/socket').getIO();
      } catch (error) {
        logger.warn('Socket.io not available for chat update notification', { error, chatId: params.id });
      }
      if (io) {
        chat.participants.forEach((participantId: any) => {
          if (participantId.toString() !== user._id.toString()) {
            io.to(participantId.toString()).emit('chatUpdated', {
              chatId: chat._id,
              status: chat.status,
              updatedBy: user._id
            });
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: chat._id,
        status: chat.status,
        priority: chat.priority,
        rating: chat.rating,
        feedback: chat.feedback
      }
    });
    
    logger.business('Chat updated', {
      chatId: params.id,
      userId: user._id.toString(),
      status: validatedData.status,
      priority: validatedData.priority
    });
    logger.apiResponse('PUT', `/api/chat/${params.id}`, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Chat update validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error updating chat', error, { chatId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ في تحديث المحادثة');
  }
});

// DELETE /api/chat/[id] - Delete chat (admin only)
export const DELETE = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف المحادثات' },
        { status: 403 }
      );
    }

    await connectDB();

    const chat = await Chat.findByIdAndDelete(params.id);

    if (!chat) {
      return NextResponse.json(
        { error: 'المحادثة غير موجودة' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف المحادثة بنجاح'
    });
    
    logger.business('Chat deleted', {
      chatId: params.id,
      deletedBy: user._id.toString()
    });
    logger.apiResponse('DELETE', `/api/chat/${params.id}`, 200);
  } catch (error) {
    logger.error('Error deleting chat', error, { chatId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ في حذف المحادثة');
  }
}); 