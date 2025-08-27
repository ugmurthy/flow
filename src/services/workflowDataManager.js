/**
 * Workflow Data Manager
 * Handles complete workflow data integration between React Flow and NodeDataManager
 * Ensures 100% data fidelity during save/load operations
 */

/**
 * Enhanced Workflow Data Manager Class
 * Merges React Flow positioning data with NodeDataManager rich connection data
 */
export class WorkflowDataManager {
  constructor(nodeDataManager) {
    this.nodeDataManager = nodeDataManager;
    this.validationErrors = [];
    this.lastMergeStats = null;
  }

  /**
   * Merge React Flow nodes with NodeDataManager rich data
   * @param {Array} reactFlowNodes - Basic React Flow nodes (position, type, id)
   * @param {Array} reactFlowEdges - Basic React Flow edges
   * @returns {Object} - Enhanced workflow data with full fidelity
   */
  async mergeReactFlowWithNodeData(reactFlowNodes, reactFlowEdges) {
    console.log('<core> workflowDataManager: Starting data merge operation');
    this.validationErrors = [];
    
    const startTime = Date.now();
    const enhancedNodes = [];
    let nodesWithConnections = 0;
    let totalConnections = 0;
    
    try {
      for (const reactFlowNode of reactFlowNodes) {
        // Get rich data from NodeDataManager
        const nodeData = this.nodeDataManager.getNodeData(reactFlowNode.id);
        
        if (nodeData) {
          console.log(`<core> workflowDataManager: nodeData ${JSON.stringify(Object.keys(nodeData))}`)
          console.log(`<core> workflowDataManager: nodeData.meta.version ${(nodeData.meta?.version)}`)
          // Count connections for statistics
          const connectionCount = Object.keys(nodeData.input?.connections || {}).length;
          if (connectionCount > 0) {
            nodesWithConnections++;
            totalConnections += connectionCount;
          }

          // Merge React Flow positioning with NodeData rich content
          const enhancedNode = {
            ...reactFlowNode, // Keep id, type, position, selected, etc.
            data: nodeData,   // Replace with complete NodeData structure
            // Add metadata for tracking and validation
            enhancedMetadata: {
              lastSync: new Date().toISOString(),
              source: 'nodeDataManager',
              hasConnections: connectionCount > 0,
              connectionCount: connectionCount,
              dataVersion: nodeData.meta?.version || '1.0.0'
            }
          };

          enhancedNodes.push(enhancedNode);
          if (enhancedNodes.length) {
            console.log(`<core> workflowDataManager: Enhanced node[].keys ${JSON.stringify(Object.keys(enhancedNodes[enhancedNodes.length-1].data.input.connections),null,2)} `);
          }
          console.log(`<core> workflowDataManager: Enhanced node ${reactFlowNode.id} with ${connectionCount} connections`);
        } else {
          // Fallback to React Flow data if NodeData not found
          console.warn(`<core> workflowDataManager: No NodeData found for ${reactFlowNode.id}, using React Flow data`);
          
          enhancedNodes.push({
            ...reactFlowNode,
            enhancedMetadata: {
              lastSync: new Date().toISOString(),
              source: 'reactFlow',
              hasConnections: false,
              connectionCount: 0,
              warning: 'Missing NodeData - using fallback'
            }
          });
        }
      }

      // Create comprehensive connection metadata
      const connectionMap = new Map();
      for (const [connectionId, connection] of this.nodeDataManager.connections) {
        console.log(`<core> workflowDataManager: connectionId ${connectionId}`)
        connectionMap.set(connectionId, {
          ...connection,
          exportedAt: new Date().toISOString()
        });
      }

      const processingTime = Date.now() - startTime;
      
      // Store statistics for validation
      this.lastMergeStats = {
        totalNodes: enhancedNodes.length,
        nodesWithConnections,
        totalConnections,
        connectionsMapSize: connectionMap.size,
        processingTime,
        timestamp: new Date().toISOString()
      };

      console.log('<core> workflowDataManager: Merge completed:', this.lastMergeStats);

      return {
        nodes: enhancedNodes,
        edges: reactFlowEdges, // Edges remain the same for React Flow compatibility
        connectionMap: connectionMap,
        stats: this.lastMergeStats,
        validationErrors: this.validationErrors
      };

    } catch (error) {
      console.error('<core> workflowDataManager: Merge operation failed:', error);
      this.validationErrors.push({
        type: 'MERGE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Workflow data merge failed: ${error.message}`);
    }
  }

  /**
   * Restore NodeDataManager state from saved enhanced workflow
   * @param {Array} enhancedNodes - Nodes with full NodeData
   * @param {Map|Object} connectionMap - Saved connection metadata
   * @returns {Object} - Restoration result
   */
  async restoreNodeDataManagerState(enhancedNodes, connectionMap) {
    console.log('<core> workflowDataManager: Restoring NodeDataManager state');
    
    const startTime = Date.now();
    let restoredNodes = 0;
    let restoredConnections = 0;
    
    try {
      // Clear existing NodeDataManager state
      await this.nodeDataManager.cleanup();
      await this.nodeDataManager.initialize();

      // Restore connection map if provided
      if (connectionMap) {
        const connectionsToRestore = connectionMap instanceof Map 
          ? connectionMap 
          : new Map(Object.entries(connectionMap));

        for (const [connectionId, connection] of connectionsToRestore) {
          this.nodeDataManager.connections.set(connectionId, {
            ...connection,
            restoredAt: new Date().toISOString()
          });
          restoredConnections++;
        }
      }

      // Register all enhanced nodes with NodeDataManager
      for (const enhancedNode of enhancedNodes) {
        if (enhancedNode.data && enhancedNode.enhancedMetadata?.source === 'nodeDataManager') {
          // Register node with NodeDataManager using the restored data
          this.nodeDataManager.nodes.set(enhancedNode.id, enhancedNode.data);
          restoredNodes++;
          
          console.log(`<core> workflowDataManager: Restored node ${enhancedNode.id} with connections:`, 
            Object.keys(enhancedNode.data.input?.connections || {}).length);
        }
      }

      const processingTime = Date.now() - startTime;
      
      const restorationStats = {
        restoredNodes,
        restoredConnections,
        processingTime,
        timestamp: new Date().toISOString()
      };

      console.log('<core> workflowDataManager: NodeDataManager state restored:', restorationStats);
      
      return {
        success: true,
        stats: restorationStats
      };

    } catch (error) {
      console.error('<core> workflowDataManager: State restoration failed:', error);
      throw new Error(`NodeDataManager state restoration failed: ${error.message}`);
    }
  }

  /**
   * Validate data integrity during merge operations
   * @param {Object} mergeResult - Result from mergeReactFlowWithNodeData
   * @returns {Object} - Validation result
   */
  validateDataIntegrity(mergeResult) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        nodesValidated: 0,
        connectionsValidated: 0,
        dataFidelityScore: 0
      }
    };

    try {
      // Validate nodes
      for (const node of mergeResult.nodes) {
        validation.stats.nodesValidated++;
        
        // Check for missing critical data
        if (!node.data) {
          validation.errors.push(`Node ${node.id}: Missing data object`);
          validation.isValid = false;
          continue;
        }

        // Check NodeData schema compliance
        if (!node.data.meta || !node.data.input || !node.data.output || !node.data.error) {
          validation.errors.push(`Node ${node.id}: Invalid NodeData schema`);
          validation.isValid = false;
          continue;
        }

        // Validate connections if present
        if (node.data.input?.connections) {
          const connections = node.data.input.connections;
          const connectionCount = Object.keys(connections).length;
          
          validation.stats.connectionsValidated += connectionCount;
          
          for (const [connectionId, connection] of Object.entries(connections)) {
            if (!connection.sourceNodeId || !connection.meta) {
              validation.errors.push(`Node ${node.id}: Invalid connection ${connectionId}`);
              validation.isValid = false;
            }
          }
        }

        // Check enhanced metadata
        if (!node.enhancedMetadata) {
          validation.warnings.push(`Node ${node.id}: Missing enhanced metadata`);
        }
      }

      // Calculate data fidelity score
      const totalExpectedNodes = mergeResult.nodes.length;
      const nodesWithData = mergeResult.nodes.filter(n => n.data && n.enhancedMetadata?.source === 'nodeDataManager').length;
      validation.stats.dataFidelityScore = totalExpectedNodes > 0 ? (nodesWithData / totalExpectedNodes) * 100 : 0;

      // Add overall assessment
      if (validation.stats.dataFidelityScore < 80) {
        validation.warnings.push(`Low data fidelity score: ${validation.stats.dataFidelityScore.toFixed(1)}%`);
      }

      console.log('<core> workflowDataManager: Data integrity validation completed:', validation);
      
      return validation;

    } catch (error) {
      console.error('<core> workflowDataManager: Validation failed:', error);
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
      return validation;
    }
  }

  /**
   * Get detailed statistics about the last merge operation
   * @returns {Object} - Comprehensive statistics
   */
  getLastMergeStats() {
    return {
      ...this.lastMergeStats,
      hasErrors: this.validationErrors.length > 0,
      validationErrors: this.validationErrors
    };
  }

  /**
   * Split enhanced workflow data back into React Flow and NodeData components
   * Used during load operations to separate concerns
   * @param {Object} enhancedWorkflowData - Complete workflow data
   * @returns {Object} - Split data for different systems
   */
  splitWorkflowData(enhancedWorkflowData) {
    const reactFlowNodes = [];
    const nodeDataMap = new Map();
    
    for (const node of enhancedWorkflowData.nodes) {
      // Extract React Flow node (positioning, type, id)
      reactFlowNodes.push({
        id: node.id,
        type: node.type,
        position: node.position,
        selected: node.selected,
        data: node.data, // Keep full data for React Flow compatibility
        // Preserve any other React Flow specific properties
        ...(node.dragging !== undefined && { dragging: node.dragging }),
        ...(node.width !== undefined && { width: node.width }),
        ...(node.height !== undefined && { height: node.height })
      });
      
      // Extract NodeData for NodeDataManager
      if (node.data && node.enhancedMetadata?.source === 'nodeDataManager') {
        nodeDataMap.set(node.id, node.data);
      }
    }

    return {
      reactFlowNodes,
      reactFlowEdges: enhancedWorkflowData.edges,
      nodeDataMap,
      connectionMap: enhancedWorkflowData.connectionMap,
      stats: enhancedWorkflowData.stats
    };
  }
}

/**
 * Create WorkflowDataManager instance
 * @param {NodeDataManager} nodeDataManager - NodeDataManager instance
 * @returns {WorkflowDataManager} - New instance
 */
export function createWorkflowDataManager(nodeDataManager) {
  return new WorkflowDataManager(nodeDataManager);
}

export default WorkflowDataManager;