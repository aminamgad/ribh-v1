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
      <div className={`aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center ${className}`}>
        {fallbackIcon || <ImageIcon className="w-8 h-8 text-gray-400 dark:text-slate-500" />}
      </div>
    );
  }

  const firstMedia = media[0];
  const mediaType = getMediaType(firstMedia);

  return (
    <div className={`aspect-square bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden relative ${className}`}>
      {mediaType === 'image' ? (
        width && height ? (
          <OptimizedImage
            src={firstMedia}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-full object-cover"
            priority={priority}
          />
        ) : (
          <LazyImage
            src={firstMedia}
            alt={alt}
            className="w-full h-full object-cover"
            priority={priority}
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
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-6 h-6 text-white bg-black bg-opacity-50 rounded-full p-1" />
          </div>
        </div>
      )}
      
      {showTypeBadge && (
        <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white rounded-full p-1">
          {mediaType === 'image' ? (
            <ImageIcon className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </div>
      )}
    </div>
  );
}
