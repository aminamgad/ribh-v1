import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings-manager';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/settings - Get public system settings
export const GET = async (req: NextRequest) => {
  try {
    logger.apiRequest('GET', '/api/settings');
    
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
    
    // Return public settings (excluding sensitive financial details)
    const publicSettings = {
      // General settings
      platformName: settings.platformName,
      platformDescription: settings.platformDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      
      // Order settings
      minimumOrderValue: settings.minimumOrderValue,
      maximumOrderValue: settings.maximumOrderValue,
      
      // Shipping settings
      shippingEnabled: settings.shippingEnabled,
      defaultShippingCost: settings.defaultShippingCost,
      defaultFreeShippingThreshold: settings.defaultFreeShippingThreshold,
      governorates: settings.governorates,
      
      // Product settings
      maxProductImages: settings.maxProductImages,
      maxProductDescriptionLength: settings.maxProductDescriptionLength,
      autoApproveProducts: settings.autoApproveProducts,
      
      // Notification settings
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      pushNotifications: settings.pushNotifications,
      
      // Security settings
      passwordMinLength: settings.passwordMinLength,
      sessionTimeout: settings.sessionTimeout,
      maxLoginAttempts: settings.maxLoginAttempts,
      
      // Legal settings
      termsOfService: settings.termsOfService,
      privacyPolicy: settings.privacyPolicy,
      refundPolicy: settings.refundPolicy,
      
      // Analytics settings
      googleAnalyticsId: settings.googleAnalyticsId,
      facebookPixelId: settings.facebookPixelId,
      
      // Legacy fields for backward compatibility
      freeShippingThreshold: settings.defaultFreeShippingThreshold,
      shippingCost: settings.defaultShippingCost,
      maxProductDescription: settings.maxProductDescriptionLength,
      whatsappNotifications: settings.smsNotifications,
      requireProductImages: true,
      requireAdminApproval: !settings.autoApproveProducts,
      autoApproveOrders: false,
      maintenanceMode: false,
      maintenanceMessage: '',
      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',
      linkedinUrl: '',
      minimumWithdrawal: 100,
      maximumWithdrawal: 10000,
      withdrawalFee: 2.5,
      currency: '₪',
      shippingCompanies: ['شركة الشحن السريع', 'شركة الشحن الموثوقة'],
      requireTwoFactor: false,
      commissionRates: settings.commissionRates,
      withdrawalSettings: settings.withdrawalSettings,
      supportWhatsApp: settings.contactPhone
    };
    
    logger.apiResponse('GET', '/api/settings', 200);
    
    return NextResponse.json({
      success: true,
      settings: publicSettings
    });
    
  } catch (error) {
    logger.error('Error fetching system settings', error);
    return handleApiError(error, 'حدث خطأ في جلب إعدادات النظام');
  }
}; 