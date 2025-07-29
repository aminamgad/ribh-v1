import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Category from '@/models/Category';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(2, 'اسم الفئة يجب أن يكون حرفين على الأقل'),
  nameEn: z.string().optional().or(z.string().min(2, 'اسم الفئة بالإنجليزية يجب أن يكون حرفين على الأقل')),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().min(0).optional(),
  isActive: z.boolean().optional()
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
    
    const categories = await Category.find(query)
      .populate('parentId', 'name')
      .sort({ order: 1, name: 1 })
      .lean();
    
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
        subcategories: subs.map(sub => ({
          _id: sub._id,
          name: sub.name,
          nameEn: sub.nameEn,
          description: sub.description,
          image: sub.image,
          parentId: sub.parentId._id,
          parentName: parent.name,
          order: sub.order,
          isActive: sub.isActive,
          slug: sub.slug,
          productCount: sub.productCount || 0
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
      parentId: category.parentId,
      order: category.order,
      isActive: category.isActive,
      slug: category.slug,
      productCount: category.productCount || 0,
      subcategories: category.subcategories || []
    }));
    
    return NextResponse.json({
      success: true,
      categories: transformedCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الفئات', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
async function createCategory(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    console.log('Creating category with data:', body);
    
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
    
    // Create category
    const categoryData = {
      name: validatedData.name,
      nameEn: validatedData.nameEn || '',
      description: validatedData.description || '',
      image: validatedData.image || '',
      parentId: validatedData.parentId || null,
      order: validatedData.order || 0,
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : true
    };
    
    const category = await Category.create(categoryData);
    
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
        parentId: category.parentId?._id || category.parentId,
        parentName: category.parentId?.name,
        order: category.order,
        isActive: category.isActive,
        slug: category.slug
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إضافة الفئة', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Export handlers with role-based access
export const GET = withAuth(getCategories);
export const POST = withRole(['admin'])(createCategory); 