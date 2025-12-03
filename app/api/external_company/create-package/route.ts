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
      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        const validationErrors: Record<string, string[]> = {};
        
        zodError.issues.forEach((issue) => {
          const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(issue.message);
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

    // Verify village exists and is active
    const village = await Village.findOne({
      villageId: validatedData.village_id,
      isActive: true
    }).lean();

    if (!village) {
      logger.warn('Invalid or inactive village_id provided', {
        companyId: company._id,
        companyName: company.companyName,
        villageId: validatedData.village_id,
        path: req.nextUrl.pathname
      });

      // Check if village exists but is inactive
      const inactiveVillage = await Village.findOne({
        villageId: validatedData.village_id,
        isActive: false
      }).lean();

      const errorMessage = inactiveVillage 
        ? 'The village_id exists but is not active. Please contact support.'
        : 'The village_id is invalid. Please check the villages list and use a valid village_id from the provided data document.';

      return NextResponse.json(
        {
          code: 302,
          state: 'false',
          data: {
            village_id: [errorMessage]
          },
          errors: {
            village_id: [errorMessage]
          },
          message: 'Invalid village_id'
        },
        { status: 400 }
      );
    }

    logger.debug('Village verified successfully', {
      villageId: (village as any).villageId,
      villageName: (village as any).villageName,
      deliveryCost: (village as any).deliveryCost,
      areaId: (village as any).areaId
    });

    // Verify package type exists (optional check - can be skipped if not required)
    // Package types should be seeded using: node scripts/seed-package-types.js
    const packageType = await PackageType.findOne({
      typeKey: validatedData.package_type.toLowerCase(),
      isActive: true
    }).lean();

    if (!packageType) {
      logger.warn('Package type not found in database', {
        companyId: company._id,
        companyName: company.companyName,
        packageType: validatedData.package_type,
        note: 'Package type validation is optional. Continuing with creation.'
      });
      // Continue anyway - package type validation is optional
      // Common package types: 'normal', 'express', 'fragile', etc.
    } else {
      logger.debug('Package type verified', {
        packageType: validatedData.package_type,
        typeKey: (packageType as any).typeKey,
        name: (packageType as any).name
      });
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

    logger.business('Package created successfully via external company API', {
      packageId: newPackage.packageId,
      companyId: (company._id as any).toString(),
      companyName: company.companyName,
      barcode: newPackage.barcode,
      villageId: validatedData.village_id,
      villageName: (village as any).villageName,
      toName: validatedData.to_name,
      totalCost: validatedData.total_cost,
      packageType: validatedData.package_type
    });
    
    logger.info('Package created successfully', {
      packageId: newPackage.packageId,
      companyId: company._id,
      companyName: company.companyName,
      barcode: newPackage.barcode,
      villageId: validatedData.village_id
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

    // Return error in the format specified by the API documentation
    return NextResponse.json(
      {
        code: 500,
        state: 'false',
        data: {},
        errors: {
          server: ['Internal server error. Please try again later or contact support.']
        },
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export const POST = requireExternalCompanyAuth(createPackageHandler);

