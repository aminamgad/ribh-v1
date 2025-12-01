import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { LogContext } from '@/types/api';

/**
 * Error handler utility for API routes
 * Prevents exposing sensitive information in production
 */

interface ValidationError {
  path: string;
  message: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: ValidationError[];
  code?: string;
}

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
  errors?: Record<string, { message: string }>;
}

interface CloudinaryError extends Error {
  http_code?: number;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(error: unknown): string {
  if (isProduction) {
    // In production, return generic messages
    if (error instanceof ZodError) {
      return 'بيانات غير صحيحة';
    }
    
    if (error instanceof Error) {
      // Check for specific error types that are safe to expose
      if (error.name === 'ValidationError') {
        return 'بيانات غير صحيحة';
      }
      
      if (error.name === 'CastError') {
        return 'معرف غير صحيح';
      }
      
      // For other errors, return generic message
      return 'حدث خطأ في معالجة الطلب';
    }
    
    return 'حدث خطأ غير متوقع';
  }
  
  // In development, return detailed error messages
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}

/**
 * Get error code for specific error types
 */
function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error) {
    const mongoError = error as MongoError;
    // MongoDB duplicate key error
    if (mongoError.code === 11000) {
      return 'DUPLICATE_KEY';
    }
    
    // MongoDB validation error
    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }
    
    // MongoDB cast error
    if (error.name === 'CastError') {
      return 'INVALID_ID';
    }
  }
  
  return undefined;
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): NextResponse {
  const errors = error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message
  }));
  
  return NextResponse.json(
    {
      success: false,
      message: 'بيانات غير صحيحة',
      errors: errors,
      code: 'VALIDATION_ERROR'
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Handle MongoDB duplicate key errors
 */
function handleDuplicateKeyError(error: MongoError): NextResponse {
  const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
  
  return NextResponse.json(
    {
      success: false,
      message: `${field} موجود بالفعل. يرجى استخدام قيمة مختلفة`,
      code: 'DUPLICATE_KEY'
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Handle MongoDB validation errors
 */
function handleValidationError(error: MongoError): NextResponse {
  const firstError = error.errors ? Object.values(error.errors)[0] : null;
  const message = firstError && 'message' in firstError && typeof firstError.message === 'string'
    ? firstError.message
    : 'بيانات غير صحيحة';
  
  return NextResponse.json(
    {
      success: false,
      message,
      code: 'VALIDATION_ERROR'
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Handle MongoDB cast errors (invalid ObjectId)
 */
function handleCastError(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message: 'معرف غير صحيح',
      code: 'INVALID_ID'
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Handle authentication/authorization errors
 */
export function handleAuthError(message: string = 'غير مصرح لك بالوصول'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      code: 'UNAUTHORIZED'
    } as ErrorResponse,
    { status: 401 }
  );
}

/**
 * Handle forbidden errors
 */
export function handleForbiddenError(message: string = 'ليس لديك صلاحية للوصول لهذا المورد'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      code: 'FORBIDDEN'
    } as ErrorResponse,
    { status: 403 }
  );
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(resource: string = 'المورد'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message: `${resource} غير موجود`,
      code: 'NOT_FOUND'
    } as ErrorResponse,
    { status: 404 }
  );
}

/**
 * Main error handler function
 * Use this in all API route catch blocks
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'حدث خطأ في معالجة الطلب',
  logContext?: LogContext
): NextResponse {
  // Log error details (only in development or with proper logging)
  if (!isProduction || process.env.ENABLE_ERROR_LOGGING === 'true') {
    console.error('API Error:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context: logContext
    });
  }
  
  // Handle specific error types
  if (error instanceof ZodError) {
    return handleZodError(error);
  }
  
  if (error instanceof Error) {
    const mongoError = error as MongoError;
    // MongoDB duplicate key error
    if (mongoError.code === 11000) {
      return handleDuplicateKeyError(mongoError);
    }
    
    // MongoDB validation error
    if (error.name === 'ValidationError') {
      return handleValidationError(mongoError);
    }
    
    // MongoDB cast error
    if (error.name === 'CastError') {
      return handleCastError();
    }
    
    // Network/timeout errors
    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          message: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',
          code: 'TIMEOUT'
        } as ErrorResponse,
        { status: 408 }
      );
    }
    
    // Cloudinary errors (don't expose internal details)
    const cloudinaryError = error as CloudinaryError;
    if (cloudinaryError.http_code) {
      return NextResponse.json(
        {
          success: false,
          message: 'حدث خطأ في خدمة رفع الملفات. يرجى المحاولة لاحقاً',
          code: 'UPLOAD_ERROR'
        } as ErrorResponse,
        { status: cloudinaryError.http_code || 500 }
      );
    }
  }
  
  // Generic error response
  const response: ErrorResponse = {
    success: false,
    message: isProduction ? defaultMessage : sanitizeErrorMessage(error),
    code: getErrorCode(error)
  };
  
  // Only include error details in development
  if (!isProduction && error instanceof Error) {
    response.error = error.message;
  }
  
  return NextResponse.json(response, { status: 500 });
}

/**
 * Safe error logger - only logs in development or when explicitly enabled
 */
export function safeLogError(
  error: unknown,
  context?: string,
  additionalData?: LogContext
): void {
  if (isProduction && process.env.ENABLE_ERROR_LOGGING !== 'true') {
    // In production, only log error type without sensitive details
    console.error(`[${context || 'Error'}]`, {
      type: error instanceof Error ? error.name : typeof error,
      ...additionalData
    });
    return;
  }
  
  // In development, log full details
  console.error(`[${context || 'Error'}]`, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    ...additionalData
  });
}

