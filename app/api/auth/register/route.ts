import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';
import { sanitizeString, sanitizeEmail, sanitizePhone, sanitizeUrl } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { authRateLimit } from '@/lib/rate-limiter';
import { settingsManager } from '@/lib/settings-manager';

async function registerHandler(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    
    // Get system settings for password validation
    const settings = await settingsManager.getSettings();
    const minPasswordLength = settings?.passwordMinLength || 8;
    
    // Create dynamic schema with system settings
    const registerSchema = z.object({
      name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100, 'الاسم لا يمكن أن يتجاوز 100 حرف'),
      email: z.string().email('البريد الإلكتروني غير صحيح'),
      phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'رقم الهاتف غير صحيح'),
      password: z.string().min(minPasswordLength, `كلمة المرور يجب أن تكون ${minPasswordLength} أحرف على الأقل`),
      confirmPassword: z.string(),
      role: z.enum(['supplier', 'marketer']),
      // Marketing account fields
      country: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['male', 'female']).optional().or(z.literal('')),
      websiteLink: z.string().optional().or(z.literal('')).refine((val) => {
        if (!val || val.trim() === '') return true;
        const normalized = val.startsWith('http://') || val.startsWith('https://') 
          ? val 
          : 'https://' + val;
        try {
          new URL(normalized);
          return true;
        } catch {
          return false;
        }
      }, { message: 'رابط الموقع غير صحيح' }),
      // Supplier account fields
      companyName: z.string().optional(),
      commercialRegisterNumber: z.string().optional(),
      address: z.string().optional(),
      // Legacy field
      taxId: z.string().optional(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: 'كلمات المرور غير متطابقة',
      path: ['confirmPassword'],
    }).refine((data) => {
      // Marketing account validation
      if (data.role === 'marketer') {
        if (!data.country || data.country.trim() === '') return false;
        if (!data.dateOfBirth || data.dateOfBirth.trim() === '') return false;
        if (!data.gender || data.gender.trim() === '') return false;
      }
      return true;
    }, {
      message: 'جميع الحقول مطلوبة لحساب المسوق',
      path: ['role'],
    }).refine((data) => {
      // Supplier account validation
      if (data.role === 'supplier') {
        if (!data.companyName || data.companyName.trim() === '') return false;
        if (!data.commercialRegisterNumber || data.commercialRegisterNumber.trim() === '') return false;
        if (!data.address || data.address.trim() === '') return false;
      }
      return true;
    }, {
      message: 'جميع الحقول مطلوبة لحساب المورد',
      path: ['role'],
    });
    
    // Sanitize input before validation
    // Convert empty strings to undefined for optional fields
    const sanitizedBody = {
      ...body,
      name: sanitizeString(body.name, 100),
      email: sanitizeEmail(body.email),
      phone: sanitizePhone(body.phone),
      country: body.country && body.country.trim() !== '' ? sanitizeString(body.country, 100) : undefined,
      websiteLink: body.websiteLink && body.websiteLink.trim() !== '' ? sanitizeUrl(body.websiteLink) : undefined,
      dateOfBirth: body.dateOfBirth && body.dateOfBirth.trim() !== '' ? body.dateOfBirth : undefined,
      gender: body.gender && body.gender.trim() !== '' ? body.gender : undefined,
      companyName: body.companyName && body.companyName.trim() !== '' ? sanitizeString(body.companyName, 200) : undefined,
      address: body.address && body.address.trim() !== '' ? sanitizeString(body.address, 500) : undefined,
      commercialRegisterNumber: body.commercialRegisterNumber && body.commercialRegisterNumber.trim() !== '' ? sanitizeString(body.commercialRegisterNumber, 50) : undefined,
      taxId: body.taxId && body.taxId.trim() !== '' ? sanitizeString(body.taxId, 50) : undefined,
    };
    
    // Validate input
    const validatedData = registerSchema.parse(sanitizedBody);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: validatedData.email.toLowerCase() },
        { phone: validatedData.phone }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً' },
        { status: 400 }
      );
    }

    // Prepare user data based on role
    const userData: any = {
      name: validatedData.name,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.phone,
      password: validatedData.password,
      role: validatedData.role,
      isVerified: validatedData.role === 'marketer', // Auto-verify marketers
    };

    // Add marketing-specific fields
    if (validatedData.role === 'marketer') {
      userData.country = validatedData.country;
      userData.dateOfBirth = validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined;
      userData.gender = validatedData.gender;
      userData.websiteLink = validatedData.websiteLink || undefined;
    }

    // Add supplier-specific fields
    if (validatedData.role === 'supplier') {
      userData.companyName = validatedData.companyName;
      userData.commercialRegisterNumber = validatedData.commercialRegisterNumber;
      userData.address = validatedData.address;
    }

    // Create user
    const user = new User(userData);

    await user.save();

    // Create wallet for user
    const wallet = new Wallet({
      userId: user._id,
      balance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
    });

    await wallet.save();

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
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        websiteLink: user.websiteLink,
        companyName: user.companyName,
        commercialRegisterNumber: user.commercialRegisterNumber,
        address: user.address,
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

    logger.auth('User registered', user._id.toString(), { email: user.email, role: user.role });
    logger.apiResponse('POST', '/api/auth/register', 201);

    return response;

  } catch (error) {
    logger.error('Registration error', error);
    
    if (error instanceof z.ZodError) {
      logger.warn('Registration validation failed', { errors: error.errors });
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return handleApiError(error, 'حدث خطأ أثناء إنشاء الحساب');
  }
}

// Apply rate limiting to registration endpoint
export const POST = authRateLimit(registerHandler); 