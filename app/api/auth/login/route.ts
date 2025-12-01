import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import { authRateLimit } from '@/lib/rate-limiter';
import { handleApiError, safeLogError } from '@/lib/error-handler';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

async function loginHandler(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const user = await User.findOne({ email: validatedData.email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Generate token
    const token = generateToken({
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
    safeLogError(error, 'Login', { email: (await req.json().catch(() => ({}))).email });
    return handleApiError(error, 'حدث خطأ أثناء تسجيل الدخول');
  }
}

// Apply rate limiting to login endpoint
export const POST = authRateLimit(loginHandler); 