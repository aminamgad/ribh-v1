/**
 * Image Cache API utility for caching images in browser Cache API
 * This improves performance by storing frequently accessed images
 */

const CACHE_NAME = 'ribh-images-v1';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache size
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  url: string;
  timestamp: number;
  size: number;
}

/**
 * Check if Cache API is supported
 */
export const isCacheAPISupported = (): boolean => {
  return typeof caches !== 'undefined' && 'open' in caches;
};

/**
 * Open the image cache
 */
const openCache = async (): Promise<Cache | null> => {
  if (!isCacheAPISupported()) {
    return null;
  }

  try {
    return await caches.open(CACHE_NAME);
  } catch (error) {
    return null;
  }
};

/**
 * Get cached image from Cache API
 */
export const getCachedImage = async (url: string): Promise<Response | null> => {
  if (!isCacheAPISupported()) {
    return null;
  }

  try {
    const cache = await openCache();
    if (!cache) return null;

    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      // Check if cache is still valid
      const cacheDate = cachedResponse.headers.get('date');
      if (cacheDate) {
        const cacheAge = Date.now() - new Date(cacheDate).getTime();
        if (cacheAge > CACHE_DURATION) {
          // Cache expired, remove it
          await cache.delete(url);
          return null;
        }
      }
      return cachedResponse;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Cache an image in Cache API
 */
export const cacheImage = async (url: string, response: Response): Promise<boolean> => {
  if (!isCacheAPISupported()) {
    return false;
  }

  try {
    const cache = await openCache();
    if (!cache) return false;

    // Clone the response before caching (responses can only be read once)
    const responseToCache = response.clone();
    
    // Add cache metadata to headers
    const headers = new Headers(responseToCache.headers);
    headers.set('date', new Date().toISOString());
    headers.set('cache-control', `max-age=${CACHE_DURATION / 1000}`);

    // Create new response with updated headers
    const modifiedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers: headers,
    });

    await cache.put(url, modifiedResponse);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Preload and cache an image
 */
export const preloadAndCacheImage = async (url: string): Promise<boolean> => {
  if (!isCacheAPISupported()) {
    return false;
  }

  try {
    // Check if already cached
    const cached = await getCachedImage(url);
    if (cached) {
      return true; // Already cached
    }

    // Fetch and cache the image
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'no-cache', // We'll handle caching ourselves
    });

    if (response.ok) {
      await cacheImage(url, response);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Preload multiple images
 */
export const preloadAndCacheImages = async (urls: string[]): Promise<number> => {
  if (!isCacheAPISupported()) {
    return 0;
  }

  let successCount = 0;
  
  // Process images in batches to avoid overwhelming the browser
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(url => preloadAndCacheImage(url))
    );
    
    successCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    // Small delay between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return successCount;
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = async (): Promise<number> => {
  if (!isCacheAPISupported()) {
    return 0;
  }

  try {
    const cache = await openCache();
    if (!cache) return 0;

    const keys = await cache.keys();
    let clearedCount = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const cacheDate = response.headers.get('date');
        if (cacheDate) {
          const cacheAge = Date.now() - new Date(cacheDate).getTime();
          if (cacheAge > CACHE_DURATION) {
            await cache.delete(request);
            clearedCount++;
          }
        }
      }
    }

    return clearedCount;
  } catch (error) {
    return 0;
  }
};

/**
 * Clear all cached images
 */
export const clearImageCache = async (): Promise<boolean> => {
  if (!isCacheAPISupported()) {
    return false;
  }

  try {
    const deleted = await caches.delete(CACHE_NAME);
    return deleted;
  } catch (error) {
    return false;
  }
};

/**
 * Get cache size estimate (approximate)
 */
export const getCacheSize = async (): Promise<number> => {
  if (!isCacheAPISupported()) {
    return 0;
  }

  try {
    const cache = await openCache();
    if (!cache) return 0;

    const keys = await cache.keys();
    let totalSize = 0;

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }

    return totalSize;
  } catch (error) {
    return 0;
  }
};

/**
 * Initialize image cache - clear expired entries on app start
 */
export const initializeImageCache = async (): Promise<void> => {
  if (!isCacheAPISupported()) {
    return;
  }

  try {
    // Clear expired entries
    await clearExpiredCache();
    
    // Check cache size and clear if too large
    const cacheSize = await getCacheSize();
    if (cacheSize > MAX_CACHE_SIZE) {
      await clearImageCache();
    }
  } catch (error) {
    // Silently handle cache initialization errors
  }
};

