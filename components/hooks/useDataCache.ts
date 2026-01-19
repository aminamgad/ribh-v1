'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDataCache as useDataCacheContext } from '@/components/providers/DataCacheProvider';

interface UseDataCacheOptions {
  key: string;
  fetchFn: () => Promise<any>;
  enabled?: boolean;
  forceRefresh?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseDataCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearCache: () => void;
  isCached: boolean;
  cacheTimestamp: number | null;
}

export function useDataCache<T = any>({
  key,
  fetchFn,
  enabled = true,
  forceRefresh = false,
  onSuccess,
  onError
}: UseDataCacheOptions): UseDataCacheReturn<T> {
  const cache = useDataCacheContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true); // Start with true to show loading initially
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      cache.setCachedData(key, result);
      setHasFetched(true);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, enabled, cache, onSuccess, onError]);

  // Get cached data on mount and fetch if needed
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cachedData = cache.getCachedData<T>(key);
    
    if (cachedData && !forceRefresh) {
      // Use cached data - no loading needed
      setData(cachedData);
      setHasFetched(true);
      setLoading(false); // Set loading to false immediately when using cache
      if (onSuccess) {
        onSuccess(cachedData);
      }
    } else if (!hasFetched || forceRefresh) {
      // No cached data or force refresh - fetch
      fetchData();
    } else {
      // Already fetched, just set loading to false
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, forceRefresh]); // Only run when key, enabled, or forceRefresh changes

  // Manual refresh function
  const refresh = useCallback(async () => {
    cache.refreshData(key);
    await fetchData();
  }, [key, fetchData, cache]);

  // Clear cache function
  const clearCache = useCallback(() => {
    cache.clearCache(key);
    setData(null);
  }, [key, cache]);

  // Calculate these values directly (they're fast operations)
  const isCached = cache.getCachedData<T>(key) !== null;
  const cacheTimestamp = cache.getCacheTimestamp(key);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    isCached,
    cacheTimestamp
  };
}

