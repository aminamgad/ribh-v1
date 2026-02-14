/**
 * React Hook for Polling API Endpoints
 * Alternative to Socket.io for real-time updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { pollingManager, PollingConfig } from '@/lib/polling';
import { logger } from '@/lib/logger';

export interface UsePollingResult<T = unknown> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  lastUpdate: Date | null;
  stop: () => void;
  start: () => void;
}

export function usePolling<T = unknown>(
  endpoint: string | null,
  config: PollingConfig = {}
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const onUpdateRef = useRef<(data: unknown) => void>();

  // Create update handler
  const handleUpdate = useCallback((newData: unknown) => {
    try {
      setData(newData as T);
      setError(null);
      setIsLoading(false);
      setLastUpdate(new Date());
      
      if (config.onSuccess) {
        config.onSuccess(newData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      
      if (config.onError) {
        config.onError(error);
      }
    }
  }, [config]);

  // Store handler ref
  useEffect(() => {
    onUpdateRef.current = handleUpdate;
  }, [handleUpdate]);

  // Start polling
  const start = useCallback(() => {
    if (!endpoint || subscriptionIdRef.current) {
      return; // Already polling or no endpoint
    }

    try {
      const id = pollingManager.subscribe(
        endpoint,
        {
          ...config,
          onError: (err) => {
            setError(err);
            setIsLoading(false);
            if (config.onError) {
              config.onError(err);
            }
          },
        },
        (newData) => {
          if (onUpdateRef.current) {
            onUpdateRef.current(newData);
          }
        }
      );
      
      subscriptionIdRef.current = id;
      setIsLoading(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      logger.error('Failed to start polling', error, { endpoint });
    }
  }, [endpoint, config]);

  // Stop polling
  const stop = useCallback(() => {
    if (subscriptionIdRef.current) {
      pollingManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Auto-start on mount if endpoint is provided
  useEffect(() => {
    if (endpoint) {
      start();
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionIdRef.current) {
        stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return {
    data,
    error,
    isLoading,
    lastUpdate,
    stop,
    start,
  };
}

