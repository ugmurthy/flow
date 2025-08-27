/**
 * Comprehensive test suite for workflow data integrity
 * Validates that the enhanced save/load pipeline preserves all NodeDataManager data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowDataManager } from '../../services/workflowDataManager.js';
import nodeDataManager from '../../services/nodeDataManager.js';
import { createWorkflowObject } from '../../utils/workflowUtils.js';
import { NodeData, ConnectionData } from '../../types/nodeSchema.js';

// Mock React Flow nodes with basic data
const createMockReactFlowNodes = () => [
  {
    id: 'form-1',
    type: 'templateFormNode',
    position: { x: 100, y: 100 },
    data: {
      // Basic React Flow data - missing rich NodeData
      formFields: [{ name: 'input1', type: 'text', value: 'test data' }]
    }
  },
  {
    id: 'process-1', 
    type: 'ProcessNew',
    position: { x: 300, y: 100 },
    data: {
      // Basic React Flow data - missing connection info
      pluginName: 'dataProcessor'
    }
  },
  {
    id: 'output-1',
    type: 'MarkdownNew', 
    position: { x: 500, y: 100 },
    data: {
      // Basic React Flow data - missing processed results
      content: ''
    }
  }
];

const createMockReactFlowEdges = () => [
  {
    id: 'form-1-process-1',
    source: 'form-1',
    target: 'process-1',
    sourceHandle: 'output',
    targetHandle: 'input'
  },
  {
    id: 'process-1-output-1', 
    source: 'process-1',
    target: 'output-1',
    sourceHandle: 'output',
    targetHandle: 'input'
  }
];

// Create rich NodeData with connections (what should be preserved)
const createRichNodeData = () => {
  const formNodeData = NodeData.create({
    id: 'form-1',
    type: 'templateFormNode',
    category: 'input',
    label: 'Form Input'
  });

  // Add form data to output
  formNodeData.output.data = {
    input1: 'test data',
    timestamp: new Date().toISOString()
  };

  const processNodeData = NodeData.create({
    id: 'process-1', 
    type: 'ProcessNew',
    category: 'process',
    label: 'Data Processor'
  });

  // Add rich connection data to process node
  const connectionData = ConnectionData.create(
    'form-1', 
    'output', 
    'input', 
    { input1: 'test data', timestamp: new Date().toISOString() },
    { input1: 'PROCESSED: test data' }
  );

  processNodeData.input.connections = {
    'form-1-process-1-output-input': connectionData
  };

  processNodeData.output.data = {
    result: 'PROCESSED: test data',
    processingTime: 150,
    timestamp: new Date().toISOString()
  };

  const outputNodeData = NodeData.create({
    id: 'output-1',
    type: 'MarkdownNew',
    category: 'output', 
    label: 'Markdown Output'
  });

  // Add connection from process node
  const outputConnectionData = ConnectionData.create(
    'process-1',
    'output',
    'input', 
    { result: 'PROCESSED: test data', processingTime: 150 },
    { markdown: '# Result\nPROCESSED: test data' }
  );

  outputNodeData.input.connections = {
    'process-1-output-1-output-input': outputConnectionData
  };

  outputNodeData.output.data = {
    markdown: '# Result\nPROCESSED: test data',
    rendered: true
  };

  return {
    'form-1': formNodeData,
    'process-1': processNodeData, 
    'output-1': outputNodeData
  };
};

describe('Workflow Data Integrity Tests', () => {
  let workflowDataManager;
  let mockReactFlowNodes;
  let mockReactFlowEdges;
  let richNodeData;

  beforeEach(async () => {
    // Reset NodeDataManager
    await nodeDataManager.cleanup();
    await nodeDataManager.initialize();
    
    // Create fresh test data
    workflowDataManager = new WorkflowDataManager(nodeDataManager);
    mockReactFlowNodes = createMockReactFlowNodes();
    mockReactFlowEdges = createMockReactFlowEdges();
    richNodeData = createRichNodeData();

    // Populate NodeDataManager with rich data
    for (const [nodeId, nodeData] of Object.entries(richNodeData)) {
      nodeDataManager.nodes.set(nodeId, nodeData);
    }

    // Add connection metadata
    nodeDataManager.connections.set('form-1-process-1-output-input', {
      id: 'form-1-process-1-output-input',
      sourceNodeId: 'form-1',
      targetNodeId: 'process-1', 
      sourceHandle: 'output',
      targetHandle: 'input',
      createdAt: new Date().toISOString()
    });

    nodeDataManager.connections.set('process-1-output-1-output-input', {
      id: 'process-1-output-1-output-input',
      sourceNodeId: 'process-1',
      targetNodeId: 'output-1',
      sourceHandle: 'output', 
      targetHandle: 'input',
      createdAt: new Date().toISOString()
    });
  });

  describe('Data Merge Operations', () => {
    it('should merge React Flow nodes with NodeDataManager rich data', async () => {
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes, 
        mockReactFlowEdges
      );

      expect(mergedData.nodes).toHaveLength(3);
      expect(mergedData.stats.nodesWithConnections).toBe(2); // process and output nodes have connections
      expect(mergedData.stats.totalConnections).toBe(2);

      // Verify form node has enhanced data
      const formNode = mergedData.nodes.find(n => n.id === 'form-1');
      expect(formNode.data.output.data).toEqual({
        input1: 'test data',
        timestamp: expect.any(String)
      });
      expect(formNode.enhancedMetadata.source).toBe('nodeDataManager');

      // Verify process node has connection data
      const processNode = mergedData.nodes.find(n => n.id === 'process-1');
      expect(processNode.data.input.connections).toBeDefined();
      expect(Object.keys(processNode.data.input.connections)).toHaveLength(1);
      
      const connection = processNode.data.input.connections['form-1-process-1-output-input'];
      expect(connection.sourceNodeId).toBe('form-1');
      expect(connection.data).toEqual({
        input1: 'test data',
        timestamp: expect.any(String)
      });

      // Verify output node has connection data  
      const outputNode = mergedData.nodes.find(n => n.id === 'output-1');
      expect(outputNode.data.input.connections).toBeDefined();
      expect(Object.keys(outputNode.data.input.connections)).toHaveLength(1);
    });

    it('should preserve connection metadata in merge result', async () => {
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      expect(mergedData.connectionMap).toBeDefined();
      expect(mergedData.connectionMap.size).toBe(2);

      const connection1 = mergedData.connectionMap.get('form-1-process-1-output-input');
      expect(connection1.sourceNodeId).toBe('form-1');
      expect(connection1.targetNodeId).toBe('process-1');
      expect(connection1.exportedAt).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate data integrity during merge', async () => {
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      const validation = workflowDataManager.validateDataIntegrity(mergedData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.stats.nodesValidated).toBe(3);
      expect(validation.stats.connectionsValidated).toBe(2);
      expect(validation.stats.dataFidelityScore).toBeGreaterThan(80);
    });

    it('should detect missing NodeData and provide warnings', async () => {
      // Remove one node from NodeDataManager to simulate missing data
      nodeDataManager.nodes.delete('process-1');

      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      // Process node should fall back to React Flow data
      const processNode = mergedData.nodes.find(n => n.id === 'process-1');
      expect(processNode.enhancedMetadata.source).toBe('reactFlow');
      expect(processNode.enhancedMetadata.warning).toContain('Missing NodeData');
    });
  });

  describe('Enhanced Workflow Creation', () => {
    it('should create enhanced workflow object with complete data', async () => {
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      const enhancedMetadata = {
        version: '2.0.0',
        dataFidelity: 'complete',
        stats: mergedData.stats
      };

      const workflow = createWorkflowObject({
        name: 'Test Enhanced Workflow',
        description: 'Testing enhanced data preservation',
        nodes: mergedData.nodes,
        edges: mergedData.edges,
        connectionMap: mergedData.connectionMap,
        enhancedMetadata
      });

      expect(workflow.version).toBe('2.0.0');
      expect(workflow.workflow.enhancedMetadata).toBeDefined();
      expect(workflow.workflow.connectionMap).toBeDefined();
      
      // Verify connection data is preserved in workflow nodes
      const savedProcessNode = workflow.workflow.nodes.find(n => n.id === 'process-1');
      expect(savedProcessNode.data.input.connections).toBeDefined();
      expect(Object.keys(savedProcessNode.data.input.connections)).toHaveLength(1);
    });

    it('should maintain backward compatibility with legacy format', () => {
      const legacyWorkflow = createWorkflowObject({
        name: 'Legacy Workflow',
        description: 'Testing legacy compatibility',
        nodes: mockReactFlowNodes,
        edges: mockReactFlowEdges
      });

      expect(legacyWorkflow.version).toBe('1.0.0');
      expect(legacyWorkflow.workflow.enhancedMetadata).toBeUndefined();
      expect(legacyWorkflow.workflow.connectionMap).toBeUndefined();
    });
  });

  describe('State Restoration', () => {
    it('should restore NodeDataManager state from enhanced workflow', async () => {
      // First create enhanced workflow data
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      // Clear NodeDataManager to simulate fresh load
      await nodeDataManager.cleanup();
      await nodeDataManager.initialize();

      // Restore state
      const restorationResult = await workflowDataManager.restoreNodeDataManagerState(
        mergedData.nodes,
        mergedData.connectionMap
      );

      expect(restorationResult.success).toBe(true);
      expect(restorationResult.stats.restoredNodes).toBe(3);
      expect(restorationResult.stats.restoredConnections).toBe(2);

      // Verify NodeDataManager state was restored
      const restoredProcessNode = nodeDataManager.getNodeData('process-1');
      expect(restoredProcessNode).toBeDefined();
      expect(restoredProcessNode.input.connections).toBeDefined();
      expect(Object.keys(restoredProcessNode.input.connections)).toHaveLength(1);
    });
  });

  describe('Critical Issue Reproduction', () => {
    it('should demonstrate the OLD system loses connection data', () => {
      // Simulate old save process (just React Flow data)
      const oldWorkflow = createWorkflowObject({
        name: 'Old System Test',
        nodes: mockReactFlowNodes, // Only React Flow data - NO NodeData connections!
        edges: mockReactFlowEdges
      });

      // Verify connections are lost in old system
      const oldProcessNode = oldWorkflow.workflow.nodes.find(n => n.id === 'process-1');
      expect(oldProcessNode.data.input?.connections).toBeUndefined();
      expect(oldProcessNode.data.output?.data).toBeUndefined();
    });

    it('should demonstrate the NEW system preserves all connection data', async () => {
      // Simulate new enhanced save process
      const mergedData = await workflowDataManager.mergeReactFlowWithNodeData(
        mockReactFlowNodes,
        mockReactFlowEdges
      );

      const newWorkflow = createWorkflowObject({
        name: 'New System Test',
        nodes: mergedData.nodes, // Enhanced data with full NodeData!
        edges: mergedData.edges,
        connectionMap: mergedData.connectionMap,
        enhancedMetadata: {
          version: '2.0.0',
          dataFidelity: 'complete',
          stats: mergedData.stats
        }
      });

      // Verify connections are preserved in new system
      const newProcessNode = newWorkflow.workflow.nodes.find(n => n.id === 'process-1');
      expect(newProcessNode.data.input.connections).toBeDefined();
      expect(Object.keys(newProcessNode.data.input.connections)).toHaveLength(1);
      
      const connection = newProcessNode.data.input.connections['form-1-process-1-output-input'];
      expect(connection.sourceNodeId).toBe('form-1');
      expect(connection.data).toBeDefined();
      expect(connection.processed).toBeDefined();

      // Verify output data is preserved
      expect(newProcessNode.data.output.data).toBeDefined();
      expect(newProcessNode.data.output.data.result).toBe('PROCESSED: test data');
    });
  });
});