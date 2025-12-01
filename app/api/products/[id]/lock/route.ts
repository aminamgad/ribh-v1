import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const lockProductSchema = z.object({
  isLocked: z.boolean(),
  lockReason: z.string().optional()
});

async function handler(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } } | undefined;
  const params = routeParams?.params || { id: '' };
  try {
    await connectDB();
    
    logger.apiRequest('PUT', '/api/products/[id]/lock', { userId: user?._id, userRole: user?.role });
    
    // Check if user is authenticated
    if (!user) {
      logger.warn('Authentication failed - no user found', { path: '/api/products/[id]/lock' });
      return NextResponse.json(
        { success: false, message: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }
    
    // Extract product ID from URL path since params is undefined
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 2]; // Get the ID before 'lock'
    
    logger.debug('Lock API - Extracting product ID from URL', { pathParts, productId });
    
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'معرف المنتج مطلوب' },
        { status: 400 }
      );
    }
    
    // Validate MongoDB ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, message: 'معرف المنتج غير صحيح' },
        { status: 400 }
      );
    }
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }
    
    // Check permissions - only admin or the product owner (supplier) can lock/unlock
    if (user.role !== 'admin' && product.supplierId.toString() !== user._id) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بقفل/إلغاء قفل هذا المنتج' },
        { status: 403 }
      );
    }
    
    if (req.method === 'PUT') {
      const body = await req.json();
      const validatedData = lockProductSchema.parse(body);
      
      // Update the product
      const updateData: any = {
        isLocked: validatedData.isLocked
      };
      
      if (validatedData.isLocked) {
        updateData.lockedAt = new Date();
        updateData.lockedBy = user._id;
        updateData.lockReason = validatedData.lockReason || '';
      } else {
        updateData.lockedAt = null;
        updateData.lockedBy = null;
        updateData.lockReason = '';
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
      ).populate('supplierId', 'name companyName');
      
      logger.business('Product lock status changed', {
        productId,
        isLocked: validatedData.isLocked,
        userId: user._id.toString()
      });
      logger.apiResponse('PUT', '/api/products/[id]/lock', 200);
      
      return NextResponse.json({
        success: true,
        message: validatedData.isLocked ? 'تم قفل المنتج بنجاح' : 'تم إلغاء قفل المنتج بنجاح',
        product: updatedProduct
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'طريقة طلب غير مدعومة' },
      { status: 405 }
    );
    
  } catch (error) {
    logger.error('Error in lock/unlock product', error, {
      userId: user?._id,
      productId: params?.id
    });
    
    if (error instanceof z.ZodError) {
      logger.warn('Lock product validation failed', { errors: error.errors });
      return NextResponse.json(
        { success: false, message: 'بيانات غير صحيحة', errors: error.errors },
        { status: 400 }
      );
    }
    
    return handleApiError(error, 'حدث خطأ أثناء قفل/إلغاء قفل المنتج');
  }
}

export const PUT = withAuth(handler);
