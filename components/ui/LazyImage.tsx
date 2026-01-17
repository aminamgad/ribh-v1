'use client';

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { getCloudinaryThumbnailUrl, isCloudinaryUrl } from '@/lib/mediaUtils';
import { imagePerformanceMonitor } from '@/lib/imagePerformance';

const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty' | 'loading';
  blurDataURL?: string;
  priority?: boolean;
  onError?: () => void;
  onLoad?: () => void;
}

/**
 * Lazy-loaded image component with loading states and error handling
 */
export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'loading',
  blurDataURL,
  priority = false,
  onError,
  onLoad,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const MAX_RETRIES = 2;

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const loadStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isInView && !loadStartTimeRef.current) {
      loadStartTimeRef.current = performance.now();
    }
  }, [isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setRetryCount(0); // Reset retry count on success
    
    // Measure and log load time in development
    if (process.env.NODE_ENV === 'development' && loadStartTimeRef.current) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      const imageSize = imgElementRef.current?.naturalWidth && imgElementRef.current?.naturalHeight
        ? `${imgElementRef.current.naturalWidth}x${imgElementRef.current.naturalHeight}`
        : 'unknown';
      
      // Log to performance monitor
      imagePerformanceMonitor.logImageLoad({
        url: src,
        loadTime,
        size: imageSize,
        timestamp: Date.now(),
        retryCount
      });
      
      loadStartTimeRef.current = null;
    }
    
    if (onLoad) onLoad();
  };

  const handleError = () => {
    if (retryCount < MAX_RETRIES && imgElementRef.current) {
      // Retry loading the image after a short delay
      const delay = (retryCount + 1) * 500; // Exponential backoff: 500ms, 1000ms
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
        if (imgElementRef.current) {
          // Force reload by adding cache-busting parameter
          const separator = src.includes('?') ? '&' : '?';
          imgElementRef.current.src = `${src}${separator}_retry=${retryCount + 1}&_t=${Date.now()}`;
        }
      }, delay);
    } else {
      setIsLoading(false);
      setHasError(true);
      // Log error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Image failed to load after retries:', src, { retryCount });
      }
      if (onError) onError();
    }
  };

  // Placeholder while loading
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
        {...props}
      >
        <div className="w-8 h-8 text-gray-400 dark:text-gray-500">
          <ImageIcon className="w-full h-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (hasError || !src) {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
        {...props}
      >
        <div className="text-center p-4">
          <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">فشل تحميل الصورة</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && placeholder === 'loading') {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative ${className}`}
        style={{ width, height }}
        {...props}
      >
        <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
      <img
        ref={imgElementRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className="hidden"
        loading="lazy"
      />
      </div>
    );
  }

  // Blur placeholder
  if (isLoading && placeholder === 'blur' && blurDataURL) {
    return (
      <div className={`relative ${className}`} style={{ width, height }} {...props}>
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
        <img
          ref={imgElementRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
          loading="lazy"
        />
      </div>
    );
  }

  // Final loaded image
  return (
    <div className={`relative ${className}`} style={{ width, height }} {...props}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 z-10">
          <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
        </div>
      )}
      <img
        ref={imgElementRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
}

/**
 * Optimized image component using Next.js Image
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes,
  quality = 75,
  placeholder = 'blur',
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  unoptimized,
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  unoptimized?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  if (hasError || !src) {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  // Use Next.js Image for optimization if dimensions provided
  if (width && height) {
    const transformedSrc = getCloudinaryThumbnailUrl(src, { width, height, crop: 'fill', quality: 'auto' });
    const shouldUnoptimize = unoptimized ?? isCloudinaryUrl(transformedSrc);
    const currentSrc = retryCount > 0 
      ? `${transformedSrc}${transformedSrc.includes('?') ? '&' : '?'}_retry=${retryCount}&_t=${Date.now()}`
      : transformedSrc;
    
    return (
      <Image
        key={retryCount} // Force re-render on retry
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? blurDataURL : undefined}
        unoptimized={shouldUnoptimize}
        onLoad={() => {
          // Measure and log load time
          const resourceEntry = performance.getEntriesByName(currentSrc, 'resource')[0] as PerformanceResourceTiming;
          const loadTime = resourceEntry 
            ? resourceEntry.responseEnd - resourceEntry.startTime
            : performance.now();
          
          imagePerformanceMonitor.logImageLoad({
            url: src,
            loadTime,
            size: `${width}x${height}`,
            timestamp: Date.now(),
            retryCount
          });
        }}
        onError={() => {
          if (retryCount < MAX_RETRIES) {
            // Retry with exponential backoff
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              if (process.env.NODE_ENV === 'development') {
                console.warn('[Image Performance] Retrying image load:', currentSrc, { retryCount: retryCount + 1 });
              }
            }, (retryCount + 1) * 500);
          } else {
            setHasError(true);
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Image Performance] Image failed to load after retries:', transformedSrc);
            }
          }
        }}
        {...props}
      />
    );
  }

  // Fallback to regular img tag with retry
  const handleImgError = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      // Retry will be handled by src change
    } else {
      setHasError(true);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Image failed to load after retries:', src);
      }
    }
  };

  const imgSrc = retryCount > 0 
    ? `${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount}&_t=${Date.now()}`
    : src;

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleImgError}
      {...props}
    />
  );
}

