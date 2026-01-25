import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import SystemSettings from '@/models/SystemSettings';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// Schema for shipping region
const shippingRegionSchema = z.object({
  regionName: z.string().min(1, 'اسم المنطقة مطلوب'),
  description: z.string().optional(),
  shippingCost: z.number().min(0, 'سعر التوصيل يجب أن يكون أكبر من أو يساوي صفر'),
  freeShippingThreshold: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  villageIds: z.array(z.number()).optional(),
  governorateName: z.string().optional(),
  cityNames: z.array(z.string()).optional()
});

// GET /api/admin/settings/shipping - Get shipping regions
async function getShippingRegions(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    // Convert regions to plain objects with _id
    const regions = (settings?.shippingRegions || []).map((region: any) => {
      const regionObj = region && typeof region.toObject === 'function' 
        ? region.toObject() 
        : region;
      return {
        _id: regionObj._id?.toString() || regionObj._id,
        regionName: regionObj.regionName,
        description: regionObj.description,
        shippingCost: regionObj.shippingCost,
        freeShippingThreshold: regionObj.freeShippingThreshold,
        isActive: regionObj.isActive !== undefined ? regionObj.isActive : true,
        villageIds: regionObj.villageIds || [],
        governorateName: regionObj.governorateName || '',
        cityNames: regionObj.cityNames || []
      };
    });
    
    return NextResponse.json({
      success: true,
      regions: regions,
      defaultShippingCost: settings?.defaultShippingCost || 50,
      defaultFreeShippingThreshold: settings?.defaultFreeShippingThreshold || 500
    });
  } catch (error) {
    logger.error('Error fetching shipping regions', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب إعدادات التوصيل');
  }
}

// POST /api/admin/settings/shipping - Add new shipping region
async function addShippingRegion(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = shippingRegionSchema.parse(body);
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Create new settings if none exist
      settings = new SystemSettings({});
      await settings.save();
    }
    
    // Check if region name already exists
    const existingRegion = settings.shippingRegions?.find(
      (r: any) => r.regionName === validatedData.regionName
    );
    
    if (existingRegion) {
      return NextResponse.json(
        { success: false, message: 'اسم المنطقة موجود بالفعل' },
        { status: 400 }
      );
    }
    
    // Add new region
    if (!settings.shippingRegions) {
      settings.shippingRegions = [];
    }
    
    // Create new region object with proper structure
    const newRegion = {
      regionName: validatedData.regionName,
      description: validatedData.description || '',
      shippingCost: validatedData.shippingCost,
      freeShippingThreshold: validatedData.freeShippingThreshold || null,
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      villageIds: validatedData.villageIds || [],
      governorateName: validatedData.governorateName || '',
      cityNames: validatedData.cityNames || []
    };
    
    settings.shippingRegions.push(newRegion as any);
    settings.markModified('shippingRegions');
    await settings.save();
    
    // Get the saved region with _id
    const savedRegion = settings.shippingRegions[settings.shippingRegions.length - 1];
    
    logger.info('Shipping region added', {
      regionName: validatedData.regionName,
      regionId: savedRegion._id?.toString(),
      addedBy: user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة منطقة التوصيل بنجاح',
      region: savedRegion
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error adding shipping region', error);
    return handleApiError(error, 'حدث خطأ أثناء إضافة منطقة التوصيل');
  }
}

// PUT /api/admin/settings/shipping - Update shipping region
async function updateShippingRegion(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { regionId, ...updateData } = body;
    
    if (!regionId) {
      return NextResponse.json(
        { success: false, message: 'معرف المنطقة مطلوب' },
        { status: 400 }
      );
    }
    
    const validatedData = shippingRegionSchema.partial().parse(updateData);
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings || !settings.shippingRegions) {
      return NextResponse.json(
        { success: false, message: 'المنطقة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Find region by ID (MongoDB _id)
    const regionIndex = settings.shippingRegions.findIndex(
      (r: any) => {
        const rId = r._id?.toString() || r._id;
        return rId === regionId;
      }
    );
    
    if (regionIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'المنطقة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Check if region name is being changed and already exists
    if (validatedData.regionName && validatedData.regionName !== settings.shippingRegions[regionIndex].regionName) {
      const existingRegion = settings.shippingRegions.find(
        (r: any) => r.regionName === validatedData.regionName && r._id?.toString() !== regionId
      );
      
      if (existingRegion) {
        return NextResponse.json(
          { success: false, message: 'اسم المنطقة موجود بالفعل' },
          { status: 400 }
        );
      }
    }
    
    // Update region
    const currentRegion = settings.shippingRegions[regionIndex];
    const regionObject = currentRegion && typeof (currentRegion as any).toObject === 'function' 
      ? (currentRegion as any).toObject() 
      : currentRegion;
    
    // Update region with validated data
    settings.shippingRegions[regionIndex] = {
      ...regionObject,
      ...validatedData,
      _id: regionObject._id || currentRegion._id // Preserve _id
    } as any;
    
    settings.markModified('shippingRegions');
    await settings.save();
    
    logger.info('Shipping region updated', {
      regionId,
      updatedBy: user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث منطقة التوصيل بنجاح',
      region: settings.shippingRegions[regionIndex]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Error updating shipping region', error);
    return handleApiError(error, 'حدث خطأ أثناء تحديث منطقة التوصيل');
  }
}

// DELETE /api/admin/settings/shipping - Delete shipping region
async function deleteShippingRegion(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const regionId = searchParams.get('regionId');
    
    if (!regionId) {
      return NextResponse.json(
        { success: false, message: 'معرف المنطقة مطلوب' },
        { status: 400 }
      );
    }
    
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings || !settings.shippingRegions) {
      return NextResponse.json(
        { success: false, message: 'المنطقة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Remove region by ID
    const initialLength = settings.shippingRegions.length;
    settings.shippingRegions = settings.shippingRegions.filter(
      (r: any) => {
        const rId = r._id?.toString() || r._id;
        return rId !== regionId;
      }
    );
    
    if (settings.shippingRegions.length === initialLength) {
      return NextResponse.json(
        { success: false, message: 'المنطقة غير موجودة' },
        { status: 404 }
      );
    }
    
    settings.markModified('shippingRegions');
    await settings.save();
    
    logger.info('Shipping region deleted', {
      regionId,
      deletedBy: user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف منطقة التوصيل بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting shipping region', error);
    return handleApiError(error, 'حدث خطأ أثناء حذف منطقة التوصيل');
  }
}

// Export handlers
export const GET = withRole(['admin'])(getShippingRegions);
export const POST = withRole(['admin'])(addShippingRegion);
export const PUT = withRole(['admin'])(updateShippingRegion);
export const DELETE = withRole(['admin'])(deleteShippingRegion);

