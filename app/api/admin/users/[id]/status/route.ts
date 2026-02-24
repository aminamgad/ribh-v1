import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const statusSchema = z.object({
  isActive: z.boolean()
});

// PUT /api/admin/users/[id]/status - Update user status
async function updateUserStatus(req: NextRequest, user: any, ...args: unknown[]) {
  // Extract params from args - Next.js passes it as third parameter
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = statusSchema.parse(body);
    
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    // Prevent admin from deactivating themselves
    if (targetUser._id.toString() === user._id) {
      return NextResponse.json(
        { success: false, message: 'لا يمكنك إيقاف حسابك الخاص' },
        { status: 400 }
      );
    }
    
    // Prevent deactivating other admins
    if (targetUser.role === 'admin' && !validatedData.isActive) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن إيقاف حساب إداري آخر' },
        { status: 400 }
      );
    }
    
    targetUser.isActive = validatedData.isActive;
    await targetUser.save();
    
    return NextResponse.json({
      success: true,
      message: `تم ${validatedData.isActive ? 'تفعيل' : 'إيقاف'} المستخدم بنجاح`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive
      }
    });
  } catch (error) {
    const routeParams = args[0] as { params: { id: string } };
    if (error instanceof z.ZodError) {
      logger.warn('User status update validation failed', { errors: error.errors, userId: routeParams?.params?.id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error updating user status', error, { userId: routeParams?.params?.id, adminId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث حالة المستخدم');
  }
}

export const PUT = withPermission(PERMISSIONS.USERS_TOGGLE_STATUS)(updateUserStatus); 