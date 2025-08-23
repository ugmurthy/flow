/**
 * Phase 4 NodeDataManager Enhancement Tests
 * Tests the enhanced aggregation strategies and directive processing system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeDataManager, NodeDataEvents } from '../services/nodeDataManager.js';
import { NodeData, ProcessNodeData, DataDirective } from '../types/nodeSchema.js';

describe('Phase 4 NodeDataManager Enhancements', () => {
  let nodeDataManager;
  let mockUpdateCallback;

  beforeEach(() => {
    nodeDataManager = new NodeDataManager();
    mockUpdateCallback = vi.fn();
  });

  describe('Enhanced Aggregation Strategies', () => {
    it('should aggregate using merge strategy (default)', async () => {
      // Create nodes with merge strategy
      const sourceNode1 = NodeData.create({
        meta: { label: 'Source 1', category: 'input' },
        output: { data: { name: 'John', age: 30 } }
      });

      const sourceNode2 = NodeData.create({
        meta: { label: 'Source 2', category: 'input' },
        output: { data: { city: 'NYC', age: 25 } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'merge' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      // Register nodes
      nodeDataManager.registerNode('source1', sourceNode1, mockUpdateCallback);
      nodeDataManager.registerNode('source2', sourceNode2, mockUpdateCallback);
      nodeDataManager.registerNode('target', targetNode, mockUpdateCallback);

      // Add connections
      await nodeDataManager.addConnection('source1', 'target', 'default', 'default', 'edge1');
      await nodeDataManager.addConnection('source2', 'target', 'default', 'default', 'edge2');

      // Test aggregation directly (data comes from source nodes' output.data)
      const targetData = nodeDataManager.getNodeData('target');
      const aggregatedData = await nodeDataManager._aggregateInputs('target', targetData);
      
      expect(aggregatedData.name).toBe('John');
      expect(aggregatedData.city).toBe('NYC');
      expect(aggregatedData.age).toBe(25); // Later source should override
    });

    it('should aggregate using priority strategy', async () => {
      // Create nodes for priority testing
      const sourceNode1 = NodeData.create({
        meta: { label: 'Low Priority Source', category: 'input' },
        output: { data: { name: 'John', priority: 'low' } }
      });

      const sourceNode2 = NodeData.create({
        meta: { label: 'High Priority Source', category: 'input' },
        output: { data: { name: 'Jane', priority: 'high' } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Priority Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'priority' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      // Register nodes
      nodeDataManager.registerNode('source1', sourceNode1, mockUpdateCallback);
      nodeDataManager.registerNode('source2', sourceNode2, mockUpdateCallback);
      nodeDataManager.registerNode('target', targetNode, mockUpdateCallback);

      // Add connections
      await nodeDataManager.addConnection('source1', 'target', 'default', 'default', 'edge1');
      await nodeDataManager.addConnection('source2', 'target', 'default', 'default', 'edge2');

      // Set priorities on connections by updating the target node's connection metadata
      const targetData = nodeDataManager.getNodeData('target');
      const connections = targetData.input.connections;
      const connectionIds = Object.keys(connections);

      // Update connection priorities
      connections[connectionIds[0]].meta.priority = 3; // Low priority
      connections[connectionIds[1]].meta.priority = 8; // High priority

      await nodeDataManager.updateNodeData('target', {
        input: { connections }
      });

      // Test priority aggregation
      const updatedTargetData = nodeDataManager.getNodeData('target');
      const aggregatedData = await nodeDataManager._aggregateInputs('target', updatedTargetData);

      // High priority source data should take precedence
      expect(aggregatedData.name).toBe('Jane');
      expect(aggregatedData.priority).toBe('high');
    });

    it('should aggregate using array strategy', async () => {
      // Create array aggregation nodes
      const sourceNode1 = NodeData.create({
        meta: { label: 'Array Source 1', category: 'input' },
        output: { data: { value: 10 } }
      });

      const sourceNode2 = NodeData.create({
        meta: { label: 'Array Source 2', category: 'input' },
        output: { data: { value: 20 } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Array Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'array' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      // Register nodes
      nodeDataManager.registerNode('source1', sourceNode1, mockUpdateCallback);
      nodeDataManager.registerNode('source2', sourceNode2, mockUpdateCallback);
      nodeDataManager.registerNode('target', targetNode, mockUpdateCallback);

      // Add connections
      await nodeDataManager.addConnection('source1', 'target', 'default', 'default', 'edge1');
      await nodeDataManager.addConnection('source2', 'target', 'default', 'default', 'edge2');

      // Test array aggregation
      const targetData = nodeDataManager.getNodeData('target');
      const aggregatedData = await nodeDataManager._aggregateInputs('target', targetData);

      expect(aggregatedData.connections).toHaveLength(2);
      expect(aggregatedData.data).toHaveLength(2);
      expect(aggregatedData.data).toContainEqual({ value: 10 });
      expect(aggregatedData.data).toContainEqual({ value: 20 });
    });

    it('should aggregate using latest strategy', async () => {
      // Create latest strategy nodes
      const sourceNode1 = NodeData.create({
        meta: { label: 'Old Source', category: 'input' },
        output: { data: { message: 'old data' } }
      });

      const sourceNode2 = NodeData.create({
        meta: { label: 'New Source', category: 'input' },
        output: { data: { message: 'new data' } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Latest Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'latest' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      // Register nodes
      nodeDataManager.registerNode('source1', sourceNode1, mockUpdateCallback);
      nodeDataManager.registerNode('source2', sourceNode2, mockUpdateCallback);
      nodeDataManager.registerNode('target', targetNode, mockUpdateCallback);

      // Add first connection
      await nodeDataManager.addConnection('source1', 'target', 'default', 'default', 'edge1');
      
      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50)); // Increased delay
      
      // Add second connection
      await nodeDataManager.addConnection('source2', 'target', 'default', 'default', 'edge2');

      // Manually update connection timestamps to ensure source2 is later
      const targetData = nodeDataManager.getNodeData('target');
      const connections = targetData.input.connections;
      const connectionIds = Object.keys(connections);
      
      // Set explicit timestamps to ensure order
      const oldTime = new Date('2023-01-01T10:00:00.000Z').toISOString();
      const newTime = new Date('2023-01-01T10:00:01.000Z').toISOString();
      
      connections[connectionIds[0]].meta.timestamp = oldTime;
      connections[connectionIds[0]].meta.lastProcessed = oldTime;
      connections[connectionIds[1]].meta.timestamp = newTime;
      connections[connectionIds[1]].meta.lastProcessed = newTime;

      await nodeDataManager.updateNodeData('target', {
        input: { connections }
      });

      // Test latest aggregation
      const updatedTargetData = nodeDataManager.getNodeData('target');
      const aggregatedData = await nodeDataManager._aggregateInputs('target', updatedTargetData);

      expect(aggregatedData.latest.message).toBe('new data');
      expect(aggregatedData.source).toBe('source2');
      expect(aggregatedData.timestamp).toBeDefined();
    });

    it('should handle custom aggregation strategy', async () => {
      const customAggregationHandler = vi.fn((connections, nodeData) => {
        const values = [];
        for (const [id, connection] of Object.entries(connections)) {
          if (connection.data && connection.data.value) {
            values.push(connection.data.value);
          }
        }
        return { sum: values.reduce((a, b) => a + b, 0), count: values.length };
      });

      // Create custom aggregation nodes
      const sourceNode1 = NodeData.create({
        meta: { label: 'Custom Source 1', category: 'input' },
        output: { data: { value: 15 } }
      });

      const sourceNode2 = NodeData.create({
        meta: { label: 'Custom Source 2', category: 'input' },
        output: { data: { value: 25 } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Custom Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'custom' },
          connections: {},
          config: { 
            allowMultipleConnections: true,
            customAggregationHandler 
          }
        }
      });

      // Register nodes
      nodeDataManager.registerNode('source1', sourceNode1, mockUpdateCallback);
      nodeDataManager.registerNode('source2', sourceNode2, mockUpdateCallback);
      nodeDataManager.registerNode('target', targetNode, mockUpdateCallback);

      // Add connections
      await nodeDataManager.addConnection('source1', 'target', 'default', 'default', 'edge1');
      await nodeDataManager.addConnection('source2', 'target', 'default', 'default', 'edge2');

      // Test custom aggregation
      const targetData = nodeDataManager.getNodeData('target');
      const aggregatedData = await nodeDataManager._aggregateInputs('target', targetData);

      expect(customAggregationHandler).toHaveBeenCalled();
      expect(aggregatedData.sum).toBe(40);
      expect(aggregatedData.count).toBe(2);
    });
  });

  describe('Data Directive Processing', () => {
    it('should process directives after node processing', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: {
          section: 'input',
          path: 'config.displayFormat',
          operation: 'set'
        },
        payload: 'enhanced',
        processing: { immediate: true },
        meta: { source: 'test-node' }
      });

      const sourceNode = NodeData.create({
        meta: { label: 'Directive Source', category: 'input' },
        output: {
          data: { message: 'processed' },
          directives: {
            'target-node': [directive]
          }
        }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Directive Target', category: 'output' },
        input: {
          config: { displayFormat: 'default' }
        }
      });

      nodeDataManager.registerNode('source', sourceNode, mockUpdateCallback);
      nodeDataManager.registerNode('target-node', targetNode, mockUpdateCallback);

      // Test directive processing by passing the actual directives
      const sourceData = nodeDataManager.getNodeData('source');
      await nodeDataManager.processDirectives('source', sourceData.output.directives);

      // Check if directive was applied to target
      const updatedTarget = nodeDataManager.getNodeData('target-node');
      expect(updatedTarget.input.config.displayFormat).toBe('enhanced');
    });

    it('should handle directive merge operations', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: {
          section: 'input',
          path: 'config',
          operation: 'merge'
        },
        payload: { newProperty: 'added', displayFormat: 'merged' },
        processing: { immediate: true }
      });

      const sourceNode = NodeData.create({
        meta: { label: 'Merge Source', category: 'input' },
        output: {
          data: { message: 'processed' },
          directives: {
            'merge-target': [directive]
          }
        }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Merge Target', category: 'output' },
        input: {
          config: { 
            displayFormat: 'original',
            existingProperty: 'preserved'
          }
        }
      });

      nodeDataManager.registerNode('merge-source', sourceNode, mockUpdateCallback);
      nodeDataManager.registerNode('merge-target', targetNode, mockUpdateCallback);

      // Test directive processing
      const sourceData = nodeDataManager.getNodeData('merge-source');
      await nodeDataManager.processDirectives('merge-source', sourceData.output.directives);

      const updatedTarget = nodeDataManager.getNodeData('merge-target');
      expect(updatedTarget.input.config.displayFormat).toBe('merged');
      expect(updatedTarget.input.config.newProperty).toBe('added');
      expect(updatedTarget.input.config.existingProperty).toBe('preserved');
    });

    it('should handle directive errors gracefully', async () => {
      const invalidDirective = {
        // Missing required fields
        type: 'invalid-type',
        payload: 'test'
      };

      const sourceNode = NodeData.create({
        meta: { label: 'Error Source', category: 'input' },
        output: {
          data: { message: 'processed' },
          directives: {
            'target-node': [invalidDirective]
          }
        }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Error Target', category: 'output' }
      });

      nodeDataManager.registerNode('error-source', sourceNode, mockUpdateCallback);
      nodeDataManager.registerNode('target-node', targetNode, mockUpdateCallback);

      // Should not throw error, but handle gracefully
      const sourceData = nodeDataManager.getNodeData('error-source');
      await expect(nodeDataManager.processDirectives('error-source', sourceData.output.directives)).resolves.not.toThrow();

      // Check if error was recorded in source node
      const updatedSource = nodeDataManager.getNodeData('error-source');
      expect(updatedSource.error.hasError).toBe(true);
      expect(updatedSource.error.errors).toHaveLength(1);
      expect(updatedSource.error.errors[0].code).toBe('DIRECTIVE_PROCESSING_ERROR');
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should handle aggregation errors gracefully', async () => {
      const sourceNode = NodeData.create({
        meta: { label: 'Error Source', category: 'input' },
        output: { data: { value: 'invalid' } }
      });

      const targetNode = NodeData.create({
        meta: { label: 'Error Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'custom' },
          connections: {},
          config: {
            allowMultipleConnections: true,
            customAggregationHandler: () => {
              throw new Error('Aggregation failed');
            }
          }
        }
      });

      nodeDataManager.registerNode('error-source', sourceNode, mockUpdateCallback);
      nodeDataManager.registerNode('error-target', targetNode, mockUpdateCallback);

      await nodeDataManager.addConnection('error-source', 'error-target', 'default', 'default', 'edge1');

      // Should not throw, but handle error gracefully
      const targetData = nodeDataManager.getNodeData('error-target');
      await expect(nodeDataManager._aggregateInputs('error-target', targetData)).resolves.not.toThrow();

      const updatedTarget = nodeDataManager.getNodeData('error-target');
      expect(updatedTarget.error.hasError).toBe(true);
    });

    it('should recover from connection data errors', async () => {
      const sourceNode = NodeData.create({
        meta: { label: 'Recovery Source', category: 'input' },
        output: { data: null } // Null data should be handled
      });

      const targetNode = NodeData.create({
        meta: { label: 'Recovery Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'merge' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      nodeDataManager.registerNode('recovery-source', sourceNode, mockUpdateCallback);
      nodeDataManager.registerNode('recovery-target', targetNode, mockUpdateCallback);

      await nodeDataManager.addConnection('recovery-source', 'recovery-target', 'default', 'default', 'edge1');

      // Should handle null data gracefully
      const targetData = nodeDataManager.getNodeData('recovery-target');
      await expect(nodeDataManager._aggregateInputs('recovery-target', targetData)).resolves.not.toThrow();

      const processedTarget = nodeDataManager.getNodeData('recovery-target');
      expect(processedTarget.error.hasError).toBe(false);
    });
  });

  describe('Performance and Integration', () => {
    it('should handle multiple aggregation strategies efficiently', async () => {
      const nodeCount = 10;
      const nodes = [];

      // Create source nodes
      for (let i = 0; i < nodeCount; i++) {
        const sourceNode = NodeData.create({
          meta: { label: `Perf Source ${i}`, category: 'input' },
          output: { data: { value: i, timestamp: Date.now() } }
        });
        nodes.push({ id: `perf-source-${i}`, data: sourceNode });
        nodeDataManager.registerNode(`perf-source-${i}`, sourceNode, mockUpdateCallback);
      }

      // Create target node with array strategy
      const targetNode = NodeData.create({
        meta: { label: 'Performance Target', category: 'process', allowMultipleConnections: true },
        input: {
          processed: { strategy: 'array' },
          connections: {},
          config: { allowMultipleConnections: true }
        }
      });

      nodeDataManager.registerNode('perf-target', targetNode, mockUpdateCallback);

      // Add connections
      for (let i = 0; i < nodeCount; i++) {
        await nodeDataManager.addConnection(`perf-source-${i}`, 'perf-target', 'default', 'default', `perf-edge-${i}`);
      }

      // Measure processing time
      const startTime = performance.now();
      const targetData = nodeDataManager.getNodeData('perf-target');
      const aggregatedData = await nodeDataManager._aggregateInputs('perf-target', targetData);
      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(100); // Should complete in under 100ms
      expect(aggregatedData.data).toHaveLength(nodeCount);
      expect(aggregatedData.connections).toHaveLength(nodeCount);
    });
  });
});