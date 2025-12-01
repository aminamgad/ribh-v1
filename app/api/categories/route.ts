import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Category from '@/models/Category';
import { z } from 'zod';
import { handleApiError, safeLogError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { categoryCache, generateCacheKey } from '@/lib/cache';

const categorySchema = z.object({
  name: z.string().min(2, 'اسم الفئة يجب أن يكون حرفين على الأقل'),
  nameEn: z.string().optional().or(z.string().min(2, 'اسم الفئة بالإنجليزية يجب أن يكون حرفين على الأقل')),
  description: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  icon: z.string().optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  showInHome: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional()
});

// GET /api/categories - Get categories
async function getCategories(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    const parent = searchParams.get('parent');
    const featured = searchParams.get('featured');
    const includeInactive = searchParams.get('includeInactive');
    const showInMenu = searchParams.get('showInMenu');
    const showInHome = searchParams.get('showInHome');
    const tree = searchParams.get('tree'); // Get full tree structure
    const withStats = searchParams.get('withStats'); // Include product counts
    
    let query: any = {};
    
    // Only filter by active status if not explicitly including inactive
    if (active === 'true') {
      query.isActive = true;
    } else if (includeInactive !== 'true' && user?.role !== 'admin') {
      query.isActive = true;
    }
    
    if (parent === 'null' || parent === '') {
      query.parentId = { $in: [null, undefined] };
    } else if (parent) {
      query.parentId = parent;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    if (showInMenu === 'true') {
      query.showInMenu = true;
    }
    
    if (showInHome === 'true') {
      query.showInHome = true;
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(
      'categories',
      active || '',
      parent || '',
      featured || '',
      showInMenu || '',
      showInHome || '',
      tree || '',
      withStats || ''
    );
    
    // Try to get from cache
    const cached = categoryCache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        categories: cached
      });
    }
    
    // If tree is requested, use aggregation for better performance
    if (tree === 'true') {
      const Product = (await import('@/models/Product')).default;
      const categoryTree = await Category.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: 'parentId',
            as: 'subcategories'
          }
        },
        ...(withStats === 'true' ? [{
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'categoryId',
            pipeline: [
              { $match: { isActive: true, isApproved: true } },
              { $count: 'count' }
            ],
            as: 'productStats'
          }
        }, {
          $addFields: {
            productCount: { $ifNull: [{ $arrayElemAt: ['$productStats.count', 0] }, 0] }
          }
        }] : []),
        { $sort: { order: 1, name: 1 } }
      ]);
      
      // Cache the tree result
      categoryCache.set(cacheKey, categoryTree);
      
      return NextResponse.json({
        success: true,
        categories: categoryTree
      });
    }
    
    const categories = await Category.find(query)
      .populate('parentId', 'name')
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get product counts if requested
    let productCounts: Record<string, number> = {};
    if (withStats === 'true') {
      const Product = (await import('@/models/Product')).default;
      const counts = await Product.aggregate([
        { $match: { isActive: true, isApproved: true, categoryId: { $exists: true, $ne: null } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } }
      ]);
      
      counts.forEach((item: any) => {
        productCounts[item._id.toString()] = item.count;
      });
    }
    
    // For hierarchical view, organize categories with subcategories
    const parentCategories = categories.filter(cat => !cat.parentId);
    const subcategories = categories.filter(cat => cat.parentId);
    
    // Attach subcategories to their parents
    const categoriesWithSubs = parentCategories.map(parent => {
      const subs = subcategories.filter(sub => 
        sub.parentId && String(sub.parentId._id) === String(parent._id)
      );
      return {
        ...parent,
        productCount: withStats === 'true' ? (productCounts[(parent as any)._id?.toString()] || 0) : (parent.productCount || 0),
        subcategories: subs.map(sub => ({
          _id: sub._id,
          name: sub.name,
          nameEn: sub.nameEn,
          description: sub.description,
          image: sub.image,
          images: sub.images || [],
          icon: sub.icon,
          parentId: sub.parentId._id,
          parentName: parent.name,
          order: sub.order,
          isActive: sub.isActive,
          featured: sub.featured,
          slug: sub.slug,
          productCount: withStats === 'true' ? (productCounts[(sub as any)._id?.toString()] || 0) : (sub.productCount || 0),
          showInMenu: sub.showInMenu,
          showInHome: sub.showInHome
        }))
      };
    });
    
    // Transform categories for frontend
    const transformedCategories = (categoriesWithSubs as any[]).map(category => ({
      _id: category._id,
      name: category.name,
      nameEn: category.nameEn,
      description: category.description,
      image: category.image,
      images: category.images || [],
      icon: category.icon,
      parentId: category.parentId,
      order: category.order,
      isActive: category.isActive,
      featured: category.featured,
      slug: category.slug,
      productCount: category.productCount || 0,
      level: category.level || 0,
      showInMenu: category.showInMenu !== false,
      showInHome: category.showInHome || false,
      subcategories: category.subcategories || []
    }));
    
    // Cache the results
    categoryCache.set(cacheKey, transformedCategories);
    
    return NextResponse.json({
      success: true,
      categories: transformedCategories
    });
  } catch (error) {
    safeLogError(error, 'Get Categories API', { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب الفئات', { userId: user?._id });
  }
}

// POST /api/categories - Create new category
async function createCategory(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    logger.apiRequest('POST', '/api/categories', { userId: user._id, role: user.role });
    
    const body = await req.json();
    logger.debug('Creating category', { body });
    
    // Clean the data before validation
    const cleanData = {
      ...body,
      parentId: body.parentId === '' ? undefined : body.parentId,
      order: typeof body.order === 'string' ? parseInt(body.order) || 0 : body.order || 0,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
    };
    
    // Validate input
    const validatedData = categorySchema.parse(cleanData);
    
    // Check if parent category exists
    if (validatedData.parentId) {
      const parentCategory = await Category.findById(validatedData.parentId);
      if (!parentCategory) {
        return NextResponse.json(
          { success: false, message: 'الفئة الأب غير موجودة' },
          { status: 400 }
        );
      }
    }
    
    // Check if category name already exists at the same level
    const existingQuery: any = { name: validatedData.name };
    if (validatedData.parentId) {
      existingQuery.parentId = validatedData.parentId;
    } else {
      existingQuery.parentId = { $in: [null, undefined] };
    }
    
    const existingCategory = await Category.findOne(existingQuery);
    
    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: 'اسم الفئة موجود بالفعل في نفس المستوى' },
        { status: 400 }
      );
    }

    // Generate slug
    let slug = validatedData.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let uniqueSlug = slug;
    let counter = 2;
    while (await Category.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    
    // Create category
    const categoryData: any = {
      name: validatedData.name,
      nameEn: validatedData.nameEn || '',
      description: validatedData.description || '',
      image: validatedData.image || '',
      images: validatedData.images || [],
      icon: validatedData.icon || '',
      parentId: validatedData.parentId || null,
      order: validatedData.order || 0,
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      featured: validatedData.featured || false,
      showInMenu: validatedData.showInMenu !== undefined ? validatedData.showInMenu : true,
      showInHome: validatedData.showInHome || false,
      metaTitle: validatedData.metaTitle || '',
      metaDescription: validatedData.metaDescription || '',
      seoKeywords: validatedData.seoKeywords || [],
      slug: uniqueSlug
    };
    
    const category = await Category.create(categoryData);
    
    // Invalidate category cache and stats cache
    categoryCache.clear();
    const { statsCache } = require('@/lib/cache');
    statsCache.clear();
    
    // Populate the parent if exists
    if (category.parentId) {
      await category.populate('parentId', 'name');
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة الفئة بنجاح',
      category: {
        _id: category._id,
        name: category.name,
        nameEn: category.nameEn,
        description: category.description,
        image: category.image,
        images: category.images || [],
        icon: category.icon,
        parentId: category.parentId?._id || category.parentId,
        parentName: category.parentId?.name,
        order: category.order,
        isActive: category.isActive,
        featured: category.featured,
        showInMenu: category.showInMenu,
        showInHome: category.showInHome,
        slug: category.slug,
        productCount: category.productCount || 0
      }
    }, { status: 201 });
  } catch (error) {
    safeLogError(error, 'Create Category API', { userId: user._id });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return handleApiError(error, 'حدث خطأ أثناء إضافة الفئة', { userId: user._id });
  }
}

// Export handlers with role-based access
export const GET = withAuth(getCategories);
export const POST = withRole(['admin'])(createCategory); 