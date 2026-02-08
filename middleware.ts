import { NextRequest, NextResponse } from 'next/server';

const EASY_ORDERS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, secret',
  'Access-Control-Max-Age': '86400',
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // CORS for Easy Orders callback & webhook (browser sends preflight from app.easy-orders.net)
  if (
    pathname === '/api/integrations/easy-orders/callback' ||
    pathname === '/api/integrations/easy-orders/webhook'
  ) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: EASY_ORDERS_CORS_HEADERS,
      });
    }
    const response = NextResponse.next();
    Object.entries(EASY_ORDERS_CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/integrations/easy-orders/callback',
    '/api/integrations/easy-orders/webhook',
  ],
};

