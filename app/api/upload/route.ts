import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

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
  console.log('Cloudinary configured successfully with:', {
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key ? '***' + cloudinaryConfig.api_key.slice(-4) : 'undefined',
    api_secret: cloudinaryConfig.api_secret ? '***' + cloudinaryConfig.api_secret.slice(-4) : 'undefined'
  });
} else {
  console.warn('Cloudinary not configured. Using fallback upload method.');
  console.log('Cloudinary config check:', {
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key ? '***' + cloudinaryConfig.api_key.slice(-4) : 'undefined',
    api_secret: cloudinaryConfig.api_secret ? '***' + cloudinaryConfig.api_secret.slice(-4) : 'undefined'
  });
}

// POST /api/upload - Upload file to Cloudinary
async function uploadFile(req: NextRequest, user: any) {
  try {
    console.log(`Upload request from user: ${user.email} (${user.role})`);
    
    const formData = await req.formData();
    const file = formData.get('file') as File || formData.get('image') as File; // دعم كلا الاسمين
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'لم يتم اختيار ملف' },
        { status: 400 }
      );
    }

    // تحديد نوع الملف
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isDocument = file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text');
    const isArchive = file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z');

    // التحقق من نوع الملف المدعوم
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
    const allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    const allowedDocumentTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedArchiveTypes = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'];

    let allowedTypes: string[] = [];
    if (isImage) allowedTypes = allowedImageTypes;
    else if (isVideo) allowedTypes = allowedVideoTypes;
    else if (isAudio) allowedTypes = allowedAudioTypes;
    else if (isDocument) allowedTypes = allowedDocumentTypes;
    else if (isArchive) allowedTypes = allowedArchiveTypes;
    else allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes, ...allowedDocumentTypes, ...allowedArchiveTypes];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'نوع الملف غير مدعوم. يرجى اختيار ملف صالح' },
        { status: 400 }
      );
    }

    // التحقق من حجم الملف (حد أقصى 10 ميجابايت)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes, type: ${file.type}) for user: ${user.name}`);

    // If Cloudinary is not configured, use fallback method
    if (!isCloudinaryConfigured) {
      // For development/testing, return a mock URL
      const mockUrl = isImage 
        ? `https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(file.name)}`
        : `https://via.placeholder.com/400x200/6B7280/FFFFFF?text=${encodeURIComponent(file.name)}`;
      
      console.log(`Using fallback upload method for ${file.name}`);
      
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Uploading file: ${file.name} (${file.size} bytes, type: ${file.type}) for user: ${user.name}`);

    // تحديد نوع المورد لـ Cloudinary
    let resourceType: 'image' | 'video' | 'raw' = 'raw';
    if (isImage) resourceType = 'image';
    else if (isVideo) resourceType = 'video';

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ribh-files',
          resource_type: resourceType,
          public_id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transformation: isImage ? [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
            { fetch_format: 'auto' }
          ] : undefined,
          allowed_formats: isImage ? ['jpg', 'png', 'webp', 'gif'] : undefined
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result?.public_id);
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    const uploadResult = result as any;
    
    console.log(`Upload successful for user ${user.email}: ${uploadResult.secure_url}`);
    
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
  } catch (error: any) {
    console.error(`Error uploading file for user ${user?.email}:`, error);
    
    // Handle specific Cloudinary errors
    if (error.http_code) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'خطأ في خدمة رفع الملفات. يرجى المحاولة لاحقاً',
          error: `Cloudinary error: ${error.message}`
        },
        { status: error.http_code }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadFile); 