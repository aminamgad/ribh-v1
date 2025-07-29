import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';

// GET /api/messages/conversations/[id] - Get messages in a conversation
async function getConversationMessages(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const conversationId = params.id;
    
    // Parse conversation ID to get the two user IDs
    const [userId1, userId2] = conversationId.split('-');
    
    if (!userId1 || !userId2) {
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة غير صحيح' },
        { status: 400 }
      );
    }
    
    // Verify that the current user is part of this conversation
    if (userId1 !== user._id.toString() && userId2 !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذه المحادثة' },
        { status: 403 }
      );
    }
    
    // Get messages in this conversation (approved messages only)
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ],
      isApproved: true // Only show approved messages
    })
    .populate('senderId', 'name role')
    .populate('receiverId', 'name role')
    .populate('productId', 'name images')
    .sort({ createdAt: 1 });
    
    console.log(`Found ${messages.length} messages in conversation ${conversationId}`);
    
    return NextResponse.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الرسائل' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getConversationMessages); 