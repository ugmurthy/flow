/**
 * Performance benchmarking tests for Enhanced Performance Monitor Service
 * Measures actual performance metrics and system impact under various load conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { PerformanceMonitor } from '../../services/performanceMonitor.js';

// Benchmark thresholds and configurations
const BENCHMARK_CONFIG = {
  // Performance thresholds (in milliseconds)
  TRACKING_OVERHEAD_MAX: 5, // Max overhead per tracking call
  ANALYSIS_TIME_MAX: 100, // Max time for performance analysis
  MEMORY_CLEANUP_TIME_MAX: 50, // Max time for memory cleanup
  
  // Load testing parameters
  HIGH_LOAD_OPERATIONS: 10000,
  STRESS_TEST_OPERATIONS: 100000,
  CONCURRENT_NODES: 1000,
  
  // Data size tests
  SMALL_DATA_SIZE: 1024, // 1KB
  MEDIUM_DATA_SIZE: 1024 * 1024, // 1MB
  LARGE_DATA_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Memory thresholds
  MAX_MEMORY_INCREASE_MB: 50, // Max memory increase during tests
  MEMORY_LEAK_THRESHOLD_MB: 10, // Memory leak detection threshold
};

describe('Performance Monitor Benchmarks', () => {
  let monitor;
  let initialMemoryUsage;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    initialMemoryUsage = process.memoryUsage?.().heapUsed || 0;
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor.stopPeriodicAnalysis();
    monitor.clear();
    vi.useRealTimers();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Core Performance Benchmarks', () => {
    it('should track node processing with minimal overhead', async () => {
      const iterations = 10000;
      const testData = Array.from({ length: iterations }, (_, i) => ({
        nodeId: `benchmark-node-${i % 100}`, // 100 unique nodes
        startTime: i * 1000,
        endTime: i * 1000 + Math.random() * 100,
        dataSize: BENCHMARK_CONFIG.SMALL_DATA_SIZE + Math.random() * 1024,
      }));

      // Measure performance with monitoring enabled
      const startWithMonitoring = performance.now();
      
      testData.forEach(({ nodeId, startTime, endTime, dataSize }) => {
        monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);
      });
      
      const endWithMonitoring = performance.now();
      const timeWithMonitoring = endWithMonitoring - startWithMonitoring;

      // Measure performance with monitoring disabled
      monitor.clear();
      monitor.setEnabled(false);
      
      const startWithoutMonitoring = performance.now();
      
      testData.forEach(({ nodeId, startTime, endTime, dataSize }) => {
        monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);
      });
      
      const endWithoutMonitoring = performance.now();
      const timeWithoutMonitoring = endWithoutMonitoring - startWithoutMonitoring;

      // Calculate overhead
      const overheadPerOperation = (timeWithMonitoring - timeWithoutMonitoring) / iterations;
      const overheadPercentage = ((timeWithMonitoring - timeWithoutMonitoring) / timeWithoutMonitoring) * 100;

      console.log(`Tracking Overhead Benchmark:`, {
        iterations,
        timeWithMonitoring: `${timeWithMonitoring.toFixed(2)}ms`,
        timeWithoutMonitoring: `${timeWithoutMonitoring.toFixed(2)}ms`,
        overheadPerOperation: `${overheadPerOperation.toFixed(4)}ms`,
        overheadPercentage: `${overheadPercentage.toFixed(2)}%`,
      });

      // Assertions
      expect(overheadPerOperation).toBeLessThan(BENCHMARK_CONFIG.TRACKING_OVERHEAD_MAX);
      expect(timeWithMonitoring).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should perform analysis efficiently under high load', async () => {
      // Generate high-load test data
      const nodeCount = 500;
      const operationsPerNode = 200;

      console.log(`Generating ${nodeCount * operationsPerNode} performance data points...`);

      // Setup test data
      for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
        for (let op = 0; op < operationsPerNode; op++) {
          const startTime = op * 1000;
          const processingTime = 50 + Math.random() * 200; // 50-250ms
          const endTime = startTime + processingTime;
          const dataSize = BENCHMARK_CONFIG.SMALL_DATA_SIZE + Math.random() * 2048;
          
          monitor.trackNodeProcessing(
            `load-test-node-${nodeId}`,
            startTime,
            endTime,
            dataSize,
            {
              memoryUsage: (20 + Math.random() * 80) * 1024 * 1024, // 20-100MB
              connectionCount: Math.floor(Math.random() * 20),
              ...(Math.random() < 0.05 && { error: new Error('Random error') }), // 5% error rate
            }
          );
        }
      }

      // Benchmark analysis performance
      const analysisStartTime = performance.now();
      const analysis = monitor.analyzePerformance();
      const analysisEndTime = performance.now();
      const analysisTime = analysisEndTime - analysisStartTime;

      console.log(`Analysis Performance Benchmark:`, {
        totalNodes: analysis.totalNodes,
        totalDataPoints: nodeCount * operationsPerNode,
        analysisTime: `${analysisTime.toFixed(2)}ms`,
        slowestNodes: analysis.slowestNodes.length,
        recommendations: analysis.recommendations.length,
        violations: analysis.thresholdViolations.length,
      });

      // Assertions
      expect(analysis.totalNodes).toBe(nodeCount);
      expect(analysisTime).toBeLessThan(BENCHMARK_CONFIG.ANALYSIS_TIME_MAX);
      expect(analysis.slowestNodes).toHaveLength(Math.min(10, nodeCount)); // Default limit is 10
    });

    it('should handle memory efficiently during continuous operation', async () => {
      const iterations = BENCHMARK_CONFIG.HIGH_LOAD_OPERATIONS;
      const memoryCheckInterval = 1000;
      const memoryUsages = [];

      console.log(`Running continuous operation test with ${iterations} iterations...`);

      for (let i = 0; i < iterations; i++) {
        const nodeId = `continuous-node-${i % 50}`; // 50 rotating nodes
        const startTime = i * 10;
        const endTime = startTime + Math.random() * 100;
        const dataSize = BENCHMARK_CONFIG.SMALL_DATA_SIZE;

        monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);

        // Check memory usage periodically
        if (i % memoryCheckInterval === 0 && process.memoryUsage) {
          const currentMemory = process.memoryUsage().heapUsed;
          const memoryIncrease = (currentMemory - initialMemoryUsage) / 1024 / 1024; // MB
          memoryUsages.push({ iteration: i, memoryMB: memoryIncrease });
          
          console.log(`Memory at iteration ${i}: ${memoryIncrease.toFixed(2)}MB`);
        }
      }

      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      const totalMemoryIncrease = (finalMemory - initialMemoryUsage) / 1024 / 1024;

      console.log(`Memory Usage Benchmark:`, {
        iterations,
        initialMemoryMB: (initialMemoryUsage / 1024 / 1024).toFixed(2),
        finalMemoryMB: (finalMemory / 1024 / 1024).toFixed(2),
        totalIncreaseMB: totalMemoryIncrease.toFixed(2),
        memoryEfficiency: `${((totalMemoryIncrease / iterations) * 1024).toFixed(4)}KB per operation`,
      });

      // Assertions
      expect(totalMemoryIncrease).toBeLessThan(BENCHMARK_CONFIG.MAX_MEMORY_INCREASE_MB);
      
      // Memory should not grow linearly with iterations (indicating good cleanup)
      if (memoryUsages.length > 2) {
        const firstHalf = memoryUsages.slice(0, Math.floor(memoryUsages.length / 2));
        const secondHalf = memoryUsages.slice(Math.floor(memoryUsages.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.memoryMB, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.memoryMB, 0) / secondHalf.length;
        
        const memoryGrowthRate = secondHalfAvg - firstHalfAvg;
        expect(memoryGrowthRate).toBeLessThan(BENCHMARK_CONFIG.MEMORY_LEAK_THRESHOLD_MB);
      }
    });
  });

  describe('Scalability Benchmarks', () => {
    it('should scale efficiently with increasing node count', async () => {
      const nodeCounts = [10, 50, 100, 500, 1000];
      const operationsPerNode = 100;
      const results = [];

      for (const nodeCount of nodeCounts) {
        monitor.clear();
        
        const startTime = performance.now();
        
        // Generate test data for this node count
        for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
          for (let op = 0; op < operationsPerNode; op++) {
            monitor.trackNodeProcessing(
              `scale-test-node-${nodeId}`,
              op * 1000,
              op * 1000 + 50 + Math.random() * 100,
              BENCHMARK_CONFIG.SMALL_DATA_SIZE
            );
          }
        }
        
        const trackingTime = performance.now() - startTime;
        
        // Measure analysis time
        const analysisStart = performance.now();
        const analysis = monitor.analyzePerformance();
        const analysisTime = performance.now() - analysisStart;
        
        results.push({
          nodeCount,
          totalOperations: nodeCount * operationsPerNode,
          trackingTime,
          analysisTime,
          trackingTimePerOp: trackingTime / (nodeCount * operationsPerNode),
          memoryUsage: process.memoryUsage?.().heapUsed || 0,
        });
        
        console.log(`Scalability test - Nodes: ${nodeCount}, Tracking: ${trackingTime.toFixed(2)}ms, Analysis: ${analysisTime.toFixed(2)}ms`);
      }

      // Analyze scalability
      console.log(`Scalability Benchmark Results:`, results.map(r => ({
        nodeCount: r.nodeCount,
        trackingTimeMs: r.trackingTime.toFixed(2),
        analysisTimeMs: r.analysisTime.toFixed(2),
        timePerOpMs: r.trackingTimePerOp.toFixed(4),
      })));

      // Assertions - time complexity should be reasonable
      const smallScale = results.find(r => r.nodeCount === 10);
      const largeScale = results.find(r => r.nodeCount === 1000);
      
      if (smallScale && largeScale) {
        const scalingFactor = largeScale.nodeCount / smallScale.nodeCount; // 100x nodes
        const performanceFactor = largeScale.trackingTime / smallScale.trackingTime;
        
        // Performance should not degrade more than O(n log n)
        expect(performanceFactor).toBeLessThan(scalingFactor * Math.log10(scalingFactor));
      }
    });

    it('should handle concurrent access efficiently', async () => {
      const concurrentOperations = 1000;
      const nodeCount = 100;
      
      console.log(`Testing concurrent access with ${concurrentOperations} operations across ${nodeCount} nodes...`);

      const startTime = performance.now();

      // Create concurrent operations
      const promises = Array.from({ length: concurrentOperations }, (_, i) => {
        return new Promise(resolve => {
          // Simulate async processing
          setTimeout(() => {
            const nodeId = `concurrent-node-${i % nodeCount}`;
            const opStartTime = performance.now();
            const opEndTime = opStartTime + Math.random() * 50;
            const dataSize = BENCHMARK_CONFIG.SMALL_DATA_SIZE;
            
            monitor.trackNodeProcessing(nodeId, opStartTime, opEndTime, dataSize);
            resolve();
          }, Math.random() * 10); // Stagger operations
        });
      });

      await Promise.all(promises);
      
      const totalTime = performance.now() - startTime;
      const analysis = monitor.analyzePerformance();

      console.log(`Concurrent Access Benchmark:`, {
        operations: concurrentOperations,
        nodes: nodeCount,
        totalTimeMs: totalTime.toFixed(2),
        timePerOperationMs: (totalTime / concurrentOperations).toFixed(4),
        finalNodeCount: analysis.totalNodes,
        avgOperationsPerNode: (concurrentOperations / analysis.totalNodes).toFixed(1),
      });

      // Assertions
      expect(analysis.totalNodes).toBe(nodeCount);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(totalTime / concurrentOperations).toBeLessThan(1); // Less than 1ms per operation
    });
  });

  describe('Data Size Performance Benchmarks', () => {
    it('should handle varying data sizes efficiently', async () => {
      const dataSizes = [
        { name: 'small', size: BENCHMARK_CONFIG.SMALL_DATA_SIZE },
        { name: 'medium', size: BENCHMARK_CONFIG.MEDIUM_DATA_SIZE },
        { name: 'large', size: BENCHMARK_CONFIG.LARGE_DATA_SIZE },
      ];
      
      const operationsPerSize = 100;
      const results = [];

      for (const { name, size } of dataSizes) {
        monitor.clear();
        
        const startTime = performance.now();
        
        for (let i = 0; i < operationsPerSize; i++) {
          monitor.trackNodeProcessing(
            `data-size-test-${name}-${i}`,
            i * 1000,
            i * 1000 + 100,
            size
          );
        }
        
        const trackingTime = performance.now() - startTime;
        
        const analysisStart = performance.now();
        const analysis = monitor.analyzePerformance();
        const analysisTime = performance.now() - analysisStart;
        
        results.push({
          dataSize: name,
          sizeBytes: size,
          sizeMB: (size / 1024 / 1024).toFixed(2),
          operations: operationsPerSize,
          trackingTime,
          analysisTime,
          avgTimePerOp: trackingTime / operationsPerSize,
        });
        
        console.log(`Data size test - ${name} (${(size / 1024 / 1024).toFixed(2)}MB): Tracking ${trackingTime.toFixed(2)}ms, Analysis ${analysisTime.toFixed(2)}ms`);
      }

      console.log(`Data Size Performance Results:`, results);

      // Assertions - performance should degrade gracefully with data size
      const smallResult = results.find(r => r.dataSize === 'small');
      const largeResult = results.find(r => r.dataSize === 'large');
      
      if (smallResult && largeResult) {
        const dataSizeRatio = largeResult.sizeBytes / smallResult.sizeBytes;
        const performanceRatio = largeResult.avgTimePerOp / smallResult.avgTimePerOp;
        
        // Performance degradation should be reasonable
        expect(performanceRatio).toBeLessThan(dataSizeRatio * 2); // Allow 2x the linear degradation
      }
    });

    it('should maintain performance with mixed data sizes', async () => {
      const operations = 1000;
      const mixedDataSizes = [
        BENCHMARK_CONFIG.SMALL_DATA_SIZE,
        BENCHMARK_CONFIG.MEDIUM_DATA_SIZE,
        BENCHMARK_CONFIG.LARGE_DATA_SIZE,
      ];

      console.log(`Testing mixed data sizes with ${operations} operations...`);

      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        const dataSize = mixedDataSizes[i % mixedDataSizes.length];
        monitor.trackNodeProcessing(
          `mixed-size-node-${i % 10}`,
          i * 1000,
          i * 1000 + 100,
          dataSize
        );
      }

      const trackingTime = performance.now() - startTime;
      const analysis = monitor.analyzePerformance();

      console.log(`Mixed Data Size Benchmark:`, {
        operations,
        trackingTimeMs: trackingTime.toFixed(2),
        avgTimePerOpMs: (trackingTime / operations).toFixed(4),
        totalNodes: analysis.totalNodes,
        avgDataSizeKB: (mixedDataSizes.reduce((a, b) => a + b, 0) / mixedDataSizes.length / 1024).toFixed(2),
      });

      // Assertions
      expect(trackingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(trackingTime / operations).toBeLessThan(2); // Less than 2ms per operation
    });
  });

  describe('Error Scenario Benchmarks', () => {
    it('should maintain performance during high error rates', async () => {
      const operations = 5000;
      const errorRates = [0.1, 0.3, 0.5]; // 10%, 30%, 50% error rates
      const results = [];

      for (const errorRate of errorRates) {
        monitor.clear();
        
        const startTime = performance.now();
        
        for (let i = 0; i < operations; i++) {
          const shouldError = Math.random() < errorRate;
          const additional = shouldError ? { error: new Error(`Error ${i}`) } : {};
          
          monitor.trackNodeProcessing(
            `error-test-node-${i % 20}`,
            i * 1000,
            i * 1000 + 50,
            BENCHMARK_CONFIG.SMALL_DATA_SIZE,
            additional
          );
        }
        
        const trackingTime = performance.now() - startTime;
        const analysis = monitor.analyzePerformance();
        
        results.push({
          errorRate: (errorRate * 100).toFixed(0) + '%',
          operations,
          trackingTime,
          avgTimePerOp: trackingTime / operations,
          actualErrorRate: analysis.errorAnalysis.overallErrorRate,
          totalErrors: analysis.errorAnalysis.totalErrors,
        });
        
        console.log(`Error rate test - ${(errorRate * 100).toFixed(0)}%: ${trackingTime.toFixed(2)}ms, ${analysis.errorAnalysis.totalErrors} errors`);
      }

      console.log(`Error Scenario Benchmark Results:`, results);

      // Assertions - performance should remain stable even with high error rates
      const lowErrorResult = results.find(r => r.errorRate === '10%');
      const highErrorResult = results.find(r => r.errorRate === '50%');
      
      if (lowErrorResult && highErrorResult) {
        const performanceRatio = highErrorResult.avgTimePerOp / lowErrorResult.avgTimePerOp;
        expect(performanceRatio).toBeLessThan(2); // Should not be more than 2x slower with errors
      }
    });
  });

  describe('Threshold and Analysis Benchmarks', () => {
    it('should efficiently detect threshold violations', async () => {
      const operations = 10000;
      const violationRate = 0.1; // 10% of operations should violate thresholds
      
      let violationCount = 0;
      const violationObserver = vi.fn(() => { violationCount++; });
      monitor.addObserver(violationObserver);

      console.log(`Testing threshold violation detection with ${operations} operations...`);

      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        // Create some operations that violate thresholds
        const shouldViolate = Math.random() < violationRate;
        const processingTime = shouldViolate ? 6000 : 100; // Critical threshold is 5000ms
        const dataSize = shouldViolate ? 15 * 1024 * 1024 : 1024; // Critical is 10MB
        
        monitor.trackNodeProcessing(
          `threshold-test-node-${i % 50}`,
          i * 1000,
          i * 1000 + processingTime,
          dataSize
        );
      }

      const trackingTime = performance.now() - startTime;
      const analysis = monitor.analyzePerformance();

      console.log(`Threshold Violation Benchmark:`, {
        operations,
        trackingTimeMs: trackingTime.toFixed(2),
        expectedViolations: Math.floor(operations * violationRate),
        detectedViolations: violationCount,
        analysisViolations: analysis.thresholdViolations.length,
        detectionRate: (violationCount / (operations * violationRate) * 100).toFixed(1) + '%',
      });

      // Assertions
      expect(trackingTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(violationCount).toBeGreaterThan(operations * violationRate * 0.8); // Detect at least 80% of violations
    });

    it('should generate recommendations efficiently', async () => {
      // Create problematic nodes
      const problemNodes = [
        { type: 'slow', count: 10, processingTime: 3000 },
        { type: 'memory', count: 5, memoryUsage: 200 * 1024 * 1024 },
        { type: 'error', count: 8, errorRate: 0.4 },
      ];

      console.log(`Setting up problematic nodes for recommendation testing...`);

      // Generate test data
      problemNodes.forEach(({ type, count, processingTime, memoryUsage, errorRate }) => {
        for (let i = 0; i < count; i++) {
          for (let op = 0; op < 100; op++) {
            const additional = {};
            
            if (memoryUsage) additional.memoryUsage = memoryUsage + Math.random() * 50 * 1024 * 1024;
            if (errorRate && Math.random() < errorRate) additional.error = new Error(`${type} error`);
            
            monitor.trackNodeProcessing(
              `${type}-problem-node-${i}`,
              op * 1000,
              op * 1000 + (processingTime || 100),
              BENCHMARK_CONFIG.SMALL_DATA_SIZE,
              additional
            );
          }
        }
      });

      // Benchmark recommendation generation
      const recommendationStartTime = performance.now();
      const recommendations = monitor.getOptimizationRecommendations();
      const recommendationTime = performance.now() - recommendationStartTime;

      console.log(`Recommendation Generation Benchmark:`, {
        totalNodes: monitor.metrics.size,
        recommendationTimeMs: recommendationTime.toFixed(2),
        recommendationsGenerated: recommendations.length,
        performanceRecs: recommendations.filter(r => r.type === 'performance').length,
        memoryRecs: recommendations.filter(r => r.type === 'memory').length,
        reliabilityRecs: recommendations.filter(r => r.type === 'reliability').length,
      });

      // Assertions
      expect(recommendationTime).toBeLessThan(50); // Should generate recommendations quickly
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'performance')).toBe(true);
      expect(recommendations.some(r => r.type === 'memory')).toBe(true);
      expect(recommendations.some(r => r.type === 'reliability')).toBe(true);
    });
  });

  describe('Real-world Simulation Benchmarks', () => {
    it('should handle realistic workflow patterns', async () => {
      // Simulate a realistic workflow with different node types and patterns
      const workflowNodes = [
        { name: 'input-nodes', count: 5, opsPerSec: 10, avgProcessingTime: 50, dataSize: 2048 },
        { name: 'process-nodes', count: 10, opsPerSec: 5, avgProcessingTime: 200, dataSize: 8192 },
        { name: 'output-nodes', count: 3, opsPerSec: 15, avgProcessingTime: 30, dataSize: 1024 },
        { name: 'heavy-nodes', count: 2, opsPerSec: 1, avgProcessingTime: 2000, dataSize: 1024 * 1024 },
      ];

      const simulationDurationSec = 10;
      console.log(`Running realistic workflow simulation for ${simulationDurationSec} seconds...`);

      const startTime = performance.now();
      const promises = [];

      workflowNodes.forEach(({ name, count, opsPerSec, avgProcessingTime, dataSize }) => {
        for (let nodeIndex = 0; nodeIndex < count; nodeIndex++) {
          const nodeId = `${name}-${nodeIndex}`;
          
          // Create operations for this node
          const totalOps = opsPerSec * simulationDurationSec;
          const intervalMs = 1000 / opsPerSec;
          
          for (let op = 0; op < totalOps; op++) {
            promises.push(
              new Promise(resolve => {
                setTimeout(() => {
                  const opStartTime = performance.now();
                  // Add some variance to processing time
                  const variance = avgProcessingTime * 0.3 * (Math.random() - 0.5);
                  const actualProcessingTime = Math.max(10, avgProcessingTime + variance);
                  const opEndTime = opStartTime + actualProcessingTime;
                  
                  // Add some variance to data size
                  const actualDataSize = Math.max(256, dataSize + (dataSize * 0.2 * (Math.random() - 0.5)));
                  
                  // Simulate occasional errors (1% chance)
                  const additional = Math.random() < 0.01 ? { error: new Error('Random workflow error') } : {};
                  
                  monitor.trackNodeProcessing(nodeId, opStartTime, opEndTime, actualDataSize, additional);
                  resolve();
                }, op * intervalMs + Math.random() * intervalMs * 0.5); // Add jitter
              })
            );
          }
        }
      });

      await Promise.all(promises);
      
      const simulationTime = performance.now() - startTime;
      const analysis = monitor.analyzePerformance();

      const totalExpectedOps = workflowNodes.reduce((sum, node) => 
        sum + (node.count * node.opsPerSec * simulationDurationSec), 0
      );

      console.log(`Realistic Workflow Benchmark Results:`, {
        simulationDurationSec,
        totalExpectedOps,
        actualSimulationTimeMs: simulationTime.toFixed(2),
        totalNodesTracked: analysis.totalNodes,
        avgProcessingTime: analysis.slowestNodes.reduce((sum, n) => sum + n.averageProcessingTime, 0) / analysis.slowestNodes.length,
        totalErrors: analysis.errorAnalysis.totalErrors,
        overallErrorRate: (analysis.errorAnalysis.overallErrorRate * 100).toFixed(2) + '%',
        recommendations: analysis.recommendations.length,
      });

      // Assertions for realistic performance
      expect(analysis.totalNodes).toBe(workflowNodes.reduce((sum, w) => sum + w.count, 0));
      expect(simulationTime).toBeLessThan((simulationDurationSec + 2) * 1000); // Allow 2 seconds overhead
      expect(analysis.errorAnalysis.overallErrorRate).toBeLessThan(0.02); // Less than 2% error rate
    });
  });
});