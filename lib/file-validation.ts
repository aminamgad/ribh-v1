/**
 * Enhanced file validation utilities
 * Includes magic number checking, MIME type validation, and security checks
 */

/**
 * File type magic numbers (file signatures)
 * Used to verify actual file type regardless of extension
 */
const FILE_SIGNATURES: { [key: string]: string[] } = {
  // Images
  'image/jpeg': ['FFD8FF'],
  'image/png': ['89504E47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646'], // RIFF header, needs additional check
  'image/bmp': ['424D'],
  
  // Videos
  'video/mp4': ['0000001866747970', '0000002066747970'], // ftyp box
  'video/avi': ['52494646'], // RIFF
  'video/quicktime': ['000000206674797071742020'], // QuickTime
  'video/x-msvideo': ['52494646'], // AVI
  
  // Documents
  'application/pdf': ['255044462D'], // %PDF-
  'application/msword': ['D0CF11E0A1B11AE1'], // MS Office (old)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'], // ZIP signature (Office 2007+)
  
  // Archives
  'application/zip': ['504B0304', '504B0506', '504B0708'],
  'application/x-rar-compressed': ['526172211A07'], // RAR
  'application/x-7z-compressed': ['377ABCAF271C'], // 7z
};

/**
 * Allowed file types by category
 */
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  videos: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],
  documents: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
};

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  archive: 100 * 1024 * 1024, // 100MB
  default: 10 * 1024 * 1024 // 10MB
};

/**
 * Read file header (first bytes) to check magic number
 */
async function readFileHeader(file: File, bytes: number = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join('');
      resolve(hex);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Verify file type using magic number
 */
export async function verifyFileType(file: File, expectedMimeType: string): Promise<boolean> {
  try {
    const header = await readFileHeader(file, 12);
    const signatures = FILE_SIGNATURES[expectedMimeType];
    
    if (!signatures) {
      // If no signature defined, trust MIME type
      return true;
    }
    
    // Check if header matches any signature
    return signatures.some(sig => header.startsWith(sig));
  } catch (error) {
    return false;
  }
}

/**
 * Detect actual file type from magic number
 */
export async function detectFileType(file: File): Promise<string | null> {
  try {
    const header = await readFileHeader(file, 12);
    
    // Check all known signatures
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      if (signatures.some(sig => header.startsWith(sig))) {
        return mimeType;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'اسم الملف مطلوب' };
  }
  
  // Check length
  if (fileName.length > 255) {
    return { valid: false, error: 'اسم الملف طويل جداً (الحد الأقصى 255 حرف)' };
  }
  
  // Check for path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'اسم الملف يحتوي على أحرف غير مسموحة' };
  }
  
  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return { valid: false, error: 'اسم الملف يحتوي على أحرف خطيرة' };
  }
  
  // Sanitize file name
  const sanitized = fileName
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim();
  
  return { valid: true, sanitized };
}

/**
 * Validate file extension matches MIME type
 */
export function validateFileExtension(fileName: string, mimeType: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const extensionMap: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/avi': ['avi'],
    'video/mov': ['mov'],
    'video/webm': ['webm'],
    'application/pdf': ['pdf'],
    'application/zip': ['zip'],
    'application/x-rar-compressed': ['rar'],
  };
  
  const allowedExtensions = extensionMap[mimeType];
  if (!allowedExtensions) {
    return true; // If no mapping, allow
  }
  
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * Comprehensive file validation
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  sanitizedFileName?: string;
}

export async function validateFile(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    requireMagicNumber?: boolean;
    category?: 'images' | 'videos' | 'documents' | 'archives' | 'all';
  } = {}
): Promise<FileValidationResult> {
  const {
    allowedTypes,
    maxSize,
    requireMagicNumber = true,
    category = 'all'
  } = options;
  
  // 1. Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return { valid: false, error: nameValidation.error };
  }
  
  // 2. Check file size
  const sizeLimit = maxSize || 
    (category === 'videos' ? FILE_SIZE_LIMITS.video :
     category === 'images' ? FILE_SIZE_LIMITS.image :
     category === 'documents' ? FILE_SIZE_LIMITS.document :
     category === 'archives' ? FILE_SIZE_LIMITS.archive :
     FILE_SIZE_LIMITS.default);
  
  if (file.size > sizeLimit) {
    const maxSizeMB = Math.round(sizeLimit / (1024 * 1024));
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`
    };
  }
  
  // 3. Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'الملف فارغ' };
  }
  
  // 4. Determine allowed types
  let typesToCheck: string[] = [];
  if (allowedTypes && allowedTypes.length > 0) {
    typesToCheck = allowedTypes;
  } else if (category !== 'all') {
    typesToCheck = ALLOWED_FILE_TYPES[category] || [];
  } else {
    typesToCheck = [
      ...ALLOWED_FILE_TYPES.images,
      ...ALLOWED_FILE_TYPES.videos,
      ...ALLOWED_FILE_TYPES.documents,
      ...ALLOWED_FILE_TYPES.archives
    ];
  }
  
  // 5. Check MIME type
  if (typesToCheck.length > 0 && !typesToCheck.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المسموحة: ${typesToCheck.join(', ')}`
    };
  }
  
  // 6. Verify file extension matches MIME type
  if (!validateFileExtension(file.name, file.type)) {
    return {
      valid: false,
      error: 'امتداد الملف لا يطابق نوع الملف'
    };
  }
  
  // 7. Magic number verification (if required)
  if (requireMagicNumber) {
    const detectedType = await detectFileType(file);
    
    if (detectedType && detectedType !== file.type) {
      return {
        valid: false,
        error: `نوع الملف الفعلي (${detectedType}) لا يطابق النوع المعلن (${file.type})`,
        detectedType
      };
    }
    
    if (detectedType && typesToCheck.length > 0 && !typesToCheck.includes(detectedType)) {
      return {
        valid: false,
        error: `نوع الملف الفعلي (${detectedType}) غير مسموح`,
        detectedType
      };
    }
  }
  
  return {
    valid: true,
    sanitizedFileName: nameValidation.sanitized
  };
}

/**
 * Check if file is potentially malicious
 * Basic checks - in production, use proper antivirus scanning
 */
export async function checkFileSecurity(file: File): Promise<{ safe: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  
  // Check for executable extensions
  const executableExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension && executableExtensions.includes(extension)) {
    warnings.push('الملف قد يكون قابلاً للتنفيذ');
  }
  
  // Check for double extensions (e.g., file.jpg.exe)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const lastExt = parts[parts.length - 1]?.toLowerCase();
    const secondLastExt = parts[parts.length - 2]?.toLowerCase();
    
    if (executableExtensions.includes(lastExt || '') && 
        ALLOWED_FILE_TYPES.images.some(t => t.includes(secondLastExt || ''))) {
      warnings.push('الملف يحتوي على امتداد مزدوج مشبوه');
    }
  }
  
  // Check file size anomalies (very small files might be malicious)
  if (file.size < 100 && !file.type.startsWith('text/')) {
    warnings.push('حجم الملف صغير جداً');
  }
  
  return {
    safe: warnings.length === 0,
    warnings
  };
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  const validation = validateFileName(fileName);
  if (validation.sanitized) {
    return validation.sanitized;
  }
  
  // Fallback sanitization
  return fileName
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
    .substring(0, 255);
}

