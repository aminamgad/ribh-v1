import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { z } from 'zod';

const lockProductSchema = z.object({
  isLocked: z.boolean(),
  lockReason: z.string().optional()
});

async function handler(req: NextRequest, user: any, { params }: { params: any } = { params: undefined }) {
  console.log('🔒 Lock API - Route hit successfully');
  console.log('🔒 Lock API - Method:', req.method);
  console.log('🔒 Lock API - URL:', req.url);
  console.log('🔒 Lock API - User object:', user);
  console.log('🔒 Lock API - User type:', typeof user);
  
  try {
    await connectDB();
    
    console.log('🔍 Lock API - Params:', params);
    console.log('🔍 Lock API - Params type:', typeof params);
    
    // Check if user is authenticated
    if (!user) {
      console.error('🔒 Lock API - User is undefined, authentication failed');
      return NextResponse.json(
        { success: false, message: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }
    
    console.log('🔒 Lock API - User authenticated:', {
      userId: user._id,
      userRole: user.role,
      userEmail: user.email
    });
    
    // Extract product ID from URL path since params is undefined
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 2]; // Get the ID before 'lock'
    
    console.log('🔍 Lock API - URL path parts:', pathParts);
    console.log('🔍 Lock API - Product ID from URL:', productId);
    
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
    console.error('Error in lock/unlock product:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      params: params
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'بيانات غير صحيحة', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء قفل/إلغاء قفل المنتج' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(handler);
