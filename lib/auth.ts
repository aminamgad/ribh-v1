import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/types/index';
import { logger } from './logger';
import { hasPermission as hasPermissionCheck, type PermissionKey } from './permissions';

// Validate JWT_SECRET - must be set in production
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '❌ JWT_SECRET environment variable is required in production. ' +
        'Please set it in your environment variables.'
      );
    }
    // Only allow default secret in development
    console.warn(
      '⚠️ WARNING: Using default JWT_SECRET. This is insecure and should only be used in development. ' +
      'Please set JWT_SECRET environment variable in production.'
    );
    return 'super-secret-jwt-key-for-ribh-platform-development-only-please-change-in-production';
  }
  
  // Validate secret strength in production
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error(
      '❌ JWT_SECRET must be at least 32 characters long in production for security.'
    );
  }
  
  return secret;
};

const JWT_SECRET = getJWTSecret();

// Get JWT expiration from system settings
async function getJWTExpiration(): Promise<string> {
  try {
    const { settingsManager } = await import('@/lib/settings-manager');
    const settings = await settingsManager.getSettings();
    const sessionTimeout = settings?.sessionTimeout || 60; // Default 60 minutes
    
    // Convert minutes to JWT expiration format
    if (sessionTimeout < 60) {
      return `${sessionTimeout}m`; // minutes
    } else if (sessionTimeout < 1440) {
      const hours = Math.floor(sessionTimeout / 60);
      return `${hours}h`; // hours
    } else {
      const days = Math.floor(sessionTimeout / 1440);
      return `${days}d`; // days
    }
  } catch (error) {
    // Fallback to default
    return '7d';
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const expiresIn = await getJWTExpiration();
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

// Synchronous version for backward compatibility (uses default expiration)
export function generateTokenSync(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookieToken = req.cookies.get('ribh-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set('ribh-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  });
  return res;
}

export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.delete('ribh-token');
  return res;
}

export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  try {
    logger.debug('Getting current user from request', { url: req.url, method: req.method });
    
    const token = getTokenFromRequest(req);
    if (!token) {
      logger.debug('No token found in request', {
        hasCookies: req.cookies.has('ribh-token'),
        hasAuthHeader: !!req.headers.get('authorization')
      });
      return null;
    }
    
    logger.debug('Token found in request', { tokenLength: token.length });

    const payload = verifyToken(token);
    if (!payload) {
      logger.warn('Invalid token payload - token verification failed');
      return null;
    }
    
    logger.debug('Token verified successfully', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    // Import here to avoid circular dependency
    const connectDB = (await import('@/lib/database')).default;
    const User = (await import('@/models/User')).default;
    
    // Ensure database connection
    await connectDB();
    logger.debug('Database connected');
    
    const user = await User.findById(payload.userId).select('-password').lean();
    
    if (!user) {
      logger.warn('User not found in database', { userId: payload.userId });
      return null;
    }
    
    logger.debug('User found in database', { userId: (user as any)._id, email: (user as any).email });
    return user as unknown as User;
  } catch (error) {
    logger.error('Error getting current user', error);
    return null;
  }
}

type AuthHandler = (req: NextRequest, user: User, ...args: unknown[]) => Promise<NextResponse>;

export function requireAuth(handler: AuthHandler) {
  return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      logger.debug('Auth check for request', { method: req.method, url: req.url });
      
      // Check maintenance mode first (skip for admin routes, auth routes, and external company routes)
      if (!req.nextUrl.pathname.startsWith('/api/admin') && 
          !req.nextUrl.pathname.startsWith('/api/auth/login') &&
          !req.nextUrl.pathname.startsWith('/api/auth/register') &&
          !req.nextUrl.pathname.startsWith('/api/external_company')) {
        try {
          const { checkMaintenanceMode } = await import('@/lib/maintenance');
          const maintenanceResponse = await checkMaintenanceMode(req);
          if (maintenanceResponse) {
            return maintenanceResponse;
          }
        } catch (error) {
          // If maintenance check fails, continue with auth
          logger.debug('Maintenance check failed, continuing with auth', { error });
        }
      }
      
      const user = await getCurrentUser(req);
      if (!user) {
        logger.warn('Authentication failed - no user found', { url: req.url });
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول' },
          { status: 401 }
        );
      }
      
      // If user is admin, they can bypass maintenance mode (already checked above)
      // For non-admin users, check maintenance mode again after auth
      if (user.role !== 'admin' && 
          !req.nextUrl.pathname.startsWith('/api/admin') && 
          !req.nextUrl.pathname.startsWith('/api/auth/login') &&
          !req.nextUrl.pathname.startsWith('/api/auth/register') &&
          !req.nextUrl.pathname.startsWith('/api/external_company')) {
        try {
          const { checkMaintenanceMode } = await import('@/lib/maintenance');
          const maintenanceResponse = await checkMaintenanceMode(req);
          if (maintenanceResponse) {
            return maintenanceResponse;
          }
        } catch (error) {
          // If maintenance check fails, continue
          logger.debug('Maintenance check failed after auth, continuing', { error });
        }
      }
      
      logger.debug('Authentication successful', { userId: user._id, email: user.email });
      // Pass user directly as second parameter, keeping original args structure
      return handler(req, user, ...args);
    } catch (error) {
      logger.error('Auth middleware error', error);
      return NextResponse.json(
        { success: false, message: 'خطأ في التحقق من المصادقة' },
        { status: 500 }
      );
    }
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (handler: AuthHandler) => {
    return async (req: NextRequest, user: User, ...args: unknown[]): Promise<NextResponse> => {
      if (!allowedRoles.includes(user.role)) {
        logger.warn('Role check failed', { 
          userRole: user.role, 
          allowedRoles, 
          userId: user._id 
        });
        return NextResponse.json(
          { success: false, error: 'ليس لديك صلاحية للوصول لهذا المورد' },
          { status: 403 }
        );
      }
      
      return handler(req, user, ...args);
    };
  };
}

export function requireAdmin(handler: AuthHandler) {
  return requireRole(['admin'])(handler);
}

export function requireSupplier(handler: AuthHandler) {
  return requireRole(['supplier'])(handler);
}

export function requireMarketer(handler: AuthHandler) {
  return requireRole(['marketer'])(handler);
}

export function requireWholesaler(handler: AuthHandler) {
  return requireRole(['wholesaler'])(handler);
}

export function requireCustomer(handler: AuthHandler) {
  return requireRole(['marketer', 'wholesaler'])(handler);
}

export function requireSupplierOrAdmin(handler: AuthHandler) {
  return requireRole(['supplier', 'admin'])(handler);
}

// ============ Permission-based access (for admin / staff) ============

/**
 * تحقق إذا كان المستخدم يملك صلاحية معينة.
 * - مدير نظام (admin وليس موظفاً) = كل الصلاحيات.
 * - موظف full_admin = كل الصلاحيات.
 * - موظف custom = فقط ما في user.permissions.
 */
export function userHasPermission(user: User, permission: string): boolean {
  return hasPermissionCheck(user, permission);
}


export function userHasAnyPermission(user: User, permissions: string[]): boolean {
  return permissions.some((p) => userHasPermission(user, p));
}

export function userHasAllPermissions(user: User, permissions: string[]): boolean {
  return permissions.every((p) => userHasPermission(user, p));
}

function requirePermission(permission: PermissionKey) {
  return (handler: AuthHandler) => {
    return async (req: NextRequest, user: User, ...args: unknown[]): Promise<NextResponse> => {
      if (!userHasPermission(user, permission)) {
        logger.warn('Permission check failed', {
          userId: user._id,
          permission,
          userStaffRole: (user as any).staffRole,
        });
        return NextResponse.json(
          { success: false, message: 'ليس لديك صلاحية لهذا الإجراء' },
          { status: 403 }
        );
      }
      return handler(req, user, ...args);
    };
  };
}

function requireAnyPermission(permissions: PermissionKey[]) {
  return (handler: AuthHandler) => {
    return async (req: NextRequest, user: User, ...args: unknown[]): Promise<NextResponse> => {
      if (!userHasAnyPermission(user, permissions)) {
        logger.warn('Permission check failed (any)', {
          userId: user._id,
          permissions,
        });
        return NextResponse.json(
          { success: false, message: 'ليس لديك صلاحية لهذا الإجراء' },
          { status: 403 }
        );
      }
      return handler(req, user, ...args);
    };
  };
}

/** يتطلب تسجيل الدخول + دور admin + صلاحية واحدة */
export function withPermission(permission: PermissionKey) {
  return (handler: AuthHandler) =>
    requireAuth(requireRole(['admin'])(requirePermission(permission)(handler)));
}

/** يتطلب تسجيل الدخول + دور admin + أي صلاحية من القائمة */
export function withAnyPermission(permissions: PermissionKey[]) {
  return (handler: AuthHandler) =>
    requireAuth(requireRole(['admin'])(requireAnyPermission(permissions)(handler)));
}

// Middleware for API routes
export function withAuth(handler: AuthHandler) {
  return requireAuth(handler);
}

export function withRole(allowedRoles: UserRole[]) {
  return (handler: AuthHandler) => requireAuth(requireRole(allowedRoles)(handler));
}

export function withAdmin(handler: AuthHandler) {
  return withRole(['admin'])(handler);
}

export function withSupplier(handler: AuthHandler) {
  return withRole(['supplier'])(handler);
}

export function withMarketer(handler: AuthHandler) {
  return withRole(['marketer'])(handler);
}

export function withWholesaler(handler: AuthHandler) {
  return withRole(['wholesaler'])(handler);
}

export function withCustomer(handler: AuthHandler) {
  return withRole(['marketer', 'wholesaler'])(handler);
}

export function withSupplierOrAdmin(handler: AuthHandler) {
  return withRole(['supplier', 'admin'])(handler);
} 