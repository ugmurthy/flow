/**
 * Enhanced Performance Monitor Service
 * Implements Phase 10 requirements from COMPREHENSIVE_IMPLEMENTATION_PLAN.md
 * 
 * Features:
 * - Node processing tracking with detailed metrics
 * - Memory usage monitoring and analysis
 * - Processing time analytics with trend analysis
 * - Performance optimization recommendations
 * - Threshold-based alerting system
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = new Map();
    this.observers = new Set();
    this.analysisHistory = [];
    this.isEnabled = true;
    
    // Initialize default thresholds
    this.setupDefaultThresholds();
    
    // Performance analysis interval (5 minutes)
    this.analysisInterval = null;
    this.startPeriodicAnalysis();
  }

  /**
   * Setup default performance thresholds
   */
  setupDefaultThresholds() {
    this.thresholds.set('processingTime', { warning: 1000, critical: 5000 }); // ms
    this.thresholds.set('memoryUsage', { warning: 100, critical: 500 }); // MB
    this.thresholds.set('dataSize', { warning: 1024 * 1024, critical: 10 * 1024 * 1024 }); // bytes
    this.thresholds.set('connectionCount', { warning: 50, critical: 100 });
    this.thresholds.set('errorRate', { warning: 0.05, critical: 0.15 }); // 5% and 15%
  }

  /**
   * Track node processing performance
   * @param {string} nodeId - Node identifier
   * @param {number} startTime - Processing start time
   * @param {number} endTime - Processing end time
   * @param {number} dataSize - Size of data processed
   * @param {Object} additional - Additional metrics
   */
  trackNodeProcessing(nodeId, startTime, endTime, dataSize, additional = {}) {
    if (!this.isEnabled) return;

    const processingTime = endTime - startTime;
    const timestamp = Date.now();

    // Initialize node metrics if not exists
    if (!this.metrics.has(nodeId)) {
      this.metrics.set(nodeId, {
        processingTimes: [],
        dataSizes: [],
        memoryUsages: [],
        errors: [],
        connections: [],
        lastProcessed: null,
        totalProcessed: 0,
        averageProcessingTime: 0,
        peakMemoryUsage: 0,
        errorCount: 0,
      });
    }

    const nodeMetrics = this.metrics.get(nodeId);

    // Update processing metrics
    this.updateMetric(nodeId, 'processingTime', processingTime, timestamp);
    this.updateMetric(nodeId, 'dataSize', dataSize, timestamp);
    
    // Update derived metrics
    nodeMetrics.totalProcessed += 1;
    nodeMetrics.lastProcessed = timestamp;
    nodeMetrics.averageProcessingTime = this.calculateAverage(nodeMetrics.processingTimes);

    // Track additional metrics
    if (additional.memoryUsage) {
      this.updateMetric(nodeId, 'memoryUsage', additional.memoryUsage, timestamp);
      nodeMetrics.peakMemoryUsage = Math.max(nodeMetrics.peakMemoryUsage, additional.memoryUsage);
    }

    if (additional.connectionCount) {
      this.updateMetric(nodeId, 'connectionCount', additional.connectionCount, timestamp);
    }

    if (additional.error) {
      nodeMetrics.errors.push({ error: additional.error, timestamp });
      nodeMetrics.errorCount += 1;
      this.trimMetricArray(nodeMetrics.errors);
    }

    // Check thresholds and notify observers
    this.checkThresholds(nodeId, { processingTime, dataSize, ...additional });
  }

  /**
   * Update a specific metric for a node
   * @param {string} nodeId - Node identifier
   * @param {string} metricName - Metric name
   * @param {*} value - Metric value
   * @param {number} timestamp - Timestamp
   */
  updateMetric(nodeId, metricName, value, timestamp = Date.now()) {
    const nodeMetrics = this.metrics.get(nodeId);
    if (!nodeMetrics) return;

    const metricKey = `${metricName}s`;
    if (!nodeMetrics[metricKey]) {
      nodeMetrics[metricKey] = [];
    }

    nodeMetrics[metricKey].push({ value, timestamp });
    this.trimMetricArray(nodeMetrics[metricKey]);
  }

  /**
   * Trim metric arrays to prevent memory leaks
   * @param {Array} metricArray - Array to trim
   * @param {number} maxSize - Maximum array size
   */
  trimMetricArray(metricArray, maxSize = 100) {
    if (metricArray.length > maxSize) {
      metricArray.splice(0, metricArray.length - maxSize);
    }
  }

  /**
   * Calculate average from metric array
   * @param {Array} metricArray - Array of metric objects
   * @returns {number} Average value
   */
  calculateAverage(metricArray) {
    if (!metricArray || metricArray.length === 0) return 0;
    const sum = metricArray.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metricArray.length;
  }

  /**
   * Get performance statistics for a specific node
   * @param {string} nodeId - Node identifier
   * @returns {Object} Node performance statistics
   */
  getNodeStats(nodeId) {
    const nodeMetrics = this.metrics.get(nodeId);
    if (!nodeMetrics) return null;

    return {
      nodeId,
      totalProcessed: nodeMetrics.totalProcessed,
      lastProcessed: nodeMetrics.lastProcessed,
      averageProcessingTime: nodeMetrics.averageProcessingTime,
      peakMemoryUsage: nodeMetrics.peakMemoryUsage,
      errorCount: nodeMetrics.errorCount,
      errorRate: nodeMetrics.totalProcessed > 0 ? nodeMetrics.errorCount / nodeMetrics.totalProcessed : 0,
      processingTimeStats: this.getMetricStats(nodeMetrics.processingTimes),
      dataSizeStats: this.getMetricStats(nodeMetrics.dataSizes),
      memoryUsageStats: this.getMetricStats(nodeMetrics.memoryUsages),
      recentErrors: nodeMetrics.errors.slice(-5), // Last 5 errors
    };
  }

  /**
   * Get statistics for a metric array
   * @param {Array} metricArray - Array of metric objects
   * @returns {Object} Metric statistics
   */
  getMetricStats(metricArray) {
    if (!metricArray || metricArray.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, recent: [] };
    }

    const values = metricArray.map(m => m.value);
    return {
      count: values.length,
      average: this.calculateAverage(metricArray),
      min: Math.min(...values),
      max: Math.max(...values),
      recent: values.slice(-10), // Last 10 values
      trend: this.calculateTrend(metricArray.slice(-20)), // Trend over last 20 values
    };
  }

  /**
   * Calculate trend for a metric
   * @param {Array} metricArray - Array of metric objects
   * @returns {string} Trend direction ('increasing', 'decreasing', 'stable')
   */
  calculateTrend(metricArray) {
    if (metricArray.length < 2) return 'stable';

    const firstHalf = metricArray.slice(0, Math.floor(metricArray.length / 2));
    const secondHalf = metricArray.slice(Math.floor(metricArray.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze overall performance across all nodes
   * @returns {Object} Comprehensive performance analysis
   */
  analyzePerformance() {
    const analysis = {
      timestamp: Date.now(),
      totalNodes: this.metrics.size,
      slowestNodes: this.getSlowNodes(),
      memoryUsage: this.getMemoryStats(),
      processingTrends: this.getTrends(),
      errorAnalysis: this.getErrorAnalysis(),
      recommendations: this.getOptimizationRecommendations(),
      thresholdViolations: this.getThresholdViolations(),
    };

    // Store analysis in history
    this.analysisHistory.push(analysis);
    this.trimMetricArray(this.analysisHistory, 50); // Keep last 50 analyses

    // Notify observers
    this.notifyObservers('performance_analysis', analysis);

    return analysis;
  }

  /**
   * Get slowest performing nodes
   * @param {number} limit - Number of nodes to return
   * @returns {Array} Slowest nodes
   */
  getSlowNodes(limit = 10) {
    const nodeStats = Array.from(this.metrics.entries()).map(([nodeId, metrics]) => ({
      nodeId,
      averageProcessingTime: metrics.averageProcessingTime,
      totalProcessed: metrics.totalProcessed,
      errorRate: metrics.totalProcessed > 0 ? metrics.errorCount / metrics.totalProcessed : 0,
    }));

    return nodeStats
      .filter(node => node.totalProcessed > 0)
      .sort((a, b) => b.averageProcessingTime - a.averageProcessingTime)
      .slice(0, limit);
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage analysis
   */
  getMemoryStats() {
    let totalMemoryUsage = 0;
    let peakMemoryUsage = 0;
    let nodesWithMemoryData = 0;

    for (const [nodeId, metrics] of this.metrics.entries()) {
      if (metrics.memoryUsages && metrics.memoryUsages.length > 0) {
        const recent = metrics.memoryUsages.slice(-1)[0];
        totalMemoryUsage += recent ? recent.value : 0;
        peakMemoryUsage = Math.max(peakMemoryUsage, metrics.peakMemoryUsage || 0);
        nodesWithMemoryData++;
      }
    }

    return {
      totalMemoryUsage,
      averageMemoryUsage: nodesWithMemoryData > 0 ? totalMemoryUsage / nodesWithMemoryData : 0,
      peakMemoryUsage,
      nodesTracked: nodesWithMemoryData,
    };
  }

  /**
   * Get processing trends across all nodes
   * @returns {Object} Processing trends analysis
   */
  getTrends() {
    const trends = {
      processingTime: { increasing: 0, decreasing: 0, stable: 0 },
      memoryUsage: { increasing: 0, decreasing: 0, stable: 0 },
      errorRate: { increasing: 0, decreasing: 0, stable: 0 },
    };

    for (const [nodeId, metrics] of this.metrics.entries()) {
      // Processing time trend
      const processingTrend = this.calculateTrend(metrics.processingTimes || []);
      trends.processingTime[processingTrend]++;

      // Memory usage trend
      const memoryTrend = this.calculateTrend(metrics.memoryUsages || []);
      trends.memoryUsage[memoryTrend]++;

      // Error rate trend (calculated from recent error occurrences)
      const errorTrend = this.calculateErrorTrend(metrics.errors || []);
      trends.errorRate[errorTrend]++;
    }

    return trends;
  }

  /**
   * Calculate error rate trend
   * @param {Array} errors - Array of error objects
   * @returns {string} Trend direction
   */
  calculateErrorTrend(errors) {
    if (errors.length < 2) return 'stable';

    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds

    const recentErrors = errors.filter(error => error.timestamp > oneHourAgo);
    const olderErrors = errors.filter(error => error.timestamp <= oneHourAgo);

    if (recentErrors.length > olderErrors.length * 1.5) return 'increasing';
    if (recentErrors.length < olderErrors.length * 0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Get error analysis across all nodes
   * @returns {Object} Error analysis
   */
  getErrorAnalysis() {
    let totalErrors = 0;
    let totalProcessed = 0;
    const errorTypes = new Map();
    const nodesWithErrors = [];

    for (const [nodeId, metrics] of this.metrics.entries()) {
      totalErrors += metrics.errorCount || 0;
      totalProcessed += metrics.totalProcessed || 0;

      if (metrics.errorCount > 0) {
        nodesWithErrors.push({
          nodeId,
          errorCount: metrics.errorCount,
          errorRate: metrics.totalProcessed > 0 ? metrics.errorCount / metrics.totalProcessed : 0,
        });
      }

      // Categorize error types
      (metrics.errors || []).forEach(errorObj => {
        const errorType = errorObj.error?.name || 'Unknown';
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      });
    }

    return {
      totalErrors,
      totalProcessed,
      overallErrorRate: totalProcessed > 0 ? totalErrors / totalProcessed : 0,
      nodesWithErrors: nodesWithErrors.sort((a, b) => b.errorRate - a.errorRate),
      errorTypes: Array.from(errorTypes.entries()).map(([type, count]) => ({ type, count })),
    };
  }

  /**
   * Generate optimization recommendations
   * @returns {Array} Array of recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const slowNodes = this.getSlowNodes(5);
    const memoryStats = this.getMemoryStats();
    const errorAnalysis = this.getErrorAnalysis();

    // Performance recommendations
    if (slowNodes.length > 0) {
      const slowestNode = slowNodes[0];
      if (slowestNode.averageProcessingTime > this.thresholds.get('processingTime').warning) {
        recommendations.push({
          type: 'performance',
          priority: slowestNode.averageProcessingTime > this.thresholds.get('processingTime').critical ? 'critical' : 'warning',
          nodeId: slowestNode.nodeId,
          message: `Node ${slowestNode.nodeId} has high average processing time (${slowestNode.averageProcessingTime.toFixed(2)}ms)`,
          suggestion: 'Consider optimizing the node\'s processing logic or reducing input data size',
        });
      }
    }

    // Memory recommendations
    if (memoryStats.peakMemoryUsage > this.thresholds.get('memoryUsage').warning * 1024 * 1024) {
      recommendations.push({
        type: 'memory',
        priority: memoryStats.peakMemoryUsage > this.thresholds.get('memoryUsage').critical * 1024 * 1024 ? 'critical' : 'warning',
        message: `High memory usage detected (${(memoryStats.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB)`,
        suggestion: 'Review memory usage patterns and consider implementing data streaming or chunking',
      });
    }

    // Error recommendations
    if (errorAnalysis.overallErrorRate > this.thresholds.get('errorRate').warning) {
      recommendations.push({
        type: 'reliability',
        priority: errorAnalysis.overallErrorRate > this.thresholds.get('errorRate').critical ? 'critical' : 'warning',
        message: `High error rate detected (${(errorAnalysis.overallErrorRate * 100).toFixed(2)}%)`,
        suggestion: 'Investigate error patterns and implement better error handling or validation',
      });
    }

    return recommendations;
  }

  /**
   * Check performance thresholds
   * @param {string} nodeId - Node identifier
   * @param {Object} metrics - Current metrics
   */
  checkThresholds(nodeId, metrics) {
    const violations = [];

    for (const [metricName, value] of Object.entries(metrics)) {
      const threshold = this.thresholds.get(metricName);
      if (threshold) {
        if (value > threshold.critical) {
          violations.push({ nodeId, metric: metricName, value, level: 'critical', threshold: threshold.critical });
        } else if (value > threshold.warning) {
          violations.push({ nodeId, metric: metricName, value, level: 'warning', threshold: threshold.warning });
        }
      }
    }

    if (violations.length > 0) {
      this.notifyObservers('threshold_violation', { nodeId, violations });
    }
  }

  /**
   * Get current threshold violations
   * @returns {Array} Current threshold violations
   */
  getThresholdViolations() {
    const violations = [];

    for (const [nodeId, metrics] of this.metrics.entries()) {
      // Check processing time
      if (metrics.averageProcessingTime > this.thresholds.get('processingTime').warning) {
        violations.push({
          nodeId,
          metric: 'processingTime',
          value: metrics.averageProcessingTime,
          level: metrics.averageProcessingTime > this.thresholds.get('processingTime').critical ? 'critical' : 'warning',
        });
      }

      // Check error rate
      const errorRate = metrics.totalProcessed > 0 ? metrics.errorCount / metrics.totalProcessed : 0;
      if (errorRate > this.thresholds.get('errorRate').warning) {
        violations.push({
          nodeId,
          metric: 'errorRate',
          value: errorRate,
          level: errorRate > this.thresholds.get('errorRate').critical ? 'critical' : 'warning',
        });
      }
    }

    return violations;
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
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * Start periodic performance analysis
   * @param {number} interval - Analysis interval in milliseconds
   */
  startPeriodicAnalysis(interval = 300000) { // 5 minutes
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, interval);
  }

  /**
   * Stop periodic performance analysis
   */
  stopPeriodicAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopPeriodicAnalysis();
    } else {
      this.startPeriodicAnalysis();
    }
  }

  /**
   * Clear all performance data
   */
  clear() {
    this.metrics.clear();
    this.analysisHistory = [];
  }

  /**
   * Export performance data for analysis
   * @returns {Object} Exportable performance data
   */
  exportData() {
    return {
      metrics: Object.fromEntries(this.metrics),
      analysisHistory: this.analysisHistory,
      thresholds: Object.fromEntries(this.thresholds),
      configuration: {
        isEnabled: this.isEnabled,
        observerCount: this.observers.size,
      },
    };
  }

  /**
   * Get performance summary for debugging
   * @returns {Object} Performance summary
   */
  getSummary() {
    const analysis = this.analyzePerformance();
    
    return {
      enabled: this.isEnabled,
      totalNodes: this.metrics.size,
      observerCount: this.observers.size,
      recentAnalyses: this.analysisHistory.length,
      currentPerformance: {
        slowestNodes: analysis.slowestNodes.slice(0, 3),
        memoryUsage: `${(analysis.memoryUsage.totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        errorRate: `${(analysis.errorAnalysis.overallErrorRate * 100).toFixed(2)}%`,
        recommendations: analysis.recommendations.length,
        violations: analysis.thresholdViolations.length,
      },
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions for common operations
export const trackNodeProcessing = (nodeId, startTime, endTime, dataSize, additional) => 
  performanceMonitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize, additional);

export const getNodePerformanceStats = (nodeId) => 
  performanceMonitor.getNodeStats(nodeId);

export const analyzeSystemPerformance = () => 
  performanceMonitor.analyzePerformance();

export const addPerformanceObserver = (callback) => 
  performanceMonitor.addObserver(callback);

export const removePerformanceObserver = (callback) => 
  performanceMonitor.removeObserver(callback);