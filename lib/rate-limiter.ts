import { NextRequest, NextResponse } from 'next/server';
// AuthHandler type: (req: NextRequest, user: any, ...args: unknown[]) => Promise<NextResponse>

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface ExtendedRequest extends NextRequest {
  userId?: string;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Get client identifier from request
 */
function getClientId(req: NextRequest): string {
  // Try to get user ID from auth token first
  const authHeader = req.headers.get('authorization');
  const cookieToken = req.cookies.get('ribh-token')?.value;
  
  if (authHeader || cookieToken) {
    // For authenticated users, use user ID (will be set by middleware)
    const extendedReq = req as ExtendedRequest;
    if (extendedReq.userId) {
      return `user:${extendedReq.userId}`;
    }
  }
  
  // For unauthenticated requests, use IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiter middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return (handler: (req: NextRequest, user: any, ...args: unknown[]) => Promise<NextResponse>) => {
    return async (req: NextRequest, user: unknown, ...args: unknown[]): Promise<NextResponse> => {
      const clientId = getClientId(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = store[clientId];
      
      if (!entry || entry.resetTime < now) {
        // Create new entry or reset expired entry
        entry = {
          count: 0,
          resetTime: now + windowMs
        };
        store[clientId] = entry;
      }
      
      // Check if limit exceeded
      if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        return NextResponse.json(
          {
            success: false,
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
            }
          }
        );
      }
      
      // Increment counter
      entry.count++;
      
      // Execute handler
      const response = await (handler as any)(req, user, ...args);
      
      // Skip counting based on config
      if (skipSuccessfulRequests && response.status < 400) {
        entry.count--;
      }
      
      if (skipFailedRequests && response.status >= 400) {
        entry.count--;
      }
      
      // Add rate limit headers to response
      const remaining = Math.max(0, maxRequests - entry.count);
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
      
      return response;
    };
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
  message: 'تم تجاوز الحد المسموح من محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة'
});

// Standard rate limiter for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً'
});

// Rate limiter for file uploads (مناسب لرفع عدة صور عند إضافة منتج - 10 صور أو أكثر)
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 رفع في الساعة لتفادي "فشل رفع جميع الملفات" عند إضافة منتجات متعددة
  message: 'تم تجاوز الحد المسموح من رفع الملفات. يرجى المحاولة لاحقاً'
});

// Strict rate limiter for sensitive operations
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 requests per hour
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً'
});

// Rate limiter for admin operations (more lenient than sensitive but stricter than API)
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً'
});

// Rate limiter for wallet operations
export const walletRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'تم تجاوز الحد المسموح من طلبات المحفظة. يرجى المحاولة لاحقاً'
});

