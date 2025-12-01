import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Package from '@/models/Package';
import Village from '@/models/Village';
import PackageType from '@/models/PackageType';
import { createPackageSchema } from '@/lib/validations/package.validation';
import { requireExternalCompanyAuth } from '@/lib/external-company-auth';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import type { ExternalCompanyDocument } from '@/models/ExternalCompany';

async function createPackageHandler(
  req: NextRequest,
  company: ExternalCompanyDocument
): Promise<NextResponse> {
  try {
    await connectDB();

    // Parse request body
    const body = await req.json();

    // Validate input
    let validatedData;
    try {
      validatedData = createPackageSchema.parse(body);
    } catch (error: unknown) {
      if (error instanceof Error && 'errors' in error && typeof error.errors === 'object') {
        // Zod validation errors
        const zodError = error as { errors: Array<{ path: string[]; message: string }> };
        const validationErrors: Record<string, string[]> = {};
        
        zodError.errors.forEach((err) => {
          const field = err.path.join('.');
          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(err.message);
        });

        logger.warn('Package creation validation failed', {
          companyId: company._id,
          errors: validationErrors
        });

        return NextResponse.json(
          {
            code: 302,
            state: 'false',
            data: validationErrors,
            errors: validationErrors,
            message: 'Validation failed'
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify village exists
    const village = await Village.findOne({
      villageId: validatedData.village_id,
      isActive: true
    });

    if (!village) {
      logger.warn('Invalid village_id provided', {
        companyId: company._id,
        villageId: validatedData.village_id
      });

      return NextResponse.json(
        {
          code: 302,
          state: 'false',
          data: {
            village_id: ['The village_id is invalid or not active.']
          },
          errors: {
            village_id: ['The village_id is invalid or not active.']
          },
          message: 'Invalid village_id'
        },
        { status: 400 }
      );
    }

    // Verify package type exists (optional check - can be skipped if not required)
    const packageType = await PackageType.findOne({
      typeKey: validatedData.package_type.toLowerCase(),
      isActive: true
    });

    if (!packageType) {
      logger.warn('Package type not found, but continuing', {
        companyId: company._id,
        packageType: validatedData.package_type
      });
      // Continue anyway - package type validation might be optional
    }

    // Check if barcode already exists
    const existingPackage = await Package.findOne({
      barcode: validatedData.barcode
    });

    if (existingPackage) {
      logger.warn('Duplicate barcode attempted', {
        companyId: company._id,
        barcode: validatedData.barcode
      });

      return NextResponse.json(
        {
          code: 302,
          state: 'false',
          data: {
            barcode: ['The barcode already exists. Each package must have a unique barcode.']
          },
          errors: {
            barcode: ['The barcode already exists. Each package must have a unique barcode.']
          },
          message: 'Duplicate barcode'
        },
        { status: 400 }
      );
    }

    // Create package
    const newPackage = new Package({
      externalCompanyId: company._id,
      toName: validatedData.to_name,
      toPhone: validatedData.to_phone,
      alterPhone: validatedData.alter_phone,
      description: validatedData.description,
      packageType: validatedData.package_type,
      villageId: validatedData.village_id,
      street: validatedData.street,
      totalCost: validatedData.total_cost,
      note: validatedData.note || undefined,
      barcode: validatedData.barcode,
      status: 'pending'
    });

    await newPackage.save();

    logger.info('Package created successfully', {
      packageId: newPackage.packageId,
      companyId: company._id,
      companyName: company.companyName,
      barcode: newPackage.barcode
    });

    // Return success response in the exact format specified
    return NextResponse.json(
      {
        code: 200,
        state: 'success',
        data: {
          package_id: newPackage.packageId
        },
        message: 'Operation Successful'
      },
      { status: 201 }
    );

  } catch (error) {
    logger.error('Error creating package', error, {
      companyId: company._id,
      companyName: company.companyName
    });

    return handleApiError(error, 'حدث خطأ أثناء إنشاء الطرد');
  }
}

export const POST = requireExternalCompanyAuth(createPackageHandler);

