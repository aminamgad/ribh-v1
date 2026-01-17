/**
 * Image Performance Monitoring Utilities
 * Tracks image loading performance metrics
 */

interface ImageLoadMetric {
  url: string;
  loadTime: number;
  size?: string;
  timestamp: number;
  retryCount?: number;
}

class ImagePerformanceMonitor {
  private metrics: ImageLoadMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  logImageLoad(metric: ImageLoadMetric) {
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const { url, loadTime, size, retryCount } = metric;
      const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
      
      console.log(`[Image Performance] ${shortUrl}`, {
        loadTime: `${loadTime.toFixed(2)}ms`,
        size: size || 'unknown',
        retryCount: retryCount || 0
      });

      // Warn on slow loads
      if (loadTime > 1000) {
        console.warn(`[Image Performance] ⚠️ Slow load: ${loadTime.toFixed(2)}ms for ${shortUrl}`);
      }
    }
  }

  getMetrics(): ImageLoadMetric[] {
    return [...this.metrics];
  }

  getAverageLoadTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.loadTime, 0);
    return total / this.metrics.length;
  }

  getSlowImages(threshold: number = 1000): ImageLoadMetric[] {
    return this.metrics.filter(m => m.loadTime > threshold);
  }

  clearMetrics() {
    this.metrics = [];
  }

  // Measure LCP (Largest Contentful Paint) for images
  measureLCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        if (lastEntry && lastEntry.element && lastEntry.element.tagName === 'IMG') {
          const imgUrl = (lastEntry.element as HTMLImageElement).src;
          const loadTime = lastEntry.renderTime || lastEntry.loadTime || 0;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Image Performance] LCP Image detected:', {
              url: imgUrl.substring(0, 50) + '...',
              loadTime: `${loadTime.toFixed(2)}ms`,
              size: `${lastEntry.size || 'unknown'}`
            });
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // PerformanceObserver not supported or error
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Image Performance] LCP measurement not available');
      }
    }
  }
}

// Singleton instance
export const imagePerformanceMonitor = new ImagePerformanceMonitor();

// Initialize LCP measurement on client side
if (typeof window !== 'undefined') {
  // Wait for page load
  if (document.readyState === 'complete') {
    imagePerformanceMonitor.measureLCP();
  } else {
    window.addEventListener('load', () => {
      imagePerformanceMonitor.measureLCP();
    });
  }
}

