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
      
      // Maintenance settings
      maintenanceMode: settings.maintenanceMode || false,
      maintenanceMessage: settings.maintenanceMessage || '',
      
      // Financial settings (public info only)
      withdrawalSettings: {
        minimumWithdrawal: settings.withdrawalSettings?.minimumWithdrawal || 100,
        maximumWithdrawal: settings.withdrawalSettings?.maximumWithdrawal || 50000,
        withdrawalFees: settings.withdrawalSettings?.withdrawalFees || 0
      },
      // Admin profit margins (needed for product price calculation)
      adminProfitMargins: settings.adminProfitMargins || [
        { minPrice: 1, maxPrice: 100, margin: 10 },
        { minPrice: 101, maxPrice: 500, margin: 8 },
        { minPrice: 501, maxPrice: 1000, margin: 6 },
        { minPrice: 1001, maxPrice: 999999, margin: 5 }
      ],
      
      // Legacy fields for backward compatibility (deprecated - use new fields)
      freeShippingThreshold: settings.defaultFreeShippingThreshold,
      shippingCost: settings.defaultShippingCost,
      maxProductDescription: settings.maxProductDescriptionLength,
      whatsappNotifications: settings.smsNotifications,
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