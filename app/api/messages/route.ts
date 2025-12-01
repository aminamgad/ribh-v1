import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Message from '@/models/Message';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const messageSchema = z.object({
  receiverId: z.string().min(1, 'يجب اختيار المستلم'),
  subject: z.string().min(3, 'موضوع الرسالة يجب أن يكون 3 أحرف على الأقل'),
  content: z.string().min(10, 'محتوى الرسالة يجب أن يكون 10 أحرف على الأقل'),
  productId: z.string().optional()
});

// POST /api/messages - Send new message
async function sendMessage(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Validate input
    const validatedData = messageSchema.parse(body);
    
    // Check if receiver exists
    const User = (await import('@/models/User')).default;
    const receiver = await User.findById(validatedData.receiverId);
    if (!receiver) {
      return NextResponse.json(
        { success: false, message: 'المستلم غير موجود' },
        { status: 400 }
      );
    }
    
    // Check if product exists (if provided)
    if (validatedData.productId) {
      const Product = (await import('@/models/Product')).default;
      const product = await Product.findById(validatedData.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, message: 'المنتج غير موجود' },
          { status: 400 }
        );
      }
    }
    
    logger.apiRequest('POST', '/api/messages', { userId: user._id, role: user.role });
    logger.debug('Creating message', {
      senderId: user._id.toString(),
      receiverId: validatedData.receiverId,
      hasProductId: !!validatedData.productId
    });
    
    // Create message - Set to pending for admin review
    const message = await Message.create({
      senderId: user._id,
      receiverId: validatedData.receiverId,
      productId: validatedData.productId,
      subject: validatedData.subject,
      content: validatedData.content,
      isApproved: null // Set to null for admin review
    });
    
    logger.business('Message created', {
      messageId: message._id.toString(),
      senderId: user._id.toString(),
      receiverId: validatedData.receiverId
    });
    
    await message.populate('senderId', 'name role');
    await message.populate('receiverId', 'name role');
    if (validatedData.productId) {
      await message.populate('productId', 'name images');
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح',
      data: {
        _id: message._id,
        subject: message.subject,
        content: message.content,
        senderName: message.senderId.name,
        receiverName: message.receiverId.name,
        isApproved: message.isApproved,
        createdAt: message.createdAt
      }
    }, { status: 201 });
    
    logger.apiResponse('POST', '/api/messages', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Message creation validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error sending message', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إرسال الرسالة');
  }
}

export const POST = withRole(['marketer', 'wholesaler', 'admin', 'supplier'])(sendMessage); 