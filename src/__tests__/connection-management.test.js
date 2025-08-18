/**
 * Connection Management Tests
 * Tests for the enhanced connection management system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeDataManager } from '../services/nodeDataManager.js';
import { NodeData, ConnectionData } from '../types/nodeSchema.js';

describe('Connection Management', () => {
  let nodeDataManager;
  let mockReactFlowCallbacks;

  beforeEach(() => {
    nodeDataManager = new NodeDataManager();
    
    // Mock React Flow callbacks
    mockReactFlowCallbacks = {
      removeEdge: vi.fn(),
      addEdge: vi.fn()
    };
    
    nodeDataManager.setReactFlowCallbacks(mockReactFlowCallbacks);
    
    // Create test nodes
    const nodeA = NodeData.create({
      meta: { label: 'Node A', category: 'input' }
    });
    
    const nodeB = NodeData.create({
      meta: { label: 'Node B', category: 'input' }
    });
    
    const nodeC = NodeData.create({
      meta: { label: 'Node C', category: 'process' },
      input: {
        config: { allowMultipleConnections: false } // Single connection mode
      }
    });
    
    const nodeD = NodeData.create({
      meta: { label: 'Node D', category: 'process' },
      input: {
        config: { allowMultipleConnections: true } // Multiple connection mode
      }
    });
    
    // Register nodes
    nodeDataManager.registerNode('nodeA', nodeA, vi.fn());
    nodeDataManager.registerNode('nodeB', nodeB, vi.fn());
    nodeDataManager.registerNode('nodeC', nodeC, vi.fn());
    nodeDataManager.registerNode('nodeD', nodeD, vi.fn());
  });

  describe('CASE 1: Connection Deletion Cleanup', () => {
    it('should properly clean up target node connections when edge is deleted', async () => {
      // Add connection
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'default', 'default', 'nodeA-nodeC');
      
      // Verify connection exists
      const nodeC = nodeDataManager.getNodeData('nodeC');
      expect(Object.keys(nodeC.input.connections)).toHaveLength(1);
      expect(nodeC.input.connections['nodeA-nodeC-default-default']).toBeDefined();
      
      // Remove connection by edge ID
      await nodeDataManager.removeConnectionByEdgeId('nodeA-nodeC');
      
      // Verify connection is cleaned up
      const updatedNodeC = nodeDataManager.getNodeData('nodeC');
      expect(Object.keys(updatedNodeC.input.connections)).toHaveLength(0);
      expect(updatedNodeC.input.processed).toEqual({});
    });

    it('should handle edge deletion when connection does not exist', async () => {
      // Try to remove non-existent connection
      await nodeDataManager.removeConnectionByEdgeId('nonexistent-edge');
      
      // Should not throw error and node should remain unchanged
      const nodeC = nodeDataManager.getNodeData('nodeC');
      expect(Object.keys(nodeC.input.connections)).toHaveLength(0);
    });
  });

  describe('CASE 2: Connection Replacement (Single Connection Mode)', () => {
    it('should replace old connection when new connection is made', async () => {
      // Add first connection A → C
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'default', 'default', 'nodeA-nodeC');
      
      // Verify first connection exists
      let nodeC = nodeDataManager.getNodeData('nodeC');
      console.log("nodeC :" , nodeC);
      
      expect(Object.keys(nodeC.input.connections)).toHaveLength(1);
      expect(nodeC.input.connections['nodeA-nodeC-default-default']).toBeDefined();
      
      // Add second connection B → C (should replace A → C)
      await nodeDataManager.addConnection('nodeB', 'nodeC', 'default', 'default', 'nodeB-nodeC');
      
      // Verify old connection is removed and new one exists
      nodeC = nodeDataManager.getNodeData('nodeC');
      expect(Object.keys(nodeC.input.connections)).toHaveLength(1);
      expect(nodeC.input.connections['nodeA-nodeC-default-default']).toBeUndefined();
      expect(nodeC.input.connections['nodeB-nodeC-default-default']).toBeDefined();
      
      // Verify React Flow edge removal was called
      expect(mockReactFlowCallbacks.removeEdge).toHaveBeenCalledWith('nodeA-nodeC');
    });

    it('should clear processed data when connection is replaced', async () => {
      // Add connection and simulate processed data
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'default', 'default', 'nodeA-nodeC');
      await nodeDataManager.updateNodeData('nodeC', {
        input: { processed: { 'Node A_nodeA': { test: 'data' } } }
      });
      
      // Verify initial processed data exists
      let nodeC = nodeDataManager.getNodeData('nodeC');
      expect(nodeC.input.processed['Node A_nodeA']).toEqual({ test: 'data' });
      
      // Replace connection
      await nodeDataManager.addConnection('nodeB', 'nodeC', 'default', 'default', 'nodeB-nodeC');
      
      // Verify processed data was cleared during connection replacement
      // Note: The processing system will populate it again with new data from nodeB
      nodeC = nodeDataManager.getNodeData('nodeC');
      expect(nodeC.input.processed['Node A_nodeA']).toBeUndefined();
      expect(nodeC.input.processed['Node B_nodeB']).toBeDefined();
    });
  });

  describe('Multiple Connection Mode', () => {
    it('should allow multiple connections when allowMultipleConnections is true', async () => {
      // Add first connection A → D
      await nodeDataManager.addConnection('nodeA', 'nodeD', 'default', 'default', 'nodeA-nodeD');
      
      // Add second connection B → D
      await nodeDataManager.addConnection('nodeB', 'nodeD', 'default', 'default', 'nodeB-nodeD');
      
      // Verify both connections exist
      const nodeD = nodeDataManager.getNodeData('nodeD');
      console.log("nodeD ",nodeD);
      
      expect(Object.keys(nodeD.input.connections)).toHaveLength(2);
      expect(nodeD.input.connections['nodeA-nodeD-default-default']).toBeDefined();
      expect(nodeD.input.connections['nodeB-nodeD-default-default']).toBeDefined();
      
      // Verify no React Flow edges were removed
      expect(mockReactFlowCallbacks.removeEdge).not.toHaveBeenCalled();
    });

    it('should properly remove individual connections in multiple connection mode', async () => {
      // Add multiple connections
      await nodeDataManager.addConnection('nodeA', 'nodeD', 'default', 'default', 'nodeA-nodeD');
      await nodeDataManager.addConnection('nodeB', 'nodeD', 'default', 'default', 'nodeB-nodeD');
      
      // Remove one connection
      await nodeDataManager.removeConnection('nodeA', 'nodeD', 'default', 'default');
      
      // Verify only one connection remains
      const nodeD = nodeDataManager.getNodeData('nodeD');
      expect(Object.keys(nodeD.input.connections)).toHaveLength(1);
      expect(nodeD.input.connections['nodeA-nodeD-default-default']).toBeUndefined();
      expect(nodeD.input.connections['nodeB-nodeD-default-default']).toBeDefined();
    });
  });

  describe('Connection ID Management', () => {
    it('should generate consistent connection IDs', async () => {
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'output1', 'input1', 'custom-edge-id');
      
      const nodeC = nodeDataManager.getNodeData('nodeC');
      const connectionId = 'nodeA-nodeC-output1-input1';
      expect(nodeC.input.connections[connectionId]).toBeDefined();
    });

    it('should find connections by edge ID', async () => {
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'default', 'default', 'test-edge-123');
      
      const connection = nodeDataManager.findConnectionByEdgeId('test-edge-123');
      expect(connection).toBeDefined();
      expect(connection.sourceNodeId).toBe('nodeA');
      expect(connection.targetNodeId).toBe('nodeC');
      expect(connection.edgeId).toBe('test-edge-123');
    });
  });

  describe('React Flow Integration', () => {
    it('should register React Flow callbacks', () => {
      const callbacks = { removeEdge: vi.fn(), addEdge: vi.fn() };
      nodeDataManager.setReactFlowCallbacks(callbacks);
      
      expect(nodeDataManager.reactFlowCallbacks).toBe(callbacks);
    });

    it('should call removeEdge callback when replacing connections', async () => {
      // Add first connection
      await nodeDataManager.addConnection('nodeA', 'nodeC', 'default', 'default', 'edge1');
      
      // Replace with second connection
      await nodeDataManager.addConnection('nodeB', 'nodeC', 'default', 'default', 'edge2');
      
      // Verify removeEdge was called for the old edge
      expect(mockReactFlowCallbacks.removeEdge).toHaveBeenCalledWith('edge1');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing target node gracefully', async () => {
      // Try to add connection to non-existent node
      await nodeDataManager.addConnection('nodeA', 'nonexistent', 'default', 'default', 'test-edge');
      
      // Should not throw error
      expect(nodeDataManager.connections.size).toBe(0);
    });

    it('should handle connection removal for non-existent connection', async () => {
      // Try to remove non-existent connection
      await nodeDataManager.removeConnection('nodeA', 'nodeB', 'default', 'default');
      
      // Should not throw error
      const nodeB = nodeDataManager.getNodeData('nodeB');
      expect(Object.keys(nodeB.input.connections)).toHaveLength(0);
    });
  });
});