import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Comment from '@/models/Comment';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// PATCH /api/comments/[id] - Update a comment
export const PATCH = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
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

    // Only the comment owner or admin can update
    if (comment.userId.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتعديل هذا التعليق' },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (body.content) {
      comment.content = body.content;
    }
    if (body.isInternal !== undefined && user.role === 'admin') {
      comment.isInternal = body.isInternal;
    }

    await comment.save();
    await comment.populate('userId', 'name email role companyName avatar');

    logger.apiResponse('PATCH', `/api/comments/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث التعليق بنجاح',
      comment
    });
  } catch (error) {
    logger.error('Error updating comment', error, { commentId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث التعليق');
  }
});

// DELETE /api/comments/[id] - Delete a comment
export const DELETE = withAuth(async (req: NextRequest, user: any, ...args: unknown[]) => {
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

    // Only the comment owner or admin can delete
    if (comment.userId.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بحذف هذا التعليق' },
        { status: 403 }
      );
    }

    // Delete all replies first
    await Comment.deleteMany({ parentId: comment._id });

    // Delete the comment
    await Comment.findByIdAndDelete(comment._id);

    logger.apiResponse('DELETE', `/api/comments/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم حذف التعليق بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting comment', error, { commentId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء حذف التعليق');
  }
});

