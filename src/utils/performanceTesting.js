/**
 * Performance Testing Utilities
 * Provides tools for testing and benchmarking the optimization system
 */

import { performanceMonitor } from './performanceMonitor.js';
import { validationCache } from './validationCache.js';
import { debouncedValidator } from './debouncedValidation.js';
import { validateWorkflowOptimized } from './workflowValidationOptimized.js';

/**
 * Performance Test Suite
 */
export class PerformanceTestSuite {
  constructor() {
    this.results = [];
    this.isRunning = false;
  }

  /**
   * Run a comprehensive performance test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runComprehensiveTest(options = {}) {
    const {
      nodeCount = 50,
      edgeCount = 60,
      iterations = 100,
      includeStressTest = true,
      includeCacheTest = true,
      includeDebounceTest = true,
    } = options;

    this.isRunning = true;
    this.results = [];

    console.log('🚀 Starting comprehensive performance test...');
    
    try {
      // Test 1: Basic validation performance
      const basicTest = await this.testBasicValidation(nodeCount, edgeCount, iterations);
      this.results.push(basicTest);

      // Test 2: Cache performance
      if (includeCacheTest) {
        const cacheTest = await this.testCachePerformance(nodeCount, edgeCount, iterations);
        this.results.push(cacheTest);
      }

      // Test 3: Debounce performance
      if (includeDebounceTest) {
        const debounceTest = await this.testDebouncePerformance(nodeCount, edgeCount);
        this.results.push(debounceTest);
      }

      // Test 4: Stress test
      if (includeStressTest) {
        const stressTest = await this.testStressPerformance();
        this.results.push(stressTest);
      }

      // Test 5: Memory usage test
      const memoryTest = await this.testMemoryUsage(nodeCount, edgeCount, iterations);
      this.results.push(memoryTest);

      const summary = this.generateTestSummary();
      console.log('✅ Performance test completed!', summary);
      
      return {
        summary,
        results: this.results,
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('❌ Performance test failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test basic validation performance
   */
  async testBasicValidation(nodeCount, edgeCount, iterations) {
    console.log(`📊 Testing basic validation (${nodeCount} nodes, ${edgeCount} edges, ${iterations} iterations)...`);
    
    const nodes = this.generateTestNodes(nodeCount);
    const edges = this.generateTestEdges(nodes, edgeCount);
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await validateWorkflowOptimized(nodes, edges, { force: true });
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    return {
      name: 'Basic Validation',
      nodeCount,
      edgeCount,
      iterations,
      times,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: this.calculateMedian(times),
    };
  }

  /**
   * Test cache performance
   */
  async testCachePerformance(nodeCount, edgeCount, iterations) {
    console.log(`🗄️ Testing cache performance...`);
    
    const nodes = this.generateTestNodes(nodeCount);
    const edges = this.generateTestEdges(nodes, edgeCount);
    
    // Clear cache first
    validationCache.clear();
    
    // First run (cache miss)
    const missStartTime = performance.now();
    await validateWorkflowOptimized(nodes, edges);
    const missTime = performance.now() - missStartTime;

    // Subsequent runs (cache hits)
    const hitTimes = [];
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await validateWorkflowOptimized(nodes, edges);
      const endTime = performance.now();
      hitTimes.push(endTime - startTime);
    }

    const averageHitTime = hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length;
    const speedup = missTime / averageHitTime;

    return {
      name: 'Cache Performance',
      missTime,
      averageHitTime,
      speedup,
      cacheEfficiency: speedup > 1 ? 'Good' : 'Poor',
      stats: validationCache.getStats(),
    };
  }

  /**
   * Test debounce performance
   */
  async testDebouncePerformance(nodeCount, edgeCount) {
    console.log(`⏱️ Testing debounce performance...`);
    
    const nodes = this.generateTestNodes(nodeCount);
    const edges = this.generateTestEdges(nodes, edgeCount);
    
    // Clear debouncer
    debouncedValidator.clearAll();
    
    // Rapid fire validations
    const rapidFireCount = 50;
    const startTime = performance.now();
    
    const promises = [];
    for (let i = 0; i < rapidFireCount; i++) {
      promises.push(
        debouncedValidator.debounceValidation(
          `test-${i}`,
          () => validateWorkflowOptimized(nodes, edges, { force: true }),
          'validation'
        )
      );
    }
    
    await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    
    const stats = debouncedValidator.getStats();
    
    return {
      name: 'Debounce Performance',
      rapidFireCount,
      totalTime,
      averageTime: totalTime / rapidFireCount,
      debouncerStats: stats,
      efficiency: rapidFireCount > stats.pendingValidations ? 'Good' : 'Poor',
    };
  }

  /**
   * Test stress performance with large workflows
   */
  async testStressPerformance() {
    console.log(`💪 Running stress test...`);
    
    const stressTests = [
      { nodes: 100, edges: 150 },
      { nodes: 200, edges: 300 },
      { nodes: 500, edges: 750 },
    ];
    
    const results = [];
    
    for (const test of stressTests) {
      const nodes = this.generateTestNodes(test.nodes);
      const edges = this.generateTestEdges(nodes, test.edges);
      
      const startTime = performance.now();
      const result = await validateWorkflowOptimized(nodes, edges);
      const endTime = performance.now();
      
      results.push({
        nodeCount: test.nodes,
        edgeCount: test.edges,
        time: endTime - startTime,
        success: result.isValid !== undefined,
        memoryUsage: performanceMonitor.getMemoryUsage(),
      });
    }
    
    return {
      name: 'Stress Test',
      results,
      maxNodeCount: Math.max(...results.map(r => r.nodeCount)),
      maxTime: Math.max(...results.map(r => r.time)),
      allPassed: results.every(r => r.success),
    };
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage(nodeCount, edgeCount, iterations) {
    console.log(`🧠 Testing memory usage...`);
    
    const initialMemory = performanceMonitor.getMemoryUsage();
    const memorySnapshots = [initialMemory];
    
    for (let i = 0; i < iterations; i++) {
      const nodes = this.generateTestNodes(nodeCount);
      const edges = this.generateTestEdges(nodes, edgeCount);
      
      await validateWorkflowOptimized(nodes, edges);
      
      if (i % 10 === 0) {
        memorySnapshots.push(performanceMonitor.getMemoryUsage());
      }
    }
    
    const finalMemory = performanceMonitor.getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;
    const memoryGrowthPercentage = (memoryGrowth / initialMemory) * 100;
    
    return {
      name: 'Memory Usage',
      initialMemory,
      finalMemory,
      memoryGrowth,
      memoryGrowthPercentage,
      snapshots: memorySnapshots,
      memoryEfficient: memoryGrowthPercentage < 20, // Less than 20% growth is good
    };
  }

  /**
   * Generate test nodes
   */
  generateTestNodes(count) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `node-${i}`,
        type: i % 3 === 0 ? 'fetchNodeNew' : i % 3 === 1 ? 'processNew' : 'markdownNew',
        position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 150 },
        data: {
          label: `Test Node ${i}`,
          meta: { category: 'test' },
          input: { connections: {} },
          output: { data: {} },
          error: { hasError: false, errors: [] },
        },
      });
    }
    return nodes;
  }

  /**
   * Generate test edges
   */
  generateTestEdges(nodes, count) {
    const edges = [];
    for (let i = 0; i < count && i < nodes.length - 1; i++) {
      const sourceIndex = i;
      const targetIndex = Math.min(i + 1 + Math.floor(Math.random() * 3), nodes.length - 1);
      
      edges.push({
        id: `edge-${i}`,
        source: nodes[sourceIndex].id,
        target: nodes[targetIndex].id,
        sourceHandle: 'default',
        targetHandle: 'default',
      });
    }
    return edges;
  }

  /**
   * Calculate median
   */
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  /**
   * Generate test summary
   */
  generateTestSummary() {
    const summary = {
      totalTests: this.results.length,
      passedTests: 0,
      failedTests: 0,
      averagePerformance: {},
      recommendations: [],
    };

    this.results.forEach(result => {
      if (result.name === 'Basic Validation') {
        summary.averagePerformance.validation = result.average;
        if (result.average < 100) {
          summary.passedTests++;
        } else {
          summary.failedTests++;
          summary.recommendations.push('Validation performance is slow. Consider optimizing validation logic.');
        }
      }
      
      if (result.name === 'Cache Performance') {
        summary.averagePerformance.cacheSpeedup = result.speedup;
        if (result.speedup > 5) {
          summary.passedTests++;
        } else {
          summary.failedTests++;
          summary.recommendations.push('Cache performance is poor. Check cache hit rates.');
        }
      }
      
      if (result.name === 'Memory Usage') {
        summary.averagePerformance.memoryGrowth = result.memoryGrowthPercentage;
        if (result.memoryEfficient) {
          summary.passedTests++;
        } else {
          summary.failedTests++;
          summary.recommendations.push('Memory usage is growing too much. Check for memory leaks.');
        }
      }
    });

    return summary;
  }

  /**
   * Export test results
   */
  exportResults() {
    return {
      results: this.results,
      summary: this.generateTestSummary(),
      timestamp: Date.now(),
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: performanceMonitor.getMemoryUsage(),
        performance: performanceMonitor.getStats(),
      },
    };
  }
}

// Create singleton instance
export const performanceTestSuite = new PerformanceTestSuite();

// Export utility functions
export const PerformanceTestUtils = {
  /**
   * Quick performance test
   */
  quickTest: async () => {
    return await performanceTestSuite.runComprehensiveTest({
      nodeCount: 20,
      edgeCount: 25,
      iterations: 10,
      includeStressTest: false,
    });
  },

  /**
   * Full performance test
   */
  fullTest: async () => {
    return await performanceTestSuite.runComprehensiveTest({
      nodeCount: 50,
      edgeCount: 60,
      iterations: 100,
      includeStressTest: true,
      includeCacheTest: true,
      includeDebounceTest: true,
    });
  },

  /**
   * Benchmark validation performance
   */
  benchmarkValidation: async (nodes, edges, iterations = 50) => {
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await validateWorkflowOptimized(nodes, edges, { force: true });
      times.push(performance.now() - startTime);
    }
    
    return {
      iterations,
      times,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
    };
  },

  /**
   * Test cache effectiveness
   */
  testCacheEffectiveness: async (nodes, edges) => {
    validationCache.clear();
    
    // Cache miss
    const missStart = performance.now();
    await validateWorkflowOptimized(nodes, edges);
    const missTime = performance.now() - missStart;
    
    // Cache hit
    const hitStart = performance.now();
    await validateWorkflowOptimized(nodes, edges);
    const hitTime = performance.now() - hitStart;
    
    return {
      missTime,
      hitTime,
      speedup: missTime / hitTime,
      cacheStats: validationCache.getStats(),
    };
  },
};