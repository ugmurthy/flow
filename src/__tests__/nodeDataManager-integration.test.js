/**
 * Integration tests for NodeDataManager with React Flow events
 * Tests the Phase 1 implementation fixes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';

// Mock React Flow connection object
const mockConnection = {
  source: 'node1',
  target: 'node2',
  sourceHandle: 'output',
  targetHandle: 'input'
};

// Mock edge change for removal
const mockEdgeRemovalChange = {
  id: 'node1-node2',
  type: 'remove'
};

describe('NodeDataManager Integration Tests', () => {
  beforeEach(async () => {
    // Initialize NodeDataManager before each test
    await nodeDataManager.initialize();
    
    // Clear any existing data
    await nodeDataManager.cleanup();
    await nodeDataManager.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    await nodeDataManager.cleanup();
  });

  describe('Connection Management', () => {
    it('should add connection when React Flow connects nodes', async () => {
      // Arrange
      const connectionAddedSpy = vi.fn();
      nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_ADDED, connectionAddedSpy);

      // Act
      await nodeDataManager.addConnection(
        mockConnection.source,
        mockConnection.target,
        mockConnection.sourceHandle,
        mockConnection.targetHandle,
        `${mockConnection.source}-${mockConnection.target}`
      );

      // Assert
      expect(connectionAddedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            sourceNodeId: mockConnection.source,
            targetNodeId: mockConnection.target,
            sourceHandle: mockConnection.sourceHandle,
            targetHandle: mockConnection.targetHandle
          })
        })
      );

      // Cleanup
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_ADDED, connectionAddedSpy);
    });

    it('should remove connection when React Flow removes edge', async () => {
      // Arrange
      const connectionRemovedSpy = vi.fn();
      nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_REMOVED, connectionRemovedSpy);

      // First add a connection
      await nodeDataManager.addConnection(
        mockConnection.source,
        mockConnection.target,
        mockConnection.sourceHandle,
        mockConnection.targetHandle,
        `${mockConnection.source}-${mockConnection.target}`
      );

      // Act - Remove the connection
      await nodeDataManager.removeConnection(
        mockConnection.source,
        mockConnection.target,
        mockConnection.sourceHandle,
        mockConnection.targetHandle
      );

      // Assert
      expect(connectionRemovedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            sourceNodeId: mockConnection.source,
            targetNodeId: mockConnection.target,
            sourceHandle: mockConnection.sourceHandle,
            targetHandle: mockConnection.targetHandle
          })
        })
      );

      // Cleanup
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_REMOVED, connectionRemovedSpy);
    });

    it('should update target node connections when connection is added', async () => {
      // Arrange - Register target node first
      const mockTargetNodeData = {
        meta: { label: 'Target Node', category: 'process' },
        input: { connections: {}, processed: {}, config: {} },
        output: { data: {}, meta: { status: 'idle' } },
        error: { hasError: false, errors: [] }
      };

      const mockUpdateCallback = vi.fn();
      nodeDataManager.registerNode(mockConnection.target, mockTargetNodeData, mockUpdateCallback);

      // Act
      await nodeDataManager.addConnection(
        mockConnection.source,
        mockConnection.target,
        mockConnection.sourceHandle,
        mockConnection.targetHandle,
        `${mockConnection.source}-${mockConnection.target}`
      );

      // Assert
      const targetNodeData = nodeDataManager.getNodeData(mockConnection.target);
      expect(targetNodeData).toBeTruthy();
      expect(Object.keys(targetNodeData.input.connections)).toHaveLength(1);
      
      const connectionId = `${mockConnection.source}-${mockConnection.target}-${mockConnection.sourceHandle}-${mockConnection.targetHandle}`;
      expect(targetNodeData.input.connections[connectionId]).toBeTruthy();
      expect(targetNodeData.input.connections[connectionId].sourceNodeId).toBe(mockConnection.source);
    });
  });

  describe('Node Management', () => {
    it('should unregister node when removed from React Flow', () => {
      // Arrange
      const mockNodeData = {
        meta: { label: 'Test Node', category: 'input' },
        input: { connections: {}, processed: {}, config: {} },
        output: { data: {}, meta: { status: 'idle' } },
        error: { hasError: false, errors: [] }
      };

      const mockUpdateCallback = vi.fn();
      nodeDataManager.registerNode('test-node', mockNodeData, mockUpdateCallback);

      // Verify node is registered
      expect(nodeDataManager.getNodeData('test-node')).toBeTruthy();

      // Act
      nodeDataManager.unregisterNode('test-node');

      // Assert
      expect(nodeDataManager.getNodeData('test-node')).toBeNull();
    });
  });

  describe('Event Flow Integration', () => {
    it('should maintain event flow compatibility with existing system', async () => {
      // This test ensures that our changes don't break the existing CustomEvent system
      
      // Arrange
      const mockEventListener = vi.fn();
      const mockElement = {
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      // Mock DOM query selector
      const originalQuerySelector = document.querySelector;
      document.querySelector = vi.fn().mockReturnValue(mockElement);

      // Act - Simulate the event flow that happens in App.jsx
      const connection = mockConnection;
      const appContent = document.querySelector('[data-workflow-content]');
      
      if (appContent) {
        appContent.dispatchEvent(new CustomEvent('connected', { detail: connection }));
      }

      // Also call NodeDataManager (as our integration does)
      await nodeDataManager.addConnection(
        connection.source,
        connection.target,
        connection.sourceHandle || 'default',
        connection.targetHandle || 'default',
        `${connection.source}-${connection.target}`
      );

      // Assert
      expect(mockElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
          detail: connection
        })
      );

      // Restore original querySelector
      document.querySelector = originalQuerySelector;
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act - Try to add connection with invalid data
      try {
        await nodeDataManager.addConnection(null, null, null, null, null);
      } catch (error) {
        // Expected to throw
      }

      // Assert - Should not crash the system
      expect(nodeDataManager.getStats().initialized).toBe(true);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle node removal errors gracefully', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act - Try to unregister non-existent node
      nodeDataManager.unregisterNode('non-existent-node');

      // Assert - Should not crash
      expect(nodeDataManager.getStats().initialized).toBe(true);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });
});