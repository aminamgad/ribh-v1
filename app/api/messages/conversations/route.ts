import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import User from '@/models/User'; // Import User model for population

// GET /api/messages/conversations - Get user conversations
async function getConversations(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    console.log('🔍 Fetching conversations for user:', user._id);
    
    // Get conversations with approved messages only
    console.log('🔍 User ID for conversation search:', user._id);
    console.log('🔍 User role:', user.role);
    
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
    
    console.log('🔍 Total messages found:', allMessages.length);
    
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
    console.log('🔍 Conversations found:', conversations.length);
    
    // Transform conversations for frontend
    const transformedConversations = conversations
      .filter(conv => conv.lastMessage && conv.lastMessage.senderId && conv.lastMessage.receiverId)
      .map(conv => {
        const lastMessage = conv.lastMessage;
        
        // Ensure we have valid sender and receiver data
        if (!lastMessage.senderId._id || !lastMessage.receiverId._id) {
          console.log('⚠️ Skipping conversation with invalid user data:', {
            conversationId: conv._id,
            senderId: lastMessage.senderId?._id,
            receiverId: lastMessage.receiverId?._id
          });
          return null;
        }
        
        const isSender = lastMessage.senderId._id.toString() === user._id.toString();
        console.log('🔍 Message sender ID:', lastMessage.senderId._id.toString());
        console.log('🔍 Current user ID:', user._id.toString());
        console.log('🔍 Is sender:', isSender);
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
    
    console.log(`Found ${transformedConversations.length} conversations for user ${user.name}`);
    console.log('🔍 Raw conversations before transformation:', conversations.length);
    console.log('🔍 Transformed conversations:', transformedConversations.length);
    
    // Debug: Show conversation details
    transformedConversations.forEach((conv, index) => {
      if (conv) { // Add null check
        console.log(`🔍 Conversation ${index + 1}:`, {
          id: conv._id,
          otherUser: conv.otherUser.name,
          lastMessageSubject: conv.lastMessage.subject,
          lastMessageContent: conv.lastMessage.content,
          unreadCount: conv.unreadCount
        });
      }
    });
    
    // Debug: Show additional message details
    console.log('🔍 Messages details:', allMessages.map(m => ({
      id: m._id,
      sender: m.senderId?.name,
      receiver: m.receiverId?.name,
      isApproved: m.isApproved,
      subject: m.subject
    })));
    
    return NextResponse.json({
      success: true,
      conversations: transformedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    
    // If it's an aggregation error, try a simpler approach
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('aggregation')) {
      console.log('🔄 Trying simpler conversation fetch...');
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
        
        console.log(`Found ${messages.length} messages for user ${user.name}`);
        
        return NextResponse.json({
          success: true,
          conversations: [] // Return empty conversations for now
        });
      } catch (fallbackError) {
        console.error('Fallback conversation fetch also failed:', fallbackError);
      }
    }
    
        return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المحادثات' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getConversations); 