// Performance monitoring and optimization utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure function execution time
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.recordMetric(name, performance.now() - start);
      return result;
    } catch (error) {
      this.recordMetric(`${name}_error`, performance.now() - start);
      throw error;
    }
  }

  // Measure synchronous function execution time
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      this.recordMetric(name, performance.now() - start);
      return result;
    } catch (error) {
      this.recordMetric(`${name}_error`, performance.now() - start);
      throw error;
    }
  }

  // Record metric
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Keep only last 100 measurements
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }

  // Get performance statistics
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  // Get all metrics
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  // Clear metrics
  clear(): void {
    this.metrics.clear();
  }
}

// Web Vitals monitoring
export class WebVitalsMonitor {
  private static vitals: Record<string, number> = {};

  static async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      // Mock implementation for now
      const mockVital = (name: string) => ({
        getCLS: (callback: any) => callback({ value: Math.random() * 0.1 }),
        getFID: (callback: any) => callback({ value: Math.random() * 100 }),
        getFCP: (callback: any) => callback({ value: Math.random() * 2000 }),
        getLCP: (callback: any) => callback({ value: Math.random() * 3000 }),
        getTTFB: (callback: any) => callback({ value: Math.random() * 500 })
      });
      
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = mockVital('vitals');
      
      getCLS((metric: any) => {
        this.vitals.CLS = metric.value;
        this.reportVital('CLS', metric.value);
      });

      getFID((metric: any) => {
        this.vitals.FID = metric.value;
        this.reportVital('FID', metric.value);
      });

      getFCP((metric: any) => {
        this.vitals.FCP = metric.value;
        this.reportVital('FCP', metric.value);
      });

      getLCP((metric: any) => {
        this.vitals.LCP = metric.value;
        this.reportVital('LCP', metric.value);
      });

      getTTFB((metric: any) => {
        this.vitals.TTFB = metric.value;
        this.reportVital('TTFB', metric.value);
      });
    } catch (error) {
      console.warn('Web Vitals monitoring failed to initialize:', error);
    }
  }

  private static reportVital(name: string, value: number): void {
    // Report to analytics service
    if ((window as any).gtag) {
      (window as any).gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        non_interaction: true,
      });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Web Vital ${name}:`, value);
    }
  }

  static getVitals(): Record<string, number> {
    return { ...this.vitals };
  }
}

// Image optimization utilities
export class ImageOptimizer {
  // Resize image to target dimensions
  static async resizeImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx!.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Convert to WebP if supported
  static async convertToWebP(file: File, quality: number = 0.8): Promise<Blob> {
    if (!this.supportsWebP()) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx!.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('WebP conversion failed'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Check WebP support
  static supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
}

// Bundle size tracking
export class BundleAnalyzer {
  static trackComponentUsage(componentName: string): void {
    if (process.env.NODE_ENV === 'development') {
      const key = `component_usage_${componentName}`;
      const count = parseInt(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, count.toString());
    }
  }

  static getUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('component_usage_')) {
        const componentName = key.replace('component_usage_', '');
        stats[componentName] = parseInt(localStorage.getItem(key) || '0');
      }
    }
    return stats;
  }
}

// Memory leak detection
export class MemoryLeakDetector {
  private static intervals: Set<number> = new Set();
  private static timeouts: Set<number> = new Set();
  private static eventListeners: WeakMap<Element, Array<{
    event: string;
    handler: EventListener;
  }>> = new WeakMap();

  static trackInterval(id: number): void {
    this.intervals.add(id);
  }

  static trackTimeout(id: number): void {
    this.timeouts.add(id);
  }

  static clearInterval(id: number): void {
    clearInterval(id);
    this.intervals.delete(id);
  }

  static clearTimeout(id: number): void {
    clearTimeout(id);
    this.timeouts.delete(id);
  }

  static addEventListener(
    element: Element,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    this.eventListeners.get(element)!.push({ event, handler });
  }

  static removeEventListener(
    element: Element,
    event: string,
    handler: EventListener
  ): void {
    element.removeEventListener(event, handler);
    
    const listeners = this.eventListeners.get(element);
    if (listeners) {
      const index = listeners.findIndex(l => l.event === event && l.handler === handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  static cleanup(): void {
    // Clear all tracked intervals and timeouts
    this.intervals.forEach(id => clearInterval(id));
    this.timeouts.forEach(id => clearTimeout(id));
    
    this.intervals.clear();
    this.timeouts.clear();

    // Report potential memory leaks
    if (process.env.NODE_ENV === 'development') {
      console.log('Memory cleanup completed');
    }
  }

  static getLeakReport(): {
    activeIntervals: number;
    activeTimeouts: number;
    trackedElements: number;
  } {
    return {
      activeIntervals: this.intervals.size,
      activeTimeouts: this.timeouts.size,
      trackedElements: 0 // WeakMap size cannot be determined
    };
  }
}

// Export performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();