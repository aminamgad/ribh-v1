/**
 * Polling endpoint for messages
 * Used as an alternative to Socket.io for real-time chat updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handleApiError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    // Get chat ID and timestamp from query
    const chatId = req.nextUrl.searchParams.get('chatId');
    const since = req.nextUrl.searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 1 * 60 * 1000); // Default: last minute

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة مطلوب' },
        { status: 400 }
      );
    }

    // Import Chat model
    const Chat = (await import('@/models/Chat')).default;
    const Message = (await import('@/models/Message')).default;

    // Check if user is participant in the chat
    const chat = await Chat.findById(chatId).lean();
    
    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'المحادثة غير موجودة' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    const chatObj = Array.isArray(chat) ? chat[0] : chat;
    const isParticipant = (chatObj as any)?.participants?.some(
      (p: { toString: () => string }) => p.toString() === user._id.toString()
    ) || false;

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: 'ليس لديك صلاحية للوصول لهذه المحادثة' },
        { status: 403 }
      );
    }

    // Fetch new messages since the given timestamp
    const messages = await Message.find({
      chatId,
      createdAt: { $gte: sinceDate }
    })
      .populate('senderId', 'name email role avatar')
      .sort({ createdAt: 1 })
      .lean();

    logger.debug('Polling messages', {
      userId: user._id,
      chatId,
      count: messages.length,
      since: sinceDate.toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        messages,
        timestamp: new Date().toISOString(),
        count: messages.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

