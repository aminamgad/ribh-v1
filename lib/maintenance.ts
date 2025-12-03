import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { getCurrentUser } from './auth';
import { logger } from './logger';

export async function checkMaintenanceMode(req: NextRequest): Promise<NextResponse | null> {
  try {
    // Skip maintenance check for admin routes and API calls
    if (req.nextUrl.pathname.startsWith('/api/admin') || 
        req.nextUrl.pathname.startsWith('/dashboard/admin') ||
        req.nextUrl.pathname.startsWith('/api/auth/login') ||
        req.nextUrl.pathname.startsWith('/api/auth/register')) {
      return null;
    }
    
    await connectDB();
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    
    if (settings?.maintenanceMode) {
      // Allow admin users to bypass maintenance mode
      try {
        const user = await getCurrentUser(req);
        if (user && user.role === 'admin') {
          logger.debug('Admin user bypassing maintenance mode', { userId: user._id });
          return null; // Allow admin to access
        }
      } catch (error) {
        // If auth check fails, continue with maintenance check
        logger.debug('Auth check failed during maintenance check', { error });
      }
      
      // Skip maintenance check for external company API (they need to create packages)
      if (req.nextUrl.pathname.startsWith('/api/external_company')) {
        return null;
      }
      
      // Return maintenance response
      const maintenanceMessage = settings.maintenanceMessage || 'المنصة تحت الصيانة. يرجى المحاولة لاحقاً.';
      
      // If it's an API request, return JSON
      if (req.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.json({
          success: false,
          maintenance: true,
          message: maintenanceMessage,
          estimatedTime: 'قريباً'
        }, { status: 503 });
      }
      
      // For page requests, return HTML maintenance page
      const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>المنصة تحت الصيانة</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .maintenance-container {
              background: white;
              border-radius: 20px;
              padding: 60px 40px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 600px;
              width: 100%;
            }
            .maintenance-icon {
              font-size: 80px;
              margin-bottom: 30px;
            }
            h1 {
              color: #333;
              font-size: 32px;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              font-size: 18px;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="maintenance-container">
            <div class="maintenance-icon">🔧</div>
            <h1>المنصة تحت الصيانة</h1>
            <p>${maintenanceMessage}</p>
            <div class="spinner"></div>
          </div>
        </body>
        </html>
      `;
      
      return new NextResponse(html, {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    
    return null;
  } catch (error) {
    logger.error('Error checking maintenance mode', error);
    return null; // Continue normally if maintenance check fails
  }
}

export async function getMaintenanceStatus(): Promise<{
  maintenanceMode: boolean;
  message: string;
}> {
  try {
    await connectDB();
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    
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