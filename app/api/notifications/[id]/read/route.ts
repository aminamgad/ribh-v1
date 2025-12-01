import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// PUT /api/notifications/[id]/read - Mark notification as read
async function markAsRead(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const notification = await Notification.findOneAndUpdate(
      {
        _id: params.id,
        userId: user._id
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'الإشعار غير موجود' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notification
    });
    
    logger.apiResponse('POST', `/api/notifications/${params.id}/read`, 200);
  } catch (error) {
    logger.error('Error marking notification as read', error, {
      notificationId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء تحديث الإشعار');
  }
}

export const POST = withAuth(markAsRead); 