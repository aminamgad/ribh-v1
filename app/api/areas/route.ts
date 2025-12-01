import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Village from '@/models/Village';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/areas - Get all areas with their villages
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get all villages grouped by area_id
    const villages = await Village.find({ isActive: true })
      .sort({ areaId: 1, villageId: 1 })
      .lean();

    // Group by area_id
    const areasMap = new Map<number, {
      areaId: number;
      villages: Array<{
        id: number;
        name: string;
        deliveryCost: number;
      }>;
      totalVillages: number;
      minDeliveryCost: number;
      maxDeliveryCost: number;
    }>();

    villages.forEach((village) => {
      if (!areasMap.has(village.areaId)) {
        areasMap.set(village.areaId, {
          areaId: village.areaId,
          villages: [],
          totalVillages: 0,
          minDeliveryCost: village.deliveryCost,
          maxDeliveryCost: village.deliveryCost,
        });
      }

      const area = areasMap.get(village.areaId)!;
      area.villages.push({
        id: village.villageId,
        name: village.villageName,
        deliveryCost: village.deliveryCost,
      });
      area.totalVillages++;
      area.minDeliveryCost = Math.min(area.minDeliveryCost, village.deliveryCost);
      area.maxDeliveryCost = Math.max(area.maxDeliveryCost, village.deliveryCost);
    });

    const areas = Array.from(areasMap.values());

    logger.apiResponse('GET', '/api/areas', 200);

    return NextResponse.json({
      success: true,
      data: areas,
    });
  } catch (error) {
    logger.error('Error fetching areas', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب المناطق');
  }
}

