/**
 * Test setup and configuration for optimization tests
 */

import { vi } from 'vitest';

// Global test configuration
export const TEST_CONFIG = {
  // Performance thresholds
  performance: {
    maxValidationTime: 100, // ms
    minCacheHitRate: 0.6,
    minDebouncingEfficiency: 0.5,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  },
  
  // Test data sizes
  dataSizes: {
    small: { nodes: 5, edges: 4 },
    medium: { nodes: 20, edges: 25 },
    large: { nodes: 100, edges: 150 },
    xlarge: { nodes: 500, edges: 750 },
  },
  
  // Timeout configurations
  timeouts: {
    unit: 5000, // 5 seconds
    integration: 10000, // 10 seconds
    performance: 30000, // 30 seconds
  },
};

// Mock implementations
export const createMockNodeDataManager = () => ({
  updateNodeData: vi.fn().mockResolvedValue(true),
  getNodeData: vi.fn().mockResolvedValue({}),
  validateWorkflow: vi.fn().mockResolvedValue({ valid: true }),
  getWorkflowData: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
});

export const createMockReactFlowInstance = (initialNodes = [], initialEdges = []) => ({
  getNodes: vi.fn(() => initialNodes),
  getEdges: vi.fn(() => initialEdges),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  getNode: vi.fn((id) => initialNodes.find(n => n.id === id)),
  getEdge: vi.fn((id) => initialEdges.find(e => e.id === id)),
  addNodes: vi.fn(),
  addEdges: vi.fn(),
  deleteElements: vi.fn(),
  fitView: vi.fn(),
  project: vi.fn((position) => position),
  screenToFlowPosition: vi.fn((position) => position),
});

export const createMockPerformanceMonitor = () => ({
  startMeasurement: vi.fn(),
  endMeasurement: vi.fn(),
  measureFunction: vi.fn((name, fn) => fn()),
  getMetrics: vi.fn(() => ({})),
  getMetricsFor: vi.fn(() => null),
  clearMetrics: vi.fn(),
  addObserver: vi.fn(),
  removeObserver: vi.fn(),
  getPerformanceSummary: vi.fn(() => ({
    totalOperations: 0,
    totalMeasurements: 0,
    slowestOperation: null,
    mostFrequentOperation: null,
  })),
  exportMetrics: vi.fn(() => JSON.stringify({ timestamp: Date.now(), metrics: {} })),
  importMetrics: vi.fn(),
});

// Test data generators
export const generateTestNode = (id, overrides = {}) => ({
  id: id.toString(),
  type: 'fetchNode',
  position: { x: 0, y: 0 },
  data: {
    label: `Node ${id}`,
    url: `https://api.example.com/node/${id}`,
    method: 'GET',
    headers: {},
    ...overrides.data,
  },
  ...overrides,
});

export const generateTestEdge = (id, source, target, overrides = {}) => ({
  id: id.toString(),
  source: source.toString(),
  target: target.toString(),
  type: 'default',
  ...overrides,
});

export const generateTestWorkflow = (nodeCount, edgeCount = null) => {
  const nodes = Array.from({ length: nodeCount }, (_, i) => generateTestNode(i + 1));
  
  // Generate edges - if not specified, create a linear chain
  const actualEdgeCount = edgeCount || Math.max(0, nodeCount - 1);
  const edges = [];
  
  for (let i = 0; i < actualEdgeCount; i++) {
    if (i < nodeCount - 1) {
      // Linear chain
      edges.push(generateTestEdge(i + 1, i + 1, i + 2));
    } else {
      // Additional random edges
      const source = Math.floor(Math.random() * nodeCount) + 1;
      let target = Math.floor(Math.random() * nodeCount) + 1;
      while (target === source) {
        target = Math.floor(Math.random() * nodeCount) + 1;
      }
      edges.push(generateTestEdge(i + 1, source, target));
    }
  }
  
  return { nodes, edges };
};

// Performance measurement utilities
export const measurePerformance = async (name, fn) => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  return {
    result,
    duration: endTime - startTime,
    name,
  };
};

export const measureMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

// Test assertion helpers
export const expectPerformanceWithinThreshold = (duration, threshold, operation = 'operation') => {
  expect(duration).toBeLessThan(threshold);
  if (duration > threshold * 0.8) {
    console.warn(`Performance warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
  }
};

export const expectCacheHitRate = (stats, minRate = TEST_CONFIG.performance.minCacheHitRate) => {
  expect(stats.hitRate).toBeGreaterThanOrEqual(minRate);
  if (stats.hitRate < minRate + 0.1) {
    console.warn(`Cache hit rate warning: ${stats.hitRate} (minimum: ${minRate})`);
  }
};

export const expectDebouncingEfficiency = (originalCalls, actualCalls, minEfficiency = TEST_CONFIG.performance.minDebouncingEfficiency) => {
  const efficiency = (originalCalls - actualCalls) / originalCalls;
  expect(efficiency).toBeGreaterThanOrEqual(minEfficiency);
  if (efficiency < minEfficiency + 0.1) {
    console.warn(`Debouncing efficiency warning: ${efficiency} (minimum: ${minEfficiency})`);
  }
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock timers
  vi.useFakeTimers();
  
  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console };
  console.warn = vi.fn();
  console.error = vi.fn();
  
  // Mock performance API if not available
  if (typeof performance === 'undefined') {
    global.performance = {
      now: vi.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1024 * 1024,
        totalJSHeapSize: 2 * 1024 * 1024,
        jsHeapSizeLimit: 4 * 1024 * 1024,
      },
    };
  }
  
  return {
    cleanup: () => {
      vi.useRealTimers();
      Object.assign(console, originalConsole);
    },
  };
};

// Test data validation
export const validateTestWorkflow = (nodes, edges) => {
  // Check node structure
  for (const node of nodes) {
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('type');
    expect(node).toHaveProperty('position');
    expect(node).toHaveProperty('data');
    expect(node.position).toHaveProperty('x');
    expect(node.position).toHaveProperty('y');
  }
  
  // Check edge structure
  for (const edge of edges) {
    expect(edge).toHaveProperty('id');
    expect(edge).toHaveProperty('source');
    expect(edge).toHaveProperty('target');
    
    // Verify edge references valid nodes
    const sourceExists = nodes.some(n => n.id === edge.source);
    const targetExists = nodes.some(n => n.id === edge.target);
    expect(sourceExists).toBe(true);
    expect(targetExists).toBe(true);
  }
};

// Async test helpers
export const waitForDebounce = async (ms = 300) => {
  vi.advanceTimersByTime(ms);
  await vi.runAllTimersAsync();
};

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Test result aggregation
export class TestResultAggregator {
  constructor() {
    this.results = [];
  }
  
  addResult(testName, result) {
    this.results.push({
      testName,
      timestamp: Date.now(),
      ...result,
    });
  }
  
  getResults() {
    return this.results;
  }
  
  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    
    const performanceResults = this.results.filter(r => r.duration);
    const avgDuration = performanceResults.length > 0
      ? performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length
      : 0;
    
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 0,
      avgDuration,
      slowestTest: performanceResults.reduce((slowest, current) => 
        current.duration > (slowest?.duration || 0) ? current : slowest, null),
    };
  }
  
  exportResults() {
    return JSON.stringify({
      summary: this.getSummary(),
      results: this.results,
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Export default configuration
export default TEST_CONFIG;