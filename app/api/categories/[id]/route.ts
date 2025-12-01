import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { z } from 'zod';
import { handleApiError, safeLogError } from '@/lib/error-handler';
import { isValidObjectId } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { categoryCache } from '@/lib/cache';

const categoryUpdateSchema = z.object({
  name: z.string().min(2, 'اسم الفئة يجب أن يكون حرفين على الأقل').optional(),
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

interface RouteParams {
  params: Promise<{ id: string }> | { id: string };
}

// GET /api/categories/[id] - Get specific category
async function getCategory(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  try {
    await connectDB();
    
    // Handle both Promise and direct params (Next.js 14 compatibility)
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'معرف الفئة غير صحيح' },
        { status: 400 }
      );
    }
    
    const category = await Category.findById(categoryId)
      .populate('parentId', 'name')
      .lean();
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Get subcategories
    const subcategories = await Category.find({ parentId: categoryId })
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get product count (active and approved only)
    const productCount = await Product.countDocuments({ 
      categoryId: categoryId,
      isActive: true,
      isApproved: true
    });
    
    // Get breadcrumb - simplified to avoid aggregation issues
    const breadcrumb: any[] = [];
    let currentCategory: any = category;
    while (currentCategory?.parentId) {
      const parent = await Category.findById(currentCategory.parentId).lean();
      if (parent) {
        breadcrumb.unshift(parent);
        currentCategory = parent;
      } else {
        break;
      }
    }
    
    return NextResponse.json({
      success: true,
      category: {
        ...category,
        subcategories,
        productCount,
        breadcrumb
      }
    });
  } catch (error) {
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    safeLogError(error, 'Get Category API', { categoryId });
    return handleApiError(error, 'حدث خطأ أثناء جلب الفئة');
  }
}

// PUT /api/categories/[id] - Update category
async function updateCategory(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  try {
    await connectDB();
    
    // Handle both Promise and direct params (Next.js 14 compatibility)
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'معرف الفئة غير صحيح' },
        { status: 400 }
      );
    }
    
    logger.apiRequest('PUT', `/api/categories/${categoryId}`, { userId: user._id, role: user.role });
    
    const body = await req.json();
    logger.debug('Updating category', { categoryId, body });
    
    // Clean the data before validation
    const cleanData = {
      ...body,
      parentId: body.parentId === '' ? null : body.parentId,
      order: typeof body.order === 'string' ? parseInt(body.order) || 0 : body.order,
    };
    
    // Validate input
    const validatedData = categoryUpdateSchema.parse(cleanData);
    
    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Check if parent category exists and prevent circular reference
    if (validatedData.parentId) {
      if (validatedData.parentId === categoryId) {
        return NextResponse.json(
          { success: false, message: 'لا يمكن أن تكون الفئة أباً لنفسها' },
          { status: 400 }
        );
      }
      
      // Validate parent ID format
      if (!isValidObjectId(validatedData.parentId)) {
        return NextResponse.json(
          { success: false, message: 'معرف الفئة الأب غير صحيح' },
          { status: 400 }
        );
      }
      
      const parentCategory = await Category.findById(validatedData.parentId);
      if (!parentCategory) {
        return NextResponse.json(
          { success: false, message: 'الفئة الأب غير موجودة' },
          { status: 400 }
        );
      }
      
      // Check if the parent is a child of this category (prevent circular reference)
      if (parentCategory.parentId && parentCategory.parentId.toString() === categoryId) {
        return NextResponse.json(
          { success: false, message: 'لا يمكن إنشاء مرجع دائري بين الفئات' },
          { status: 400 }
        );
      }
      
      // Check deeper circular references
      let checkParent: any = parentCategory;
      const visited = new Set([categoryId]);
      while (checkParent?.parentId) {
        const parentIdStr = checkParent.parentId.toString();
        if (visited.has(parentIdStr)) {
          return NextResponse.json(
            { success: false, message: 'لا يمكن إنشاء مرجع دائري بين الفئات' },
            { status: 400 }
          );
        }
        visited.add(parentIdStr);
        if (parentIdStr === categoryId) {
          return NextResponse.json(
            { success: false, message: 'لا يمكن إنشاء مرجع دائري بين الفئات' },
            { status: 400 }
          );
        }
        checkParent = await Category.findById(checkParent.parentId).lean();
        if (!checkParent) break;
      }
    }
    
    // Check if name already exists at the same level (if name is being changed)
    if (validatedData.name && validatedData.name !== category.name) {
      const existingQuery: any = { 
        name: validatedData.name,
        _id: { $ne: categoryId }
      };
      
      if (validatedData.parentId !== undefined) {
        if (validatedData.parentId) {
          existingQuery.parentId = validatedData.parentId;
        } else {
          existingQuery.parentId = { $in: [null, undefined] };
        }
      } else {
        // Use current parent if not changing
        if (category.parentId) {
          existingQuery.parentId = category.parentId;
        } else {
          existingQuery.parentId = { $in: [null, undefined] };
        }
      }
      
      const existingCategory = await Category.findOne(existingQuery);
      if (existingCategory) {
        return NextResponse.json(
          { success: false, message: 'اسم الفئة موجود بالفعل في نفس المستوى' },
          { status: 400 }
        );
      }
    }
    
    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $set: validatedData },
      { new: true, runValidators: true }
    ).populate('parentId', 'name');
    
    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Invalidate category cache
    categoryCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      category: {
        _id: updatedCategory._id,
        name: updatedCategory.name,
        nameEn: updatedCategory.nameEn,
        description: updatedCategory.description,
        image: updatedCategory.image,
        images: updatedCategory.images || [],
        icon: updatedCategory.icon,
        parentId: updatedCategory.parentId?._id || updatedCategory.parentId,
        parentName: updatedCategory.parentId?.name,
        order: updatedCategory.order,
        isActive: updatedCategory.isActive,
        featured: updatedCategory.featured,
        showInMenu: updatedCategory.showInMenu,
        showInHome: updatedCategory.showInHome,
        metaTitle: updatedCategory.metaTitle,
        metaDescription: updatedCategory.metaDescription,
        seoKeywords: updatedCategory.seoKeywords || [],
        slug: updatedCategory.slug,
        productCount: await Product.countDocuments({ 
          categoryId: categoryId,
          isActive: true,
          isApproved: true
        })
      }
    });
  } catch (error) {
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    safeLogError(error, 'Update Category API', { categoryId });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return handleApiError(error, 'حدث خطأ أثناء تحديث الفئة', { categoryId });
  }
}

// DELETE /api/categories/[id] - Delete category
async function deleteCategory(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as RouteParams;
  try {
    await connectDB();
    
    // Handle both Promise and direct params (Next.js 14 compatibility)
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(categoryId)) {
      return NextResponse.json(
        { success: false, message: 'معرف الفئة غير صحيح' },
        { status: 400 }
      );
    }
    
    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Check if category has subcategories
    const subcategoriesCount = await Category.countDocuments({ parentId: categoryId });
    if (subcategoriesCount > 0) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف فئة تحتوي على فئات فرعية' },
        { status: 400 }
      );
    }
    
    // Check if category has products
    const productsCount = await Product.countDocuments({ categoryId: categoryId });
    if (productsCount > 0) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف فئة تحتوي على منتجات' },
        { status: 400 }
      );
    }
    
    // Delete the category
    await Category.findByIdAndDelete(categoryId);
    
    // Invalidate category cache and stats cache
    categoryCache.clear();
    const { statsCache } = require('@/lib/cache');
    statsCache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    const params = 'then' in routeParams.params ? await routeParams.params : routeParams.params;
    const categoryId = params.id;
    safeLogError(error, 'Delete Category API', { categoryId });
    return handleApiError(error, 'حدث خطأ أثناء حذف الفئة', { categoryId });
  }
}

// Export handlers with role-based access
export const GET = withAuth(getCategory);
export const PUT = withRole(['admin'])(updateCategory);
export const DELETE = withRole(['admin'])(deleteCategory); 