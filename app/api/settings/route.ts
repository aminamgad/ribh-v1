import { NextRequest, NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings-manager';

// GET /api/settings - Get public system settings
export const GET = async (req: NextRequest) => {
  try {
    console.log('🔧 جلب إعدادات النظام العامة');
    
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
      platformName: settings.platformName,
      platformDescription: settings.platformDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      minimumOrderValue: settings.minimumOrderValue,
      maximumOrderValue: settings.maximumOrderValue,
      shippingCost: settings.shippingCost,
      freeShippingThreshold: settings.freeShippingThreshold,
      withdrawalSettings: settings.withdrawalSettings,
      commissionRates: settings.commissionRates,
      maxProductImages: settings.maxProductImages,
      maxProductDescriptionLength: settings.maxProductDescriptionLength,
      passwordMinLength: settings.passwordMinLength,
      sessionTimeout: settings.sessionTimeout,
      maxLoginAttempts: settings.maxLoginAttempts
    };
    
    console.log('✅ تم جلب إعدادات النظام العامة بنجاح');
    
    return NextResponse.json({
      success: true,
      settings: publicSettings
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
}; 