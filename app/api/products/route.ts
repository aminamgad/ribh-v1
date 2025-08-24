import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SystemSettings from '@/models/SystemSettings';
import { z } from 'zod';

// Dynamic product schema based on system settings
async function getProductSchema() {
  let settings;
  try {
    settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
  } catch (error) {
    console.warn('Failed to fetch system settings in schema, using defaults:', error);
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
  const maxProductDescription = currentSettings.maxProductDescription || 2000;
  const requireProductImages = currentSettings.requireProductImages !== false; // Default true
  
  return z.object({
    name: z.string().min(3, 'اسم المنتج يجب أن يكون 3 أحرف على الأقل'),
    description: z.string()
      .optional()
      .refine((val) => !val || val.length >= 10, 'وصف المنتج يجب أن يكون 10 أحرف على الأقل')
      .refine((val) => !val || val.length <= maxProductDescription, `وصف المنتج لا يمكن أن يتجاوز ${maxProductDescription} حرف`),
    categoryId: z.string().optional().nullable(),
    marketerPrice: z.number().min(0.01, 'سعر المسوق يجب أن يكون أكبر من 0'),
    wholesalerPrice: z.number().min(0.01, 'سعر الجملة يجب أن يكون أكبر من 0'),
    minimumSellingPrice: z.number().min(0.01, 'السعر الأدنى للبيع يجب أن يكون أكبر من 0').optional(),
    isMinimumPriceMandatory: z.boolean().default(false),
    stockQuantity: z.number().min(0, 'الكمية يجب أن تكون 0 أو أكثر'),
    images: requireProductImages 
      ? z.array(z.string()).min(1, 'يجب إضافة صورة واحدة على الأقل').max(maxProductImages, `لا يمكن إضافة أكثر من ${maxProductImages} صور`)
      : z.array(z.string()).max(maxProductImages, `لا يمكن إضافة أكثر من ${maxProductImages} صور`),
    sku: z.string().optional(),
    weight: z.number().min(0).optional().nullable(),
    dimensions: z.object({
      length: z.number().min(0).optional().nullable(),
      width: z.number().min(0).optional().nullable(),
      height: z.number().min(0).optional().nullable()
    }).optional().nullable(),
    tags: z.array(z.string()).optional(),
    specifications: z.record(z.any()).optional(),
    // Product variants
    hasVariants: z.boolean().default(false),
    variants: z.array(z.object({
      _id: z.string(),
      name: z.string(),
      values: z.array(z.string()),
      isRequired: z.boolean().default(true),
      order: z.number().default(0)
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
    
    // Test database connection and get product count
    const totalProductCount = await Product.countDocuments({});
    console.log('📊 Total products in database:', totalProductCount);
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    
    let query: any = {};
    
    // Role-based filtering
    if (user.role === 'supplier') {
      query.supplierId = user._id;
    }
    
    // Additional filters
    if (category) {
      query.categoryId = category;
    }
    
    // Build search conditions
    let searchConditions = [];
    if (search) {
      searchConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      );
    }
    
    if (status === 'approved') {
      query.isApproved = true;
      query.isRejected = false;
    } else if (status === 'pending') {
      query.isApproved = false;
      query.isRejected = false;
    } else if (status === 'rejected') {
      query.isRejected = true;
    }
    
    // For marketers and wholesalers, only show approved products
    if (user.role === 'marketer' || user.role === 'wholesaler') {
      query.isApproved = true;
      // نسمح بالمنتجات التي لم يتم رفضها أو isRejected = false أو undefined
      searchConditions.push(
        { isRejected: false },
        { isRejected: { $exists: false } }
      );
      // Exclude locked products for marketers and wholesalers
      query.isLocked = { $ne: true };
      // لا نضيف فلتر isActive هنا - نترك المسوق يرى جميع المنتجات المعتمدة
      // query.isActive = true;
      // لا نضيف فلتر المخزون هنا - نترك المسوق يرى جميع المنتجات المعتمدة
      // query.stockQuantity = { $gt: 0 };
    }
    
    // Combine search conditions with main query
    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }
    
    console.log('🔍 Final query:', JSON.stringify(query, null, 2));
    console.log('👤 User role:', user.role);
    console.log('👤 User ID:', user._id);
    
    // Test: Check if user's products exist
    if (user.role === 'supplier') {
      const userProductCount = await Product.countDocuments({ supplierId: user._id });
      console.log('📊 User products count:', userProductCount);
    }
    
    const skip = (page - 1) * limit;
    
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Product.countDocuments(query);
    
    // Transform products for frontend
    const transformedProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      description: product.description,
      images: product.images,
      marketerPrice: product.marketerPrice,
      wholesalerPrice: product.wholesalerPrice,
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
      supplierName: product.supplierId?.name || product.supplierId?.companyName,
      sku: product.sku,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      createdAt: product.createdAt
    }));
    
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
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المنتجات', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
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
      console.warn('Failed to fetch system settings, using defaults:', error);
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
    console.log('Creating product with data:', body);
    
    // Clean and prepare data
    const cleanData = {
      name: body.name?.trim(),
      description: body.description?.trim() || '',
      categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : null,
      marketerPrice: parseFloat(body.marketerPrice) || 0,
      wholesalerPrice: parseFloat(body.wholesalerPrice) || 0,
      minimumSellingPrice: body.minimumSellingPrice && body.minimumSellingPrice > 0 ? parseFloat(body.minimumSellingPrice) : null,
      isMinimumPriceMandatory: body.isMinimumPriceMandatory || false,
      stockQuantity: parseInt(body.stockQuantity) || 0,
      images: Array.isArray(body.images) ? body.images : [],
      sku: body.sku?.trim() || '',
      weight: body.weight ? parseFloat(body.weight) : null,
      dimensions: body.dimensions ? {
        length: body.dimensions.length ? parseFloat(body.dimensions.length) : null,
        width: body.dimensions.width ? parseFloat(body.dimensions.width) : null,
        height: body.dimensions.height ? parseFloat(body.dimensions.height) : null
      } : null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      specifications: body.specifications || {},
      // Product variants
      hasVariants: body.hasVariants || false,
      variants: Array.isArray(body.variants) ? body.variants.map((variant: any) => ({
        _id: variant._id || crypto.randomUUID(),
        name: variant.name?.trim(),
        values: Array.isArray(variant.values) ? variant.values.map((val: string) => val.trim()) : [],
        isRequired: variant.isRequired || true,
        order: variant.order || 0
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
    const validatedData = productSchema.parse(cleanData);
    
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
    
    // Validate pricing logic
    if (validatedData.wholesalerPrice >= validatedData.marketerPrice) {
      return NextResponse.json(
        { success: false, message: 'سعر المسوق يجب أن يكون أكبر من سعر الجملة' },
        { status: 400 }
      );
    }
    
    if (validatedData.minimumSellingPrice && validatedData.marketerPrice >= validatedData.minimumSellingPrice) {
      return NextResponse.json(
        { success: false, message: 'السعر الأدنى للبيع يجب أن يكون أكبر من سعر المسوق' },
        { status: 400 }
      );
    }
    
    // Create product data
    const productData = {
      name: validatedData.name,
      description: validatedData.description,
      categoryId: validatedData.categoryId,
      supplierId: user.role === 'supplier' ? user._id : (body.supplierId || user._id), // Admin can create for themselves or specify supplier
      marketerPrice: validatedData.marketerPrice,
      wholesalerPrice: validatedData.wholesalerPrice,
      minimumSellingPrice: validatedData.minimumSellingPrice,
      isMinimumPriceMandatory: validatedData.isMinimumPriceMandatory,
      stockQuantity: validatedData.stockQuantity,
      images: validatedData.images,
      sku: validatedData.sku || '',
      weight: validatedData.weight,
      dimensions: validatedData.dimensions,
      tags: validatedData.tags || [],
      specifications: validatedData.specifications || {},
      // Product variants
      hasVariants: validatedData.hasVariants,
      variants: validatedData.variants || [],
      variantOptions: validatedData.variantOptions || [],
      isApproved: user.role === 'admin' ? true : (currentSettings.autoApproveProducts || false),
      isActive: true,
      isFulfilled: false,
      isLocked: false // New field
    };
    
    console.log('Final product data:', {
      ...productData,
      supplierId: productData.supplierId.toString(),
      userRole: user.role,
      userId: user._id.toString()
    });
    
    const product = await Product.create(productData);
    
    console.log('✅ Product created successfully:', {
      id: product._id,
      name: product.name,
      supplierId: product.supplierId,
      isApproved: product.isApproved,
      isActive: product.isActive
    });
    
    // Populate category and supplier info
    await product.populate('categoryId', 'name');
    await product.populate('supplierId', 'name companyName');
    
    // Send notification to admins if supplier created the product
    if (user.role === 'supplier') {
      try {
        // Get all admin users
        const User = (await import('@/models/User')).default;
        const adminUsers = await User.find({ role: 'admin' }).select('_id name').lean();
        
        // Create notification for each admin
        const Notification = (await import('@/models/Notification')).default;
        const notificationPromises = adminUsers.map(admin => 
          Notification.create({
            userId: admin._id,
            title: 'منتج جديد للمراجعة',
            message: `تم إضافة منتج جديد "${product.name}" من قبل ${user.name}`,
            type: 'info',
            actionUrl: `/dashboard/products/${product._id}`,
            metadata: { 
              productId: product._id,
              supplierId: user._id,
              supplierName: user.name
            }
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`✅ Notifications sent to ${adminUsers.length} admin users for new product: ${product.name}`);
        
      } catch (error) {
        console.error('❌ Error sending notifications to admins:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة المنتج بنجاح' + (user.role === 'supplier' ? ' وسيتم مراجعته من قبل الإدارة' : ''),
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        images: product.images,
        marketerPrice: product.marketerPrice,
        wholesalerPrice: product.wholesalerPrice,
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
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message, errors: error.errors },
        { status: 400 }
      );
    }
    
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { success: false, message: 'SKU موجود بالفعل. يرجى استخدام SKU مختلف' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إضافة المنتج', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Export handlers with role-based access
export const GET = withAuth(getProducts);
export const POST = withRole(['supplier', 'admin'])(createProduct); 