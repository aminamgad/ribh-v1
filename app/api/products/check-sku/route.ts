import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/products/check-sku - Check if SKU exists
async function checkProductSKU(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get('sku');
    const excludeId = searchParams.get('excludeId');
    
    if (!sku || sku.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'SKU مطلوب' },
        { status: 400 }
      );
    }
    
    // Build query to check for SKU
    const query: any = { sku: sku.trim() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    // For suppliers, only check their own products
    if (user.role === 'supplier') {
      query.supplierId = user._id;
    }
    
    const existingProduct = await Product.findOne(query).select('_id sku').lean();
    
    return NextResponse.json({
      success: true,
      exists: !!existingProduct
    });
    
  } catch (error) {
    logger.error('Error checking product SKU', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء التحقق من SKU');
  }
}

export const GET = withAuth(checkProductSKU);

