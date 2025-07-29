import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';

export async function checkMaintenanceMode(req: NextRequest): Promise<NextResponse | null> {
  try {
    // Skip maintenance check for admin routes and API calls
    if (req.nextUrl.pathname.startsWith('/api/admin') || 
        req.nextUrl.pathname.startsWith('/dashboard/admin')) {
      return null;
    }
    
    await connectDB();
    const settings = await SystemSettings.getCurrentSettings();
    
    if (settings?.maintenanceMode) {
      // Allow admin users to bypass maintenance mode
      const authHeader = req.headers.get('authorization');
      const cookies = req.cookies.getAll();
      
      // Simple check for admin session (in production, use proper JWT verification)
      const hasAdminSession = cookies.some(cookie => 
        cookie.name === 'auth-token' && cookie.value.includes('admin')
      );
      
      if (!hasAdminSession) {
        return NextResponse.json({
          success: false,
          maintenance: true,
          message: settings.maintenanceMessage || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.',
          estimatedTime: 'قريباً'
        }, { status: 503 });
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return null; // Continue normally if maintenance check fails
  }
}

export async function getMaintenanceStatus(): Promise<{
  maintenanceMode: boolean;
  message: string;
}> {
  try {
    await connectDB();
    const settings = await SystemSettings.getCurrentSettings();
    
    return {
      maintenanceMode: settings?.maintenanceMode || false,
      message: settings?.maintenanceMessage || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.'
    };
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    return {
      maintenanceMode: false,
      message: 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.'
    };
  }
} 