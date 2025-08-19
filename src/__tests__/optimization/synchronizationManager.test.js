/**
 * Tests for SynchronizationManager
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { SynchronizationManager } from '../../services/synchronizationManager.js';

// Mock dependencies
const mockFlowStateActions = {
  updateNodes: vi.fn(),
  updateEdges: vi.fn(),
  updateNode: vi.fn(),
  setValidationState: vi.fn(),
};

const mockNodeDataManager = {
  updateNodeData: vi.fn(),
  getNodeData: vi.fn(),
  validateWorkflow: vi.fn(),
};

const mockReactFlowInstance = {
  getNodes: vi.fn(),
  getEdges: vi.fn(),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
};

const mockPerformanceMonitor = {
  startMeasurement: vi.fn(),
  endMeasurement: vi.fn(),
  measureFunction: vi.fn((name, fn) => fn()),
};

describe('SynchronizationManager', () => {
  let syncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    syncManager = new SynchronizationManager(
      mockFlowStateActions,
      mockNodeDataManager,
      mockReactFlowInstance,
      mockPerformanceMonitor
    );
  });

  afterEach(() => {
    syncManager.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with provided dependencies', () => {
      expect(syncManager.flowStateActions).toBe(mockFlowStateActions);
      expect(syncManager.nodeDataManager).toBe(mockNodeDataManager);
      expect(syncManager.reactFlowInstance).toBe(mockReactFlowInstance);
      expect(syncManager.performanceMonitor).toBe(mockPerformanceMonitor);
    });

    test('should initialize with default configuration', () => {
      const config = syncManager.config;
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(100);
      expect(config.conflictResolution).toBe('merge');
      expect(config.enablePerformanceTracking).toBe(true);
    });
  });

  describe('Node Synchronization', () => {
    test('should synchronize node from FlowState to NodeDataManager', async () => {
      const nodeUpdate = {
        id: 'node-1',
        data: { label: 'Updated Node', value: 42 },
      };

      mockNodeDataManager.updateNodeData.mockResolvedValue(true);

      await syncManager.syncNodeToDataManager(nodeUpdate);

      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledWith(
        'node-1',
        nodeUpdate.data
      );
      expect(mockPerformanceMonitor.measureFunction).toHaveBeenCalled();
    });

    test('should handle NodeDataManager update failures with retry', async () => {
      const nodeUpdate = {
        id: 'node-1',
        data: { label: 'Updated Node' },
      };

      mockNodeDataManager.updateNodeData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(true);

      await syncManager.syncNodeToDataManager(nodeUpdate);

      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      const nodeUpdate = {
        id: 'node-1',
        data: { label: 'Updated Node' },
      };

      mockNodeDataManager.updateNodeData.mockRejectedValue(new Error('Persistent error'));

      await expect(syncManager.syncNodeToDataManager(nodeUpdate)).rejects.toThrow('Persistent error');
      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test('should synchronize node from NodeDataManager to FlowState', async () => {
      const nodeData = {
        id: 'node-1',
        data: { label: 'External Update', value: 100 },
      };

      await syncManager.syncNodeFromDataManager(nodeData);

      expect(mockFlowStateActions.updateNode).toHaveBeenCalledWith(
        'node-1',
        { data: nodeData.data }
      );
    });
  });

  describe('React Flow Synchronization', () => {
    test('should synchronize nodes to React Flow', async () => {
      const nodes = [
        { id: '1', type: 'fetchNode', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'processNode', position: { x: 100, y: 0 }, data: {} },
      ];

      await syncManager.syncNodesToReactFlow(nodes);

      expect(mockReactFlowInstance.setNodes).toHaveBeenCalledWith(nodes);
    });

    test('should synchronize edges to React Flow', async () => {
      const edges = [
        { id: 'e1', source: '1', target: '2' },
      ];

      await syncManager.syncEdgesToReactFlow(edges);

      expect(mockReactFlowInstance.setEdges).toHaveBeenCalledWith(edges);
    });

    test('should synchronize from React Flow to FlowState', async () => {
      const reactFlowNodes = [
        { id: '1', type: 'fetchNode', position: { x: 50, y: 50 }, data: {} },
      ];
      const reactFlowEdges = [
        { id: 'e1', source: '1', target: '2' },
      ];

      mockReactFlowInstance.getNodes.mockReturnValue(reactFlowNodes);
      mockReactFlowInstance.getEdges.mockReturnValue(reactFlowEdges);

      await syncManager.syncFromReactFlow();

      expect(mockFlowStateActions.updateNodes).toHaveBeenCalledWith(reactFlowNodes);
      expect(mockFlowStateActions.updateEdges).toHaveBeenCalledWith(reactFlowEdges);
    });
  });

  describe('Conflict Resolution', () => {
    test('should merge conflicting updates', async () => {
      const currentState = {
        id: 'node-1',
        data: { label: 'Current', value: 10, timestamp: 1000 },
      };
      const incomingUpdate = {
        id: 'node-1',
        data: { label: 'Updated', description: 'New field', timestamp: 2000 },
      };

      const resolved = await syncManager.resolveConflict(currentState, incomingUpdate, 'merge');

      expect(resolved.data).toEqual({
        label: 'Updated', // Newer timestamp wins
        value: 10, // Preserved from current
        description: 'New field', // Added from incoming
        timestamp: 2000,
      });
    });

    test('should use last-write-wins strategy', async () => {
      const currentState = {
        id: 'node-1',
        data: { label: 'Current', timestamp: 1000 },
      };
      const incomingUpdate = {
        id: 'node-1',
        data: { label: 'Updated', timestamp: 2000 },
      };

      const resolved = await syncManager.resolveConflict(currentState, incomingUpdate, 'last-write-wins');

      expect(resolved).toEqual(incomingUpdate);
    });

    test('should reject conflicting updates', async () => {
      const currentState = {
        id: 'node-1',
        data: { label: 'Current', timestamp: 2000 },
      };
      const incomingUpdate = {
        id: 'node-1',
        data: { label: 'Updated', timestamp: 1000 },
      };

      const resolved = await syncManager.resolveConflict(currentState, incomingUpdate, 'reject');

      expect(resolved).toEqual(currentState);
    });
  });

  describe('Batch Operations', () => {
    test('should process batch updates efficiently', async () => {
      const updates = [
        { type: 'node', id: '1', data: { label: 'Node 1' } },
        { type: 'node', id: '2', data: { label: 'Node 2' } },
        { type: 'edge', id: 'e1', source: '1', target: '2' },
      ];

      mockNodeDataManager.updateNodeData.mockResolvedValue(true);

      await syncManager.processBatchUpdates(updates);

      expect(mockNodeDataManager.updateNodeData).toHaveBeenCalledTimes(2);
      expect(mockFlowStateActions.updateNode).toHaveBeenCalledTimes(2);
    });

    test('should handle partial batch failures', async () => {
      const updates = [
        { type: 'node', id: '1', data: { label: 'Node 1' } },
        { type: 'node', id: '2', data: { label: 'Node 2' } },
      ];

      mockNodeDataManager.updateNodeData
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Update failed'));

      const results = await syncManager.processBatchUpdates(updates);

      expect(results.successful).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error.message).toBe('Update failed');
    });
  });

  describe('Event Handling', () => {
    test('should handle node change events', async () => {
      const nodeChanges = [
        { id: '1', type: 'position', position: { x: 100, y: 100 } },
        { id: '2', type: 'data', data: { label: 'Updated' } },
      ];

      mockReactFlowInstance.getNodes.mockReturnValue([
        { id: '1', position: { x: 100, y: 100 }, data: {} },
        { id: '2', position: { x: 0, y: 0 }, data: { label: 'Updated' } },
      ]);

      await syncManager.handleNodeChanges(nodeChanges);

      expect(mockFlowStateActions.updateNodes).toHaveBeenCalled();
    });

    test('should handle edge change events', async () => {
      const edgeChanges = [
        { id: 'e1', type: 'add', item: { id: 'e1', source: '1', target: '2' } },
        { id: 'e2', type: 'remove' },
      ];

      mockReactFlowInstance.getEdges.mockReturnValue([
        { id: 'e1', source: '1', target: '2' },
      ]);

      await syncManager.handleEdgeChanges(edgeChanges);

      expect(mockFlowStateActions.updateEdges).toHaveBeenCalled();
    });
  });

  describe('State Validation', () => {
    test('should validate synchronized state', async () => {
      const nodes = [
        { id: '1', type: 'fetchNode', data: {} },
      ];
      const edges = [];

      mockNodeDataManager.validateWorkflow.mockResolvedValue({
        valid: true,
        nodeCount: 1,
      });

      const result = await syncManager.validateSynchronizedState(nodes, edges);

      expect(result.valid).toBe(true);
      expect(mockNodeDataManager.validateWorkflow).toHaveBeenCalledWith(nodes, edges);
    });

    test('should handle validation errors', async () => {
      const nodes = [];
      const edges = [];

      mockNodeDataManager.validateWorkflow.mockRejectedValue(new Error('Validation failed'));

      const result = await syncManager.validateSynchronizedState(nodes, edges);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('Performance Tracking', () => {
    test('should track synchronization performance', async () => {
      const nodeUpdate = {
        id: 'node-1',
        data: { label: 'Updated Node' },
      };

      mockNodeDataManager.updateNodeData.mockResolvedValue(true);

      await syncManager.syncNodeToDataManager(nodeUpdate);

      expect(mockPerformanceMonitor.measureFunction).toHaveBeenCalledWith(
        'sync-node-to-data-manager',
        expect.any(Function)
      );
    });

    test('should provide synchronization metrics', () => {
      const metrics = syncManager.getMetrics();

      expect(metrics).toHaveProperty('totalSyncs');
      expect(metrics).toHaveProperty('successfulSyncs');
      expect(metrics).toHaveProperty('failedSyncs');
      expect(metrics).toHaveProperty('conflictsResolved');
      expect(metrics).toHaveProperty('averageSyncTime');
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = {
        maxRetries: 5,
        retryDelay: 200,
        conflictResolution: 'last-write-wins',
      };

      syncManager.updateConfig(newConfig);

      expect(syncManager.config.maxRetries).toBe(5);
      expect(syncManager.config.retryDelay).toBe(200);
      expect(syncManager.config.conflictResolution).toBe('last-write-wins');
    });

    test('should validate configuration updates', () => {
      const invalidConfig = {
        maxRetries: -1,
        conflictResolution: 'invalid-strategy',
      };

      expect(() => {
        syncManager.updateConfig(invalidConfig);
      }).toThrow('Invalid configuration');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      const cleanupSpy = vi.spyOn(syncManager, 'cleanup');

      syncManager.destroy();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    test('should clear pending operations on destroy', () => {
      // Add some pending operations
      syncManager.pendingOperations.set('op1', Promise.resolve());
      syncManager.pendingOperations.set('op2', Promise.resolve());

      expect(syncManager.pendingOperations.size).toBe(2);

      syncManager.destroy();

      expect(syncManager.pendingOperations.size).toBe(0);
    });
  });
});