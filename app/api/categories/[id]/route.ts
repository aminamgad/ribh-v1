import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth';
import connectDB from '@/lib/database';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { z } from 'zod';

const categoryUpdateSchema = z.object({
  name: z.string().min(2, 'اسم الفئة يجب أن يكون حرفين على الأقل').optional(),
  nameEn: z.string().optional().or(z.string().min(2, 'اسم الفئة بالإنجليزية يجب أن يكون حرفين على الأقل')),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().min(0).optional(),
  isActive: z.boolean().optional()
});

interface RouteParams {
  params: { id: string };
}

// GET /api/categories/[id] - Get specific category
async function getCategory(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    const category = await Category.findById(params.id)
      .populate('parentId', 'name')
      .lean();
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Get subcategories
    const subcategories = await Category.find({ parentId: params.id })
      .sort({ order: 1, name: 1 })
      .lean();
    
    // Get product count
    const productCount = await Product.countDocuments({ categoryId: params.id });
    
    return NextResponse.json({
      success: true,
      category: {
        ...category,
        subcategories,
        productCount
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب الفئة' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update category
async function updateCategory(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    const body = await req.json();
    console.log('Updating category with data:', body);
    
    // Clean the data before validation
    const cleanData = {
      ...body,
      parentId: body.parentId === '' ? null : body.parentId,
      order: typeof body.order === 'string' ? parseInt(body.order) || 0 : body.order,
    };
    
    // Validate input
    const validatedData = categoryUpdateSchema.parse(cleanData);
    
    // Check if category exists
    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Check if parent category exists and prevent circular reference
    if (validatedData.parentId) {
      if (validatedData.parentId === params.id) {
        return NextResponse.json(
          { success: false, message: 'لا يمكن أن تكون الفئة أباً لنفسها' },
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
      if (parentCategory.parentId && parentCategory.parentId.toString() === params.id) {
        return NextResponse.json(
          { success: false, message: 'لا يمكن إنشاء مرجع دائري بين الفئات' },
          { status: 400 }
        );
      }
    }
    
    // Check if name already exists at the same level (if name is being changed)
    if (validatedData.name && validatedData.name !== category.name) {
      const existingQuery: any = { 
        name: validatedData.name,
        _id: { $ne: params.id }
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
      params.id,
      { $set: validatedData },
      { new: true, runValidators: true }
    ).populate('parentId', 'name');
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      category: {
        _id: updatedCategory._id,
        name: updatedCategory.name,
        nameEn: updatedCategory.nameEn,
        description: updatedCategory.description,
        image: updatedCategory.image,
        parentId: updatedCategory.parentId?._id || updatedCategory.parentId,
        parentName: updatedCategory.parentId?.name,
        order: updatedCategory.order,
        isActive: updatedCategory.isActive,
        slug: updatedCategory.slug
      }
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث الفئة', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
async function deleteCategory(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    // Check if category exists
    const category = await Category.findById(params.id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'الفئة غير موجودة' },
        { status: 404 }
      );
    }
    
    // Check if category has subcategories
    const subcategoriesCount = await Category.countDocuments({ parentId: params.id });
    if (subcategoriesCount > 0) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف فئة تحتوي على فئات فرعية' },
        { status: 400 }
      );
    }
    
    // Check if category has products
    const productsCount = await Product.countDocuments({ categoryId: params.id });
    if (productsCount > 0) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن حذف فئة تحتوي على منتجات' },
        { status: 400 }
      );
    }
    
    // Delete the category
    await Category.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف الفئة' },
      { status: 500 }
    );
  }
}

// Export handlers with role-based access
export const GET = withAuth(getCategory);
export const PUT = withRole(['admin'])(updateCategory);
export const DELETE = withRole(['admin'])(deleteCategory); 