import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Comment from '@/models/Comment';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// POST /api/comments/[id]/read - Mark comment as read
export const POST = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();

    const comment = await Comment.findById(params.id);
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'التعليق غير موجود' },
        { status: 404 }
      );
    }

    await comment.markAsRead(user._id.toString());

    logger.apiResponse('POST', `/api/comments/${params.id}/read`, 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديد التعليق كمقروء'
    });
  } catch (error) {
    logger.error('Error marking comment as read', error, { commentId: params.id, userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديد التعليق كمقروء');
  }
});

