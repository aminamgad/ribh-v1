import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Package from '@/models/Package';
import ExternalCompany from '@/models/ExternalCompany';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

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
      .lean() as any;

    if (!packageDoc) {
      return NextResponse.json(
        { success: false, message: 'الطرد غير موجود' },
        { status: 404 }
      );
    }

    // Fetch external company separately to avoid populate issues
    let externalCompanyName = 'غير محدد';
    if (packageDoc.externalCompanyId) {
      try {
        const externalCompany = await ExternalCompany.findById(packageDoc.externalCompanyId)
          .lean() as any;
        if (externalCompany) {
          externalCompanyName = externalCompany.companyName || 'غير محدد';
        }
      } catch (error) {
        logger.warn('Error fetching external company', { 
          externalCompanyId: packageDoc.externalCompanyId,
          error 
        });
      }
    }

    return NextResponse.json({
      success: true,
      package: {
        _id: packageDoc._id.toString(),
        packageId: packageDoc.packageId,
        status: packageDoc.status,
        externalCompanyId: packageDoc.externalCompanyId?.toString() || null,
        externalCompanyName: externalCompanyName,
        orderId: packageDoc.orderId?.toString(),
        toName: packageDoc.toName,
        toPhone: packageDoc.toPhone,
        villageId: packageDoc.villageId,
        street: packageDoc.street,
        totalCost: packageDoc.totalCost,
        deliveryCost: packageDoc.deliveryCost,
        qrCode: packageDoc.qrCode,
        externalPackageId: packageDoc.externalPackageId, // package_id from shipping company API
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

