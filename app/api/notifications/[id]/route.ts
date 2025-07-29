import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';

// DELETE /api/notifications/[id] - Delete notification
async function deleteNotification(req: NextRequest, user: any, { params }: { params: { id: string } }) {
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
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف الإشعار' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(deleteNotification); 