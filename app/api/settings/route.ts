import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';

// GET /api/settings - Get public system settings (for all users)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    let settings = await SystemSettings.getCurrentSettings();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await SystemSettings.create({
        updatedBy: null // System default
      });
    }
    
    // Return only public settings (no sensitive information)
    return NextResponse.json({
      success: true,
      settings: {
        platformName: settings.platformName,
        platformDescription: settings.platformDescription,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        supportWhatsApp: settings.supportWhatsApp,
        currency: settings.currency,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        facebookUrl: settings.facebookUrl,
        instagramUrl: settings.instagramUrl,
        twitterUrl: settings.twitterUrl,
        linkedinUrl: settings.linkedinUrl,
        termsOfService: settings.termsOfService,
        privacyPolicy: settings.privacyPolicy,
        refundPolicy: settings.refundPolicy,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الإعدادات' },
      { status: 500 }
    );
  }
} 