import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Chat, { ChatStatus, MessageType } from '@/models/Chat';
import { UserRole } from '@/types';

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
export const GET = withAuth(async (req: NextRequest, user, { params }: RouteParams) => {
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

    // Mark messages as read
    await chat.markAsRead(user._id.toString());

    return NextResponse.json({
      success: true,
      chat: {
        ...chat.toObject(),
        unreadCount: chat.getUnreadCount(user._id.toString())
      }
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب المحادثة' },
      { status: 500 }
    );
  }
});

// POST /api/chat/[id] - Send message in chat
export const POST = withAuth(async (req: NextRequest, user, { params }: RouteParams) => {
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

    return NextResponse.json({
      success: true,
      message
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إرسال الرسالة' },
      { status: 500 }
    );
  }
});

// PUT /api/chat/[id] - Update chat (status, priority, etc.)
export const PUT = withAuth(async (req: NextRequest, user, { params }: RouteParams) => {
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
      const io = require('@/lib/socket').getIO();
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث المحادثة' },
      { status: 500 }
    );
  }
});

// DELETE /api/chat/[id] - Delete chat (admin only)
export const DELETE = withAuth(async (req: NextRequest, user, { params }: RouteParams) => {
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
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف المحادثة' },
      { status: 500 }
    );
  }
}); 