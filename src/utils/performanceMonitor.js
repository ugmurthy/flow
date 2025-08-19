/**
 * Performance Monitor System
 * Tracks performance metrics for validation, synchronization, and rendering
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      validationTimes: [],
      syncTimes: [],
      renderTimes: [],
      cacheHitRates: [],
      memoryUsage: [],
    };
    this.observers = new Set();
    this.isEnabled = true;
  }

  /**
   * Start performance measurement
   * @param {string} operation - Operation name
   * @returns {Object} Measurement object
   */
  startMeasurement(operation) {
    if (!this.isEnabled) return { operation, startTime: 0, startMemory: 0 };

    return {
      operation,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
    };
  }

  /**
   * End performance measurement
   * @param {Object} measurement - Measurement object from startMeasurement
   * @returns {Object} Performance result
   */
  endMeasurement(measurement) {
    if (!this.isEnabled) return null;

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    const endMemory = this.getMemoryUsage();

    const result = {
      operation: measurement.operation,
      duration,
      memoryDelta: endMemory - measurement.startMemory,
      timestamp: Date.now(),
    };

    this.recordMetric(measurement.operation, result);
    this.notifyObservers(result);

    return result;
  }

  /**
   * Record metric
   * @param {string} operation - Operation name
   * @param {Object} result - Performance result
   */
  recordMetric(operation, result) {
    const metricKey = `${operation}Times`;
    if (this.metrics[metricKey]) {
      this.metrics[metricKey].push(result);

      // Keep only last 100 measurements
      if (this.metrics[metricKey].length > 100) {
        this.metrics[metricKey].shift();
      }
    }
  }

  /**
   * Record cache hit rate
   * @param {number} hitRate - Hit rate (0-1)
   */
  recordCacheHitRate(hitRate) {
    this.metrics.cacheHitRates.push({
      hitRate,
      timestamp: Date.now(),
    });

    // Keep only last 100 measurements
    if (this.metrics.cacheHitRates.length > 100) {
      this.metrics.cacheHitRates.shift();
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    const usage = this.getMemoryUsage();
    this.metrics.memoryUsage.push({
      usage,
      timestamp: Date.now(),
    });

    // Keep only last 100 measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const stats = {};

    for (const [key, values] of Object.entries(this.metrics)) {
      if (values.length > 0) {
        if (key === 'cacheHitRates') {
          const rates = values.map((v) => v.hitRate);
          stats[key] = {
            count: values.length,
            average: rates.reduce((a, b) => a + b, 0) / rates.length,
            min: Math.min(...rates),
            max: Math.max(...rates),
            recent: rates.slice(-10), // Last 10 measurements
          };
        } else if (key === 'memoryUsage') {
          const usage = values.map((v) => v.usage);
          stats[key] = {
            count: values.length,
            current: usage[usage.length - 1] || 0,
            average: usage.reduce((a, b) => a + b, 0) / usage.length,
            min: Math.min(...usage),
            max: Math.max(...usage),
            recent: usage.slice(-10), // Last 10 measurements
          };
        } else {
          const durations = values.map((v) => v.duration || v);
          stats[key] = {
            count: values.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            recent: durations.slice(-10), // Last 10 measurements
          };
        }
      }
    }

    return stats;
  }

  /**
   * Get memory usage
   * @returns {number} Memory usage in bytes
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Add performance observer
   * @param {Function} callback - Observer callback
   */
  addObserver(callback) {
    this.observers.add(callback);
  }

  /**
   * Remove performance observer
   * @param {Function} callback - Observer callback
   */
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * Notify observers of performance events
   * @param {Object} result - Performance result
   */
  notifyObservers(result) {
    this.observers.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Performance observer error:", error);
      }
    });
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Clear all metrics
   */
  clear() {
    for (const key of Object.keys(this.metrics)) {
      this.metrics[key] = [];
    }
  }

  /**
   * Get performance summary for debugging
   * @returns {Object} Performance summary
   */
  getSummary() {
    const stats = this.getStats();
    const summary = {
      enabled: this.isEnabled,
      observerCount: this.observers.size,
      totalMeasurements: 0,
      averagePerformance: {},
    };

    for (const [key, stat] of Object.entries(stats)) {
      summary.totalMeasurements += stat.count || 0;
      if (stat.average !== undefined) {
        summary.averagePerformance[key] = `${stat.average.toFixed(2)}ms`;
      }
    }

    return summary;
  }

  /**
   * Create a performance measurement wrapper
   * @param {string} operation - Operation name
   * @returns {Function} Wrapper function
   */
  createMeasurementWrapper(operation) {
    return (fn) => {
      return async (...args) => {
        const measurement = this.startMeasurement(operation);
        try {
          const result = await fn(...args);
          this.endMeasurement(measurement);
          return result;
        } catch (error) {
          this.endMeasurement(measurement);
          throw error;
        }
      };
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const measureValidation = performanceMonitor.createMeasurementWrapper('validation');
export const measureSync = performanceMonitor.createMeasurementWrapper('sync');
export const measureRender = performanceMonitor.createMeasurementWrapper('render');