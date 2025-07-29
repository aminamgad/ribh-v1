import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Product from '@/models/Product';

interface RouteParams {
  params: { id: string };
}

// GET /api/products/[id] - Get single product
async function getProduct(req: NextRequest, user: any, { params }: RouteParams) {
  try {
    await connectDB();
    
    const product = await Product.findById(params.id)
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

    // Role-based access control
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
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      images: product.images,
      marketerPrice: product.marketerPrice,
      wholesalePrice: product.wholesalePrice,
      costPrice: product.costPrice,
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
      supplierName: product.supplierId?.name || product.supplierId?.companyName,
      sku: product.sku,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      specifications: product.specifications,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    console.log('📤 Sending product data:', {
      id: transformedProduct._id,
      name: transformedProduct.name,
      isApproved: transformedProduct.isApproved,
      isRejected: transformedProduct.isRejected,
      rejectionReason: transformedProduct.rejectionReason,
      status: transformedProduct.isApproved ? 'معتمد' : transformedProduct.isRejected ? 'مرفوض' : 'قيد المراجعة'
    });

    return NextResponse.json({
      success: true,
      product: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المنتج' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
async function updateProduct(req: NextRequest, user: any, { params }: RouteParams) {
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
      'name', 'nameEn', 'description', 'images', 'categoryId',
      'marketerPrice', 'wholesalePrice', 'costPrice', 'stockQuantity',
      'isActive', 'tags', 'specifications', 'sku', 'weight', 'dimensions'
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
        updateData[field] = body[field];
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name')
     .populate('supplierId', 'name companyName');

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تحديث المنتج' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
async function deleteProduct(req: NextRequest, user: any, { params }: RouteParams) {
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

    return NextResponse.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حذف المنتج' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getProduct);
export const PUT = withAuth(updateProduct);
export const DELETE = withAuth(deleteProduct);
export const PATCH = withAuth(updateProduct); 