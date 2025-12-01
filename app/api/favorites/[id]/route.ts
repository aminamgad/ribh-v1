import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Favorite from '@/models/Favorite';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

// DELETE /api/favorites/[id] - Remove from favorites
async function removeFromFavorites(req: NextRequest, user: any, ...args: unknown[]) {
  const routeParams = args[0] as { params: { id: string } };
  const params = routeParams.params;
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
    
    logger.business('Product removed from favorites', {
      productId: params.id,
      userId: user._id.toString()
    });
    logger.apiResponse('DELETE', `/api/favorites/${params.id}`, 200);
  } catch (error) {
    logger.error('Error removing from favorites', error, {
      productId: params.id,
      userId: user._id.toString()
    });
    return handleApiError(error, 'حدث خطأ أثناء إزالة المنتج من المفضلة');
  }
}

export const DELETE = withAuth(removeFromFavorites); 