import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import User from '@/models/User'; // Import User model for population
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/messages/conversations/[id] - Get messages in a conversation
async function getConversationMessages(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const conversationId = params.id;
    
    // Parse conversation ID to get the two user IDs
    const [userId1, userId2] = conversationId.split('-');
    
    logger.apiRequest('GET', `/api/messages/conversations/${params.id}`, {
      conversationId,
      userId: user._id.toString()
    });
    
    if (!userId1 || !userId2) {
      logger.warn('Invalid conversation ID format', { conversationId, userId: user._id });
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة غير صحيح' },
        { status: 400 }
      );
    }
    
    // Verify that the current user is part of this conversation
    if (userId1 !== user._id.toString() && userId2 !== user._id.toString()) {
      logger.warn('Unauthorized access attempt to conversation', {
        conversationId,
        userId: user._id.toString(),
        conversationUsers: [userId1, userId2]
      });
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' },
        { status: 403 }
      );
    }
    
    // Get messages in this conversation (approved messages only)
    const mongoose = await import('mongoose');
    const messages = await Message.find({
      $or: [
        { senderId: new mongoose.Types.ObjectId(userId1), receiverId: new mongoose.Types.ObjectId(userId2) },
        { senderId: new mongoose.Types.ObjectId(userId2), receiverId: new mongoose.Types.ObjectId(userId1) }
      ],
      isApproved: true // Only show approved messages
    })
    .populate('senderId', 'name role')
    .populate('receiverId', 'name role')
    .sort({ createdAt: 1 });
    
    logger.debug('Conversation messages fetched', {
      conversationId,
      messageCount: messages.length,
      userId: user._id.toString()
    });
    
    logger.apiResponse('GET', `/api/messages/conversations/${params.id}`, 200);
    
    return NextResponse.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    logger.error('Error fetching conversation messages', error, {
      conversationId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء جلب الرسائل');
  }
}

export const GET = withAuth(getConversationMessages); 