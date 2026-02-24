import { NextRequest, NextResponse } from 'next/server';
import { withRole, userHasPermission } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import Product from '@/models/Product'; // Import Product model for population
import User from '@/models/User'; // Import User model for population
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

// PUT /api/admin/messages/[id]/approve - Approve a message
async function approveMessage(req: NextRequest, user: any, ...args: unknown[]) {
  try {
    if (!userHasPermission(user, 'messages.moderate')) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالموافقة على الرسائل' },
        { status: 403 }
      );
    }
    await connectDB();
    
    // Extract params from args - Next.js passes it as third parameter
    const routeParams = args[0] as { params: { id: string } };
    const messageId = routeParams.params.id;
    const body = await req.json();
    const { adminNotes } = body;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'الرسالة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Update the message
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        isApproved: true,
        adminNotes: adminNotes || message.adminNotes,
        approvedAt: new Date(),
        approvedBy: user._id
      },
      { new: true }
    ).populate('senderId', 'name role')
     .populate('receiverId', 'name role')
     .populate('productId', 'name images')
     .populate('approvedBy', 'name');
    
    logger.business('Message approved by admin', { messageId, adminId: user._id });
    logger.apiResponse('PUT', `/api/admin/messages/${messageId}/approve`, 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم اعتماد الرسالة بنجاح',
      data: updatedMessage
    });
  } catch (error) {
    const routeParams = args[0] as { params: { id: string } };
    logger.error('Error approving message', error, { messageId: routeParams?.params?.id, adminId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء اعتماد الرسالة');
  }
}

export const PUT = withRole(['admin'])(approveMessage);
