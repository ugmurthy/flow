/**
 * Performance regression tests for optimization system
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { DebouncedValidator } from '../../utils/debouncedValidation.js';
import { ValidationCache } from '../../utils/validationCache.js';
import { PerformanceMonitor } from '../../utils/performanceMonitor.js';
import { validateWorkflowOptimized } from '../../utils/workflowValidationOptimized.js';

describe('Performance Regression Tests', () => {
  let performanceMonitor;
  let validationCache;
  let debouncedValidator;

  // Test data generators
  const generateNodes = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      type: i % 3 === 0 ? 'fetchNode' : i % 3 === 1 ? 'processNode' : 'outputNode',
      position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 },
      data: {
        label: `Node ${i}`,
        value: Math.random() * 100,
        timestamp: Date.now() + i,
      },
    }));
  };

  const generateEdges = (nodeCount) => {
    const edges = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
      });
    }
    return edges;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    performanceMonitor = new PerformanceMonitor();
    validationCache = new ValidationCache(100, 10000);
    debouncedValidator = new DebouncedValidator(validationCache, performanceMonitor);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Debouncing Performance', () => {
    test('should reduce validation calls by at least 50% under rapid updates', async () => {
      const validationSpy = vi.fn().mockResolvedValue({ valid: true });
      debouncedValidator.setValidator(validationSpy);

      const nodes = generateNodes(10);
      const edges = generateEdges(10);

      // Simulate 20 rapid validation requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(debouncedValidator.validateWorkflow(nodes, edges, 'node-update'));
      }

      vi.advanceTimersByTime(200);
      await Promise.all(promises);

      // Should call validator significantly fewer times due to debouncing
      expect(validationSpy).toHaveBeenCalledTimes(1);
      
      // Performance improvement: 95% reduction (1 call vs 20)
      const reductionPercentage = ((20 - validationSpy.mock.calls.length) / 20) * 100;
      expect(reductionPercentage).toBeGreaterThanOrEqual(50);
    });

    test('should handle different validation types with appropriate debounce times', async () => {
      const validationSpy = vi.fn().mockResolvedValue({ valid: true });
      debouncedValidator.setValidator(validationSpy);

      const nodes = generateNodes(5);
      const edges = generateEdges(5);

      // Critical validation (50ms debounce)
      debouncedValidator.validateWorkflow(nodes, edges, 'critical');
      vi.advanceTimersByTime(60);

      // Node update validation (150ms debounce)
      debouncedValidator.validateWorkflow(nodes, edges, 'node-update');
      vi.advanceTimersByTime(160);

      // General validation (300ms debounce)
      debouncedValidator.validateWorkflow(nodes, edges, 'general');
      vi.advanceTimersByTime(310);

      await vi.runAllTimersAsync();

      // Should have called validator for each type
      expect(validationSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Caching Performance', () => {
    test('should achieve at least 60% cache hit rate for repeated validations', async () => {
      const nodes = generateNodes(10);
      const edges = generateEdges(10);
      const validationResult = { valid: true, nodeCount: 10 };

      // First validation - cache miss
      validationCache.set(nodes, edges, validationResult);

      // Perform multiple cache lookups
      let hits = 0;
      let misses = 0;

      for (let i = 0; i < 10; i++) {
        const cached = validationCache.get(nodes, edges);
        if (cached) {
          hits++;
        } else {
          misses++;
          validationCache.set(nodes, edges, validationResult);
        }
      }

      const hitRate = hits / (hits + misses);
      expect(hitRate).toBeGreaterThanOrEqual(0.6);

      const stats = validationCache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0.6);
    });

    test('should maintain performance with large cache sizes', () => {
      const largeCache = new ValidationCache(1000, 10000);
      const startTime = performance.now();

      // Fill cache with many entries
      for (let i = 0; i < 500; i++) {
        const nodes = generateNodes(5);
        const edges = generateEdges(5);
        largeCache.set(nodes, edges, { valid: true, id: i });
      }

      const fillTime = performance.now() - startTime;

      // Perform lookups
      const lookupStartTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const nodes = generateNodes(5);
        const edges = generateEdges(5);
        largeCache.get(nodes, edges);
      }
      const lookupTime = performance.now() - lookupStartTime;

      // Cache operations should be fast
      expect(fillTime).toBeLessThan(1000); // Less than 1 second to fill
      expect(lookupTime).toBeLessThan(100); // Less than 100ms for 100 lookups
    });

    test('should efficiently invalidate cache entries', () => {
      const nodes = generateNodes(20);
      const edges = generateEdges(20);

      // Fill cache
      for (let i = 0; i < 20; i++) {
        const nodeSubset = nodes.slice(0, i + 1);
        validationCache.set(nodeSubset, edges, { valid: true, nodeCount: i + 1 });
      }

      expect(validationCache.cache.size).toBe(20);

      const startTime = performance.now();
      
      // Invalidate entries containing specific nodes
      validationCache.invalidateByDependencies(['node-5', 'node-10'], []);
      
      const invalidationTime = performance.now() - startTime;

      // Invalidation should be fast
      expect(invalidationTime).toBeLessThan(50); // Less than 50ms
      expect(validationCache.cache.size).toBeLessThan(20); // Some entries invalidated
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain bounded memory usage under continuous operations', () => {
      const boundedCache = new ValidationCache(50, 5000); // Limited size

      // Simulate continuous operations
      for (let i = 0; i < 200; i++) {
        const nodes = generateNodes(Math.floor(Math.random() * 10) + 1);
        const edges = generateEdges(nodes.length);
        boundedCache.set(nodes, edges, { valid: true, iteration: i });
      }

      // Cache should not exceed max size
      expect(boundedCache.cache.size).toBeLessThanOrEqual(50);

      const stats = boundedCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });

    test('should efficiently cleanup expired entries', async () => {
      const shortTtlCache = new ValidationCache(100, 100); // 100ms TTL

      // Add entries
      for (let i = 0; i < 10; i++) {
        const nodes = generateNodes(3);
        const edges = generateEdges(3);
        shortTtlCache.set(nodes, edges, { valid: true, id: i });
      }

      expect(shortTtlCache.cache.size).toBe(10);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Access cache to trigger cleanup
      const nodes = generateNodes(3);
      const edges = generateEdges(3);
      shortTtlCache.get(nodes, edges);

      // Expired entries should be cleaned up
      expect(shortTtlCache.cache.size).toBeLessThan(10);
    });
  });

  describe('Validation Performance', () => {
    test('should validate large workflows efficiently', async () => {
      const largeNodes = generateNodes(100);
      const largeEdges = generateEdges(100);

      const mockValidator = vi.fn().mockImplementation(async (nodes, edges) => {
        // Simulate validation work
        await new Promise(resolve => setTimeout(resolve, 10));
        return { valid: true, nodeCount: nodes.length, edgeCount: edges.length };
      });

      debouncedValidator.setValidator(mockValidator);

      const startTime = performance.now();
      
      const result = await validateWorkflowOptimized(largeNodes, largeEdges, {
        cache: validationCache,
        debouncer: debouncedValidator,
      });

      vi.advanceTimersByTime(200);
      
      const validationTime = performance.now() - startTime;

      expect(result.valid).toBe(true);
      expect(validationTime).toBeLessThan(500); // Should complete quickly with optimizations
    });

    test('should show performance improvement with caching', async () => {
      const nodes = generateNodes(50);
      const edges = generateEdges(50);

      let validationCount = 0;
      const mockValidator = vi.fn().mockImplementation(async () => {
        validationCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate slow validation
        return { valid: true, nodeCount: nodes.length };
      });

      debouncedValidator.setValidator(mockValidator);

      // First validation (cache miss)
      const startTime1 = performance.now();
      await validateWorkflowOptimized(nodes, edges, {
        cache: validationCache,
        debouncer: debouncedValidator,
      });
      vi.advanceTimersByTime(200);
      const time1 = performance.now() - startTime1;

      // Second validation (cache hit)
      const startTime2 = performance.now();
      await validateWorkflowOptimized(nodes, edges, {
        cache: validationCache,
        debouncer: debouncedValidator,
      });
      const time2 = performance.now() - startTime2;

      // Cached validation should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.1); // At least 90% faster
      expect(validationCount).toBe(1); // Validator called only once
    });
  });

  describe('Performance Monitoring Overhead', () => {
    test('should have minimal performance overhead', () => {
      const iterations = 1000;

      // Measure without monitoring
      const startTimeWithout = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate work
        Math.random() * 100;
      }
      const timeWithout = performance.now() - startTimeWithout;

      // Measure with monitoring
      const startTimeWith = performance.now();
      for (let i = 0; i < iterations; i++) {
        performanceMonitor.measureFunction('test-operation', () => {
          Math.random() * 100;
        });
      }
      const timeWith = performance.now() - startTimeWith;

      // Monitoring overhead should be minimal (less than 50% increase)
      const overhead = (timeWith - timeWithout) / timeWithout;
      expect(overhead).toBeLessThan(0.5);
    });

    test('should efficiently store and retrieve metrics', () => {
      const operationCount = 100;

      // Generate many measurements
      for (let i = 0; i < operationCount; i++) {
        performanceMonitor.startMeasurement(`operation-${i % 10}`);
        vi.advanceTimersByTime(Math.random() * 100);
        performanceMonitor.endMeasurement(`operation-${i % 10}`);
      }

      const startTime = performance.now();
      const metrics = performanceMonitor.getMetrics();
      const retrievalTime = performance.now() - startTime;

      expect(Object.keys(metrics)).toHaveLength(10); // 10 unique operations
      expect(retrievalTime).toBeLessThan(10); // Fast retrieval
    });
  });

  describe('Scalability Tests', () => {
    test('should handle increasing workflow sizes efficiently', async () => {
      const sizes = [10, 50, 100, 200];
      const times = [];

      for (const size of sizes) {
        const nodes = generateNodes(size);
        const edges = generateEdges(size);

        const startTime = performance.now();
        
        // Perform multiple operations
        validationCache.set(nodes, edges, { valid: true, size });
        validationCache.get(nodes, edges);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      // Performance should scale reasonably (not exponentially)
      for (let i = 1; i < times.length; i++) {
        const scaleFactor = sizes[i] / sizes[i - 1];
        const timeFactor = times[i] / times[i - 1];
        
        // Time increase should be less than quadratic
        expect(timeFactor).toBeLessThan(scaleFactor * scaleFactor);
      }
    });

    test('should maintain performance under concurrent operations', async () => {
      const concurrentOperations = 20;
      const nodes = generateNodes(20);
      const edges = generateEdges(20);

      const mockValidator = vi.fn().mockResolvedValue({ valid: true });
      debouncedValidator.setValidator(mockValidator);

      const startTime = performance.now();

      // Run concurrent operations
      const promises = Array.from({ length: concurrentOperations }, (_, i) => {
        return performanceMonitor.measureFunction(`concurrent-op-${i}`, async () => {
          await debouncedValidator.validateWorkflow(nodes, edges, 'general');
          validationCache.set(nodes, edges, { valid: true, id: i });
          return validationCache.get(nodes, edges);
        });
      });

      await Promise.all(promises);
      vi.advanceTimersByTime(400);

      const totalTime = performance.now() - startTime;

      // Should complete all operations efficiently
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
      
      const metrics = performanceMonitor.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(concurrentOperations);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance targets for typical workflows', async () => {
      // Typical workflow: 20 nodes, 25 edges
      const nodes = generateNodes(20);
      const edges = generateEdges(20);
      edges.push(...Array.from({ length: 5 }, (_, i) => ({
        id: `extra-edge-${i}`,
        source: `node-${Math.floor(Math.random() * 20)}`,
        target: `node-${Math.floor(Math.random() * 20)}`,
      })));

      const mockValidator = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { valid: true, nodeCount: nodes.length };
      });

      debouncedValidator.setValidator(mockValidator);

      // Performance targets
      const targets = {
        validationTime: 100, // ms
        cacheHitRate: 0.8,
        debouncingEfficiency: 0.7, // 70% reduction in calls
      };

      // Test validation time
      const startTime = performance.now();
      await validateWorkflowOptimized(nodes, edges, {
        cache: validationCache,
        debouncer: debouncedValidator,
      });
      vi.advanceTimersByTime(200);
      const validationTime = performance.now() - startTime;

      expect(validationTime).toBeLessThan(targets.validationTime);

      // Test cache performance
      validationCache.set(nodes, edges, { valid: true });
      for (let i = 0; i < 10; i++) {
        validationCache.get(nodes, edges);
      }
      const cacheStats = validationCache.getStats();
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(targets.cacheHitRate);

      // Test debouncing efficiency
      const rapidCalls = 10;
      for (let i = 0; i < rapidCalls; i++) {
        debouncedValidator.validateWorkflow(nodes, edges, 'node-update');
      }
      vi.advanceTimersByTime(200);

      const actualCalls = mockValidator.mock.calls.length;
      const efficiency = (rapidCalls - actualCalls) / rapidCalls;
      expect(efficiency).toBeGreaterThanOrEqual(targets.debouncingEfficiency);
    });
  });
});