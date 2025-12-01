import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import User from '@/models/User'; // Import User model for population
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/messages/conversations - Get user conversations
async function getConversations(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('GET', '/api/messages/conversations', { userId: user._id, role: user.role });
    
    // Get conversations with approved messages only
    // Let's try a simpler approach first - get all messages for this user
    const allMessages = await Message.find({
      $or: [
        { senderId: user._id },
        { receiverId: user._id }
      ],
      isApproved: true,
      receiverId: { $ne: null }
    })
    .populate('senderId', 'name role')
    .populate('receiverId', 'name role')
    .sort({ createdAt: -1 });
    
    logger.debug('Messages found for conversations', { userId: user._id, count: allMessages.length });
    
    // Group messages by conversation manually
    const conversationMap = new Map();
    
    allMessages.forEach(message => {
      const senderId = message.senderId._id.toString();
      const receiverId = message.receiverId._id.toString();
      const currentUserId = user._id.toString();
      
      // Create conversation ID by sorting user IDs
      const conversationId = [senderId, receiverId].sort().join('-');
      
      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          _id: conversationId,
          lastMessage: message,
          unreadCount: 0,
          messages: []
        });
      }
      
      const conversation = conversationMap.get(conversationId);
      conversation.messages.push(message);
      
      // Update last message if this one is newer
      if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = message;
      }
      
      // Count unread messages for current user
      if (message.receiverId._id.toString() === currentUserId && !message.isRead) {
        conversation.unreadCount++;
      }
    });
    
    const conversations = Array.from(conversationMap.values());
    
    logger.debug('Conversations grouped', { userId: user._id, count: conversations.length });
    
    // Transform conversations for frontend
    const transformedConversations = conversations
      .filter(conv => conv.lastMessage && conv.lastMessage.senderId && conv.lastMessage.receiverId)
      .map(conv => {
        const lastMessage = conv.lastMessage;
        
        // Ensure we have valid sender and receiver data
        if (!lastMessage.senderId._id || !lastMessage.receiverId._id) {
          logger.warn('Skipping conversation with invalid user data', {
            conversationId: conv._id,
            hasSenderId: !!lastMessage.senderId?._id,
            hasReceiverId: !!lastMessage.receiverId?._id
          });
          return null;
        }
        
        const isSender = lastMessage.senderId._id.toString() === user._id.toString();
        const otherUserId = isSender ? lastMessage.receiverId._id : lastMessage.senderId._id;
        const otherUserName = isSender ? lastMessage.receiverId.name : lastMessage.senderId.name;
        const otherUserRole = isSender ? lastMessage.receiverId.role : lastMessage.senderId.role;
        
        return {
          _id: conv._id,
          lastMessage: {
            _id: lastMessage._id,
            subject: lastMessage.subject,
            content: lastMessage.content,
            senderId: {
              _id: lastMessage.senderId._id,
              name: lastMessage.senderId.name || 'مستخدم غير معروف',
              role: lastMessage.senderId.role || 'user'
            },
            receiverId: {
              _id: lastMessage.receiverId._id,
              name: lastMessage.receiverId.name || 'مستخدم غير معروف',
              role: lastMessage.receiverId.role || 'user'
            },
            isRead: lastMessage.isRead,
            isApproved: lastMessage.isApproved,
                         createdAt: lastMessage.createdAt,
             productId: lastMessage.productId || null
          },
          unreadCount: conv.unreadCount,
          otherUser: {
            _id: otherUserId,
            name: otherUserName || 'مستخدم غير معروف',
            role: otherUserRole || 'user'
          }
        };
      })
      .filter(Boolean); // Remove null entries
    
    logger.debug('Conversations transformed', {
      userId: user._id,
      transformedCount: transformedConversations.length,
      rawCount: conversations.length
    });
    
    logger.apiResponse('GET', '/api/messages/conversations', 200);
    
    return NextResponse.json({
      success: true,
      conversations: transformedConversations
    });
  } catch (error) {
    logger.error('Error fetching conversations', error, { userId: user._id });
    
    // If it's an aggregation error, try a simpler approach
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('aggregation')) {
      logger.debug('Trying simpler conversation fetch as fallback', { userId: user._id });
      try {
        // Fallback: get all messages for the user
        const messages = await Message.find({
          $or: [
            { senderId: user._id },
            { receiverId: user._id }
          ],
          isApproved: true,
          receiverId: { $ne: null }
        })
                 .populate('senderId', 'name role')
         .populate('receiverId', 'name role')
         .sort({ createdAt: -1 })
        .limit(50);
        
        logger.debug('Fallback messages fetched', { userId: user._id, count: messages.length });
        
        return NextResponse.json({
          success: true,
          conversations: [] // Return empty conversations for now
        });
      } catch (fallbackError) {
        logger.error('Fallback conversation fetch also failed', fallbackError, { userId: user._id });
      }
    }
    
    return handleApiError(error, 'حدث خطأ أثناء جلب المحادثات');
  }
}

export const GET = withAuth(getConversations); 