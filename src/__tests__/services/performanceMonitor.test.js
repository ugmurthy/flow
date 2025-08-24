/**
 * Comprehensive test suite for Enhanced Performance Monitor Service
 * Tests all Phase 10 requirements including tracking, analysis, and recommendations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  performanceMonitor,
  trackNodeProcessing,
  getNodePerformanceStats,
  analyzeSystemPerformance,
  addPerformanceObserver,
  removePerformanceObserver,
} from '../../services/performanceMonitor.js';

describe('Enhanced Performance Monitor Service', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stopPeriodicAnalysis();
    monitor.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      const newMonitor = new PerformanceMonitor();
      
      expect(newMonitor.metrics).toBeInstanceOf(Map);
      expect(newMonitor.thresholds).toBeInstanceOf(Map);
      expect(newMonitor.observers).toBeInstanceOf(Set);
      expect(newMonitor.isEnabled).toBe(true);
      expect(newMonitor.analysisHistory).toEqual([]);
    });

    it('should setup default thresholds', () => {
      expect(monitor.thresholds.get('processingTime')).toEqual({ warning: 1000, critical: 5000 });
      expect(monitor.thresholds.get('memoryUsage')).toEqual({ warning: 100, critical: 500 });
      expect(monitor.thresholds.get('dataSize')).toEqual({ warning: 1048576, critical: 10485760 });
      expect(monitor.thresholds.get('connectionCount')).toEqual({ warning: 50, critical: 100 });
      expect(monitor.thresholds.get('errorRate')).toEqual({ warning: 0.05, critical: 0.15 });
    });

    it('should start periodic analysis by default', () => {
      const newMonitor = new PerformanceMonitor();
      expect(newMonitor.analysisInterval).toBeTruthy();
      newMonitor.stopPeriodicAnalysis();
    });
  });

  describe('Node Processing Tracking', () => {
    it('should track basic node processing metrics', () => {
      const nodeId = 'test-node-1';
      const startTime = 1000;
      const endTime = 1500;
      const dataSize = 1024;

      monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);

      const nodeMetrics = monitor.metrics.get(nodeId);
      expect(nodeMetrics).toBeTruthy();
      expect(nodeMetrics.totalProcessed).toBe(1);
      expect(nodeMetrics.lastProcessed).toBeTruthy();
      expect(nodeMetrics.averageProcessingTime).toBe(500);
      expect(nodeMetrics.processingTimes).toHaveLength(1);
      expect(nodeMetrics.dataSizes).toHaveLength(1);
    });

    it('should track additional metrics when provided', () => {
      const nodeId = 'test-node-2';
      const additional = {
        memoryUsage: 2048000,
        connectionCount: 5,
        error: new Error('Test error'),
      };

      monitor.trackNodeProcessing(nodeId, 1000, 1200, 512, additional);

      const nodeMetrics = monitor.metrics.get(nodeId);
      expect(nodeMetrics.memoryUsages).toHaveLength(1);
      expect(nodeMetrics.connections).toHaveLength(1);
      expect(nodeMetrics.errors).toHaveLength(1);
      expect(nodeMetrics.errorCount).toBe(1);
      expect(nodeMetrics.peakMemoryUsage).toBe(2048000);
    });

    it('should handle multiple processing events for same node', () => {
      const nodeId = 'test-node-3';

      // First processing
      monitor.trackNodeProcessing(nodeId, 1000, 1300, 512);
      // Second processing
      monitor.trackNodeProcessing(nodeId, 2000, 2100, 256);
      // Third processing
      monitor.trackNodeProcessing(nodeId, 3000, 3400, 1024);

      const nodeMetrics = monitor.metrics.get(nodeId);
      expect(nodeMetrics.totalProcessed).toBe(3);
      expect(nodeMetrics.processingTimes).toHaveLength(3);
      expect(nodeMetrics.dataSizes).toHaveLength(3);
      expect(nodeMetrics.averageProcessingTime).toBe((300 + 100 + 400) / 3);
    });

    it('should not track when disabled', () => {
      monitor.setEnabled(false);
      monitor.trackNodeProcessing('disabled-node', 1000, 1500, 1024);

      expect(monitor.metrics.has('disabled-node')).toBe(false);
    });

    it('should trim metric arrays to prevent memory leaks', () => {
      const nodeId = 'memory-test-node';
      
      // Add more than 100 entries
      for (let i = 0; i < 150; i++) {
        monitor.trackNodeProcessing(nodeId, i * 1000, i * 1000 + 100, 512);
      }

      const nodeMetrics = monitor.metrics.get(nodeId);
      expect(nodeMetrics.processingTimes.length).toBeLessThanOrEqual(100);
      expect(nodeMetrics.dataSizes.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Node Statistics', () => {
    beforeEach(() => {
      // Setup test data
      const nodeId = 'stats-node';
      monitor.trackNodeProcessing(nodeId, 1000, 1200, 512); // 200ms
      monitor.trackNodeProcessing(nodeId, 2000, 2300, 1024); // 300ms
      monitor.trackNodeProcessing(nodeId, 3000, 3150, 256); // 150ms
      monitor.trackNodeProcessing(nodeId, 4000, 4400, 2048, { error: new Error('Test') }); // 400ms + error
    });

    it('should calculate correct node statistics', () => {
      const stats = monitor.getNodeStats('stats-node');
      
      expect(stats.nodeId).toBe('stats-node');
      expect(stats.totalProcessed).toBe(4);
      expect(stats.averageProcessingTime).toBe(262.5); // (200+300+150+400)/4
      expect(stats.errorCount).toBe(1);
      expect(stats.errorRate).toBe(0.25); // 1/4
      expect(stats.lastProcessed).toBeTruthy();
    });

    it('should provide detailed metric statistics', () => {
      const stats = monitor.getNodeStats('stats-node');
      
      expect(stats.processingTimeStats.count).toBe(4);
      expect(stats.processingTimeStats.min).toBe(150);
      expect(stats.processingTimeStats.max).toBe(400);
      expect(stats.processingTimeStats.average).toBe(262.5);
      expect(stats.processingTimeStats.recent).toHaveLength(4);
    });

    it('should return null for non-existent node', () => {
      const stats = monitor.getNodeStats('non-existent');
      expect(stats).toBe(null);
    });

    it('should handle empty metrics gracefully', () => {
      monitor.metrics.set('empty-node', {
        processingTimes: [],
        dataSizes: [],
        memoryUsages: [],
        errors: [],
        connections: [],
        totalProcessed: 0,
        averageProcessingTime: 0,
        peakMemoryUsage: 0,
        errorCount: 0,
      });

      const stats = monitor.getNodeStats('empty-node');
      expect(stats.totalProcessed).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.processingTimeStats.count).toBe(0);
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(() => {
      // Setup comprehensive test data
      monitor.trackNodeProcessing('fast-node', 1000, 1050, 256); // 50ms - fast
      monitor.trackNodeProcessing('slow-node', 1000, 2000, 4096); // 1000ms - slow
      monitor.trackNodeProcessing('error-node', 1000, 1200, 512, { error: new Error('Frequent errors') });
      monitor.trackNodeProcessing('error-node', 2000, 2150, 512, { error: new Error('Another error') });
      monitor.trackNodeProcessing('memory-node', 1000, 1100, 1024, { memoryUsage: 150 * 1024 * 1024 }); // 150MB
    });

    it('should analyze overall performance correctly', () => {
      const analysis = monitor.analyzePerformance();

      expect(analysis.timestamp).toBeTruthy();
      expect(analysis.totalNodes).toBe(4);
      expect(analysis.slowestNodes).toBeInstanceOf(Array);
      expect(analysis.memoryUsage).toBeTruthy();
      expect(analysis.processingTrends).toBeTruthy();
      expect(analysis.errorAnalysis).toBeTruthy();
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.thresholdViolations).toBeInstanceOf(Array);
    });

    it('should identify slowest nodes correctly', () => {
      const analysis = monitor.analyzePerformance();
      const slowestNodes = analysis.slowestNodes;

      expect(slowestNodes[0].nodeId).toBe('slow-node');
      expect(slowestNodes[0].averageProcessingTime).toBe(1000);
    });

    it('should analyze memory usage', () => {
      const analysis = monitor.analyzePerformance();
      const memoryStats = analysis.memoryUsage;

      expect(memoryStats.nodesTracked).toBe(1);
      expect(memoryStats.totalMemoryUsage).toBe(150 * 1024 * 1024);
      expect(memoryStats.peakMemoryUsage).toBe(150 * 1024 * 1024);
    });

    it('should analyze error patterns', () => {
      const analysis = monitor.analyzePerformance();
      const errorAnalysis = analysis.errorAnalysis;

      expect(errorAnalysis.totalErrors).toBe(2);
      expect(errorAnalysis.totalProcessed).toBe(5);
      expect(errorAnalysis.overallErrorRate).toBe(0.4); // 2/5
      expect(errorAnalysis.nodesWithErrors).toHaveLength(1);
      expect(errorAnalysis.nodesWithErrors[0].nodeId).toBe('error-node');
    });

    it('should store analysis in history', () => {
      expect(monitor.analysisHistory).toHaveLength(0);
      
      monitor.analyzePerformance();
      expect(monitor.analysisHistory).toHaveLength(1);
      
      monitor.analyzePerformance();
      expect(monitor.analysisHistory).toHaveLength(2);
    });

    it('should trim analysis history to prevent memory leaks', () => {
      // Add more than 50 analyses
      for (let i = 0; i < 55; i++) {
        monitor.analyzePerformance();
      }

      expect(monitor.analysisHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate increasing trend correctly', () => {
      const metricArray = [
        { value: 100, timestamp: 1000 },
        { value: 150, timestamp: 2000 },
        { value: 200, timestamp: 3000 },
        { value: 250, timestamp: 4000 },
      ];

      const trend = monitor.calculateTrend(metricArray);
      expect(trend).toBe('increasing');
    });

    it('should calculate decreasing trend correctly', () => {
      const metricArray = [
        { value: 250, timestamp: 1000 },
        { value: 200, timestamp: 2000 },
        { value: 150, timestamp: 3000 },
        { value: 100, timestamp: 4000 },
      ];

      const trend = monitor.calculateTrend(metricArray);
      expect(trend).toBe('decreasing');
    });

    it('should calculate stable trend correctly', () => {
      const metricArray = [
        { value: 200, timestamp: 1000 },
        { value: 205, timestamp: 2000 },
        { value: 195, timestamp: 3000 },
        { value: 200, timestamp: 4000 },
      ];

      const trend = monitor.calculateTrend(metricArray);
      expect(trend).toBe('stable');
    });

    it('should handle empty or single-value arrays', () => {
      expect(monitor.calculateTrend([])).toBe('stable');
      expect(monitor.calculateTrend([{ value: 100, timestamp: 1000 }])).toBe('stable');
    });
  });

  describe('Threshold Checking and Violations', () => {
    it('should detect processing time violations', () => {
      const observerSpy = vi.fn();
      monitor.addObserver(observerSpy);

      // Trigger critical threshold violation
      monitor.trackNodeProcessing('slow-node', 1000, 6500, 1024); // 5500ms > 5000ms critical

      expect(observerSpy).toHaveBeenCalledWith('threshold_violation', expect.objectContaining({
        nodeId: 'slow-node',
        violations: expect.arrayContaining([
          expect.objectContaining({
            metric: 'processingTime',
            level: 'critical',
            value: 5500,
          }),
        ]),
      }));
    });

    it('should detect memory usage violations', () => {
      const observerSpy = vi.fn();
      monitor.addObserver(observerSpy);

      // Trigger warning threshold violation
      monitor.trackNodeProcessing('memory-node', 1000, 1100, 1024, {
        memoryUsage: 200 * 1024 * 1024, // 200MB > 100MB warning
      });

      expect(observerSpy).toHaveBeenCalledWith('threshold_violation', expect.objectContaining({
        nodeId: 'memory-node',
        violations: expect.arrayContaining([
          expect.objectContaining({
            metric: 'memoryUsage',
            level: 'warning',
          }),
        ]),
      }));
    });

    it('should get current threshold violations', () => {
      // Create node with violations
      monitor.trackNodeProcessing('violation-node', 1000, 7000, 1024); // 6000ms > critical
      
      const violations = monitor.getThresholdViolations();
      expect(violations).toHaveLength(1);
      expect(violations[0].nodeId).toBe('violation-node');
      expect(violations[0].metric).toBe('processingTime');
      expect(violations[0].level).toBe('critical');
    });
  });

  describe('Optimization Recommendations', () => {
    beforeEach(() => {
      // Setup nodes with various performance issues
      monitor.trackNodeProcessing('slow-processing', 1000, 7000, 1024); // Slow processing
      monitor.trackNodeProcessing('high-memory', 1000, 1100, 1024, { memoryUsage: 600 * 1024 * 1024 }); // High memory
      monitor.trackNodeProcessing('error-prone', 1000, 1100, 1024, { error: new Error('Error 1') });
      monitor.trackNodeProcessing('error-prone', 2000, 2100, 1024, { error: new Error('Error 2') });
      monitor.trackNodeProcessing('error-prone', 3000, 3100, 1024, { error: new Error('Error 3') });
    });

    it('should generate performance recommendations', () => {
      const recommendations = monitor.getOptimizationRecommendations();
      
      const performanceRec = recommendations.find(r => r.type === 'performance');
      expect(performanceRec).toBeTruthy();
      expect(performanceRec.priority).toBe('critical');
      expect(performanceRec.nodeId).toBe('slow-processing');
    });

    it('should generate memory recommendations', () => {
      const recommendations = monitor.getOptimizationRecommendations();
      
      const memoryRec = recommendations.find(r => r.type === 'memory');
      expect(memoryRec).toBeTruthy();
      expect(memoryRec.priority).toBe('critical');
    });

    it('should generate reliability recommendations', () => {
      const recommendations = monitor.getOptimizationRecommendations();
      
      const reliabilityRec = recommendations.find(r => r.type === 'reliability');
      expect(reliabilityRec).toBeTruthy();
      expect(reliabilityRec.priority).toBe('critical'); // 3/3 = 100% error rate
    });
  });

  describe('Observer Pattern', () => {
    it('should add and remove observers', () => {
      const observer1 = vi.fn();
      const observer2 = vi.fn();

      monitor.addObserver(observer1);
      monitor.addObserver(observer2);
      expect(monitor.observers.size).toBe(2);

      monitor.removeObserver(observer1);
      expect(monitor.observers.size).toBe(1);
      expect(monitor.observers.has(observer2)).toBe(true);
    });

    it('should notify observers of performance analysis', () => {
      const observerSpy = vi.fn();
      monitor.addObserver(observerSpy);

      monitor.analyzePerformance();

      expect(observerSpy).toHaveBeenCalledWith('performance_analysis', expect.objectContaining({
        timestamp: expect.any(Number),
        totalNodes: expect.any(Number),
        slowestNodes: expect.any(Array),
      }));
    });

    it('should handle observer errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorObserver = vi.fn(() => {
        throw new Error('Observer error');
      });

      monitor.addObserver(errorObserver);
      monitor.notifyObservers('test_event', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('Performance observer error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Periodic Analysis', () => {
    it('should start and stop periodic analysis', () => {
      expect(monitor.analysisInterval).toBeTruthy();

      monitor.stopPeriodicAnalysis();
      expect(monitor.analysisInterval).toBe(null);

      monitor.startPeriodicAnalysis(1000);
      expect(monitor.analysisInterval).toBeTruthy();
    });

    it('should perform analysis on interval', () => {
      const analysisSpy = vi.spyOn(monitor, 'analyzePerformance');
      
      monitor.startPeriodicAnalysis(1000);
      
      vi.advanceTimersByTime(1000);
      expect(analysisSpy).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(1000);
      expect(analysisSpy).toHaveBeenCalledTimes(2);

      analysisSpy.mockRestore();
    });

    it('should stop periodic analysis when disabled', () => {
      const stopSpy = vi.spyOn(monitor, 'stopPeriodicAnalysis');
      
      monitor.setEnabled(false);
      expect(stopSpy).toHaveBeenCalled();
      expect(monitor.isEnabled).toBe(false);

      stopSpy.mockRestore();
    });
  });

  describe('Data Management', () => {
    beforeEach(() => {
      // Setup test data
      monitor.trackNodeProcessing('test-node-1', 1000, 1100, 512);
      monitor.trackNodeProcessing('test-node-2', 1000, 1200, 1024);
      monitor.analyzePerformance();
    });

    it('should clear all data', () => {
      expect(monitor.metrics.size).toBe(2);
      expect(monitor.analysisHistory.length).toBe(1);

      monitor.clear();
      
      expect(monitor.metrics.size).toBe(0);
      expect(monitor.analysisHistory.length).toBe(0);
    });

    it('should export performance data', () => {
      const exportData = monitor.exportData();
      
      expect(exportData.metrics).toBeTruthy();
      expect(exportData.analysisHistory).toBeInstanceOf(Array);
      expect(exportData.thresholds).toBeTruthy();
      expect(exportData.configuration).toEqual({
        isEnabled: true,
        observerCount: 0,
      });
    });

    it('should generate performance summary', () => {
      const summary = monitor.getSummary();
      
      expect(summary.enabled).toBe(true);
      expect(summary.totalNodes).toBe(2);
      expect(summary.observerCount).toBe(0);
      expect(summary.currentPerformance).toBeTruthy();
      expect(summary.currentPerformance.slowestNodes).toBeInstanceOf(Array);
    });
  });

  describe('Convenience Functions', () => {
    it('should track node processing through convenience function', () => {
      trackNodeProcessing('convenience-node', 1000, 1500, 1024);
      
      const stats = getNodePerformanceStats('convenience-node');
      expect(stats).toBeTruthy();
      expect(stats.nodeId).toBe('convenience-node');
    });

    it('should analyze system performance through convenience function', () => {
      trackNodeProcessing('system-node', 1000, 1200, 512);
      
      const analysis = analyzeSystemPerformance();
      expect(analysis.totalNodes).toBe(1);
    });

    it('should manage observers through convenience functions', () => {
      const observer = vi.fn();
      
      addPerformanceObserver(observer);
      expect(performanceMonitor.observers.has(observer)).toBe(true);
      
      removePerformanceObserver(observer);
      expect(performanceMonitor.observers.has(observer)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid node IDs gracefully', () => {
      monitor.trackNodeProcessing('', 1000, 1100, 512);
      monitor.trackNodeProcessing(null, 1000, 1100, 512);
      monitor.trackNodeProcessing(undefined, 1000, 1100, 512);
      
      // Should not crash and should handle appropriately
      expect(() => monitor.getNodeStats('')).not.toThrow();
      expect(() => monitor.getNodeStats(null)).not.toThrow();
      expect(() => monitor.getNodeStats(undefined)).not.toThrow();
    });

    it('should handle negative or zero processing times', () => {
      monitor.trackNodeProcessing('edge-case-node', 2000, 1000, 512); // Negative time
      monitor.trackNodeProcessing('edge-case-node', 1000, 1000, 512); // Zero time
      
      const stats = monitor.getNodeStats('edge-case-node');
      expect(stats.totalProcessed).toBe(2);
      expect(stats.averageProcessingTime).toBe(-250); // (-1000 + 0) / 2
    });

    it('should handle very large data sizes', () => {
      const largeDataSize = Number.MAX_SAFE_INTEGER;
      
      expect(() => {
        monitor.trackNodeProcessing('large-data-node', 1000, 1100, largeDataSize);
      }).not.toThrow();
      
      const stats = monitor.getNodeStats('large-data-node');
      expect(stats.dataSizeStats.max).toBe(largeDataSize);
    });

    it('should handle concurrent access to metrics', async () => {
      const promises = [];
      
      // Simulate concurrent tracking
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            monitor.trackNodeProcessing(`concurrent-node-${i % 5}`, i * 1000, i * 1000 + 100, 512);
          })
        );
      }
      
      await Promise.all(promises);
      
      expect(monitor.metrics.size).toBe(5); // 5 unique nodes
      const stats = monitor.getNodeStats('concurrent-node-0');
      expect(stats.totalProcessed).toBe(20); // 100 / 5 = 20 per node
    });
  });
});