import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const notificationSchema = z.object({
  userId: z.string().min(1, 'يجب تحديد المستخدم'),
  title: z.string().min(2, 'عنوان الإشعار مطلوب'),
  message: z.string().min(5, 'محتوى الإشعار مطلوب'),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// GET /api/notifications - Get user notifications
async function getNotifications(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unread = searchParams.get('unread');
    const type = searchParams.get('type');
    
    let query: any = { userId: user._id };
    
    // Filters
    if (unread === 'true') {
      query.isRead = false;
    }
    
    if (type) {
      query.type = type;
    }
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: user._id, isRead: false });
    
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
    logger.apiResponse('GET', '/api/notifications', 200);
  } catch (error) {
    logger.error('Error fetching notifications', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب الإشعارات');
  }
}

// POST /api/notifications - Create notification (admin only)
async function createNotification(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Validate input
    const validatedData = notificationSchema.parse(body);
    
    // Create notification
    const notification = await Notification.create({
      ...validatedData,
      type: validatedData.type || 'info'
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء الإشعار بنجاح',
      notification
    }, { status: 201 });
    
    logger.apiResponse('POST', '/api/notifications', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Notification creation validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error creating notification', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إنشاء الإشعار');
  }
}

// PUT /api/notifications - Mark notifications as read
async function markAsRead(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { notificationIds } = body;
    
    const query: any = { userId: user._id, isRead: false };
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }
    
    await Notification.updateMany(query, {
      isRead: true,
      readAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإشعارات بنجاح'
    });
    
    logger.apiResponse('PUT', '/api/notifications', 200);
  } catch (error) {
    logger.error('Error marking notifications as read', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث الإشعارات');
  }
}

// Export handlers with role-based access
export const GET = withAuth(getNotifications);
export const POST = withRole(['admin'])(createNotification);
export const PUT = withAuth(markAsRead); 