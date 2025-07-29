import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Favorite from '@/models/Favorite';
import Product from '@/models/Product';
import { z } from 'zod';

const addFavoriteSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب')
});

// GET /api/favorites - Get user favorites
async function getFavorites(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const favorites = await Favorite.getUserFavorites(user._id);
    
    // Filter out any null products (deleted products)
    const validFavorites = favorites
      .filter(fav => fav.productId)
      .map(fav => ({
        _id: fav.productId._id,
        name: fav.productId.name,
        description: fav.productId.description,
        images: fav.productId.images,
        marketerPrice: fav.productId.marketerPrice,
        wholesalePrice: fav.productId.wholesalePrice,
        stockQuantity: fav.productId.stockQuantity,
        categoryId: fav.productId.categoryId,
        supplierId: fav.productId.supplierId,
        isActive: fav.productId.isActive,
        isApproved: fav.productId.isApproved,
        addedAt: fav.addedAt
      }));
    
    return NextResponse.json({
      success: true,
      favorites: validFavorites
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب المفضلة' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add to favorites
async function addToFavorites(req: NextRequest, user: any) {
  try {
    await connectDB();
    
    const body = await req.json();
    const validatedData = addFavoriteSchema.parse(body);
    
    // Check if product exists and is approved
    const product = await Product.findById(validatedData.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود' },
        { status: 404 }
      );
    }
    
    if (!product.isApproved || !product.isActive) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير متاح' },
        { status: 400 }
      );
    }
    
    // Check if already favorited
    const existing = await Favorite.findOne({
      userId: user._id,
      productId: validatedData.productId
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'المنتج موجود بالفعل في المفضلة' },
        { status: 400 }
      );
    }
    
    // Create favorite
    await Favorite.create({
      userId: user._id,
      productId: validatedData.productId
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة المنتج إلى المفضلة'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إضافة المنتج إلى المفضلة' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getFavorites);
export const POST = withAuth(addToFavorites); 