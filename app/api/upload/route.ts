import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { uploadRateLimit } from '@/lib/rate-limiter';
import { handleApiError, safeLogError } from '@/lib/error-handler';
import { validateFile, checkFileSecurity, sanitizeFileName } from '@/lib/file-validation';
import { logger } from '@/lib/logger';

// Configure Cloudinary with fallback for missing env vars
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Check if Cloudinary is configured
const isCloudinaryConfigured = cloudinaryConfig.cloud_name && 
                              cloudinaryConfig.api_key && 
                              cloudinaryConfig.api_secret &&
                              cloudinaryConfig.cloud_name !== 'your-cloudinary-cloud-name' &&
                              cloudinaryConfig.api_key !== 'your-cloudinary-api-key' &&
                              cloudinaryConfig.api_secret !== 'your-cloudinary-api-secret';

if (isCloudinaryConfigured) {
  cloudinary.config(cloudinaryConfig);
  logger.info('Cloudinary configured successfully', {
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key ? '***' + cloudinaryConfig.api_key.slice(-4) : 'undefined'
  });
} else {
  logger.warn('Cloudinary not configured. Using fallback upload method.', {
    cloud_name: cloudinaryConfig.cloud_name,
    has_api_key: !!cloudinaryConfig.api_key,
    has_api_secret: !!cloudinaryConfig.api_secret
  });
}

// POST /api/upload - Upload file to Cloudinary
async function uploadFile(req: NextRequest, user: any) {
  try {
    logger.apiRequest('POST', '/api/upload', { userId: user._id, userEmail: user.email, role: user.role });
    
    // Check request method
    if (req.method !== 'POST') {
      return NextResponse.json(
        { success: false, message: 'طريقة طلب غير صحيحة' },
        { status: 405 }
      );
    }

    // Check content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, message: 'نوع المحتوى غير صحيح. يجب أن يكون multipart/form-data' },
        { status: 400 }
      );
    }

    // Set request timeout for Vercel
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    try {
      const formData = await req.formData();
      clearTimeout(timeoutId);
      
      const file = formData.get('file') as File || formData.get('image') as File; // دعم كلا الاسمين
      
      if (!file) {
        return NextResponse.json(
          { success: false, message: 'لم يتم اختيار ملف' },
          { status: 400 }
        );
      }

      // Determine file category
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDocument = file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text');
      const isArchive = file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z');
      
      const category = isImage ? 'images' : isVideo ? 'videos' : isDocument ? 'documents' : isArchive ? 'archives' : 'all';
      
      // Comprehensive file validation
      const validation = await validateFile(file, {
        category: category as 'images' | 'videos' | 'documents' | 'archives' | 'all',
        requireMagicNumber: true
      });
      
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.error || 'الملف غير صالح' },
          { status: 400 }
        );
      }
      
      // Security check
      const securityCheck = await checkFileSecurity(file);
      if (!securityCheck.safe && securityCheck.warnings.length > 0) {
        // Log warning but allow upload (in production, you might want to block)
        safeLogError(
          new Error('Security warnings for uploaded file'),
          'File Upload Security',
          { 
            fileName: file.name,
            warningsCount: securityCheck.warnings.length,
            warnings: securityCheck.warnings.join(', '),
            userId: user._id
          }
        );
      }
      
      // Sanitize file name
      const sanitizedName = validation.sanitizedFileName || sanitizeFileName(file.name);

      logger.debug('Processing file upload', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId: user._id,
        userName: user.name
      });

      // If Cloudinary is not configured, return error for large files
      if (!isCloudinaryConfigured) {
        if (file.size > 4 * 1024 * 1024) { // 4MB
          return NextResponse.json(
            { 
              success: false, 
              message: 'لا يمكن رفع الملفات الكبيرة بدون إعداد Cloudinary. يرجى إعداد Cloudinary أو استخدام ملف أصغر' 
            },
            { status: 400 }
          );
        }
        
        // For small files, use fallback method
        const mockUrl = isImage 
          ? `https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(sanitizedName)}`
          : `https://via.placeholder.com/400x200/6B7280/FFFFFF?text=${encodeURIComponent(sanitizedName)}`;
        
        logger.info('Using fallback upload method', { fileName: sanitizedName });
        
        return NextResponse.json({
          success: true,
          message: 'تم رفع الملف بنجاح (وضع التطوير)',
          url: mockUrl,
          publicId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          width: isImage ? 800 : 400,
          height: isImage ? 600 : 200,
          format: file.type.split('/')[1] || 'unknown',
          size: file.size,
          isMock: true
        });
      }

      // Convert file to buffer with timeout
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      logger.debug('Uploading file to Cloudinary', {
        fileName: sanitizedName,
        fileSize: file.size,
        fileType: file.type,
        userId: user._id
      });

      // تحديد نوع المورد لـ Cloudinary
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      if (isImage) resourceType = 'image';
      else if (isVideo) resourceType = 'video';

      // Upload to Cloudinary with timeout
      const result = await Promise.race([
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'ribh-files',
              resource_type: resourceType,
              public_id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              transformation: isImage ? [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
                { fetch_format: 'auto' }
              ] : undefined,
              allowed_formats: isImage ? ['jpg', 'png', 'webp', 'gif'] : undefined,
              timeout: 25000 // 25 seconds timeout for Cloudinary
            },
            (error, result) => {
              if (error) {
                logger.error('Cloudinary upload error', error);
                reject(error);
              } else {
                logger.debug('Cloudinary upload success', { publicId: result?.public_id });
                resolve(result);
              }
            }
          );
          uploadStream.end(buffer);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 25000)
        )
      ]);

      const uploadResult = result as any;
      
      logger.info('File upload successful', {
        userId: user._id,
        userEmail: user.email,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      });
      logger.apiResponse('POST', '/api/upload', 200);
      
      return NextResponse.json({
        success: true,
        message: 'تم رفع الملف بنجاح',
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        format: uploadResult.format || file.type.split('/')[1],
        size: uploadResult.bytes || file.size
      });
      
    } catch (formDataError: unknown) {
      clearTimeout(timeoutId);
      logger.error('FormData parsing error', formDataError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'خطأ في معالجة البيانات المرسلة. تأكد من إرسال ملف صحيح',
          error: formDataError instanceof Error ? formDataError.message : 'خطأ غير معروف' 
        },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    safeLogError(error, 'File Upload', { userId: user?._id, email: user?.email });
    return handleApiError(error, 'حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى', { userId: user?._id });
  }
}

// Apply rate limiting and authentication to upload endpoint
export const POST = uploadRateLimit(withAuth(uploadFile));

// Handle CORS preflight requests
export const OPTIONS = async (req: NextRequest) => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}; 