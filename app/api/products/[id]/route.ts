import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { productCache, generateCacheKey } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

interface RouteParams {
  params: { id: string };
}

// GET /api/products/[id] - Get single product
async function getProduct(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    await connectDB();
    
    // Try cache first
    const cacheKey = generateCacheKey('product', params.id, user.role);
    const cached = productCache.get(cacheKey);
    if (cached) {
      // Check access control
      if (user.role === 'supplier' && (cached as any).supplierId?._id?.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول لهذا المنتج' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, product: cached });
    }
    
    // Fetch from database with optimized query
    const product = await Product.findById(params.id)
      .select('-__v') // Exclude version field
      .populate('categoryId', 'name')
      .populate('supplierId', 'name companyName')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .lean() as any;

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // Role-based access control - Only suppliers are restricted to their own products
    logger.debug('Access control check', {
      userRole: user.role,
      userId: user._id.toString(),
      productSupplierId: product.supplierId._id.toString()
    });
    
    if (user.role === 'supplier' && product.supplierId._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بالوصول لهذا المنتج' },
        { status: 403 }
      );
    }

    // For customers, only show approved and active products
    if ((user.role === 'marketer' || user.role === 'wholesaler') && (!product.isApproved || !product.isActive)) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير متاح' },
        { status: 404 }
      );
    }

    // Transform product for frontend
    const baseProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      marketingText: product.marketingText,
      images: product.images,
      marketerPrice: product.marketerPrice,
      wholesalerPrice: product.wholesalerPrice,
      minimumSellingPrice: product.minimumSellingPrice,
      isMinimumPriceMandatory: product.isMinimumPriceMandatory,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      isApproved: product.isApproved,
      isRejected: product.isRejected,
      rejectionReason: product.rejectionReason,
      adminNotes: product.adminNotes,
      approvedAt: product.approvedAt,
      approvedBy: product.approvedBy,
      rejectedAt: product.rejectedAt,
      rejectedBy: product.rejectedBy,
      isFulfilled: product.isFulfilled,
      categoryName: product.categoryId?.name,
      supplierId: product.supplierId,
      sku: product.sku,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      specifications: product.specifications,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Product variants
      hasVariants: product.hasVariants || false,
      variants: product.variants || [],
      variantOptions: product.variantOptions || [],
      // Locking fields
      isLocked: product.isLocked || false,
      lockedAt: product.lockedAt,
      lockedBy: product.lockedBy,
      lockReason: product.lockReason
    };
    
    // Only include supplierName for admin and supplier roles
    const transformedProduct = (user?.role === 'admin' || user?.role === 'supplier')
      ? {
          ...baseProduct,
          supplierName: product.supplierId?.name || product.supplierId?.companyName
        }
      : baseProduct;

    logger.debug('Sending product data', {
      productId: transformedProduct._id,
      productName: transformedProduct.name,
      hasVariants: transformedProduct.hasVariants,
      variantsCount: transformedProduct.variants?.length || 0
    });

    // Cache the result
    productCache.set(cacheKey, transformedProduct);
    
    return NextResponse.json({
      success: true,
      product: transformedProduct
    });
    
    logger.apiResponse('GET', `/api/products/${params.id}`, 200);
  } catch (error) {
    logger.error('Error fetching product', error, { productId: params.id, userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب المنتج');
  }
}

// PUT /api/products/[id] - Update product
async function updateProduct(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Check if product exists and user has permission
    const existingProduct = await Product.findById(params.id);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // Only supplier who owns the product or admin can update
    if (user.role === 'supplier' && existingProduct.supplierId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتعديل هذا المنتج' },
        { status: 403 }
      );
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'description', 'marketingText', 'images', 'categoryId',
      'marketerPrice', 'wholesalerPrice', 'minimumSellingPrice', 'isMinimumPriceMandatory', 'stockQuantity',
      'isActive', 'tags', 'specifications', 'sku', 'weight', 'dimensions',
      // Product variants
      'hasVariants', 'variants', 'variantOptions'
    ];
    
    // For suppliers, allow resubmitting rejected products
    if (user.role === 'supplier' && existingProduct.isRejected) {
      allowedUpdates.push('isRejected', 'rejectionReason', 'rejectedAt', 'rejectedBy');
    }
    
    // For admins, allow approval/rejection fields
    if (user.role === 'admin') {
      allowedUpdates.push('isApproved', 'isRejected', 'rejectionReason', 'adminNotes', 'approvedAt', 'approvedBy', 'rejectedAt', 'rejectedBy');
    }
    
    const updateData: any = {};
    
    // Only update allowed fields
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        // Handle categoryId specially - convert empty string to null
        if (field === 'categoryId') {
          updateData[field] = body[field] === '' ? null : body[field];
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name')
     .populate('supplierId', 'name companyName');

    // Invalidate cache for this product and product lists
    productCache.delete(generateCacheKey('product', params.id, user.role));
    productCache.clearPattern('products');
    
    // Invalidate stats cache if product status changed
    if (updateData.isApproved !== undefined || updateData.isActive !== undefined) {
      const { statsCache } = require('@/lib/cache');
      statsCache.clear();
    }

    logger.business('Product updated', { productId: params.id, userId: user._id.toString() });
    logger.apiResponse('PUT', `/api/products/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      product: updatedProduct
    });
  } catch (error) {
    logger.error('Error updating product', error, { productId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء تحديث المنتج');
  }
}

// DELETE /api/products/[id] - Delete product
async function deleteProduct(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  try {
    await connectDB();
    
    // Check if product exists and user has permission
    const product = await Product.findById(params.id);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }

    // Only supplier who owns the product or admin can delete
    if (user.role === 'supplier' && product.supplierId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بحذف هذا المنتج' },
        { status: 403 }
      );
    }

    await Product.findByIdAndDelete(params.id);

    // Invalidate cache for this product and product lists
    productCache.delete(generateCacheKey('product', params.id, user.role));
    productCache.clearPattern('products');
    
    // Invalidate stats cache
    const { statsCache } = require('@/lib/cache');
    statsCache.clear();

    logger.business('Product deleted', { productId: params.id, userId: user._id.toString() });
    logger.apiResponse('DELETE', `/api/products/${params.id}`, 200);

    return NextResponse.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    logger.error('Error deleting product', error, { productId: params.id, userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء حذف المنتج');
  }
}

export const GET = withAuth(getProduct);
export const PUT = withAuth(updateProduct);
export const DELETE = withAuth(deleteProduct);
export const PATCH = withAuth(updateProduct); 