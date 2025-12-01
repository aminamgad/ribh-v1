import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Village from '@/models/Village';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { z } from 'zod';

// Helper function to safely parse numbers
function parseNumber(value: string | null | undefined, defaultValue?: number): number | undefined {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Helper function to safely parse boolean
function parseBoolean(value: string | null | undefined, defaultValue: boolean = true): boolean {
  if (value === null || value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

const querySchema = z.object({
  areaId: z.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  page: z.number().int().positive().default(1),
});

// GET /api/villages - Get all villages with optional filtering
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    
    // Parse query parameters manually to avoid Zod coercion issues
    const areaIdParam = searchParams.get('area_id');
    const searchParam = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    
    const queryData = {
      areaId: parseNumber(areaIdParam),
      search: searchParam || undefined,
      isActive: parseBoolean(isActiveParam, true),
      limit: parseNumber(limitParam, 100) || 100,
      page: parseNumber(pageParam, 1) || 1,
    };
    
    const query = querySchema.parse(queryData);

    const skip = (query.page - 1) * query.limit;
    const filter: any = {};

    // Filter by area_id
    if (query.areaId) {
      filter.areaId = query.areaId;
    }

    // Filter by active status
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    // Search by village name
    if (query.search) {
      filter.villageName = { $regex: query.search, $options: 'i' };
    }

    // Get villages
    const [villages, total] = await Promise.all([
      Village.find(filter)
        .sort({ villageId: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Village.countDocuments(filter),
    ]);

    logger.apiResponse('GET', '/api/villages', 200);

    return NextResponse.json({
      success: true,
      data: villages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching villages', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب القرى');
  }
}

// POST /api/villages - Create new village (Admin only - for future use)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const village = new Village({
      villageId: body.village_id,
      villageName: body.village_name,
      deliveryCost: body.delivery_cost,
      areaId: body.area_id,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    await village.save();

    logger.info('Village created', { villageId: village.villageId, villageName: village.villageName });

    return NextResponse.json(
      {
        success: true,
        data: village,
        message: 'تم إنشاء القرية بنجاح',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating village', error);
    return handleApiError(error, 'حدث خطأ أثناء إنشاء القرية');
  }
}

