import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET - Get current user data
async function getCurrentUser(req: NextRequest, user: any) {
  try {
    const currentUser = await User.findById(user._id)
      .select('-password')
      .lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const res = NextResponse.json({
      success: true,
      user: currentUser
    });
    // منع تخزين استجابة المستخدم في الكاش حرصاً على ظهور الصلاحيات دائماً بشكل صحيح
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    logger.apiResponse('GET', '/api/auth/me', 200);
    return res;
  } catch (error) {
    logger.error('Error getting current user', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب بيانات المستخدم');
  }
}

// PUT - Update current user data
async function updateCurrentUser(req: NextRequest, user: any) {
  try {
    logger.apiRequest('PUT', '/api/auth/me', { userId: user._id });
    
    const body = await req.json();
    
    // Validation schema for profile updates
    const profileSchema = z.object({
      name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      address: z.string().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل').optional(),
      settings: z.object({
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        orderUpdates: z.boolean().optional(),
        productUpdates: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        profileVisibility: z.enum(['public', 'private']).optional(),
        showEmail: z.boolean().optional(),
        showPhone: z.boolean().optional(),
        language: z.enum(['ar', 'en']).optional(),
        timezone: z.string().optional(),
        dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
        autoWithdraw: z.boolean().optional(),
        withdrawThreshold: z.number().min(50).optional()
      }).optional()
    });

    const validatedData = profileSchema.parse(body);
    
    logger.debug('User profile update validated', { userId: user._id });
    
    const updateData: any = {};
    
    // Update profile information
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.companyName !== undefined) updateData.companyName = validatedData.companyName;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    
    // Update settings
    if (validatedData.settings) {
      // Get current user to access current settings
      const currentUser = await User.findById(user._id);
      const currentSettings = currentUser?.settings || {};
      
      updateData.settings = {
        ...currentSettings,
        ...validatedData.settings
      };
      
      logger.debug('User settings merged', { userId: user._id });
    }
    
    // Handle password change
    if (validatedData.currentPassword && validatedData.newPassword) {
      // Verify current password
      const currentUser = await User.findById(user._id);
      if (!currentUser) {
        return NextResponse.json(
          { success: false, message: 'المستخدم غير موجود' },
          { status: 404 }
        );
      }
      
      const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: 'كلمة المرور الحالية غير صحيحة' },
          { status: 400 }
        );
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 12);
      updateData.password = hashedPassword;
      logger.debug('Password change requested', { userId: user._id });
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'فشل في تحديث بيانات المستخدم' },
        { status: 500 }
      );
    }
    
    logger.business('User profile updated', { userId: updatedUser._id });
    logger.apiResponse('PUT', '/api/auth/me', 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      user: updatedUser
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('User profile update validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error updating current user', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث البيانات');
  }
}

export const GET = withRole(['admin', 'supplier', 'marketer', 'wholesaler'])(getCurrentUser);
export const PUT = withRole(['admin', 'supplier', 'marketer', 'wholesaler'])(updateCurrentUser); 