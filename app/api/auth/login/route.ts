import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import { authRateLimit } from '@/lib/rate-limiter';
import { handleApiError, safeLogError } from '@/lib/error-handler';
import { settingsManager } from '@/lib/settings-manager';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

async function loginHandler(req: NextRequest) {
  let email = '';
  try {
    await connectDB();

    const body = await req.json();
    email = body.email || '';
    
    // Validate input
    const validatedData = loginSchema.parse(body);

    // Get system settings for max login attempts
    const settings = await settingsManager.getSettings();
    const maxLoginAttempts = settings?.maxLoginAttempts || 5;
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Find user by email
    const user = await User.findOne({ email: validatedData.email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { 
          success: false, 
          error: `تم حظر الحساب بسبب محاولات تسجيل دخول خاطئة متعددة. يرجى المحاولة بعد ${remainingMinutes} دقيقة` 
        },
        { status: 423 } // 423 Locked
      );
    }

    // Reset lock if lockout period has passed
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'الحساب معطل. يرجى التواصل مع الإدارة' },
        { status: 403 }
      );
    }

    // Check if user is verified (for suppliers and wholesalers)
    if ((user.role === 'supplier' || user.role === 'wholesaler') && !user.isVerified) {
      return NextResponse.json(
        { success: false, error: 'الحساب قيد المراجعة من قبل الإدارة' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(validatedData.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      const attempts = (user.loginAttempts || 0) + 1;
      user.loginAttempts = attempts;

      // Lock account if max attempts reached
      if (attempts >= maxLoginAttempts) {
        user.lockUntil = new Date(Date.now() + lockoutDuration);
        await user.save();
        return NextResponse.json(
          { 
            success: false, 
            error: `تم حظر الحساب بسبب ${maxLoginAttempts} محاولات تسجيل دخول خاطئة. يرجى المحاولة بعد 30 دقيقة` 
          },
          { status: 423 } // 423 Locked
        );
      }

      await user.save();
      return NextResponse.json(
        { 
          success: false, 
          error: `البريد الإلكتروني أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${maxLoginAttempts - attempts}` 
        },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Check maintenance mode - if enabled and user is not admin, return maintenance message
    if (user.role !== 'admin') {
      const maintenanceStatus = await settingsManager.getSettings();
      if (maintenanceStatus?.maintenanceMode) {
        const maintenanceMessage = maintenanceStatus.maintenanceMessage || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.';
        return NextResponse.json(
          {
            success: false,
            maintenance: true,
            error: maintenanceMessage,
            message: maintenanceMessage
          },
          { status: 503 }
        );
      }
    }

    // Generate token
    const token = await generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        companyName: user.companyName,
        address: user.address,
        wholesaleLicense: user.wholesaleLicense,
        businessType: user.businessType,
        taxId: user.taxId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

    response.cookies.set('ribh-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    safeLogError(error, 'Login', { email });
    return handleApiError(error, 'حدث خطأ أثناء تسجيل الدخول');
  }
}

// Apply rate limiting to login endpoint
export const POST = authRateLimit(loginHandler); 