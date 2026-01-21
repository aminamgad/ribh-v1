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

  getFastImages(threshold: number = 500): ImageLoadMetric[] {
    return this.metrics.filter(m => m.loadTime < threshold);
  }

  getMetricsByUrl(url: string): ImageLoadMetric[] {
    return this.metrics.filter(m => m.url === url);
  }

  getMetricsSummary() {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        slowCount: 0,
        fastCount: 0,
        slowPercentage: 0,
        fastPercentage: 0
      };
    }

    const loadTimes = this.metrics.map(m => m.loadTime);
    const slowImages = this.getSlowImages();
    const fastImages = this.getFastImages();

    return {
      total: this.metrics.length,
      average: this.getAverageLoadTime(),
      min: Math.min(...loadTimes),
      max: Math.max(...loadTimes),
      slowCount: slowImages.length,
      fastCount: fastImages.length,
      slowPercentage: (slowImages.length / this.metrics.length) * 100,
      fastPercentage: (fastImages.length / this.metrics.length) * 100
    };
  }

  // Get performance report
  getPerformanceReport(): string {
    const summary = this.getMetricsSummary();
    const slowImages = this.getSlowImages();

    let report = `\n=== Image Performance Report ===\n`;
    report += `Total Images Loaded: ${summary.total}\n`;
    report += `Average Load Time: ${summary.average.toFixed(2)}ms\n`;
    report += `Fastest: ${summary.min.toFixed(2)}ms\n`;
    report += `Slowest: ${summary.max.toFixed(2)}ms\n`;
    report += `Fast Images (<500ms): ${summary.fastCount} (${summary.fastPercentage.toFixed(1)}%)\n`;
    report += `Slow Images (>1000ms): ${summary.slowCount} (${summary.slowPercentage.toFixed(1)}%)\n`;

    if (slowImages.length > 0) {
      report += `\nSlowest Images:\n`;
      slowImages
        .sort((a, b) => b.loadTime - a.loadTime)
        .slice(0, 5)
        .forEach((img, index) => {
          const shortUrl = img.url.length > 60 ? img.url.substring(0, 60) + '...' : img.url;
          report += `${index + 1}. ${shortUrl}: ${img.loadTime.toFixed(2)}ms\n`;
        });
    }

    return report;
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

