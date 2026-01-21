/**
 * Utility functions for handling media (images and videos)
 */

export const getMediaType = (url: string): 'image' | 'video' => {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const extension = url.split('.').pop()?.toLowerCase();
  return videoExtensions.includes(extension || '') ? 'video' : 'image';
};

export const isCloudinaryUrl = (url: string): boolean => {
  return typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/');
};

/**
 * Returns a Cloudinary URL resized/cropped for thumbnails.
 * This avoids downloading the original large image before showing it in tables/lists.
 * Optimized with dpr_auto, fetch_format auto, and smart quality settings.
 */
export const getCloudinaryThumbnailUrl = (
  url: string,
  opts: { 
    width: number; 
    height: number; 
    crop?: 'fill' | 'fit' | 'limit' | 'thumb' | 'scale'; 
    quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    dpr?: 'auto' | number;
  }
): string => {
  if (!isCloudinaryUrl(url)) return url;
  const { 
    width, 
    height, 
    crop = 'fill', 
    quality = 'auto:good', // Use auto:good for better balance between quality and size
    format = 'auto',
    dpr = 'auto' // Auto DPR for retina displays
  } = opts;

  const [prefix, suffix] = url.split('/upload/');
  if (!prefix || !suffix) return url;

  // Build quality parameter
  const q = typeof quality === 'number' ? `q_${quality}` : `q_${quality}`;
  
  // Build format parameter (f_auto already handles format selection, but we can be explicit)
  const f = format === 'auto' ? 'f_auto' : `f_${format}`;
  
  // Build DPR parameter
  const dprParam = dpr === 'auto' ? 'dpr_auto' : `dpr_${dpr}`;
  
  // Build transformation string with optimizations
  // Order matters: format first, then quality, then dimensions, then crop, then DPR, then gravity
  const transform = `${f},${q},w_${width},h_${height},c_${crop},${dprParam},g_auto`;

  return `${prefix}/upload/${transform}/${suffix}`;
};

export const getFirstImage = (media: string[]): string | null => {
  if (!media || media.length === 0) return null;
  
  // Find the first image in the media array
  for (const item of media) {
    if (getMediaType(item) === 'image') {
      return item;
    }
  }
  
  // If no image found, return the first item (could be video)
  return media[0];
};

export const getMediaThumbnail = (media: string[]): { url: string; type: 'image' | 'video' } | null => {
  if (!media || media.length === 0) return null;
  
  const firstMedia = media[0];
  return {
    url: firstMedia,
    type: getMediaType(firstMedia)
  };
};

export const getAcceptedMediaTypes = (accept: 'images' | 'videos' | 'both' = 'both'): string => {
  switch (accept) {
    case 'images':
      return 'image/*';
    case 'videos':
      return 'video/*';
    case 'both':
    default:
      return 'image/*,video/*';
  }
};

export const getAcceptedExtensions = (accept: 'images' | 'videos' | 'both' = 'both'): string[] => {
  switch (accept) {
    case 'images':
      return ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    case 'videos':
      return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    case 'both':
    default:
      return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  }
};

export const validateMediaFile = (
  file: File, 
  accept: 'images' | 'videos' | 'both' = 'both',
  maxSize: number = 100
): { valid: boolean; error?: string } => {
  // Check file type first
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  // Check file size with different limits for videos and images
  const effectiveMaxSize = isVideo ? Math.max(maxSize, 100) : Math.min(maxSize, 10); // Videos: 100MB+, Images: 10MB max
  
  if (file.size > effectiveMaxSize * 1024 * 1024) {
    return {
      valid: false,
      error: `حجم الملف ${file.name} كبير جداً. الحد الأقصى ${effectiveMaxSize} ميجابايت`
    };
  }

  if (accept === 'images' && !isImage) {
    return {
      valid: false,
      error: `الملف ${file.name} ليس صورة صالحة`
    };
  }

  if (accept === 'videos' && !isVideo) {
    return {
      valid: false,
      error: `الملف ${file.name} ليس فيديو صالح`
    };
  }

  if (accept === 'both' && !isImage && !isVideo) {
    return {
      valid: false,
      error: `الملف ${file.name} ليس ملف وسائط صالح`
    };
  }

  return { valid: true };
};

// Download utility functions
export const getFilenameFromUrl = (url: string, mediaType: 'image' | 'video'): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    
    if (filename && filename.includes('.')) {
      return filename;
    }
    
    // If no filename in URL, generate one
    const extension = mediaType === 'image' ? 'jpg' : 'mp4';
    return `media_${Date.now()}.${extension}`;
  } catch {
    // Fallback filename
    const extension = mediaType === 'image' ? 'jpg' : 'mp4';
    return `media_${Date.now()}.${extension}`;
  }
};

export const downloadMedia = async (url: string, filename: string): Promise<boolean> => {
  try {
    // Fetch the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }
    
    // Get the blob
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return false;
  }
};

export const downloadAllMedia = async (mediaUrls: string[]): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;
  
  for (const url of mediaUrls) {
    const mediaType = getMediaType(url);
    const filename = getFilenameFromUrl(url, mediaType);
    
    const result = await downloadMedia(url, filename);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Add a small delay between downloads to avoid overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { success, failed };
};
