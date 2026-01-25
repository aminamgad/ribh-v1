import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Disable caching for this route - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/settings/shipping - Get active shipping regions (public endpoint)
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();
    
    // Use lean() to get plain object and avoid caching issues
    // Get the most recent settings document
    const settings = await SystemSettings.findOne()
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    
    if (!settings) {
      return NextResponse.json({
        success: true,
        regions: [],
        defaultShippingCost: 50,
        defaultFreeShippingThreshold: 500
      });
    }
    
    // Filter only active regions and return public data
    const allRegions = (settings as any)?.shippingRegions || [];
    logger.debug('Shipping regions fetched', {
      totalRegions: allRegions.length,
      settingsId: (settings as any)?._id?.toString(),
      updatedAt: (settings as any)?.updatedAt
    });
    
    const activeRegions = allRegions
      .filter((region: any) => region.isActive !== false)
      .map((region: any) => {
        // Handle both plain objects and Mongoose documents
        const regionObj = region && typeof region.toObject === 'function' 
          ? region.toObject() 
          : region;
        return {
          _id: regionObj._id?.toString() || regionObj._id,
          regionName: regionObj.regionName,
          description: regionObj.description,
          shippingCost: regionObj.shippingCost,
          freeShippingThreshold: regionObj.freeShippingThreshold,
          villageIds: regionObj.villageIds || [],
          governorateName: regionObj.governorateName || '',
          cityNames: regionObj.cityNames || []
        };
      });
    
    logger.debug('Active shipping regions', {
      activeCount: activeRegions.length,
      regionNames: activeRegions.map((r: any) => r.regionName)
    });
    
    const response = NextResponse.json({
      success: true,
      regions: activeRegions,
      defaultShippingCost: (settings as any)?.defaultShippingCost || 50,
      defaultFreeShippingThreshold: (settings as any)?.defaultFreeShippingThreshold || 500,
      timestamp: new Date().toISOString(), // Add timestamp for debugging
      totalRegions: activeRegions.length
    });
    
    // Add cache-control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    logger.error('Error fetching shipping regions', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب إعدادات التوصيل');
  }
};

