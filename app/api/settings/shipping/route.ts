import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/settings/shipping - Get active shipping regions (public endpoint)
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();
    
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    // Filter only active regions and return public data
    const activeRegions = (settings?.shippingRegions || [])
      .filter((region: any) => region.isActive !== false)
      .map((region: any) => {
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
    
    return NextResponse.json({
      success: true,
      regions: activeRegions,
      defaultShippingCost: settings?.defaultShippingCost || 50,
      defaultFreeShippingThreshold: settings?.defaultFreeShippingThreshold || 500
    });
  } catch (error) {
    logger.error('Error fetching shipping regions', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب إعدادات التوصيل');
  }
};

