import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import User from '@/models/User'; // Import User model for population

// GET /api/messages/conversations/[id] - Get messages in a conversation
async function getConversationMessages(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const conversationId = params.id;
    
    // Parse conversation ID to get the two user IDs
    const [userId1, userId2] = conversationId.split('-');
    
    console.log('🔍 Conversation ID:', conversationId);
    console.log('🔍 Parsed user IDs:', { userId1, userId2 });
    console.log('🔍 Current user ID:', user._id.toString());
    
    if (!userId1 || !userId2) {
      return NextResponse.json(
        { success: false, message: 'معرف المحادثة غير صحيح' },
        { status: 400 }
      );
    }
    
    // Verify that the current user is part of this conversation
    if (userId1 !== user._id.toString() && userId2 !== user._id.toString()) {
      console.log('🔍 Access denied - user not part of conversation');
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