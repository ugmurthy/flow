/**
 * Tests for PerformanceMonitor
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../utils/performanceMonitor.js';

describe('PerformanceMonitor', () => {
  let monitor;
  let mockObserver;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockObserver = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('should record measurements', () => {
    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('test-operation');

    const metrics = monitor.getMetrics();
    expect(metrics['test-operation']).toBeDefined();
    expect(metrics['test-operation'].count).toBe(1);
    expect(metrics['test-operation'].totalTime).toBeGreaterThan(0);
  });

  test('should calculate average times correctly', () => {
    // Record multiple measurements
    for (let i = 0; i < 3; i++) {
      monitor.startMeasurement('test-operation');
      vi.advanceTimersByTime(100 + i * 50); // 100ms, 150ms, 200ms
      monitor.endMeasurement('test-operation');
    }

    const metrics = monitor.getMetrics();
    const testMetric = metrics['test-operation'];

    expect(testMetric.count).toBe(3);
    expect(testMetric.averageTime).toBeCloseTo(150, 0); // (100 + 150 + 200) / 3
  });

  test('should track min and max times', () => {
    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(50);
    monitor.endMeasurement('test-operation');

    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(200);
    monitor.endMeasurement('test-operation');

    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('test-operation');

    const metrics = monitor.getMetrics();
    const testMetric = metrics['test-operation'];

    expect(testMetric.minTime).toBeCloseTo(50, 0);
    expect(testMetric.maxTime).toBeCloseTo(200, 0);
  });

  test('should handle nested measurements', () => {
    monitor.startMeasurement('outer-operation');
    vi.advanceTimersByTime(50);
    
    monitor.startMeasurement('inner-operation');
    vi.advanceTimersByTime(30);
    monitor.endMeasurement('inner-operation');
    
    vi.advanceTimersByTime(20);
    monitor.endMeasurement('outer-operation');

    const metrics = monitor.getMetrics();
    
    expect(metrics['outer-operation'].totalTime).toBeCloseTo(100, 0);
    expect(metrics['inner-operation'].totalTime).toBeCloseTo(30, 0);
  });

  test('should measure function execution', async () => {
    const testFunction = vi.fn(() => {
      vi.advanceTimersByTime(150);
      return 'result';
    });

    const result = monitor.measureFunction('test-function', testFunction);

    expect(result).toBe('result');
    expect(testFunction).toHaveBeenCalledOnce();

    const metrics = monitor.getMetrics();
    expect(metrics['test-function']).toBeDefined();
    expect(metrics['test-function'].count).toBe(1);
  });

  test('should measure async function execution', async () => {
    const asyncFunction = vi.fn(async () => {
      vi.advanceTimersByTime(200);
      return 'async-result';
    });

    const result = await monitor.measureFunction('async-function', asyncFunction);

    expect(result).toBe('async-result');
    expect(asyncFunction).toHaveBeenCalledOnce();

    const metrics = monitor.getMetrics();
    expect(metrics['async-function']).toBeDefined();
    expect(metrics['async-function'].count).toBe(1);
  });

  test('should handle function errors', () => {
    const errorFunction = vi.fn(() => {
      vi.advanceTimersByTime(100);
      throw new Error('Test error');
    });

    expect(() => {
      monitor.measureFunction('error-function', errorFunction);
    }).toThrow('Test error');

    // Should still record the measurement
    const metrics = monitor.getMetrics();
    expect(metrics['error-function']).toBeDefined();
    expect(metrics['error-function'].count).toBe(1);
  });

  test('should notify observers of measurements', () => {
    monitor.addObserver(mockObserver);

    monitor.startMeasurement('observed-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('observed-operation');

    expect(mockObserver).toHaveBeenCalledWith({
      operation: 'observed-operation',
      duration: expect.any(Number),
      timestamp: expect.any(Number),
    });
  });

  test('should remove observers', () => {
    monitor.addObserver(mockObserver);
    monitor.removeObserver(mockObserver);

    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('test-operation');

    expect(mockObserver).not.toHaveBeenCalled();
  });

  test('should clear all metrics', () => {
    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('test-operation');

    expect(Object.keys(monitor.getMetrics())).toHaveLength(1);

    monitor.clearMetrics();

    expect(Object.keys(monitor.getMetrics())).toHaveLength(0);
  });

  test('should get metrics for specific operation', () => {
    monitor.startMeasurement('operation-1');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('operation-1');

    monitor.startMeasurement('operation-2');
    vi.advanceTimersByTime(200);
    monitor.endMeasurement('operation-2');

    const op1Metrics = monitor.getMetricsFor('operation-1');
    const op2Metrics = monitor.getMetricsFor('operation-2');

    expect(op1Metrics.totalTime).toBeCloseTo(100, 0);
    expect(op2Metrics.totalTime).toBeCloseTo(200, 0);
  });

  test('should return null for non-existent operation metrics', () => {
    const metrics = monitor.getMetricsFor('non-existent');
    expect(metrics).toBeNull();
  });

  test('should handle multiple concurrent measurements of same operation', () => {
    // Start multiple measurements of the same operation
    monitor.startMeasurement('concurrent-op');
    monitor.startMeasurement('concurrent-op');
    
    vi.advanceTimersByTime(100);
    
    monitor.endMeasurement('concurrent-op');
    monitor.endMeasurement('concurrent-op');

    const metrics = monitor.getMetrics();
    expect(metrics['concurrent-op'].count).toBe(2);
  });

  test('should handle ending measurement that was never started', () => {
    // Should not throw error
    expect(() => {
      monitor.endMeasurement('never-started');
    }).not.toThrow();

    // Should not create metrics entry
    const metrics = monitor.getMetrics();
    expect(metrics['never-started']).toBeUndefined();
  });

  test('should provide performance summary', () => {
    // Create some test data
    monitor.startMeasurement('fast-operation');
    vi.advanceTimersByTime(50);
    monitor.endMeasurement('fast-operation');

    monitor.startMeasurement('slow-operation');
    vi.advanceTimersByTime(500);
    monitor.endMeasurement('slow-operation');

    monitor.startMeasurement('frequent-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('frequent-operation');

    monitor.startMeasurement('frequent-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('frequent-operation');

    const summary = monitor.getPerformanceSummary();

    expect(summary.totalOperations).toBe(3);
    expect(summary.totalMeasurements).toBe(4);
    expect(summary.slowestOperation).toBe('slow-operation');
    expect(summary.mostFrequentOperation).toBe('frequent-operation');
  });

  test('should export metrics to JSON', () => {
    monitor.startMeasurement('test-operation');
    vi.advanceTimersByTime(100);
    monitor.endMeasurement('test-operation');

    const exported = monitor.exportMetrics();
    const parsed = JSON.parse(exported);

    expect(parsed.timestamp).toBeDefined();
    expect(parsed.metrics['test-operation']).toBeDefined();
    expect(parsed.metrics['test-operation'].count).toBe(1);
  });

  test('should import metrics from JSON', () => {
    const importData = {
      timestamp: Date.now(),
      metrics: {
        'imported-operation': {
          count: 5,
          totalTime: 500,
          averageTime: 100,
          minTime: 50,
          maxTime: 150,
        },
      },
    };

    monitor.importMetrics(JSON.stringify(importData));

    const metrics = monitor.getMetrics();
    expect(metrics['imported-operation']).toEqual(importData.metrics['imported-operation']);
  });
});