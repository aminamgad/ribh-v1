import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Chat, { ChatStatus } from '@/models/Chat';
import User from '@/models/User';
import { sendNotificationToUser } from '@/lib/socket';
import Message from '@/models/Message';

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
      Chat.find(query)
        .populate('participants', 'name email role companyName')
        .populate('closedBy', 'name')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Chat.countDocuments(query)
    ]);

    // Add unread count for each chat
    const chatsWithUnread = chats.map(chat => {
      const unreadCount = chat.messages?.filter(
        (message: any) => message.senderId.toString() !== user._id.toString() && !message.isRead
      ).length || 0;
      
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
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المحادثات', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
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
    const existingChat = await Chat.findOne({
      participants: { $all: participants },
      status: { $ne: ChatStatus.CLOSED }
    });

    let chat;
    
    if (existingChat) {
      // Use existing chat
      chat = existingChat;
      
      // Add the initial message
      await Message.create({
        chatId: chat._id,
        senderId: user._id,
        content: validatedData.message,
        type: 'text'
      });
    } else {
      // Create new chat
      chat = await Chat.createChat(
        participants,
        validatedData.subject,
        validatedData.category
      );
      
      // Add the initial message
      await Message.create({
        chatId: chat._id,
        senderId: user._id,
        content: validatedData.message,
        type: 'text'
      });
    }

    // Populate participants
    await chat.populate('participants', 'name email role companyName');

    // Send notification to recipient
    sendNotificationToUser(recipientId, {
      title: 'رسالة جديدة',
      message: `رسالة جديدة من ${user.name}: ${validatedData.subject}`,
      type: 'info',
      actionUrl: `/dashboard/chat?id=${chat._id}`,
      metadata: { chatId: chat._id, senderId: user._id }
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المحادثة بنجاح',
      chat: {
        _id: chat._id,
        participants: chat.participants,
        subject: chat.subject,
        status: chat.status,
        category: chat.category,
        priority: chat.priority,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: 0, // سيتم حسابها من الرسائل غير المقروءة
        createdAt: chat.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message, errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إنشاء المحادثة', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}); 