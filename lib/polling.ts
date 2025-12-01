/**
 * REST API Polling System
 * Alternative to Socket.io for Vercel serverless environments
 * 
 * This provides a polling mechanism for real-time updates when Socket.io is not available
 */

import { logger } from './logger';

export interface PollingConfig {
  interval?: number; // Polling interval in milliseconds (default: 3000)
  maxRetries?: number; // Maximum retry attempts (default: 3)
  retryDelay?: number; // Delay between retries in milliseconds (default: 1000)
  onError?: (error: Error) => void;
  onSuccess?: (data: unknown) => void;
}

export interface PollingSubscription {
  id: string;
  endpoint: string;
  config: PollingConfig;
  lastUpdate: number;
  abortController: AbortController;
  timeoutId?: NodeJS.Timeout;
  isActive: boolean;
}

class PollingManager {
  private subscriptions: Map<string, PollingSubscription> = new Map();
  private defaultInterval = 3000; // 3 seconds
  private defaultMaxRetries = 3;
  private defaultRetryDelay = 1000;

  /**
   * Start polling an endpoint
   */
  subscribe(
    endpoint: string,
    config: PollingConfig = {},
    onUpdate: (data: unknown) => void
  ): string {
    const subscriptionId = `${endpoint}_${Date.now()}_${Math.random()}`;
    const abortController = new AbortController();
    
    const subscription: PollingSubscription = {
      id: subscriptionId,
      endpoint,
      config: {
        interval: config.interval || this.defaultInterval,
        maxRetries: config.maxRetries || this.defaultMaxRetries,
        retryDelay: config.retryDelay || this.defaultRetryDelay,
        onError: config.onError,
        onSuccess: config.onSuccess,
      },
      lastUpdate: Date.now(),
      abortController,
      isActive: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    // Start polling
    this.startPolling(subscription, onUpdate);
    
    logger.debug('Polling subscription started', { subscriptionId, endpoint });
    
    return subscriptionId;
  }

  /**
   * Stop polling an endpoint
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      logger.warn('Subscription not found', { subscriptionId });
      return;
    }

    subscription.isActive = false;
    
    // Safely abort controller if it exists and is not already aborted
    try {
      if (subscription.abortController && !subscription.abortController.signal.aborted) {
        subscription.abortController.abort();
      }
    } catch (error) {
      // Ignore abort errors - controller might already be aborted
      logger.debug('Abort controller error (ignored)', { subscriptionId, error });
    }
    
    if (subscription.timeoutId) {
      clearTimeout(subscription.timeoutId);
      subscription.timeoutId = undefined;
    }
    
    this.subscriptions.delete(subscriptionId);
    
    logger.debug('Polling subscription stopped', { subscriptionId });
  }

  /**
   * Stop all polling subscriptions
   */
  unsubscribeAll(): void {
    const keys = Array.from(this.subscriptions.keys());
    for (const subscriptionId of keys) {
      this.unsubscribe(subscriptionId);
    }
  }

  /**
   * Start polling loop
   */
  private async startPolling(
    subscription: PollingSubscription,
    onUpdate: (data: unknown) => void
  ): Promise<void> {
    if (!subscription.isActive) {
      return;
    }

    try {
      const response = await fetch(subscription.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: subscription.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      subscription.lastUpdate = Date.now();
      
      // Call update handler
      onUpdate(data);
      
      // Call success callback if provided
      if (subscription.config.onSuccess) {
        subscription.config.onSuccess(data);
      }
    } catch (error) {
      // Ignore AbortError - it's expected when subscription is stopped
      if (error instanceof Error && error.name === 'AbortError') {
        // Subscription was cancelled, don't retry or log as error
        return;
      }

      // Only log and handle non-abort errors if subscription is still active
      if (subscription.isActive) {
        logger.warn('Polling error', { 
          endpoint: subscription.endpoint, 
          error: error instanceof Error ? error.message : String(error)
        });

        // Call error callback if provided
        if (subscription.config.onError && error instanceof Error) {
          subscription.config.onError(error);
        }
      }
    } finally {
      if (subscription.isActive) {
        // Schedule next poll
        subscription.timeoutId = setTimeout(
          () => this.startPolling(subscription, onUpdate),
          subscription.config.interval
        );
      }
    }
  }

  /**
   * Get active subscriptions count
   */
  getActiveCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if subscription is active
   */
  isActive(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    return subscription?.isActive ?? false;
  }
}

// Singleton instance
export const pollingManager = new PollingManager();

/**
 * Simple polling hook for React components
 * Usage:
 *   const { data, error, isLoading } = usePolling('/api/notifications', { interval: 3000 });
 */
export function createPollingHook() {
  return function usePolling<T = unknown>(
    endpoint: string,
    config: PollingConfig = {}
  ): {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    stop: () => void;
  } {
    // This would be implemented in a React hook file
    // For now, this is just a placeholder
    throw new Error('usePolling must be implemented as a React hook');
  };
}

/**
 * Long polling helper (keeps connection open longer)
 */
export async function longPoll<T = unknown>(
  endpoint: string,
  timeout: number = 30000,
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine signals if both provided
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

