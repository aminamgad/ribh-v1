'use client';

import { Play, Image as ImageIcon } from 'lucide-react';
import { getMediaType } from '@/lib/mediaUtils';
import LazyImage, { OptimizedImage } from './LazyImage';

interface MediaThumbnailProps {
  media: string[];
  alt?: string;
  className?: string;
  showTypeBadge?: boolean;
  fallbackIcon?: React.ReactNode;
  /**
   * Use only for above-the-fold/hero images. Avoid enabling in lists/tables.
   */
  priority?: boolean;
  /**
   * If provided, we'll use Next.js Image optimization with fixed dimensions.
   * Ideal for table/list thumbnails.
   */
  width?: number;
  height?: number;
}

export default function MediaThumbnail({
  media,
  alt = 'وسائط',
  className = '',
  showTypeBadge = false,
  fallbackIcon,
  priority = false,
  width,
  height
}: MediaThumbnailProps) {
  if (!media || media.length === 0) {
    return (
      <div className={`aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg sm:rounded-xl flex items-center justify-center ${className}`}>
        {fallbackIcon || <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-500" />}
      </div>
    );
  }

  const firstMedia = media[0];
  const mediaType = getMediaType(firstMedia);

  // Calculate responsive sizes for mobile optimization
  const getSizes = () => {
    if (width && height) {
      // For fixed dimensions, use responsive sizes based on image size
      if (width <= 300) {
        // Small thumbnails (list items, cards)
        return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
      } else if (width <= 600) {
        // Medium images (product detail thumbnails)
        return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
      } else {
        // Large images (main product images)
        return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
      }
    }
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  };

  return (
    <div className={`aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg sm:rounded-xl overflow-hidden relative ${className}`}>
      {mediaType === 'image' ? (
        width && height ? (
          <OptimizedImage
            src={firstMedia}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-full object-cover"
            priority={priority}
            sizes={getSizes()}
            // Quality will be auto-calculated based on priority and size in OptimizedImage
          />
        ) : (
          <LazyImage
            src={firstMedia}
            alt={alt}
            className="w-full h-full object-cover"
            priority={priority}
            placeholder="blur"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center relative">
          <video
            src={firstMedia}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            playsInline
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
            onMouseLeave={(e) => {
              const video = e.target as HTMLVideoElement;
              video.pause();
              video.currentTime = 0;
            }}
            onTouchStart={(e) => {
              // For mobile, play on touch
              const video = e.target as HTMLVideoElement;
              if (video.paused) {
                video.play().catch(() => {
                  // Ignore autoplay errors
                });
              }
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white bg-black bg-opacity-50 rounded-full p-1 sm:p-1.5" />
          </div>
        </div>
      )}
      
      {showTypeBadge && (
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black bg-opacity-50 text-white rounded-full p-1 sm:p-1.5">
          {mediaType === 'image' ? (
            <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          ) : (
            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          )}
        </div>
      )}
    </div>
  );
}
