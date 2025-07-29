import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Notification from '@/models/Notification';

// PUT /api/notifications/[id]/read - Mark notification as read
async function markAsRead(req: NextRequest, user: any, { params }: { params: { id: string } }) {
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
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث الإشعار' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(markAsRead); 