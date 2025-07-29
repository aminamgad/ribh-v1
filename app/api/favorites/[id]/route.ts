import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Favorite from '@/models/Favorite';

// DELETE /api/favorites/[id] - Remove from favorites
async function removeFromFavorites(req: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const result = await Favorite.findOneAndDelete({
      userId: user._id,
      productId: params.id
    });
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'المنتج غير موجود في المفضلة' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إزالة المنتج من المفضلة'
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء إزالة المنتج من المفضلة' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(removeFromFavorites); 