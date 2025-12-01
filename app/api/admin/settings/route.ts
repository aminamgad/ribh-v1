import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { settingsManager } from '@/lib/settings-manager';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { adminRateLimit } from '@/lib/rate-limiter';

// Validation schemas
const commissionRateSchema = z.object({
  minPrice: z.number().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر'),
  maxPrice: z.number().min(0, 'الحد الأقصى يجب أن يكون 0 أو أكثر'),
  rate: z.number().min(0, 'النسبة يجب أن تكون 0 أو أكثر').max(100, 'النسبة لا يمكن أن تتجاوز 100%')
});

const adminProfitMarginSchema = z.object({
  minPrice: z.number().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر'),
  maxPrice: z.number().min(0, 'الحد الأقصى يجب أن يكون 0 أو أكثر'),
  margin: z.number().min(0, 'الهامش يجب أن يكون 0 أو أكثر').max(100, 'الهامش لا يمكن أن يتجاوز 100%')
});

const withdrawalSettingsSchema = z.object({
  minimumWithdrawal: z.number().min(0, 'الحد الأدنى للسحب يجب أن يكون 0 أو أكثر'),
  maximumWithdrawal: z.number().min(0, 'الحد الأقصى للسحب يجب أن يكون 0 أو أكثر'),
  withdrawalFees: z.number().min(0, 'رسوم السحب يجب أن تكون 0 أو أكثر').max(100, 'رسوم السحب لا يمكن أن تتجاوز 100%')
});

const financialSettingsSchema = z.object({
  withdrawalSettings: withdrawalSettingsSchema,
  commissionRates: z.array(commissionRateSchema).min(1, 'يجب إضافة نسبة عمولة واحدة على الأقل'),
  adminProfitMargins: z.array(adminProfitMarginSchema).min(1, 'يجب إضافة هامش ربح واحد على الأقل').optional()
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
async function getAdminSettingsHandler(req: NextRequest, user: any) {
  try {
    logger.apiRequest('GET', '/api/admin/settings', { userId: user._id });
    
    const settings = await settingsManager.getSettings();
    
    if (!settings) {
      logger.error('Failed to fetch system settings', undefined, { userId: user._id });
      return NextResponse.json(
        { 
          success: false,
          message: 'حدث خطأ في جلب إعدادات النظام'
        },
        { status: 500 }
      );
    }
    
    logger.info('System settings fetched successfully', { userId: user._id });
    logger.apiResponse('GET', '/api/admin/settings', 200);
    
    return NextResponse.json({
      success: true,
      settings: settings
    });
    
  } catch (error) {
    logger.error('Error fetching system settings', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ في جلب إعدادات النظام');
  }
}

// PUT /api/admin/settings - Update system settings
async function updateAdminSettingsHandler(req: NextRequest, user: any) {
  try {
    logger.apiRequest('PUT', '/api/admin/settings', { userId: user._id });
    
    const { section, data } = await req.json();
    
    logger.debug('Updating system settings', { section, userId: user._id });
    
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
      logger.info('Creating new system settings', { userId: user._id });
      settings = new SystemSettings({
        withdrawalSettings: {
          minimumWithdrawal: 100,
          maximumWithdrawal: 50000,
          withdrawalFees: 0
        },
        commissionRates: [
          { minPrice: 0, maxPrice: 1000, rate: 10 }
        ],
        adminProfitMargins: [
          { minPrice: 1, maxPrice: 100, margin: 10 },
          { minPrice: 101, maxPrice: 500, margin: 8 },
          { minPrice: 501, maxPrice: 1000, margin: 6 },
          { minPrice: 1001, maxPrice: 999999, margin: 5 }
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
    
    // Store financialData outside switch for use after
    let financialData: any = null;
    
    // Validate and update based on section
    switch (section) {
      case 'financial':
        logger.business('Updating financial settings', { userId: user._id });
        logger.debug('Financial settings data received', { data });
        financialData = financialSettingsSchema.parse(data);
        logger.debug('Financial settings validated', { financialData });
        
        // Update withdrawal settings
        settings.withdrawalSettings = {
          minimumWithdrawal: financialData.withdrawalSettings.minimumWithdrawal,
          maximumWithdrawal: financialData.withdrawalSettings.maximumWithdrawal,
          withdrawalFees: financialData.withdrawalSettings.withdrawalFees
        };
        
        // Update commission rates
        settings.commissionRates = financialData.commissionRates.map((rate: any) => ({
          minPrice: rate.minPrice,
          maxPrice: rate.maxPrice,
          rate: rate.rate
        }));
        
        // Update admin profit margins - always update if provided
        if (financialData.adminProfitMargins !== undefined && financialData.adminProfitMargins.length > 0) {
          logger.debug('Updating admin profit margins', { margins: financialData.adminProfitMargins });
          
          // Create new array to ensure Mongoose detects the change
          const newMargins = financialData.adminProfitMargins.map((margin: any) => ({
            minPrice: Number(margin.minPrice),
            maxPrice: Number(margin.maxPrice),
            margin: Number(margin.margin)
          }));
          
          // Set the array directly
          settings.set('adminProfitMargins', newMargins);
          settings.markModified('adminProfitMargins');
          
          logger.debug('Admin profit margins updated', {
            count: settings.adminProfitMargins?.length || 0
          });
        } else if (financialData.adminProfitMargins !== undefined && financialData.adminProfitMargins.length === 0) {
          // Empty array - set to default
          logger.debug('Setting default admin profit margins (empty array provided)');
          const defaultMargins = [
            { minPrice: 1, maxPrice: 100, margin: 10 },
            { minPrice: 101, maxPrice: 500, margin: 8 },
            { minPrice: 501, maxPrice: 1000, margin: 6 },
            { minPrice: 1001, maxPrice: 999999, margin: 5 }
          ];
          settings.set('adminProfitMargins', defaultMargins);
          settings.markModified('adminProfitMargins');
        } else {
          // Not provided - keep existing or set default
          if (!settings.adminProfitMargins || settings.adminProfitMargins.length === 0) {
            logger.debug('Setting default admin profit margins (not existing)');
            const defaultMargins = [
              { minPrice: 1, maxPrice: 100, margin: 10 },
              { minPrice: 101, maxPrice: 500, margin: 8 },
              { minPrice: 501, maxPrice: 1000, margin: 6 },
              { minPrice: 1001, maxPrice: 999999, margin: 5 }
            ];
            settings.set('adminProfitMargins', defaultMargins);
            settings.markModified('adminProfitMargins');
          }
        }
        
        logger.debug('Financial settings updated', {
          withdrawalSettings: settings.withdrawalSettings,
          commissionRatesCount: settings.commissionRates?.length || 0,
          adminProfitMarginsCount: settings.adminProfitMargins?.length || 0
        });
        
        // Ensure adminProfitMargins is properly set
        if (!settings.adminProfitMargins || settings.adminProfitMargins.length === 0) {
          logger.warn('Admin profit margins empty after update');
        } else {
          logger.debug('Admin profit margins updated successfully', {
            count: settings.adminProfitMargins.length
          });
        }
        break;
        
      case 'general':
        const generalData = generalSettingsSchema.parse(data);
        settings.platformName = generalData.platformName;
        settings.platformDescription = generalData.platformDescription;
        settings.contactEmail = generalData.contactEmail;
        settings.contactPhone = generalData.contactPhone;
        logger.business('General settings updated', { userId: user._id });
        break;
        
      case 'orders':
        const orderData = orderSettingsSchema.parse(data);
        settings.minimumOrderValue = orderData.minimumOrderValue;
        settings.maximumOrderValue = orderData.maximumOrderValue;
        logger.business('Order settings updated', { userId: user._id });
        break;
        
      case 'shipping':
        logger.business('Updating shipping settings', { userId: user._id });
        
        const shippingData = shippingSettingsSchema.parse(data);
        logger.debug('Shipping settings validated', { shippingData });
        
        settings.shippingEnabled = shippingData.shippingEnabled;
        settings.defaultShippingCost = shippingData.defaultShippingCost;
        settings.defaultFreeShippingThreshold = shippingData.defaultFreeShippingThreshold;
        settings.governorates = shippingData.governorates;
        
        logger.debug('Shipping settings updated', {
          shippingEnabled: settings.shippingEnabled,
          governoratesCount: settings.governorates.length
        });
        break;
        
      case 'products':
        const productData = productSettingsSchema.parse(data);
        settings.maxProductImages = productData.maxProductImages;
        settings.maxProductDescriptionLength = productData.maxProductDescriptionLength;
        settings.autoApproveProducts = productData.autoApproveProducts;
        logger.business('Product settings updated', { userId: user._id });
        break;
        
      case 'notifications':
        const notificationData = notificationSettingsSchema.parse(data);
        settings.emailNotifications = notificationData.emailNotifications;
        settings.smsNotifications = notificationData.smsNotifications;
        settings.pushNotifications = notificationData.pushNotifications;
        logger.business('Notification settings updated', { userId: user._id });
        break;
        
      case 'security':
        const securityData = securitySettingsSchema.parse(data);
        settings.passwordMinLength = securityData.passwordMinLength;
        settings.sessionTimeout = securityData.sessionTimeout;
        settings.maxLoginAttempts = securityData.maxLoginAttempts;
        logger.business('Security settings updated', { userId: user._id });
        break;
        
      case 'legal':
        const legalData = legalSettingsSchema.parse(data);
        settings.termsOfService = legalData.termsOfService;
        settings.privacyPolicy = legalData.privacyPolicy;
        settings.refundPolicy = legalData.refundPolicy;
        logger.business('Legal settings updated', { userId: user._id });
        break;
        
      case 'analytics':
        const analyticsData = analyticsSettingsSchema.parse(data);
        settings.googleAnalyticsId = analyticsData.googleAnalyticsId;
        settings.facebookPixelId = analyticsData.facebookPixelId;
        logger.business('Analytics settings updated', { userId: user._id });
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
    logger.debug('Saving settings to database', {
      section,
      hasAdminProfitMargins: !!settings.adminProfitMargins,
      adminProfitMarginsCount: settings.adminProfitMargins?.length || 0
    });
    
    // If adminProfitMargins was updated, save it directly using updateOne
    if (section === 'financial' && financialData && financialData.adminProfitMargins !== undefined) {
      const marginsToSave = financialData.adminProfitMargins.length > 0
        ? financialData.adminProfitMargins.map((m: any) => ({
            minPrice: Number(m.minPrice),
            maxPrice: Number(m.maxPrice),
            margin: Number(m.margin)
          }))
        : [
            { minPrice: 1, maxPrice: 100, margin: 10 },
            { minPrice: 101, maxPrice: 500, margin: 8 },
            { minPrice: 501, maxPrice: 1000, margin: 6 },
            { minPrice: 1001, maxPrice: 999999, margin: 5 }
          ];
      
      logger.debug('Saving adminProfitMargins directly', { marginsCount: marginsToSave.length });
      await SystemSettings.updateOne(
        { _id: settings._id },
        { $set: { adminProfitMargins: marginsToSave } }
      );
      // Update the local object
      settings.adminProfitMargins = marginsToSave;
    }
    
    // Force save with validation
    settings.markModified('adminProfitMargins');
    await settings.save({ validateBeforeSave: true });
    
    // Reload settings from database to ensure we have the latest data including adminProfitMargins
    const savedSettings = await SystemSettings.findById(settings._id).lean();
    
    logger.debug('Settings saved to database', {
      hasAdminProfitMargins: !!((savedSettings as any)?.adminProfitMargins),
      adminProfitMarginsCount: ((savedSettings as any)?.adminProfitMargins?.length) || 0
    });
    
    // Clear settings cache to ensure fresh data is loaded
    logger.debug('Clearing settings cache');
    settingsManager.clearCache();
    
    logger.business('System settings saved successfully', { userId: user._id, section });
    
    // Convert to object and ensure all fields are included
    let settingsObject = savedSettings || settings.toObject();
    
    // If savedSettings doesn't have adminProfitMargins, use the current settings value
    if (!settingsObject.adminProfitMargins || settingsObject.adminProfitMargins.length === 0) {
      logger.warn('adminProfitMargins not found in savedSettings, using values from settings');
      if (settings.adminProfitMargins && settings.adminProfitMargins.length > 0) {
        settingsObject.adminProfitMargins = settings.adminProfitMargins.map((m: any) => ({
          minPrice: m.minPrice,
          maxPrice: m.maxPrice,
          margin: m.margin
        }));
      } else {
        settingsObject.adminProfitMargins = [
          { minPrice: 1, maxPrice: 100, margin: 10 },
          { minPrice: 101, maxPrice: 500, margin: 8 },
          { minPrice: 501, maxPrice: 1000, margin: 6 },
          { minPrice: 1001, maxPrice: 999999, margin: 5 }
        ];
      }
    }
    
    // Ensure adminProfitMargins is properly formatted
    if (settingsObject.adminProfitMargins) {
      settingsObject.adminProfitMargins = settingsObject.adminProfitMargins.map((m: any) => ({
        minPrice: Number(m.minPrice),
        maxPrice: Number(m.maxPrice),
        margin: Number(m.margin)
      }));
    }
    
    logger.debug('Sending response with settings', {
      hasAdminProfitMargins: !!settingsObject.adminProfitMargins,
      adminProfitMarginsCount: settingsObject.adminProfitMargins?.length || 0
    });
    
    logger.apiResponse('PUT', '/api/admin/settings', 200);
    
    return NextResponse.json({
      success: true,
      message: 'تم حفظ الإعدادات بنجاح',
      settings: settingsObject
    });
    
  } catch (error) {
    logger.error('Error updating system settings', error, { userId: user?._id });
    
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
    
    return handleApiError(error, 'حدث خطأ في تحديث إعدادات النظام');
  }
}

// Apply rate limiting and authentication to admin settings endpoints
export const GET = adminRateLimit(withRole(['admin'])(getAdminSettingsHandler));
export const PUT = adminRateLimit(withRole(['admin'])(updateAdminSettingsHandler)); 