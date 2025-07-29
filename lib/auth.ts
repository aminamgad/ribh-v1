import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-ribh-platform-development-only-please-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    console.log('=== getCurrentUser Debug ===');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    
    const token = getTokenFromRequest(req);
    if (!token) {
      console.log('No token found in request');
      console.log('Cookies:', req.cookies.getAll());
      console.log('Authorization header:', req.headers.get('authorization'));
      return null;
    }
    
    console.log('Token found, length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');

    const payload = verifyToken(token);
    if (!payload) {
      console.log('Invalid token payload - token verification failed');
      return null;
    }
    
    console.log('Token verified successfully');
    console.log('Payload userId:', payload.userId);
    console.log('Payload email:', payload.email);
    console.log('Payload role:', payload.role);

    // Import here to avoid circular dependency
    const connectDB = (await import('@/lib/database')).default;
    const User = (await import('@/models/User')).default;
    
    // Ensure database connection
    await connectDB();
    console.log('Database connected');
    
    const user = await User.findById(payload.userId).select('-password');
    
    if (!user) {
      console.log('User not found in database:', payload.userId);
      return null;
    }
    
    console.log('User found in database:', user.email);
    console.log('=== End getCurrentUser Debug ===');
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export function requireAuth(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      console.log('Auth check for:', req.method, req.url);
      
      const user = await getCurrentUser(req);
      if (!user) {
        console.log('Authentication failed - no user found');
        return NextResponse.json(
          { success: false, message: 'غير مصرح لك بالوصول. يرجى تسجيل الدخول' },
          { status: 401 }
        );
      }
      
      console.log('Authentication successful for user:', user.email);
      // Pass user directly as second parameter, keeping original args structure
      return handler(req, user, ...args);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'خطأ في التحقق من المصادقة' },
        { status: 500 }
      );
    }
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (handler: Function) => {
    return async (req: NextRequest, user: User, ...args: any[]) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { success: false, error: 'ليس لديك صلاحية للوصول لهذا المورد' },
          { status: 403 }
        );
      }
      
      return handler(req, user, ...args);
    };
  };
}

export function requireAdmin(handler: Function) {
  return requireRole(['admin'])(handler);
}

export function requireSupplier(handler: Function) {
  return requireRole(['supplier'])(handler);
}

export function requireMarketer(handler: Function) {
  return requireRole(['marketer'])(handler);
}

export function requireWholesaler(handler: Function) {
  return requireRole(['wholesaler'])(handler);
}

export function requireCustomer(handler: Function) {
  return requireRole(['marketer', 'wholesaler'])(handler);
}

export function requireSupplierOrAdmin(handler: Function) {
  return requireRole(['supplier', 'admin'])(handler);
}

// Middleware for API routes
export function withAuth(handler: Function) {
  return requireAuth(handler);
}

export function withRole(allowedRoles: UserRole[]) {
  return (handler: Function) => requireAuth(requireRole(allowedRoles)(handler));
}

export function withAdmin(handler: Function) {
  return withRole(['admin'])(handler);
}

export function withSupplier(handler: Function) {
  return withRole(['supplier'])(handler);
}

export function withMarketer(handler: Function) {
  return withRole(['marketer'])(handler);
}

export function withWholesaler(handler: Function) {
  return withRole(['wholesaler'])(handler);
}

export function withCustomer(handler: Function) {
  return withRole(['marketer', 'wholesaler'])(handler);
}

export function withSupplierOrAdmin(handler: Function) {
  return withRole(['supplier', 'admin'])(handler);
} 