import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import Product from '@/models/Product'; // Import Product model for population
import User from '@/models/User'; // Import User model for population

// GET /api/admin/messages - Get all messages with filtering
async function getMessages(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    
    let query: any = {};
    
    // Apply filters
    switch (filter) {
      case 'pending':
        query.isApproved = { $exists: false }; // Only null/undefined (truly pending)
        break;
      case 'approved':
        query.isApproved = true;
        break;
      case 'rejected':
        query.isApproved = false;
        break;
      case 'all':
      default:
        // No filter - get all messages
        break;
    }
    
    // Get messages with populated fields
    const messages = await Message.find(query)
      .populate('senderId', 'name role email')
      .populate('receiverId', 'name role email')
      .populate('productId', 'name images')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    
    // Transform messages for frontend
    const transformedMessages = messages.map(message => ({
      _id: message._id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      productId: message.productId,
      subject: message.subject,
      content: message.content,
      isRead: message.isRead,
      isApproved: message.isApproved,
      adminNotes: message.adminNotes,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      readAt: message.readAt,
      approvedAt: message.approvedAt,
      approvedBy: message.approvedBy
    }));
    
    return NextResponse.json({
      success: true,
      messages: transformedMessages,
      total: transformedMessages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الرسائل' },
      { status: 500 }
    );
  }
}

export const GET = withRole(['admin'])(getMessages);
