import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Package from '@/models/Package';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

/**
 * GET /api/packages?packageId=xxx
 * Get package information by packageId
 */
async function getPackageHandler(req: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const packageId = searchParams.get('packageId');

    if (!packageId) {
      return NextResponse.json(
        { success: false, message: 'packageId مطلوب' },
        { status: 400 }
      );
    }

    const packageIdNumber = parseInt(packageId, 10);
    if (isNaN(packageIdNumber)) {
      return NextResponse.json(
        { success: false, message: 'packageId يجب أن يكون رقماً' },
        { status: 400 }
      );
    }

    const packageDoc = await Package.findOne({ packageId: packageIdNumber })
      .populate('externalCompanyId', 'companyName')
      .lean() as any;

    if (!packageDoc) {
      return NextResponse.json(
        { success: false, message: 'الطرد غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      package: {
        _id: packageDoc._id.toString(),
        packageId: packageDoc.packageId,
        status: packageDoc.status,
        externalCompanyId: packageDoc.externalCompanyId?._id?.toString() || packageDoc.externalCompanyId?.toString(),
        externalCompanyName: packageDoc.externalCompanyId?.companyName || 'غير محدد',
        orderId: packageDoc.orderId?.toString(),
        toName: packageDoc.toName,
        toPhone: packageDoc.toPhone,
        villageId: packageDoc.villageId,
        street: packageDoc.street,
        totalCost: packageDoc.totalCost,
        barcode: packageDoc.barcode,
        createdAt: packageDoc.createdAt,
        updatedAt: packageDoc.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error fetching package', error);
    return handleApiError(error, 'حدث خطأ أثناء جلب معلومات الطرد');
  }
}

export const GET = withAuth(getPackageHandler);

