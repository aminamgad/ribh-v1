'use client';

import { useEffect } from 'react';
import { initializeImageCache } from '@/lib/imageCache';

/**
 * Component to initialize image cache on client side
 */
export default function ImageCacheInitializer() {
  useEffect(() => {
    // Initialize image cache on mount
    initializeImageCache().catch(() => {
      // Cache initialization failed, continue normally
    });
  }, []);

  return null; // This component doesn't render anything
}

