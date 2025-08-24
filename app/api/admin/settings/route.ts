import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { settingsManager } from '@/lib/settings-manager';
import { z } from 'zod';

// Validation schemas
const commissionRateSchema = z.object({
  minPrice: z.number().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر'),
  maxPrice: z.number().min(0, 'الحد الأقصى يجب أن يكون 0 أو أكثر'),
  rate: z.number().min(0, 'النسبة يجب أن تكون 0 أو أكثر').max(100, 'النسبة لا يمكن أن تتجاوز 100%')
});

const withdrawalSettingsSchema = z.object({
  minimumWithdrawal: z.number().min(0, 'الحد الأدنى للسحب يجب أن يكون 0 أو أكثر'),
  maximumWithdrawal: z.number().min(0, 'الحد الأقصى للسحب يجب أن يكون 0 أو أكثر'),
  withdrawalFees: z.number().min(0, 'رسوم السحب يجب أن تكون 0 أو أكثر').max(100, 'رسوم السحب لا يمكن أن تتجاوز 100%')
});

const financialSettingsSchema = z.object({
  withdrawalSettings: withdrawalSettingsSchema,
  commissionRates: z.array(commissionRateSchema).min(1, 'يجب إضافة نسبة عمولة واحدة على الأقل')
});

const generalSettingsSchema = z.object({
  platformName: z.string().min(1, 'اسم المنصة مطلوب').max(100, 'اسم المنصة لا يمكن أن يتجاوز 100 حرف'),
  platformDescription: z.string().max(500, 'وصف المنصة لا يمكن أن يتجاوز 500 حرف'),
  contactEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  contactPhone: z.string().min(1, 'رقم الهاتف مطلوب')
});

const orderSettingsSchema = z.object({
  minimumOrderValue: z.number().min(0, 'الحد الأدنى للطلب يجب أن يكون 0 أو أكثر'),
  maximumOrderValue: z.number().min(0, 'الحد الأقصى للطلب يجب أن يكون 0 أو أكثر')
}).refine((data) => data.minimumOrderValue <= data.maximumOrderValue, {
  message: 'الحد الأدنى للطلب يجب أن يكون أقل من أو يساوي الحد الأقصى للطلب',
  path: ['maximumOrderValue']
});

const governorateSchema = z.object({
  name: z.string().min(1, 'اسم المحافظة مطلوب'),
  cities: z.array(z.string()).min(0, 'قائمة المدن يجب أن تكون مصفوفة'),
  shippingCost: z.number().min(0, 'تكلفة الشحن يجب أن تكون أكبر من أو تساوي صفر'),
  isActive: z.boolean()
});

const shippingSettingsSchema = z.object({
  shippingEnabled: z.boolean(),
  defaultShippingCost: z.number().min(0, 'التكلفة الافتراضية يجب أن تكون أكبر من أو تساوي صفر'),
  defaultFreeShippingThreshold: z.number().min(0, 'حد الشحن المجاني يجب أن يكون أكبر من أو تساوي صفر'),
  governorates: z.array(governorateSchema).min(0, 'يمكن أن تكون قائمة المحافظات فارغة')
});

const productSettingsSchema = z.object({
  maxProductImages: z.number().min(1, 'الحد الأقصى للصور يجب أن يكون 1 أو أكثر').max(20, 'الحد الأقصى للصور لا يمكن أن يتجاوز 20'),
  maxProductDescriptionLength: z.number().min(100, 'الحد الأقصى لوصف المنتج يجب أن يكون 100 أو أكثر').max(5000, 'الحد الأقصى لوصف المنتج لا يمكن أن يتجاوز 5000'),
  autoApproveProducts: z.boolean()
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean()
});

const securitySettingsSchema = z.object({
  passwordMinLength: z.number().min(6, 'الحد الأدنى لكلمة المرور يجب أن يكون 6 أو أكثر').max(20, 'الحد الأقصى لكلمة المرور لا يمكن أن يتجاوز 20'),
  sessionTimeout: z.number().min(15, 'مهلة الجلسة يجب أن تكون 15 دقيقة أو أكثر').max(1440, 'مهلة الجلسة لا يمكن أن تتجاوز 1440 دقيقة'),
  maxLoginAttempts: z.number().min(3, 'الحد الأقصى لمحاولات تسجيل الدخول يجب أن يكون 3 أو أكثر').max(10, 'الحد الأقصى لمحاولات تسجيل الدخول لا يمكن أن يتجاوز 10')
});

const legalSettingsSchema = z.object({
  termsOfService: z.string(),
  privacyPolicy: z.string(),
  refundPolicy: z.string()
});

const analyticsSettingsSchema = z.object({
  googleAnalyticsId: z.string(),
  facebookPixelId: z.string()
});

// GET /api/admin/settings - Get system settings
export const GET = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    console.log('🔧 جلب إعدادات النظام');
    
    const settings = await settingsManager.getSettings();
    
    if (!settings) {
      return NextResponse.json(
        { 
          success: false,
          message: 'حدث خطأ في جلب إعدادات النظام'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ تم جلب إعدادات النظام بنجاح');
    
    return NextResponse.json({
      success: true,
      settings: settings
    });
    
  } catch (error) {
    console.error('❌ خطأ في جلب إعدادات النظام:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'حدث خطأ في جلب إعدادات النظام',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
});

// PUT /api/admin/settings - Update system settings
export const PUT = withRole(['admin'])(async (req: NextRequest, user: any) => {
  try {
    console.log('🔧 تحديث إعدادات النظام');
    
    const { section, data } = await req.json();
    
    console.log('📝 القسم المطلوب:', section);
    console.log('📝 البيانات المرسلة:', data);
    
    if (!section || !data) {
      return NextResponse.json(
        { 
          success: false,
          message: 'القسم والبيانات مطلوبان' 
        },
        { status: 400 }
      );
    }
    
    // Get current settings or create new ones
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      console.log('📝 إنشاء إعدادات جديدة');
      settings = new SystemSettings({
        withdrawalSettings: {
          minimumWithdrawal: 100,
          maximumWithdrawal: 50000,
          withdrawalFees: 0
        },
        commissionRates: [
          { minPrice: 0, maxPrice: 1000, rate: 10 }
        ],
        platformName: 'ربح',
        platformDescription: 'منصة التجارة الإلكترونية العربية',
        contactEmail: 'support@ribh.com',
        contactPhone: '+966500000000',
        minimumOrderValue: 50,
        maximumOrderValue: 100000,
        shippingEnabled: true,
        defaultShippingCost: 50,
        defaultFreeShippingThreshold: 500,
        governorates: [
          {
            name: 'المملكة العربية السعودية',
            cities: ['الرياض', 'جدة', 'مكة المكرمة', 'الدمام', 'الجبيل', 'الخبر', 'القطيف', 'الطائف', 'المدينة المنورة', 'الباحة', 'الحدود الشمالية', 'الحدود الجنوبية', 'المنطقة الشرقية', 'المنطقة الغربية'],
            shippingCost: 50,
            isActive: true
          }
        ],
        maxProductImages: 5,
        maxProductDescriptionLength: 1000,
        autoApproveProducts: false,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        passwordMinLength: 8,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        termsOfService: 'شروط الخدمة',
        privacyPolicy: 'سياسة الخصوصية',
        refundPolicy: 'سياسة الاسترداد',
        googleAnalyticsId: '',
        facebookPixelId: ''
      });
    }
    
    // Validate and update based on section
    switch (section) {
      case 'financial':
        console.log('💰 تحديث الإعدادات المالية');
        const financialData = financialSettingsSchema.parse(data);
        console.log('💰 البيانات المالية المصدقة:', financialData);
        
        // Update withdrawal settings
        settings.withdrawalSettings = {
          minimumWithdrawal: financialData.withdrawalSettings.minimumWithdrawal,
          maximumWithdrawal: financialData.withdrawalSettings.maximumWithdrawal,
          withdrawalFees: financialData.withdrawalSettings.withdrawalFees
        };
        
        // Update commission rates
        settings.commissionRates = financialData.commissionRates.map(rate => ({
          minPrice: rate.minPrice,
          maxPrice: rate.maxPrice,
          rate: rate.rate
        }));
        
        console.log('💰 الإعدادات المالية المحدثة:', {
          withdrawalSettings: settings.withdrawalSettings,
          commissionRates: settings.commissionRates
        });
        break;
        
      case 'general':
        const generalData = generalSettingsSchema.parse(data);
        settings.platformName = generalData.platformName;
        settings.platformDescription = generalData.platformDescription;
        settings.contactEmail = generalData.contactEmail;
        settings.contactPhone = generalData.contactPhone;
        console.log('📝 تم تحديث الإعدادات العامة:', generalData);
        break;
        
      case 'orders':
        const orderData = orderSettingsSchema.parse(data);
        settings.minimumOrderValue = orderData.minimumOrderValue;
        settings.maximumOrderValue = orderData.maximumOrderValue;
        console.log('🛒 تم تحديث إعدادات الطلبات:', orderData);
        break;
        
      case 'shipping':
        console.log('🚚 تحديث إعدادات الشحن');
        console.log('🚚 البيانات المرسلة:', data);
        
        const shippingData = shippingSettingsSchema.parse(data);
        console.log('🚚 البيانات المصدقة:', shippingData);
        
        settings.shippingEnabled = shippingData.shippingEnabled;
        settings.defaultShippingCost = shippingData.defaultShippingCost;
        settings.defaultFreeShippingThreshold = shippingData.defaultFreeShippingThreshold;
        settings.governorates = shippingData.governorates;
        
        console.log('🚚 الإعدادات المحدثة:', {
          shippingEnabled: settings.shippingEnabled,
          defaultShippingCost: settings.defaultShippingCost,
          defaultFreeShippingThreshold: settings.defaultFreeShippingThreshold,
          governoratesCount: settings.governorates.length,
          governorates: settings.governorates
        });
        break;
        
      case 'products':
        const productData = productSettingsSchema.parse(data);
        settings.maxProductImages = productData.maxProductImages;
        settings.maxProductDescriptionLength = productData.maxProductDescriptionLength;
        settings.autoApproveProducts = productData.autoApproveProducts;
        console.log('📦 تم تحديث إعدادات المنتجات:', productData);
        break;
        
      case 'notifications':
        const notificationData = notificationSettingsSchema.parse(data);
        settings.emailNotifications = notificationData.emailNotifications;
        settings.smsNotifications = notificationData.smsNotifications;
        settings.pushNotifications = notificationData.pushNotifications;
        console.log('🔔 تم تحديث إعدادات الإشعارات:', notificationData);
        break;
        
      case 'security':
        const securityData = securitySettingsSchema.parse(data);
        settings.passwordMinLength = securityData.passwordMinLength;
        settings.sessionTimeout = securityData.sessionTimeout;
        settings.maxLoginAttempts = securityData.maxLoginAttempts;
        console.log('🔒 تم تحديث إعدادات الأمان:', securityData);
        break;
        
      case 'legal':
        const legalData = legalSettingsSchema.parse(data);
        settings.termsOfService = legalData.termsOfService;
        settings.privacyPolicy = legalData.privacyPolicy;
        settings.refundPolicy = legalData.refundPolicy;
        console.log('📄 تم تحديث الإعدادات القانونية:', legalData);
        break;
        
      case 'analytics':
        const analyticsData = analyticsSettingsSchema.parse(data);
        settings.googleAnalyticsId = analyticsData.googleAnalyticsId;
        settings.facebookPixelId = analyticsData.facebookPixelId;
        console.log('📊 تم تحديث إعدادات التحليلات:', analyticsData);
        break;
        
      default:
        return NextResponse.json(
          { 
            success: false,
            message: 'قسم غير معروف' 
          },
          { status: 400 }
        );
    }
    
    // Save the settings
    console.log('💾 حفظ الإعدادات في قاعدة البيانات...');
    await settings.save();
    
    // Clear settings cache to ensure fresh data is loaded
    console.log('🗑️ مسح ذاكرة التخزين المؤقت للإعدادات...');
    settingsManager.clearCache();
    
    console.log('✅ تم حفظ الإعدادات بنجاح');
    
    return NextResponse.json({
      success: true,
      message: 'تم حفظ الإعدادات بنجاح',
      settings: settings.toObject()
    });
    
  } catch (error) {
    console.error('❌ خطأ في تحديث إعدادات النظام:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as any;
      const messages = zodError.errors.map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false,
          message: 'بيانات غير صحيحة',
          errors: messages 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'حدث خطأ في تحديث إعدادات النظام',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      },
      { status: 500 }
    );
  }
}); 