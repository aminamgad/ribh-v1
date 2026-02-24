import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import { productCache, generateCacheKey } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { settingsManager } from '@/lib/settings-manager';

interface RouteParams {
  params: { id: string };
}

// منع تخزين المتصفح لاستجابة المنتج لتجنب عرض بيانات منتج خاطئ عند التنقل السريع
const PRODUCT_GET_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

// GET /api/products/[id] - Get single product
async function getProduct(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
  const productIdParam = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id?.[0] : undefined;
  if (!productIdParam || typeof productIdParam !== 'string' || !productIdParam.trim()) {
    return NextResponse.json(
      { success: false, message: 'المنتج غير موجود' },
      { status: 404 }
    );
  }
  try {
    await connectDB();
    
    // Try cache first
    const cacheKey = generateCacheKey('product', productIdParam, user?.role);
    const cached = productCache.get(cacheKey);
    if (cached) {
      // Check access control
      if (user.role === 'supplier' && (cached as any).supplierId?._id?.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول لهذا المنتج' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, product: cached }, { headers: PRODUCT_GET_HEADERS });
    }
    
    // Fetch from database with optimized query
    const product = await Product.findById(productIdParam)
      .select('-__v') // Exclude version field
      .populate('categoryId', 'name')
      .populate('supplierId', 'name companyName role')
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
    // Safely extract supplierId - handle both populated and non-populated cases
    let actualSupplierId: any = null;
    if (product.supplierId) {
      // Check if supplierId is populated (object with _id) or just an ID
      if (typeof product.supplierId === 'object' && product.supplierId !== null) {
        actualSupplierId = product.supplierId._id || product.supplierId;
      } else {
        actualSupplierId = product.supplierId;
      }
    }
    
    if (actualSupplierId) {
      logger.debug('Access control check', {
        userRole: user.role,
        userId: user._id.toString(),
        productSupplierId: actualSupplierId.toString()
      });
    }
    
    if (user.role === 'supplier' && actualSupplierId && actualSupplierId.toString() !== user._id.toString()) {
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

    // Use the original supplierPrice from database directly
    // Only calculate if supplierPrice is truly missing (null/undefined) AND marketerPrice exists
    // Do NOT calculate if supplierPrice is 0 or any other value - use the stored value as-is
    let finalSupplierPrice = product.supplierPrice;
    
    // Only calculate if supplierPrice is completely missing (null/undefined), not if it's 0
    if ((finalSupplierPrice === null || finalSupplierPrice === undefined) && product.marketerPrice && product.marketerPrice > 0) {
      try {
        finalSupplierPrice = await settingsManager.calculateSupplierPriceFromMarketerPrice(product.marketerPrice);
        logger.debug('Calculated supplierPrice from marketerPrice in getProduct (only because original was missing)', {
          productId: product._id,
          productName: product.name,
          marketerPrice: product.marketerPrice,
          calculatedSupplierPrice: finalSupplierPrice,
          originalSupplierPrice: product.supplierPrice
        });
      } catch (error) {
        logger.error('Error calculating supplierPrice from marketerPrice in getProduct', error, {
          productId: product._id,
          marketerPrice: product.marketerPrice
        });
        // Keep original value if calculation fails
        finalSupplierPrice = product.supplierPrice;
      }
    } else {
      // Use the stored supplierPrice directly - this is the original value from database
      finalSupplierPrice = product.supplierPrice;
      if (finalSupplierPrice !== null && finalSupplierPrice !== undefined) {
        logger.debug('Using original supplierPrice from database in getProduct', {
          productId: product._id,
          productName: product.name,
          originalSupplierPrice: finalSupplierPrice
        });
      }
    }

    // Transform product for frontend
    const baseProduct = {
      _id: product._id,
      name: product.name,
      description: product.description,
      marketingText: product.marketingText,
      images: product.images,
      supplierPrice: finalSupplierPrice, // This is now the original stored value
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
      isMarketerPriceManuallyAdjusted: product.isMarketerPriceManuallyAdjusted || false,
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
    
    // Only include supplierName for admin and supplier roles (عرض "الإدارة" عندما المورد هو أدمن)
    const rawSupplier = product.supplierId;
    const supplierName = (rawSupplier as any)?.role === 'admin'
      ? 'الإدارة'
      : (rawSupplier?.name || (rawSupplier as any)?.companyName || '');
    const transformedProduct = (user?.role === 'admin' || user?.role === 'supplier')
      ? { ...baseProduct, supplierName }
      : baseProduct;

    logger.debug('Sending product data', {
      productId: transformedProduct._id,
      productName: transformedProduct.name,
      hasVariants: transformedProduct.hasVariants,
      variantsCount: transformedProduct.variants?.length || 0
    });

    // Cache the result
    productCache.set(cacheKey, transformedProduct);
    
    return NextResponse.json(
      { success: true, product: transformedProduct },
      { headers: PRODUCT_GET_HEADERS }
    );
    
    logger.apiResponse('GET', `/api/products/${productIdParam}`, 200);
  } catch (error) {
    logger.error('Error fetching product', error, { productId: productIdParam, userId: user?._id });
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
      'supplierPrice', 'marketerPrice', 'wholesalerPrice', 'minimumSellingPrice', 'isMinimumPriceMandatory', 'stockQuantity',
      'isActive', 'tags', 'specifications', 'sku',
      // Product variants
      'hasVariants', 'variants', 'variantOptions'
    ];
    
    // For suppliers, allow resubmitting rejected products
    if (user.role === 'supplier' && existingProduct.isRejected) {
      allowedUpdates.push('isRejected', 'rejectionReason', 'rejectedAt', 'rejectedBy');
    }
    
    // For admins, allow approval/rejection fields and manual marketer price adjustment
    if (user.role === 'admin') {
      allowedUpdates.push('isApproved', 'isRejected', 'rejectionReason', 'adminNotes', 'approvedAt', 'approvedBy', 'rejectedAt', 'rejectedBy', 'isMarketerPriceManuallyAdjusted');
    }
    
    const updateData: any = {};
    
    // Prevent suppliers from changing supplierId
    if (user.role === 'supplier' && body.supplierId !== undefined) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتغيير مورد المنتج' },
        { status: 403 }
      );
    }
    
    // Prevent non-admin users from manually adjusting marketer price
    if (body.isMarketerPriceManuallyAdjusted !== undefined && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بتعديل سعر المسوق يدوياً' },
        { status: 403 }
      );
    }
    
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
    
    // Log for debugging
    logger.debug('Product update data', {
      productId: params.id,
      hasIsMarketerPriceManuallyAdjusted: 'isMarketerPriceManuallyAdjusted' in body,
      isMarketerPriceManuallyAdjusted: body.isMarketerPriceManuallyAdjusted,
      updateDataHasFlag: 'isMarketerPriceManuallyAdjusted' in updateData,
      updateDataFlag: updateData.isMarketerPriceManuallyAdjusted,
      userRole: user.role
    });
    
    // Handle marketerPrice manual adjustment by admin
    const isManualAdjustment = body.isMarketerPriceManuallyAdjusted === true && user.role === 'admin';
    let shouldRecalculateMarketerPrice = !existingProduct.isMarketerPriceManuallyAdjusted && !isManualAdjustment;
    
    // If admin explicitly sets isMarketerPriceManuallyAdjusted (true or false)
    if (user.role === 'admin' && 'isMarketerPriceManuallyAdjusted' in body) {
      const manualAdjustmentValue = body.isMarketerPriceManuallyAdjusted === true;
      
      if (manualAdjustmentValue) {
        // If marketerPrice is also being updated, validate it
        if (updateData.marketerPrice !== undefined) {
          const finalSupplierPrice = updateData.supplierPrice !== undefined ? updateData.supplierPrice : existingProduct.supplierPrice;
          
          // Validate that supplierPrice exists and is valid
          if (!finalSupplierPrice || finalSupplierPrice <= 0) {
            return NextResponse.json(
              { success: false, message: 'يجب تحديد سعر المورد أولاً قبل تحديث سعر المسوق' },
              { status: 400 }
            );
          }
          
          // Validation: marketerPrice must be greater than supplierPrice
          if (updateData.marketerPrice <= finalSupplierPrice) {
            return NextResponse.json(
              { success: false, message: 'سعر المسوق يجب أن يكون أكبر من سعر المورد' },
              { status: 400 }
            );
          }
        }
        
        // Set the flag to true
        updateData.isMarketerPriceManuallyAdjusted = true;
        shouldRecalculateMarketerPrice = false;
        logger.debug('Admin enabled manual marketerPrice adjustment', {
          productId: params.id,
          marketerPrice: updateData.marketerPrice || existingProduct.marketerPrice
        });
      } else {
        // Admin wants to reset to auto-calculation
        updateData.isMarketerPriceManuallyAdjusted = false;
        shouldRecalculateMarketerPrice = true;
        logger.debug('Admin disabled manual marketerPrice adjustment', {
          productId: params.id
        });
      }
    } else if (updateData.marketerPrice !== undefined && user.role === 'admin') {
      // Admin is updating marketerPrice - check if it's different from auto-calculated value
      const finalSupplierPrice = updateData.supplierPrice !== undefined ? updateData.supplierPrice : existingProduct.supplierPrice;
      
      // Validate that supplierPrice exists and is valid
      if (!finalSupplierPrice || finalSupplierPrice <= 0) {
        return NextResponse.json(
          { success: false, message: 'يجب تحديد سعر المورد أولاً قبل تحديث سعر المسوق' },
          { status: 400 }
        );
      }
      
      // Validation: marketerPrice must be greater than supplierPrice
      if (updateData.marketerPrice <= finalSupplierPrice) {
        return NextResponse.json(
          { success: false, message: 'سعر المسوق يجب أن يكون أكبر من سعر المورد' },
          { status: 400 }
        );
      }
      
      // Calculate what the auto-calculated marketerPrice would be
      try {
        const autoCalculatedMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(finalSupplierPrice);
        const priceDifference = Math.abs(updateData.marketerPrice - autoCalculatedMarketerPrice);
      
        // If the marketerPrice is different from auto-calculated (more than 0.01 difference), 
        // it means admin manually adjusted it, so set the flag
        if (priceDifference > 0.01) {
          updateData.isMarketerPriceManuallyAdjusted = true;
          shouldRecalculateMarketerPrice = false;
          logger.debug('Admin manually adjusted marketerPrice (detected from price difference)', {
            productId: params.id,
            supplierPrice: finalSupplierPrice,
            autoCalculatedPrice: autoCalculatedMarketerPrice,
            manualPrice: updateData.marketerPrice,
            difference: priceDifference
          });
        } else if (existingProduct.isMarketerPriceManuallyAdjusted) {
          // If it matches auto-calculated but was manually adjusted before, keep the flag
          // (admin might have adjusted it to match the calculated value)
          updateData.isMarketerPriceManuallyAdjusted = true;
          shouldRecalculateMarketerPrice = false;
        }
      } catch (error) {
        // If calculation fails, assume manual adjustment
        logger.error('Error calculating marketerPrice from supplierPrice', error, {
          productId: params.id,
          supplierPrice: finalSupplierPrice
        });
        updateData.isMarketerPriceManuallyAdjusted = true;
        shouldRecalculateMarketerPrice = false;
      }
    }
    
    // Calculate marketerPrice from supplierPrice if supplierPrice is updated and not manually adjusted
    if (updateData.supplierPrice !== undefined && updateData.supplierPrice > 0 && shouldRecalculateMarketerPrice) {
      // If marketerPrice is not explicitly provided, calculate it from supplierPrice
      if (updateData.marketerPrice === undefined || updateData.marketerPrice <= 0) {
        try {
          updateData.marketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(updateData.supplierPrice);
          updateData.isMarketerPriceManuallyAdjusted = false;
          logger.debug('Calculated marketerPrice from supplierPrice during update', {
            supplierPrice: updateData.supplierPrice,
            marketerPrice: updateData.marketerPrice
          });
        } catch (error) {
          logger.error('Error calculating marketerPrice from supplierPrice during update', error, {
            productId: params.id,
            supplierPrice: updateData.supplierPrice
          });
          // If calculation fails, don't update marketerPrice and mark as manually adjusted
          updateData.isMarketerPriceManuallyAdjusted = true;
        }
      }
    } else if (updateData.marketerPrice !== undefined && updateData.marketerPrice > 0 && shouldRecalculateMarketerPrice) {
      // If only marketerPrice is updated but supplierPrice exists, we might want to recalculate
      // For now, we'll keep the existing supplierPrice if it exists
      const currentSupplierPrice = existingProduct.supplierPrice || updateData.supplierPrice;
      if (currentSupplierPrice && currentSupplierPrice > 0) {
        // Recalculate to ensure consistency - but only if marketerPrice wasn't explicitly set
        // Actually, if marketerPrice is provided, we should use it as-is
        // So we'll only recalculate if supplierPrice was also updated
      }
    }
    
    // Only admin can change supplierId
    if (user.role === 'admin' && body.supplierId !== undefined) {
      updateData.supplierId = body.supplierId;
    }

    // Update product
    let updatedProduct;
    try {
      updatedProduct = await Product.findByIdAndUpdate(
        params.id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedProduct) {
        logger.error('Product not found after update', { productId: params.id });
        return NextResponse.json(
          { success: false, message: 'المنتج غير موجود' },
          { status: 404 }
        );
      }
      
      // Populate fields safely (handle null categoryId)
      if (updatedProduct.categoryId) {
        await updatedProduct.populate('categoryId', 'name');
      }
      if (updatedProduct.supplierId) {
        await updatedProduct.populate('supplierId', 'name companyName');
      }
    } catch (validationError: any) {
      // Handle Mongoose validation errors
      logger.error('Product validation error', validationError, { 
        productId: params.id, 
        updateData 
      });
      
      // Extract validation error messages
      if (validationError.name === 'ValidationError') {
        const errors = Object.values(validationError.errors || {}).map((err: any) => ({
          path: err.path,
          message: err.message
        }));
        
        return NextResponse.json(
          {
            success: false,
            message: 'بيانات المنتج غير صحيحة',
            errors: errors
          },
          { status: 400 }
        );
      }
      
      // Re-throw if not a validation error
      throw validationError;
    }

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

    // قراءة metadata من DB بعد التحديث لضمان وجودها في قرار المزامنة (المستند المُرجَع قد لا يتضمنها)
    const productForSync = await Product.findById(params.id).select('metadata').lean() as { metadata?: Record<string, unknown> } | null;
    const meta = productForSync?.metadata;
    const hasLegacyExport = Boolean(meta?.easyOrdersProductId);
    const hasExportsArray = Array.isArray(meta?.easyOrdersExports) && meta.easyOrdersExports.length > 0;
    const hasEasyOrdersExport = hasLegacyExport || hasExportsArray;

    logger.info('Product update: Easy Orders sync check', {
      productId: params.id,
      hasMetadata: !!meta,
      hasLegacyExport,
      hasExportsArray,
      exportsCount: Array.isArray(meta?.easyOrdersExports) ? meta.easyOrdersExports.length : 0,
      willSync: hasEasyOrdersExport
    });

    if (!hasEasyOrdersExport) {
      logger.info('Product update: Easy Orders sync skipped (no export link). Export product from integration page first.', { productId: params.id });
    }

    if (hasEasyOrdersExport) {
      const rawId = params.id;
      const productIdToSync = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : String(rawId);
      try {
        const { syncProductToEasyOrdersOnEdit } = await import('@/lib/integrations/easy-orders/sync-product-on-edit');
        logger.info('Product update: starting Easy Orders sync', { productId: productIdToSync });
        const syncResult = await syncProductToEasyOrdersOnEdit(productIdToSync);
        logger.info('Product update: Easy Orders sync finished', {
          productId: productIdToSync,
          synced: syncResult.synced,
          failed: syncResult.failed,
          error: syncResult.error
        });
        if (syncResult.failed > 0 && syncResult.synced === 0) {
          logger.warn('Easy Orders sync on edit: all integrations failed', {
            productId: productIdToSync,
            failed: syncResult.failed,
            error: syncResult.error
          });
        } else if (syncResult.synced > 0) {
          logger.business('Product synced to Easy Orders on edit', {
            productId: productIdToSync,
            synced: syncResult.synced,
            failed: syncResult.failed
          });
        }
      } catch (e) {
        logger.error('Easy Orders sync on edit failed', e, { productId: productIdToSync });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      product: updatedProduct,
      // إذا لم يُشغّل التحديث على أيزي أوردر لأن المنتج غير مصدّر، يمكن للواجهة إظهار تلميح للمستخدم
      ...(hasEasyOrdersExport ? {} : { easyOrdersSyncSkipped: true, easyOrdersSyncSkippedReason: 'المنتج غير مرتبط بتكامل أيزي أوردر. لوصول التعديلات لموقع المسوق، قم بتصدير المنتج من صفحة التكامل أولاً.' })
    });
  } catch (error) {
    logger.error('Error updating product', error, { 
      productId: params.id, 
      userId: user._id?.toString(),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
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