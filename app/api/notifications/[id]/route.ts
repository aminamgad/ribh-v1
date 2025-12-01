import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// DELETE /api/notifications/[id] - Delete notification
async function deleteNotification(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const result = await Notification.findOneAndDelete({
      _id: params.id,
      userId: user._id
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'الإشعار غير موجود' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
    
    logger.apiResponse('DELETE', `/api/notifications/${params.id}`, 200);
  } catch (error) {
    logger.error('Error deleting notification', error, {
      notificationId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء حذف الإشعار');
  }
}

export const DELETE = withAuth(deleteNotification); 