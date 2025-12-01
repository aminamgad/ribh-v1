import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * CSRF Protection utilities
 * Implements Double Submit Cookie pattern for CSRF protection
 */

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in response cookie
 */
export function setCsrfTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false, // Must be accessible to JavaScript for Double Submit Cookie pattern
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/'
  });
  
  return response;
}

/**
 * Get CSRF token from request
 */
export function getCsrfTokenFromRequest(req: NextRequest): string | null {
  // Try to get from header first
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  if (headerToken) {
    return headerToken;
  }
  
  // Try to get from cookie
  const cookieToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(req: NextRequest): boolean {
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  const cookieToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  
  // Both tokens must exist and match
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  // Tokens must match (Double Submit Cookie pattern)
  return headerToken === cookieToken;
}

/**
 * CSRF protection middleware
 * Use this for state-changing operations (POST, PUT, DELETE, PATCH)
 */
export function csrfProtect(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const method = req.method;
    
    // Only protect state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return handler(req, ...args);
    }
    
    // Skip CSRF check for certain endpoints (e.g., webhooks, public APIs)
    const url = new URL(req.url);
    const skipPaths = ['/api/webhooks', '/api/public'];
    if (skipPaths.some(path => url.pathname.startsWith(path))) {
      return handler(req, ...args);
    }
    
    // Verify CSRF token
    if (!verifyCsrfToken(req)) {
      return NextResponse.json(
        {
          success: false,
          message: 'رمز CSRF غير صحيح أو منتهي الصلاحية',
          code: 'CSRF_TOKEN_INVALID'
        },
        { status: 403 }
      );
    }
    
    return handler(req, ...args);
  };
}

/**
 * Get or create CSRF token for GET requests
 * Call this in GET handlers to ensure token is set
 */
export function ensureCsrfToken(req: NextRequest, response: NextResponse): NextResponse {
  const existingToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  
  if (!existingToken) {
    const newToken = generateCsrfToken();
    return setCsrfTokenCookie(response, newToken);
  }
  
  return response;
}

/**
 * Helper to add CSRF token to response for GET requests
 */
export function withCsrfToken(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const response = await handler(req, ...args);
    
    // Only add token for GET requests
    if (req.method === 'GET') {
      return ensureCsrfToken(req, response);
    }
    
    return response;
  };
}

