'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface DataCacheContextType {
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T) => void;
  clearCache: (key?: string) => void;
  clearAllCache: () => void;
  refreshData: (key: string) => void;
  isRefreshing: (key: string) => boolean;
  getCacheTimestamp: (key: string) => number | null;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<string, CacheEntry<unknown>>>(new Map());
  const [refreshingKeys, setRefreshingKeys] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cache from sessionStorage on mount
  useEffect(() => {
    try {
      const storedCache = sessionStorage.getItem('ribh_data_cache');
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        const cacheMap = new Map<string, CacheEntry<unknown>>();
        
        Object.entries(parsedCache).forEach(([key, value]: [string, any]) => {
          cacheMap.set(key, value);
        });
        
        setCache(cacheMap);
      }
    } catch (error) {
      console.error('Error loading cache from sessionStorage:', error);
    }
  }, []);

  // Save cache to sessionStorage with debounce for better performance
  useEffect(() => {
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saving to sessionStorage to avoid blocking on every cache update
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const cacheObject: Record<string, CacheEntry<unknown>> = {};
        cache.forEach((value, key) => {
          cacheObject[key] = value;
        });
        sessionStorage.setItem('ribh_data_cache', JSON.stringify(cacheObject));
      } catch (error) {
        console.error('Error saving cache to sessionStorage:', error);
      }
    }, 300); // Save after 300ms of no changes

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cache]);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }
    return entry.data as T;
  }, [cache]);

  const setCachedData = useCallback(<T,>(key: string, data: T) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, {
        data,
        timestamp: Date.now(),
        key
      });
      return newCache;
    });
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      try {
        const storedCache = sessionStorage.getItem('ribh_data_cache');
        if (storedCache) {
          const parsedCache = JSON.parse(storedCache);
          delete parsedCache[key];
          sessionStorage.setItem('ribh_data_cache', JSON.stringify(parsedCache));
        }
      } catch (error) {
        console.error('Error clearing cache from sessionStorage:', error);
      }
    } else {
      setCache(new Map());
      try {
        sessionStorage.removeItem('ribh_data_cache');
      } catch (error) {
        console.error('Error clearing all cache from sessionStorage:', error);
      }
    }
  }, []);

  const clearAllCache = useCallback(() => {
    setCache(new Map());
    try {
      sessionStorage.removeItem('ribh_data_cache');
    } catch (error) {
      console.error('Error clearing all cache from sessionStorage:', error);
    }
  }, []);

  const refreshData = useCallback((key: string) => {
    setRefreshingKeys(prev => new Set(prev).add(key));
    // Clear the cache for this key to force refresh
    clearCache(key);
    // Remove from refreshing set after a short delay
    setTimeout(() => {
      setRefreshingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 100);
  }, [clearCache]);

  const isRefreshing = useCallback((key: string): boolean => {
    return refreshingKeys.has(key);
  }, [refreshingKeys]);

  const getCacheTimestamp = useCallback((key: string): number | null => {
    const entry = cache.get(key);
    return entry ? entry.timestamp : null;
  }, [cache]);

  const value: DataCacheContextType = {
    getCachedData,
    setCachedData,
    clearCache,
    clearAllCache,
    refreshData,
    isRefreshing,
    getCacheTimestamp
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

