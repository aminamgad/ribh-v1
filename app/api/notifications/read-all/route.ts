import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// PUT /api/notifications/read-all - Mark all notifications as read
async function markAllAsRead(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    await Notification.updateMany(
      {
        userId: user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    logger.apiResponse('POST', '/api/notifications/read-all', 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديد جميع الإشعارات كمقروءة'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read', error, { userId: user._id.toString() });
    return handleApiError(error, 'حدث خطأ أثناء تحديث الإشعارات');
  }
}

export const POST = withAuth(markAllAsRead); 