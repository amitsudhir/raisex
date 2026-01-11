/**
 * Performance monitoring utilities
 */

class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
    this.metrics = new Map();
  }

  startTimer(label) {
    this.timers.set(label, performance.now());
  }

  endTimer(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      
      // Store metric
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      this.metrics.get(label).push(duration);
      
      console.log(`[TIMER] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    return null;
  }

  getAverageTime(label) {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return null;
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return average;
  }

  getMetrics() {
    const result = {};
    for (const [label, times] of this.metrics.entries()) {
      result[label] = {
        count: times.length,
        average: this.getAverageTime(label),
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((sum, time) => sum + time, 0)
      };
    }
    return result;
  }

  logSummary() {
    console.group('[PERFORMANCE] Performance Summary');
    const metrics = this.getMetrics();
    
    Object.entries(metrics).forEach(([label, stats]) => {
      console.log(`${label}:`, {
        calls: stats.count,
        avg: `${stats.average.toFixed(2)}ms`,
        min: `${stats.min.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
        total: `${stats.total.toFixed(2)}ms`
      });
    });
    
    console.groupEnd();
  }

  clear() {
    this.timers.clear();
    this.metrics.clear();
  }
}

// Global instance
export const perfMonitor = new PerformanceMonitor();

// Decorator for async functions
export const withPerformanceTracking = (label) => {
  return (target, propertyName, descriptor) => {
    const method = descriptor.value;
    
    descriptor.value = async function (...args) {
      perfMonitor.startTimer(label);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        perfMonitor.endTimer(label);
      }
    };
    
    return descriptor;
  };
};

// Helper function for manual tracking
export const trackPerformance = async (label, asyncFn) => {
  perfMonitor.startTimer(label);
  try {
    const result = await asyncFn();
    return result;
  } finally {
    perfMonitor.endTimer(label);
  }
};

// Network performance tracking
export const trackNetworkCall = async (label, networkFn) => {
  const startTime = performance.now();
  
  try {
    const result = await networkFn();
    const duration = performance.now() - startTime;
    
    console.log(`[NETWORK] ${label}: ${duration.toFixed(2)}ms`);
    
    // Log slow network calls
    if (duration > 3000) {
      console.warn(`[WARNING] Slow network call detected: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[ERROR] ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};