import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole, userHasPermission } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SystemSettings from '@/models/SystemSettings';
import { z } from 'zod';
import { handleApiError, safeLogError } from '@/lib/error-handler';
import { sanitizeString, sanitizeObject } from '@/lib/sanitize';
import { productCache, generateCacheKey } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { generateProductSKU, generateVariantOptionSKUs, isSKUUnique } from '@/lib/sku-generator';
import { settingsManager } from '@/lib/settings-manager';

// Dynamic product schema based on system settings
async function getProductSchema() {
  let settings;
  try {
    settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
  } catch (error) {
    logger.warn('Failed to fetch system settings in schema, using defaults', { error });
    settings = null;
  }
  
  // Use default settings if none exist
  const defaultSettings = {
    maxProductImages: 10,
    maxProductDescription: 2000,
    requireProductImages: true
  };
  
  const currentSettings = settings || defaultSettings;
  const maxProductImages = currentSettings.maxProductImages || 10;
  const maxProductDescription = (currentSettings as any).maxProductDescription || (currentSettings as any).maxProductDescriptionLength || 2000;
  const requireProductImages = (currentSettings as any).requireProductImages !== false; // Default true
  
  return z.object({
    name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
    description: z.string()
      .optional()
      .refine((val) => !val || val.length >= 10, 'وصف المنتج يجب أن يكون 10 أحرف على الأقل')
      .refine((val) => !val || val.length <= maxProductDescription, `وصف المنتج لا يمكن أن يتجاوز ${maxProductDescription} حرف`),
    marketingText: z.string()
      .optional()
      .refine((val) => !val || val.length <= 2000, 'النص التسويقي لا يمكن أن يتجاوز 2000 حرف'),
    categoryId: z.string().optional().nullable(),
    supplierPrice: z.number().min(0.01, 'سعر المورد يجب أن يكون أكبر من 0'),
    marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0').optional(),
    wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0').nullish(),
    minimumSellingPrice: z.number().min(0, 'السعر الأدنى للبيع لا يمكن أن يكون سالباً').nullish(),
    isMinimumPriceMandatory: z.boolean().default(false),
    stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
    images: requireProductImages 
      ? z.array(z.string()).min(1, 'يجب إضافة صورة واحدة على الأقل').max(maxProductImages, `لا يمكن إضافة أكثر من ${maxProductImages} صور`)
      : z.array(z.string()).max(maxProductImages, `لا يمكن إضافة أكثر من ${maxProductImages} صور`),
    sku: z.string().optional(),
    tags: z.array(z.string()).optional(),
    specifications: z.record(z.any()).optional(),
    // Product variants
    hasVariants: z.boolean().default(false),
    variants: z.array(z.object({
      _id: z.string(),
      name: z.string(),
      values: z.array(z.string()),
      valueDetails: z.array(z.object({
        value: z.string(),
        stockQuantity: z.number().optional(),
        customPrice: z.number().optional()
      })).optional(),
      isRequired: z.boolean().default(true),
      order: z.number().default(0),
      stockQuantity: z.number().optional(),
      customPrice: z.number().optional()
    })).optional(),
    variantOptions: z.array(z.object({
      variantId: z.string(),
      variantName: z.string(),
      value: z.string(),
      price: z.number().min(0).optional(),
      stockQuantity: z.number().min(0),
      sku: z.string().optional(),
      images: z.array(z.string()).optional()
    })).optional()
  });
}

// GET /api/products - Get products based on user role
async function getProducts(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('GET', '/api/products', { userId: user._id, role: user.role, userEmail: user.email });

    // صلاحيات دقيقة: الأدمن يحتاج products.view لعرض قائمة المنتجات
    if (user.role === 'admin' && !userHasPermission(user, 'products.view')) {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      return NextResponse.json({
        success: true,
        products: [],
        pagination: { page, limit, total: 0, pages: 0 },
        totalCount: 0,
      });
    }
    
    // Test database connection and get product count
    const totalProductCount = await Product.countDocuments({});
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category'); // can be comma-separated IDs
    const search = searchParams.get('search') || searchParams.get('q'); // Support both 'search' and 'q' params
    const status = searchParams.get('status');
    
    // Price filters
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    
    // Admin-specific filters
    const minStock = searchParams.get('minStock');
    const maxStock = searchParams.get('maxStock');
    const suppliers = searchParams.get('suppliers'); // Comma-separated supplier IDs
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const manuallyModified = searchParams.get('manuallyModified'); // Admin: المنتجات المعدلة يدوياً (سعر المسوق)
    
    let query: any = {};
    
    // Role-based filtering
    if (user.role === 'supplier') {
      // CRITICAL: Ensure supplierId is set and matches user._id exactly
      // Simple equality check - MongoDB will automatically exclude null/undefined
      query.supplierId = user._id;
    }
    
    // Additional filters
    if (category) {
      const categoryIds = category.split(',').map((s) => s.trim()).filter(Boolean);
      if (categoryIds.length === 1) {
        query.categoryId = categoryIds[0];
      } else if (categoryIds.length > 1) {
        query.categoryId = { $in: categoryIds };
      }
    }
    
    // Admin filters: Stock Quantity Range
    const stockRangeFilter: any = {};
    if (user.role === 'admin' && (minStock || maxStock)) {
      if (minStock) {
        const min = parseInt(minStock, 10);
        if (!isNaN(min) && min >= 0) {
          stockRangeFilter.$gte = min;
        }
      }
      
      if (maxStock) {
        const max = parseInt(maxStock, 10);
        if (!isNaN(max) && max >= 0) {
          stockRangeFilter.$lte = max;
        }
      }
    }
    
    // Apply stock range filter
    if (Object.keys(stockRangeFilter).length > 0) {
      query.stockQuantity = stockRangeFilter;
    }
    
    // Log stock filter for debugging
    if (user.role === 'admin' && (minStock || maxStock)) {
      logger.debug('Stock range filter applied', { minStock, maxStock, stockRangeFilter, queryStockQuantity: query.stockQuantity });
    }
    
    // Admin filters: Suppliers (multi-select)
    // IMPORTANT: This must be applied AFTER role-based filtering to override it for admin
    if (user.role === 'admin' && suppliers && suppliers.trim()) {
      const supplierIds = suppliers.split(',').map(id => id.trim()).filter(Boolean);
      
      if (supplierIds.length > 0) {
        // Override role-based supplierId filter with admin's selected suppliers
        query.supplierId = { $in: supplierIds };
      } else {
        logger.warn('Suppliers filter provided but no valid IDs after processing', { suppliers, supplierIds });
      }
    }
    
    // Admin filters: Date Range
    if (user.role === 'admin' && (startDate || endDate)) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // Admin filter: المنتجات المعدلة يدوياً (سعر المسوق)
    if (user.role === 'admin' && manuallyModified === 'true') {
      query.isMarketerPriceManuallyAdjusted = true;
    }
    
    // Price range filter - works for all roles
    // Determine price field based on user role
    const priceField = user.role === 'wholesaler' ? 'wholesalerPrice' : 'marketerPrice';
    
    if (minPrice || maxPrice) {
      query[priceField] = {};
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min) && min >= 0) {
          query[priceField].$gte = min;
        } else {
          logger.warn('Price filter - invalid minPrice', { minPrice });
        }
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max) && max >= 0) {
          query[priceField].$lte = max;
        } else {
          logger.warn('Price filter - invalid maxPrice', { maxPrice });
        }
      }
    }
    
    // Build text search conditions (name, description)
    let textSearchConditions = [];
    if (search && search.trim()) {
      const searchTerm = search.trim();
      textSearchConditions.push(
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      );
    }
    
    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      const statusOr: any[] = [];

      if (statuses.includes('approved')) {
        statusOr.push({ isApproved: true, isRejected: false });
      }
      if (statuses.includes('pending')) {
        statusOr.push({ isApproved: false, isRejected: false });
      }
      if (statuses.includes('rejected')) {
        statusOr.push({ isRejected: true });
      }

      if (statusOr.length === 1) {
        // Single status: apply directly to query (AND with other filters)
        Object.assign(query, statusOr[0]);
      } else if (statusOr.length > 1) {
        // Multiple statuses: use $or but ensure it works with AND for other filters
        query.$and = query.$and || [];
        query.$and.push({ $or: statusOr });
      }
    }
    
    // For marketers and wholesalers, only show approved products
    if (user.role === 'marketer' || user.role === 'wholesaler') {
      query.isApproved = true;
      // نسمح بالمنتجات التي لم يتم رفضها أو isRejected = false أو undefined
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { isRejected: false },
          { isRejected: { $exists: false } }
        ]
      });
      // Exclude locked products for marketers and wholesalers
      query.isLocked = { $ne: true };
      // لا نضيف فلتر isActive هنا - نترك المسوق يرى جميع المنتجات المعتمدة
      // query.isActive = true;
      // لا نضيف فلتر المخزون هنا - نترك المسوق يرى جميع المنتجات المعتمدة
      // query.stockQuantity = { $gt: 0 };
    }
    
    // Combine text search conditions with main query
    // Text search should work with AND logic with other filters
    if (textSearchConditions.length > 0) {
      // Add text search to $and to ensure it works with all other filters (AND logic)
      query.$and = query.$and || [];
      query.$and.push({ $or: textSearchConditions });
    }
    
    // IMPORTANT: Ensure all filters work together with AND logic
    // The problem: When we have both status filter (isApproved/isRejected) and stockQuantity filter,
    // they must both be satisfied (AND logic), not OR logic
    
    // MongoDB applies direct properties with AND by default, but we need to be explicit
    // when combining with $or/$and to ensure all filters work together correctly
    
    // CRITICAL FIX: If we have both status filter (isApproved/isRejected) as direct property
    // and stockQuantity as direct property, they should work together with AND logic
    // MongoDB handles this automatically: { isApproved: true, stockQuantity: { $gte: 200 } }
    // means (isApproved = true) AND (stockQuantity >= 200)
    
    // However, if there's a $or in the query from search conditions,
    // MongoDB will still AND direct properties correctly
    // But we need to ensure that direct properties are not lost or overridden
    
    // The issue: MongoDB applies direct properties with AND by default, so this should work correctly
    // But let's verify the query structure is correct
    
    // Log final query for debugging
    logger.debug('Final products query', { 
      query: JSON.stringify(query, null, 2), 
      userRole: user.role, 
      userId: user._id, 
      status, 
      minStock, 
      maxStock,
      suppliers,
      supplierIds: suppliers ? suppliers.split(',').map(id => id.trim()).filter(Boolean) : [],
      hasOr: !!query.$or,
      hasAnd: !!query.$and,
      hasStockQuantity: !!query.stockQuantity,
      hasSupplierId: !!query.supplierId,
      supplierIdValue: query.supplierId,
      hasIsApproved: query.isApproved !== undefined,
      hasIsRejected: query.isRejected !== undefined,
      stockQuantityValue: query.stockQuantity,
      isApprovedValue: query.isApproved,
      isRejectedValue: query.isRejected
    });
    
    // Test: Check if user's products exist
    if (user.role === 'supplier') {
      const userProductCount = await Product.countDocuments({ supplierId: user._id });
      logger.debug('Supplier products count', { userProductCount, userId: user._id });
    }
    
    const skip = (page - 1) * limit;
    
    // Normalize suppliers for cache key (sort IDs to ensure consistent cache keys)
    // This ensures that suppliers=id1,id2 and suppliers=id2,id1 produce the same cache key
    let normalizedSuppliers = '';
    if (suppliers && suppliers.trim()) {
      const supplierIds = suppliers.split(',').map(id => id.trim()).filter(Boolean);
      if (supplierIds.length > 0) {
        // Sort supplier IDs to ensure consistent cache keys
        normalizedSuppliers = supplierIds.sort().join(',');
      }
    }
    
    // Generate cache key (include all filters including minPrice, maxPrice, minStock, maxStock, and suppliers)
    // IMPORTANT: Use normalizedSuppliers to ensure consistent cache keys
    // CRITICAL: Include minPrice and maxPrice in cache key to ensure cache invalidation when price filters change
    const cacheKey = generateCacheKey(
      'products',
      user.role,
      user._id.toString(),
      page,
      limit,
      category || '',
      search || '',
      status || '',
      minPrice || '',
      maxPrice || '',
      minStock || '',
      maxStock || '',
      normalizedSuppliers,
      startDate || '',
      endDate || '',
      manuallyModified || ''
    );
    
    // Try to get from cache
    const cached = productCache.get<{ products: any[]; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        products: cached.products,
        pagination: {
          page,
          limit,
          total: cached.total,
          pages: Math.ceil(cached.total / limit)
        }
      });
    }
    
    // Fetch from database with optimized query
    // Use select to only get needed fields
    // ترتيب ثابت: createdAt ثم _id لتفادي اختلاف ترتيب النتائج عند نفس الوقت (ظهور/اختفاء آخر منتج)
    const products = await Product.find(query)
      .select('name description images supplierPrice marketerPrice wholesalerPrice minimumSellingPrice isMinimumPriceMandatory stockQuantity isActive isApproved isRejected rejectionReason adminNotes approvedAt approvedBy rejectedAt rejectedBy isFulfilled isLocked lockedAt lockedBy lockReason sku weight dimensions tags createdAt categoryId supplierId hasVariants variants variantOptions metadata isMarketerPriceManuallyAdjusted')
      .populate('categoryId', 'name')
      .populate('supplierId', 'name companyName role')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // CRITICAL: Additional server-side validation for suppliers
    // Filter out any products that don't belong to the supplier (defensive check)
    // NOTE: This is a safety check - the query should already filter correctly
    let filteredProducts = products;
    if (user.role === 'supplier') {
      const userSupplierId = user._id.toString();
      filteredProducts = products.filter((product: any) => {
        // Handle both populated and non-populated supplierId
        let productSupplierId: string | null = null;
        if (product.supplierId) {
          if (typeof product.supplierId === 'object' && product.supplierId !== null) {
            // Populated supplierId (object with _id)
            productSupplierId = product.supplierId._id?.toString() || product.supplierId.toString();
          } else {
            // Non-populated supplierId (string/ObjectId)
            productSupplierId = product.supplierId.toString();
          }
        }
        
        const matches = productSupplierId === userSupplierId;
        if (!matches) {
          logger.warn('Product filtered out - supplier mismatch', {
            productId: product._id,
            productName: product.name,
            productSupplierId: productSupplierId,
            userSupplierId: userSupplierId,
            userEmail: user.email,
            supplierIdType: typeof product.supplierId,
            supplierIdValue: product.supplierId
          });
        }
        return matches;
      });
      
      // Log filtered results for debugging
      logger.debug('Supplier products filtered', {
        userId: user._id.toString(),
        userEmail: user.email,
        originalCount: products.length,
        filteredCount: filteredProducts.length,
        filteredProductIds: filteredProducts.map((p: any) => p._id),
        allProductSupplierIds: products.map((p: any) => {
          if (p.supplierId) {
            return typeof p.supplierId === 'object' ? p.supplierId._id?.toString() : p.supplierId.toString();
          }
          return null;
        })
      });
    }
    
    // Use estimatedDocumentCount for better performance if exact count not critical
    // Or use countDocuments with same query for accuracy
    // For suppliers, use filtered count instead of query count for accuracy
    const total = user.role === 'supplier' 
      ? filteredProducts.length 
      : await Product.countDocuments(query);
    
    // Transform products for frontend
    const transformedProducts = await Promise.all(filteredProducts.map(async (product: any) => {
      // Extract supplierId as string for consistent comparison
      let supplierIdString: string | null = null;
      if (product.supplierId) {
        if (typeof product.supplierId === 'object' && product.supplierId !== null) {
          supplierIdString = product.supplierId._id?.toString() || product.supplierId.toString();
        } else {
          supplierIdString = product.supplierId.toString();
        }
      }
      
      // Use the original supplierPrice from database directly
      // Only calculate if supplierPrice is truly missing (null/undefined) AND marketerPrice exists
      // Do NOT calculate if supplierPrice is 0 or any other value - use the stored value as-is
      let finalSupplierPrice = product.supplierPrice;
      
      // Only calculate if supplierPrice is completely missing (null/undefined), not if it's 0
      if ((finalSupplierPrice === null || finalSupplierPrice === undefined) && product.marketerPrice && product.marketerPrice > 0) {
        try {
          finalSupplierPrice = await settingsManager.calculateSupplierPriceFromMarketerPrice(product.marketerPrice);
        } catch (error) {
          logger.error('Error calculating supplierPrice from marketerPrice', error, {
            productId: product._id,
            marketerPrice: product.marketerPrice
          });
          // Keep original value if calculation fails
          finalSupplierPrice = product.supplierPrice;
        }
      } else {
        // Use the stored supplierPrice directly - this is the original value from database
        finalSupplierPrice = product.supplierPrice;
      }
      
      const baseProduct = {
        _id: product._id,
        name: product.name,
        description: product.description,
        images: product.images,
        supplierPrice: finalSupplierPrice, // This is now the original stored value
        marketerPrice: product.marketerPrice,
        wholesalerPrice: product.wholesalerPrice,
        minimumSellingPrice: product.minimumSellingPrice,
        isMinimumPriceMandatory: product.isMinimumPriceMandatory,
        isMarketerPriceManuallyAdjusted: product.isMarketerPriceManuallyAdjusted ?? false,
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
        isLocked: product.isLocked,
        lockedAt: product.lockedAt,
        lockedBy: product.lockedBy,
        lockReason: product.lockReason,
        categoryName: product.categoryId?.name,
        supplierId: supplierIdString, // Always return as string for consistent comparison
        sku: product.sku,
        weight: product.weight,
        dimensions: product.dimensions,
        tags: product.tags,
        createdAt: product.createdAt,
        // Product variants
        hasVariants: product.hasVariants || false,
        variants: product.variants || [],
        variantOptions: product.variantOptions || []
      };
      
      // Only include supplierName for admin and supplier roles
      if (user?.role === 'admin' || user?.role === 'supplier') {
        const rawSupplier = product.supplierId;
        const supplierName = (rawSupplier as any)?.role === 'admin'
          ? 'الإدارة'
          : (rawSupplier?.name || (rawSupplier as any)?.companyName || '');
        return {
          ...baseProduct,
          supplierName
        };
      }
      
      return baseProduct;
    }));
    
    // Cache the results
    productCache.set(cacheKey, { products: transformedProducts, total });
    
    return NextResponse.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching products', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب المنتجات');
  }
}

// POST /api/products - Create new product
async function createProduct(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    // Get system settings
    let settings;
    try {
      settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    } catch (error) {
      logger.warn('Failed to fetch system settings, using defaults', { error });
      settings = null;
    }
    
    // Use default settings if none exist
    const defaultSettings = {
      autoApproveProducts: false,
      requireProductImages: true,
      maxProductImages: 10,
      maxProductDescription: 2000
    };
    
    const currentSettings = settings || defaultSettings;
    
    const body = await req.json();
    
    // Sanitize input before validation
    const sanitizedBody = sanitizeObject({
      ...body,
      name: body.name ? sanitizeString(body.name, 200) : body.name,
      description: body.description ? sanitizeString(body.description, 2000) : body.description,
      sku: body.sku ? sanitizeString(body.sku, 100) : body.sku,
    });
    
    logger.apiRequest('POST', '/api/products', { userId: user._id, role: user.role });
    
    // Clean and prepare data
    const cleanData = {
      name: body.name?.trim(),
      description: body.description?.trim() || '',
      categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : null,
      // Fix: Use !== undefined && !== null instead of truthy check to handle 0 values correctly
      supplierPrice: (body.supplierPrice !== undefined && body.supplierPrice !== null) ? parseFloat(String(body.supplierPrice)) : undefined,
      marketerPrice: (body.marketerPrice !== undefined && body.marketerPrice !== null) ? parseFloat(String(body.marketerPrice)) : undefined, // Optional - will be calculated from supplierPrice
      wholesalerPrice: (body.wholesalerPrice !== undefined && body.wholesalerPrice !== null) ? parseFloat(String(body.wholesalerPrice)) : undefined,
      minimumSellingPrice: body.minimumSellingPrice && body.minimumSellingPrice > 0 ? parseFloat(String(body.minimumSellingPrice)) : null,
      isMinimumPriceMandatory: body.isMinimumPriceMandatory || false,
      stockQuantity: parseInt(body.stockQuantity) || 0,
      images: Array.isArray(body.images) ? body.images : [],
      sku: body.sku?.trim() || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      specifications: body.specifications || {},
      // Product variants
      hasVariants: body.hasVariants || false,
      variants: Array.isArray(body.variants) ? body.variants.map((variant: any) => ({
        _id: variant._id || crypto.randomUUID(),
        name: variant.name?.trim(),
        values: Array.isArray(variant.values) ? variant.values.map((val: string) => val.trim()) : [],
        valueDetails: Array.isArray(variant.valueDetails) ? variant.valueDetails.map((vd: any) => ({
          value: vd.value?.trim(),
          stockQuantity: vd.stockQuantity !== undefined ? parseInt(vd.stockQuantity) : undefined,
          customPrice: vd.customPrice !== undefined ? parseFloat(vd.customPrice) : undefined
        })) : undefined,
        isRequired: variant.isRequired || true,
        order: variant.order || 0,
        stockQuantity: variant.stockQuantity !== undefined ? parseInt(variant.stockQuantity) : undefined,
        customPrice: variant.customPrice !== undefined ? parseFloat(variant.customPrice) : undefined
      })) : [],
      variantOptions: Array.isArray(body.variantOptions) ? body.variantOptions.map((option: any) => ({
        variantId: option.variantId || crypto.randomUUID(),
        variantName: option.variantName?.trim(),
        value: option.value?.trim(),
        price: parseFloat(option.price) || 0,
        stockQuantity: parseInt(option.stockQuantity) || 0,
        sku: option.sku?.trim() || '',
        images: Array.isArray(option.images) ? option.images : []
      })) : []
    };
    
    
    // Validate input
    const productSchema = await getProductSchema();
    let validatedData;
    try {
      validatedData = productSchema.parse(cleanData);
    } catch (error: any) {
      if (error.errors) {
        // Check for supplierPrice validation error specifically
        const supplierPriceError = error.errors.find((e: any) => e.path.includes('supplierPrice'));
        if (supplierPriceError) {
          logger.error('supplierPrice validation failed', {
            supplierPrice: cleanData.supplierPrice,
            error: supplierPriceError.message,
            allErrors: error.errors
          });
          return NextResponse.json(
            { 
              success: false, 
              message: supplierPriceError.message || 'سعر المورد غير صحيح أو مفقود',
              errors: error.errors
            },
            { status: 400 }
          );
        }
        
        const wholesalerPriceError = error.errors.find((e: any) => e.path.includes('wholesalerPrice'));
        if (wholesalerPriceError) {
          // If wholesalerPrice validation fails, remove it and try again
          const cleanDataWithoutWholesaler = { ...cleanData };
          delete cleanDataWithoutWholesaler.wholesalerPrice;
          validatedData = productSchema.parse(cleanDataWithoutWholesaler);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
    
    // Additional validation: Ensure supplierPrice is present and valid after Zod validation
    if (!validatedData.supplierPrice || validatedData.supplierPrice <= 0 || isNaN(validatedData.supplierPrice)) {
      logger.error('supplierPrice is missing or invalid after validation', {
        supplierPrice: validatedData.supplierPrice,
        cleanDataSupplierPrice: cleanData.supplierPrice
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'سعر المورد غير صحيح أو مفقود. يرجى التأكد من إدخال قيمة صحيحة أكبر من 0'
        },
        { status: 400 }
      );
    }
    
    // Check if category exists (only if categoryId is provided)
    if (validatedData.categoryId) {
      const category = await Category.findById(validatedData.categoryId);
      if (!category) {
        return NextResponse.json(
          { success: false, message: 'الفئة غير موجودة' },
          { status: 400 }
        );
      }
    }
    
    // Always calculate marketerPrice from supplierPrice using current system settings
    // so new products use the correct admin profit margin (not a client-sent or stale value)
    let finalMarketerPrice: number;
    try {
      finalMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(validatedData.supplierPrice);
    } catch (err) {
      logger.error('Failed to calculate marketerPrice on product create', err, { supplierPrice: validatedData.supplierPrice });
      return NextResponse.json(
        { success: false, message: 'تعذر حساب سعر المسوق من إعدادات النظام. تحقق من الإعدادات المالية.' },
        { status: 500 }
      );
    }
    
    // Validate pricing logic
    if (validatedData.wholesalerPrice && validatedData.wholesalerPrice >= finalMarketerPrice) {
      return NextResponse.json(
        { success: false, message: 'سعر المسوق يجب أن يكون أكبر من سعر الجملة' },
        { status: 400 }
      );
    }
    
    // التحقق من السعر الأدنى فقط عند إدخال قيمة أكبر من 0 (الحقل اختياري)
    if (validatedData.minimumSellingPrice != null && validatedData.minimumSellingPrice > 0 && finalMarketerPrice >= validatedData.minimumSellingPrice) {
      return NextResponse.json(
        { success: false, message: 'إذا أدخلت سعراً أدنى فيجب أن يكون أكبر من سعر المسوق' },
        { status: 400 }
      );
    }
    
    // Generate SKU for product if not provided
    let productSKU = validatedData.sku?.trim() || '';
    if (!productSKU) {
      productSKU = await generateProductSKU();
      logger.debug('Auto-generated product SKU', { productSKU });
    } else {
      // Validate provided SKU is unique
      const skuIsUnique = await isSKUUnique(productSKU);
      if (!skuIsUnique) {
        return NextResponse.json(
          { success: false, message: 'رمز SKU المحدد مستخدم بالفعل. يرجى اختيار رمز آخر أو ترك الحقل فارغاً لتوليد تلقائي' },
          { status: 400 }
        );
      }
    }
    
    // Generate SKUs for variant options if product has variants
    let variantOptionsWithSKU = validatedData.variantOptions || [];
    if (validatedData.hasVariants && variantOptionsWithSKU.length > 0) {
      const skuMap = await generateVariantOptionSKUs(productSKU, variantOptionsWithSKU);
      
      // Map SKUs to variant options
      variantOptionsWithSKU = variantOptionsWithSKU.map(option => {
        const skuEntry = skuMap.find(s => s.variantId === option.variantId);
        return {
          ...option,
          sku: skuEntry?.sku || option.sku || ''
        };
      });
      
      logger.debug('Auto-generated variant option SKUs', { 
        productSKU, 
        variantOptionsCount: variantOptionsWithSKU.length 
      });
    }
    
    // Calculate variant option prices from supplier price if needed
    let variantOptionsWithPrices = variantOptionsWithSKU;
    if (validatedData.hasVariants && variantOptionsWithPrices.length > 0) {
      variantOptionsWithPrices = await Promise.all(variantOptionsWithPrices.map(async (option) => {
        // If option has a price, use it; otherwise calculate from supplier price
        if (option.price && option.price > 0) {
          return option;
        }
        // Calculate marketer price for variant from supplier price
        // For variants, we use the product's supplier price as base
        const variantMarketerPrice = await settingsManager.calculateMarketerPriceFromSupplierPrice(validatedData.supplierPrice);
        return {
          ...option,
          price: variantMarketerPrice
        };
      }));
    }
    
    // عند عدم اختيار مورد من الأدمن: تسجيل المنتج للإدارة (أول مستخدم admin) وليس باسم الموظف
    let resolvedSupplierId = user._id;
    if (user.role === 'supplier') {
      resolvedSupplierId = user._id;
    } else if (body.supplierId && String(body.supplierId).trim()) {
      resolvedSupplierId = body.supplierId;
    } else {
      const User = (await import('@/models/User')).default;
      const adminUser = await User.findOne({ role: 'admin' }).select('_id').lean() as { _id: unknown } | null;
      if (adminUser) resolvedSupplierId = adminUser._id;
    }

    // Create product data
    const productData: any = {
      name: validatedData.name,
      description: validatedData.description,
      marketingText: validatedData.marketingText,
      categoryId: validatedData.categoryId,
      supplierId: resolvedSupplierId,
      supplierPrice: validatedData.supplierPrice, // CRITICAL: This must be present
      marketerPrice: finalMarketerPrice,
      minimumSellingPrice: validatedData.minimumSellingPrice != null && validatedData.minimumSellingPrice > 0 ? validatedData.minimumSellingPrice : null,
      isMinimumPriceMandatory: validatedData.isMinimumPriceMandatory,
      // stockQuantity: If hasVariants=true, this should be the sum of all variant option stock quantities
      // If hasVariants=false, this is the main stock quantity field value
      stockQuantity: validatedData.stockQuantity,
      images: validatedData.images,
      sku: productSKU,
      tags: validatedData.tags || [],
      specifications: validatedData.specifications || {},
      // Product variants
      hasVariants: validatedData.hasVariants,
      variants: validatedData.variants || [],
      variantOptions: variantOptionsWithPrices,
      isApproved: user.role === 'admin' ? true : (currentSettings.autoApproveProducts || false),
      isActive: true,
      isFulfilled: false,
      isLocked: false // New field
    };
    
    // Only include wholesalerPrice if it's provided
    if (validatedData.wholesalerPrice !== undefined && validatedData.wholesalerPrice !== null) {
      productData.wholesalerPrice = validatedData.wholesalerPrice;
    }
    
    // Final safety check: Ensure supplierPrice is present before saving
    if (!productData.supplierPrice || productData.supplierPrice <= 0 || isNaN(productData.supplierPrice)) {
      logger.error('supplierPrice is missing or invalid right before saving to database', {
        productDataSupplierPrice: productData.supplierPrice,
        validatedSupplierPrice: validatedData.supplierPrice,
        cleanDataSupplierPrice: cleanData.supplierPrice,
        bodySupplierPrice: body.supplierPrice
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'خطأ حرج: سعر المورد مفقود قبل الحفظ. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.'
        },
        { status: 500 }
      );
    }
    
    const product = await Product.create(productData);
    
    logger.business('Product created', {
      productId: product._id.toString(),
      productName: product.name,
      supplierId: product.supplierId.toString(),
      isApproved: product.isApproved,
      userId: user._id.toString(),
      supplierPrice: product.supplierPrice
    });
    
    // Populate category and supplier info
    await product.populate('categoryId', 'name');
    await product.populate('supplierId', 'name companyName');
    
    // Send notification to admins with products.approve permission if supplier created the product
    if (user.role === 'supplier') {
      try {
        const { sendNotificationToAdminsWithPermission } = await import('@/lib/notifications');
        await sendNotificationToAdminsWithPermission(
          'products.approve',
          {
            title: 'منتج جديد للمراجعة',
            message: `تم إضافة منتج جديد "${product.name}" من قبل ${user.name}`,
            type: 'info',
            actionUrl: `/dashboard/products/${product._id}`,
            metadata: { 
              productId: product._id.toString(),
              supplierId: user._id.toString(),
              supplierName: user.name
            }
          }
        );
      } catch (error) {
        logger.error('Error sending notifications to admins', error, {
          productId: product._id.toString(),
          userId: user._id
        });
      }
    }
    
    // Get product as plain object to ensure all fields are accessible
    const productObject = product.toObject ? product.toObject() : product;
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة المنتج بنجاح' + (user.role === 'supplier' ? ' وسيتم مراجعته من قبل الإدارة' : ''),
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        images: product.images,
        // Fix: Use productObject to ensure supplierPrice is accessible
        supplierPrice: productObject.supplierPrice || product.supplierPrice,
        marketerPrice: product.marketerPrice,
        wholesalerPrice: product.wholesalerPrice,
        minimumSellingPrice: product.minimumSellingPrice,
        isMinimumPriceMandatory: product.isMinimumPriceMandatory,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        isApproved: product.isApproved,
        isFulfilled: product.isFulfilled,
        isLocked: product.isLocked,
        categoryName: product.categoryId?.name,
        supplierName: product.supplierId?.name || product.supplierId?.companyName,
        sku: product.sku,
        weight: product.weight,
        dimensions: product.dimensions,
        tags: product.tags,
        createdAt: product.createdAt
      }
    }, { status: 201 });
    
    // Invalidate product cache and stats cache after creating
    productCache.clearPattern('products');
    const { statsCache } = require('@/lib/cache');
    statsCache.clear();
    
    logger.apiResponse('POST', '/api/products', 201);
  } catch (error) {
    logger.error('Error creating product', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إضافة المنتج', { userId: user._id });
  }
}

// Export handlers with role-based access
export const GET = withAuth(getProducts);
export const POST = withRole(['supplier', 'admin'])(createProduct); 