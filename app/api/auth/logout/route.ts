import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });

    // Clear auth cookie
    response.cookies.delete('ribh-token');

    logger.apiResponse('POST', '/api/auth/logout', 200);

    return response;

  } catch (error) {
    logger.error('Logout error', error);
    return handleApiError(error, 'حدث خطأ أثناء تسجيل الخروج');
  }
} 