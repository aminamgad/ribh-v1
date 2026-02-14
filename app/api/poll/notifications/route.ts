/**
 * Polling endpoint for notifications
 * Used as an alternative to Socket.io for real-time updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    // Get timestamp from query (for long polling)
    const since = req.nextUrl.searchParams.get('since');
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000); // Default: last 5 minutes

    // Import Notification model
    const Notification = (await import('@/models/Notification')).default;

    // Fetch unread notifications since the given timestamp
    const notifications = await Notification.find({
      userId: user._id,
      isRead: false,
      createdAt: { $gte: sinceDate }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        timestamp: new Date().toISOString(),
        count: notifications.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

