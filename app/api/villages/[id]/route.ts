import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Village from '@/models/Village';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/villages/[id] - Get village by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const villageId = parseInt(params.id, 10);
    
    if (isNaN(villageId)) {
      return NextResponse.json(
        { success: false, message: 'معرف القرية غير صحيح' },
        { status: 400 }
      );
    }

    const village = await Village.findOne({ villageId, isActive: true }).lean();

    if (!village) {
      return NextResponse.json(
        { success: false, message: 'القرية غير موجودة' },
        { status: 404 }
      );
    }

    logger.apiResponse('GET', `/api/villages/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      data: village,
    });
  } catch (error) {
    logger.error('Error fetching village', error, { id: params.id });
    return handleApiError(error, 'حدث خطأ أثناء جلب القرية');
  }
}

