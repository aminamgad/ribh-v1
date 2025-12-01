'use client';

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

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
  const imgRef = useRef<HTMLDivElement>(null);

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

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (onError) onError();
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
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

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
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onError={() => setHasError(true)}
        {...props}
      />
    );
  }

  // Fallback to regular img tag
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

