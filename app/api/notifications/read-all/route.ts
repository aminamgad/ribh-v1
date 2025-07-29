import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';

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
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديد جميع الإشعارات كمقروءة'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث الإشعارات' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(markAllAsRead); 