/**
 * Advanced caching utilities
 * Provides in-memory caching with TTL, LRU eviction, and cache invalidation
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  strategy?: 'lru' | 'fifo'; // Eviction strategy
}

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private options: Required<CacheOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize || 1000,
      strategy: options.strategy || 'lru'
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if cache is full
    if (this.cache.size >= this.options.maxSize) {
      this.evict();
    }

    const expiresAt = Date.now() + (ttl || this.options.ttl);

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let totalAccess = 0;

    const values = Array.from(this.cache.values());
    for (const entry of values) {
      if (now > entry.expiresAt) {
        expired++;
      }
      totalAccess += entry.accessCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      expired,
      totalAccess,
      hitRate: totalAccess > 0 ? (this.cache.size / totalAccess) * 100 : 0
    };
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    if (this.options.strategy === 'lru') {
      // Evict least recently used
      let lruKey: string | null = null;
      let lruTime = Infinity;

      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
      }
    } else {
      // FIFO: Evict first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create cache instances for different use cases
export const productCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 500,
  strategy: 'lru'
});

export const userCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  strategy: 'lru'
});

export const settingsCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 10,
  strategy: 'lru'
});

export const orderCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 300,
  strategy: 'lru'
});

export const categoryCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutes (categories change less frequently)
  maxSize: 100,
  strategy: 'lru'
});

export const statsCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes (stats need to be relatively fresh)
  maxSize: 50,
  strategy: 'lru'
});

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cache: CacheManager,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator 
      ? keyGenerator(...args)
      : `cache_${fn.name}_${JSON.stringify(args)}`;

    // Try to get from cache
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cache.set(key, result);

    return result;
  }) as T;
}

/**
 * Invalidate cache for a specific pattern
 */
export function invalidateCache(pattern: string | RegExp, cache?: CacheManager): void {
  if (cache) {
    cache.clearPattern(pattern);
  } else {
    // Invalidate in all caches
    productCache.clearPattern(pattern);
    userCache.clearPattern(pattern);
    settingsCache.clearPattern(pattern);
    orderCache.clearPattern(pattern);
    categoryCache.clearPattern(pattern);
    statsCache.clearPattern(pattern);
  }
}

/**
 * Generate cache key from object
 */
export function generateCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  const filtered = parts.filter(p => p !== undefined && p !== null);
  return `${prefix}:${filtered.join(':')}`;
}

