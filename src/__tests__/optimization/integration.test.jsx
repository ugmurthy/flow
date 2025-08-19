/**
 * Integration tests for the complete optimization system
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { FlowStateProvider, useFlowState, useFlowActions } from '../../contexts/FlowStateContext.jsx';
import { SynchronizationManager } from '../../services/synchronizationManager.js';
import { DebouncedValidator } from '../../utils/debouncedValidation.js';
import { ValidationCache } from '../../utils/validationCache.js';
import { PerformanceMonitor } from '../../utils/performanceMonitor.js';
import { validateWorkflowOptimized } from '../../utils/workflowValidationOptimized.js';

// Mock React Flow
vi.mock('reactflow', () => ({
  useReactFlow: () => ({
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
  }),
}));

// Mock NodeDataManager
const mockNodeDataManager = {
  updateNodeData: vi.fn().mockResolvedValue(true),
  getNodeData: vi.fn().mockResolvedValue({}),
  validateWorkflow: vi.fn().mockResolvedValue({ valid: true }),
};

describe('Optimization System Integration', () => {
  let performanceMonitor;
  let validationCache;
  let debouncedValidator;
  let syncManager;

  const initialNodes = [
    { id: '1', type: 'fetchNode', position: { x: 0, y: 0 }, data: { url: 'https://api.example.com' } },
    { id: '2', type: 'processNode', position: { x: 200, y: 0 }, data: { operation: 'transform' } },
  ];

  const initialEdges = [
    { id: 'e1', source: '1', target: '2' },
  ];

  const TestWrapper = ({ children }) => (
    <FlowStateProvider 
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    >
      {children}
    </FlowStateProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Initialize optimization components
    performanceMonitor = new PerformanceMonitor();
    validationCache = new ValidationCache(10, 5000);
    debouncedValidator = new DebouncedValidator(validationCache, performanceMonitor);

    // Mock React Flow instance
    const mockReactFlowInstance = {
      getNodes: vi.fn(() => initialNodes),
      getEdges: vi.fn(() => initialEdges),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
    };

    // Initialize sync manager (will be set up in individual tests)
    syncManager = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (syncManager) {
      syncManager.destroy();
    }
  });

  describe('End-to-End Flow State Management', () => {
    test('should handle complete node update flow with optimization', async () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      // Track performance
      performanceMonitor.startMeasurement('complete-node-update');

      // Update node data
      act(() => {
        actionsResult.current.updateNode('1', {
          data: { url: 'https://api.updated.com', timeout: 5000 }
        });
      });

      // Verify state update
      expect(stateResult.current.nodes[0].data.url).toBe('https://api.updated.com');
      expect(stateResult.current.version).toBeGreaterThan(0);

      performanceMonitor.endMeasurement('complete-node-update');

      // Verify performance tracking
      const metrics = performanceMonitor.getMetrics();
      expect(metrics['complete-node-update']).toBeDefined();
    });

    test('should handle batch updates efficiently', async () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const updatedNodes = [
        { ...initialNodes[0], data: { url: 'https://api1.updated.com' } },
        { ...initialNodes[1], data: { operation: 'filter' } },
      ];

      performanceMonitor.startMeasurement('batch-update');

      act(() => {
        actionsResult.current.updateNodes(updatedNodes);
      });

      performanceMonitor.endMeasurement('batch-update');

      expect(stateResult.current.nodes).toEqual(updatedNodes);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics['batch-update']).toBeDefined();
    });
  });

  describe('Debounced Validation Integration', () => {
    test('should debounce rapid validation calls', async () => {
      const validationSpy = vi.fn().mockResolvedValue({ valid: true });
      debouncedValidator.setValidator(validationSpy);

      // Trigger multiple rapid validations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'node-update'));
      }

      // Fast-forward timers to trigger debounced validation
      vi.advanceTimersByTime(200);

      await Promise.all(promises);

      // Should only call validator once due to debouncing
      expect(validationSpy).toHaveBeenCalledTimes(1);
    });

    test('should use cached validation results', async () => {
      const validationResult = { valid: true, nodeCount: 2 };
      const validationSpy = vi.fn().mockResolvedValue(validationResult);
      debouncedValidator.setValidator(validationSpy);

      // First validation
      const result1 = await debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'general');
      vi.advanceTimersByTime(200);

      // Second validation with same data (should use cache)
      const result2 = await debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'general');

      expect(result1).toEqual(validationResult);
      expect(result2).toEqual(validationResult);
      expect(validationSpy).toHaveBeenCalledTimes(1); // Only called once, second was cached
    });

    test('should invalidate cache when nodes change', async () => {
      const validationSpy = vi.fn().mockResolvedValue({ valid: true });
      debouncedValidator.setValidator(validationSpy);

      // First validation
      await debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'general');
      vi.advanceTimersByTime(200);

      // Modify nodes
      const modifiedNodes = [
        { ...initialNodes[0], data: { url: 'https://modified.com' } },
        ...initialNodes.slice(1),
      ];

      // Second validation with modified data
      await debouncedValidator.validateWorkflow(modifiedNodes, initialEdges, 'general');
      vi.advanceTimersByTime(200);

      expect(validationSpy).toHaveBeenCalledTimes(2); // Cache invalidated, called again
    });
  });

  describe('Synchronization Integration', () => {
    test('should synchronize FlowState changes to NodeDataManager', async () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      // Create sync manager with mocked dependencies
      const mockReactFlowInstance = {
        getNodes: vi.fn(() => initialNodes),
        getEdges: vi.fn(() => initialEdges),
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      };

      syncManager = new SynchronizationManager(
        actionsResult.current,
        mockNodeDataManager,
        mockReactFlowInstance,
        performanceMonitor
      );

      const nodeUpdate = {
        id: '1',
        data: { url: 'https://synced.com' },
      };

      await syncManager.syncNodeToDataManager(nodeUpdate);

      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledWith(
        '1',
        nodeUpdate.data
      );
    });

    test('should handle synchronization conflicts', async () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const mockReactFlowInstance = {
        getNodes: vi.fn(() => initialNodes),
        getEdges: vi.fn(() => initialEdges),
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      };

      syncManager = new SynchronizationManager(
        actionsResult.current,
        mockNodeDataManager,
        mockReactFlowInstance,
        performanceMonitor
      );

      const currentState = {
        id: '1',
        data: { url: 'https://current.com', timestamp: 1000 },
      };

      const incomingUpdate = {
        id: '1',
        data: { url: 'https://incoming.com', timeout: 5000, timestamp: 2000 },
      };

      const resolved = await syncManager.resolveConflict(currentState, incomingUpdate, 'merge');

      expect(resolved.data.url).toBe('https://incoming.com'); // Newer timestamp
      expect(resolved.data.timeout).toBe(5000); // Merged from incoming
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should track performance across all optimization components', async () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      // Simulate a complete workflow update with performance tracking
      performanceMonitor.startMeasurement('complete-workflow-update');

      // Update nodes
      performanceMonitor.startMeasurement('node-update');
      act(() => {
        actionsResult.current.updateNode('1', {
          data: { url: 'https://performance-test.com' }
        });
      });
      performanceMonitor.endMeasurement('node-update');

      // Validate workflow
      performanceMonitor.startMeasurement('validation');
      const validationResult = await validateWorkflowOptimized(
        initialNodes,
        initialEdges,
        { cache: validationCache, debouncer: debouncedValidator }
      );
      vi.advanceTimersByTime(200);
      performanceMonitor.endMeasurement('validation');

      performanceMonitor.endMeasurement('complete-workflow-update');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics['complete-workflow-update']).toBeDefined();
      expect(metrics['node-update']).toBeDefined();
      expect(metrics['validation']).toBeDefined();

      // Verify performance summary
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.totalOperations).toBeGreaterThan(0);
      expect(summary.totalMeasurements).toBeGreaterThan(0);
    });

    test('should provide comprehensive performance metrics', () => {
      // Simulate various operations
      performanceMonitor.measureFunction('cache-operation', () => {
        validationCache.set(initialNodes, initialEdges, { valid: true });
        return validationCache.get(initialNodes, initialEdges);
      });

      performanceMonitor.measureFunction('debounce-operation', () => {
        debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'test');
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics['cache-operation']).toBeDefined();
      expect(metrics['debounce-operation']).toBeDefined();

      // Verify cache statistics
      const cacheStats = validationCache.getStats();
      expect(cacheStats.hitCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle validation errors gracefully', async () => {
      const errorValidator = vi.fn().mockRejectedValue(new Error('Validation failed'));
      debouncedValidator.setValidator(errorValidator);

      const result = await debouncedValidator.validateWorkflow(initialNodes, initialEdges, 'general');
      vi.advanceTimersByTime(200);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    test('should recover from synchronization failures', async () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const mockReactFlowInstance = {
        getNodes: vi.fn(() => initialNodes),
        getEdges: vi.fn(() => initialEdges),
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      };

      syncManager = new SynchronizationManager(
        actionsResult.current,
        mockNodeDataManager,
        mockReactFlowInstance,
        performanceMonitor
      );

      // Mock failure then success
      mockNodeDataManager.updateNodeData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(true);

      const nodeUpdate = { id: '1', data: { url: 'https://retry-test.com' } };

      // Should succeed after retry
      await expect(syncManager.syncNodeToDataManager(nodeUpdate)).resolves.not.toThrow();
      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory and Resource Management', () => {
    test('should manage cache memory efficiently', () => {
      const smallCache = new ValidationCache(3, 1000); // Small cache for testing

      // Fill cache beyond capacity
      for (let i = 0; i < 5; i++) {
        const nodes = [{ id: `${i}`, type: 'test', position: { x: 0, y: 0 }, data: {} }];
        smallCache.set(nodes, [], { valid: true, id: i });
      }

      // Should not exceed max size
      expect(smallCache.cache.size).toBeLessThanOrEqual(3);

      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });

    test('should cleanup resources properly', () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const mockReactFlowInstance = {
        getNodes: vi.fn(() => initialNodes),
        getEdges: vi.fn(() => initialEdges),
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      };

      syncManager = new SynchronizationManager(
        actionsResult.current,
        mockNodeDataManager,
        mockReactFlowInstance,
        performanceMonitor
      );

      // Add some pending operations
      syncManager.pendingOperations.set('op1', Promise.resolve());
      expect(syncManager.pendingOperations.size).toBe(1);

      // Cleanup should clear pending operations
      syncManager.destroy();
      expect(syncManager.pendingOperations.size).toBe(0);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle rapid user interactions efficiently', async () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      performanceMonitor.startMeasurement('rapid-interactions');

      // Simulate rapid user interactions
      for (let i = 0; i < 10; i++) {
        act(() => {
          actionsResult.current.updateNode('1', {
            data: { url: `https://api${i}.com`, iteration: i }
          });
        });
      }

      performanceMonitor.endMeasurement('rapid-interactions');

      // Final state should reflect last update
      expect(stateResult.current.nodes[0].data.iteration).toBe(9);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics['rapid-interactions']).toBeDefined();
    });

    test('should maintain consistency during concurrent operations', async () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const mockReactFlowInstance = {
        getNodes: vi.fn(() => initialNodes),
        getEdges: vi.fn(() => initialEdges),
        setNodes: vi.fn(),
        setEdges: vi.fn(),
      };

      syncManager = new SynchronizationManager(
        actionsResult.current,
        mockNodeDataManager,
        mockReactFlowInstance,
        performanceMonitor
      );

      // Simulate concurrent operations
      const operations = [
        syncManager.syncNodeToDataManager({ id: '1', data: { url: 'https://concurrent1.com' } }),
        syncManager.syncNodeToDataManager({ id: '2', data: { operation: 'concurrent-op' } }),
        syncManager.syncFromReactFlow(),
      ];

      await Promise.all(operations);

      // All operations should complete successfully
      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledTimes(2);
      expect(actionsResult.current.updateNodes).toHaveBeenCalled();
    });
  });
});