import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/database';
import ExternalCompany from '@/models/ExternalCompany';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

/**
 * GET /api/admin/external-companies
 * Get all external companies
 */
async function getExternalCompaniesHandler(req: NextRequest, user: any) {
  try {
    await connectDB();

    const companies = await ExternalCompany.find({})
      .select('-apiSecret') // Don't return API secret
      .sort({ createdAt: -1 })
      .lean();

    logger.apiResponse('GET', '/api/admin/external-companies', 200);
    return NextResponse.json({
      success: true,
      companies: companies
    });
  } catch (error) {
    logger.error('Error fetching external companies', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في جلب الشركات الخارجية');
  }
}

/**
 * PUT /api/admin/external-companies/[id]
 * Update external company (including apiEndpointUrl and apiToken)
 */
async function updateExternalCompanyHandler(req: NextRequest, user: any) {
  try {
    await connectDB();

    const body = await req.json();
    const { companyId, apiEndpointUrl, apiToken, isActive } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'معرف الشركة مطلوب' },
        { status: 400 }
      );
    }

    // Validate URL if provided
    if (apiEndpointUrl && apiEndpointUrl.trim() !== '') {
      try {
        new URL(apiEndpointUrl);
      } catch {
        return NextResponse.json(
          { success: false, message: 'رابط API غير صحيح' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (apiEndpointUrl !== undefined) {
      updateData.apiEndpointUrl = apiEndpointUrl?.trim() || null;
    }
    if (apiToken !== undefined) {
      updateData.apiToken = apiToken?.trim() || null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const company = await ExternalCompany.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true }
    ).select('-apiSecret').lean();

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'الشركة غير موجودة' },
        { status: 404 }
      );
    }

    logger.business('External company updated', {
      companyId: companyId,
      updatedFields: Object.keys(updateData),
      userId: user._id
    });

    logger.apiResponse('PUT', '/api/admin/external-companies', 200);
    return NextResponse.json({
      success: true,
      company: company,
      message: 'تم تحديث الشركة بنجاح'
    });
  } catch (error) {
    logger.error('Error updating external company', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ في تحديث الشركة');
  }
}

export const GET = requireAdmin(getExternalCompaniesHandler);
export const PUT = requireAdmin(updateExternalCompanyHandler);

