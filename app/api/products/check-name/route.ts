import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// GET /api/products/check-name - Check if product name exists or find similar products
async function checkProductName(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const excludeId = searchParams.get('excludeId');
    
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'اسم المنتج يجب أن يكون 3 أحرف على الأقل' },
        { status: 400 }
      );
    }
    
    // Build query to check for exact match
    const exactQuery: any = { name: name.trim() };
    if (excludeId) {
      exactQuery._id = { $ne: excludeId };
    }
    
    // Check for exact match
    const exactMatch = await Product.findOne(exactQuery).select('_id name').lean();
    
    if (exactMatch) {
      return NextResponse.json({
        success: true,
        exists: true,
        similar: []
      });
    }
    
    // Find similar products (case-insensitive partial match)
    const similarQuery: any = {
      name: { $regex: name.trim(), $options: 'i' }
    };
    if (excludeId) {
      similarQuery._id = { $ne: excludeId };
    }
    
    // For suppliers, only show their own products
    if (user.role === 'supplier') {
      similarQuery.supplierId = user._id;
    }
    
    const similarProducts = await Product.find(similarQuery)
      .select('_id name')
      .limit(5)
      .lean();
    
    return NextResponse.json({
      success: true,
      exists: false,
      similar: similarProducts.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name
      }))
    });
    
  } catch (error) {
    logger.error('Error checking product name', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء التحقق من اسم المنتج');
  }
}

export const GET = withAuth(checkProductName);

