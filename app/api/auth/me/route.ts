import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

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

    return NextResponse.json({
      success: true,
      user: currentUser
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب بيانات المستخدم' },
      { status: 500 }
    );
  }
}

// PUT - Update current user data
async function updateCurrentUser(req: NextRequest, user: any) {
  try {
    const body = await req.json();
    
    console.log('🔄 Updating user data:', {
      userId: user._id,
      requestBody: body
    });
    
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
    
    console.log('✅ Validated data:', validatedData);
    
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
      
      console.log('📋 Current settings:', currentSettings);
      console.log('📋 New settings:', validatedData.settings);
      
      updateData.settings = {
        ...currentSettings,
        ...validatedData.settings
      };
      
      console.log('📋 Merged settings:', updateData.settings);
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
    }
    
    console.log('🔧 Final update data:', updateData);
    
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
    
    console.log('✅ User updated successfully:', {
      userId: updatedUser._id,
      name: updatedUser.name,
      settings: updatedUser.settings
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      user: updatedUser
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('❌ Error updating current user:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث البيانات' },
      { status: 500 }
    );
  }
}

export const GET = withRole(['admin', 'supplier', 'marketer', 'wholesaler'])(getCurrentUser);
export const PUT = withRole(['admin', 'supplier', 'marketer', 'wholesaler'])(updateCurrentUser); 