import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// PUT /api/admin/users/[id]/verify - Verify user
async function verifyUser(req: NextRequest, user: any, ...args: unknown[]) {
  // Extract params from args - Next.js passes it as third parameter
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    if (targetUser.isVerified) {
      return NextResponse.json(
        { success: false, message: 'المستخدم محقق بالفعل' },
        { status: 400 }
      );
    }
    
    targetUser.isVerified = true;
    await targetUser.save();
    
    return NextResponse.json({
      success: true,
      message: 'تم التحقق من المستخدم بنجاح',
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isVerified: targetUser.isVerified
      }
    });
    
    logger.business('User verified by admin', { userId: params.id, adminId: user._id });
    logger.apiResponse('PUT', `/api/admin/users/${params.id}/verify`, 200);
  } catch (error) {
    const routeParams = args[0] as { params: { id: string } };
    logger.error('Error verifying user', error, { userId: routeParams?.params?.id, adminId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء التحقق من المستخدم');
  }
}

export const PUT = withRole(['admin'])(verifyUser); 