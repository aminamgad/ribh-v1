import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';

// GET /api/messages/conversations - Get user conversations
async function getConversations(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    // Get conversations with approved messages only
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: user._id },
            { receiverId: user._id }
          ],
          isApproved: true // Only show approved messages
        }
      },
      {
        $addFields: {
          conversationId: {
            $cond: {
              if: { $eq: ['$senderId', user._id] },
              then: { $concat: ['$senderId', '-', '$receiverId'] },
              else: { $concat: ['$receiverId', '-', '$senderId'] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', user._id] },
                    { $eq: ['$isRead', false] },
                    { $eq: ['$isApproved', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);
    
    // Populate user data for conversations
    const populatedConversations = await Message.populate(conversations, [
      { path: 'lastMessage.senderId', select: 'name role' },
      { path: 'lastMessage.receiverId', select: 'name role' },
      { path: 'lastMessage.productId', select: 'name images' }
    ]);
    
    // Transform conversations for frontend
    const transformedConversations = populatedConversations.map(conv => {
      const lastMessage = conv.lastMessage;
      const isSender = lastMessage.senderId._id.toString() === user._id;
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
            name: lastMessage.senderId.name,
            role: lastMessage.senderId.role
          },
          receiverId: {
            _id: lastMessage.receiverId._id,
            name: lastMessage.receiverId.name,
            role: lastMessage.receiverId.role
          },
          isRead: lastMessage.isRead,
          isApproved: lastMessage.isApproved,
          createdAt: lastMessage.createdAt
        },
        unreadCount: conv.unreadCount,
        otherUser: {
          _id: otherUserId,
          name: otherUserName,
          role: otherUserRole
        }
      };
    });
    
    console.log(`Found ${transformedConversations.length} conversations for user ${user.name}`);
    
    return NextResponse.json({
      success: true,
      conversations: transformedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المحادثات' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getConversations); 