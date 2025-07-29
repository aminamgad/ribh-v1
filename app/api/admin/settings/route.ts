import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { z } from 'zod';

const commissionRateSchema = z.object({
  minPrice: z.number().min(0, 'السعر الأدنى يجب أن يكون 0 أو أكثر'),
  maxPrice: z.number().min(0, 'السعر الأقصى يجب أن يكون 0 أو أكثر'),
  rate: z.number().min(0, 'نسبة العمولة يجب أن تكون 0 أو أكثر').max(100, 'نسبة العمولة لا يمكن أن تتجاوز 100%')
});

const settingsSchema = z.object({
  // Commission settings
  commissionRates: z.array(commissionRateSchema).optional(),
  
  // Platform settings
  platformName: z.string().min(1, 'اسم المنصة مطلوب').max(100, 'اسم المنصة لا يمكن أن يتجاوز 100 حرف').optional(),
  platformDescription: z.string().max(500, 'وصف المنصة لا يمكن أن يتجاوز 500 حرف').optional(),
  contactEmail: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  contactPhone: z.string().optional(),
  supportWhatsApp: z.string().optional(),
  
  // Financial settings
  minimumWithdrawal: z.number().min(0, 'الحد الأدنى للسحب يجب أن يكون 0 أو أكثر').optional(),
  maximumWithdrawal: z.number().min(0, 'الحد الأقصى للسحب يجب أن يكون 0 أو أكثر').optional(),
  withdrawalFee: z.number().min(0, 'رسوم السحب يجب أن تكون 0 أو أكثر').max(100, 'رسوم السحب لا يمكن أن تتجاوز 100%').optional(),
  currency: z.string().optional(),
  
  // Order settings
  autoApproveOrders: z.boolean().optional(),
  requireAdminApproval: z.boolean().optional(),
  maxOrderValue: z.number().min(0, 'الحد الأقصى لقيمة الطلب يجب أن يكون 0 أو أكثر').optional(),
  minOrderValue: z.number().min(0, 'الحد الأدنى لقيمة الطلب يجب أن يكون 0 أو أكثر').optional(),
  
  // Product settings
  autoApproveProducts: z.boolean().optional(),
  requireProductImages: z.boolean().optional(),
  maxProductImages: z.number().min(1, 'الحد الأقصى لعدد الصور يجب أن يكون 1 أو أكثر').max(20, 'الحد الأقصى لعدد الصور لا يمكن أن يتجاوز 20').optional(),
  maxProductDescription: z.number().min(100, 'الحد الأقصى لوصف المنتج يجب أن يكون 100 أو أكثر').max(5000, 'الحد الأقصى لوصف المنتج لا يمكن أن يتجاوز 5000').optional(),
  
  // Notification settings
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  
  // Shipping settings
  defaultShippingCost: z.number().min(0, 'تكلفة الشحن الافتراضية يجب أن تكون 0 أو أكثر').optional(),
  freeShippingThreshold: z.number().min(0, 'حد الشحن المجاني يجب أن يكون 0 أو أكثر').optional(),
  shippingCompanies: z.array(z.string()).optional(),
  
  // Security settings
  maxLoginAttempts: z.number().min(3, 'الحد الأقصى لمحاولات تسجيل الدخول يجب أن يكون 3 أو أكثر').max(10, 'الحد الأقصى لمحاولات تسجيل الدخول لا يمكن أن يتجاوز 10').optional(),
  sessionTimeout: z.number().min(1, 'مهلة الجلسة يجب أن تكون ساعة واحدة على الأقل').max(168, 'مهلة الجلسة لا يمكن أن تتجاوز 168 ساعة').optional(),
  requireTwoFactor: z.boolean().optional(),
  
  // Maintenance settings
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500, 'رسالة الصيانة لا يمكن أن تتجاوز 500 حرف').optional(),
  
  // Social media
  facebookUrl: z.string().url('رابط فيسبوك غير صحيح').optional(),
  instagramUrl: z.string().url('رابط انستغرام غير صحيح').optional(),
  twitterUrl: z.string().url('رابط تويتر غير صحيح').optional(),
  linkedinUrl: z.string().url('رابط لينكد إن غير صحيح').optional(),
  
  // Legal
  termsOfService: z.string().optional(),
  privacyPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  
  // Analytics
  googleAnalyticsId: z.string().optional(),
  facebookPixelId: z.string().optional()
});

// GET /api/admin/settings - Get current system settings
async function getSettings(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    let settings = await SystemSettings.getCurrentSettings();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await SystemSettings.create({
        updatedBy: user._id
      });
    }
    
    return NextResponse.json({
      success: true,
      settings: {
        _id: settings._id,
        commissionRates: settings.commissionRates,
        platformName: settings.platformName,
        platformDescription: settings.platformDescription,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        supportWhatsApp: settings.supportWhatsApp,
        minimumWithdrawal: settings.minimumWithdrawal,
        maximumWithdrawal: settings.maximumWithdrawal,
        withdrawalFee: settings.withdrawalFee,
        currency: settings.currency,
        autoApproveOrders: settings.autoApproveOrders,
        requireAdminApproval: settings.requireAdminApproval,
        maxOrderValue: settings.maxOrderValue,
        minOrderValue: settings.minOrderValue,
        autoApproveProducts: settings.autoApproveProducts,
        requireProductImages: settings.requireProductImages,
        maxProductImages: settings.maxProductImages,
        maxProductDescription: settings.maxProductDescription,
        emailNotifications: settings.emailNotifications,
        whatsappNotifications: settings.whatsappNotifications,
        pushNotifications: settings.pushNotifications,
        defaultShippingCost: settings.defaultShippingCost,
        freeShippingThreshold: settings.freeShippingThreshold,
        shippingCompanies: settings.shippingCompanies,
        maxLoginAttempts: settings.maxLoginAttempts,
        sessionTimeout: settings.sessionTimeout,
        requireTwoFactor: settings.requireTwoFactor,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        facebookUrl: settings.facebookUrl,
        instagramUrl: settings.instagramUrl,
        twitterUrl: settings.twitterUrl,
        linkedinUrl: settings.linkedinUrl,
        termsOfService: settings.termsOfService,
        privacyPolicy: settings.privacyPolicy,
        refundPolicy: settings.refundPolicy,
        googleAnalyticsId: settings.googleAnalyticsId,
        facebookPixelId: settings.facebookPixelId,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الإعدادات' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update system settings
async function updateSettings(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = settingsSchema.parse(body);
    
    // Validate commission rates if provided
    if (validatedData.commissionRates) {
      // Check for overlapping ranges
      const sortedRates = [...validatedData.commissionRates].sort((a, b) => a.minPrice - b.minPrice);
      
      for (let i = 0; i < sortedRates.length - 1; i++) {
        if (sortedRates[i].maxPrice >= sortedRates[i + 1].minPrice) {
          return NextResponse.json(
            { success: false, message: 'نطاقات العمولة متداخلة' },
            { status: 400 }
          );
        }
      }
    }
    
    // Update settings
    const updatedSettings = await SystemSettings.updateSettings(validatedData, user._id);
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      settings: {
        _id: updatedSettings._id,
        commissionRates: updatedSettings.commissionRates,
        platformName: updatedSettings.platformName,
        platformDescription: updatedSettings.platformDescription,
        contactEmail: updatedSettings.contactEmail,
        contactPhone: updatedSettings.contactPhone,
        supportWhatsApp: updatedSettings.supportWhatsApp,
        minimumWithdrawal: updatedSettings.minimumWithdrawal,
        maximumWithdrawal: updatedSettings.maximumWithdrawal,
        withdrawalFee: updatedSettings.withdrawalFee,
        currency: updatedSettings.currency,
        autoApproveOrders: updatedSettings.autoApproveOrders,
        requireAdminApproval: updatedSettings.requireAdminApproval,
        maxOrderValue: updatedSettings.maxOrderValue,
        minOrderValue: updatedSettings.minOrderValue,
        autoApproveProducts: updatedSettings.autoApproveProducts,
        requireProductImages: updatedSettings.requireProductImages,
        maxProductImages: updatedSettings.maxProductImages,
        maxProductDescription: updatedSettings.maxProductDescription,
        emailNotifications: updatedSettings.emailNotifications,
        whatsappNotifications: updatedSettings.whatsappNotifications,
        pushNotifications: updatedSettings.pushNotifications,
        defaultShippingCost: updatedSettings.defaultShippingCost,
        freeShippingThreshold: updatedSettings.freeShippingThreshold,
        shippingCompanies: updatedSettings.shippingCompanies,
        maxLoginAttempts: updatedSettings.maxLoginAttempts,
        sessionTimeout: updatedSettings.sessionTimeout,
        requireTwoFactor: updatedSettings.requireTwoFactor,
        maintenanceMode: updatedSettings.maintenanceMode,
        maintenanceMessage: updatedSettings.maintenanceMessage,
        facebookUrl: updatedSettings.facebookUrl,
        instagramUrl: updatedSettings.instagramUrl,
        twitterUrl: updatedSettings.twitterUrl,
        linkedinUrl: updatedSettings.linkedinUrl,
        termsOfService: updatedSettings.termsOfService,
        privacyPolicy: updatedSettings.privacyPolicy,
        refundPolicy: updatedSettings.refundPolicy,
        googleAnalyticsId: updatedSettings.googleAnalyticsId,
        facebookPixelId: updatedSettings.facebookPixelId,
        updatedAt: updatedSettings.updatedAt
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث الإعدادات' },
      { status: 500 }
    );
  }
}

export const GET = withRole(['admin'])(getSettings);
export const PUT = withRole(['admin'])(updateSettings); 