/**
 * Node Data Manager
 * Manages node data using the new schema and provides event-driven updates
 * Replaces the old 100ms polling system with efficient event-based communication
 */

import { NodeData, ConnectionData, SchemaMigration } from '../types/nodeSchema.js';
import { ProcessingInput, PluginContext } from '../types/pluginSystem.js';
import { validateNodeData, validateNodeDataUpdates, createValidationErrorMessage, validateInput} from '../types/nodeDataValidation.js';
import pluginRegistry from './pluginRegistry.js';
/**
 * Event types for node data changes
 */
export const NodeDataEvents = {
  NODE_DATA_UPDATED: 'nodeDataUpdated',
  CONNECTION_ADDED: 'connectionAdded',
  CONNECTION_REMOVED: 'connectionRemoved',
  NODE_ERROR: 'nodeError',
  NODE_PROCESSING: 'nodeProcessing',
  NODE_PROCESSED: 'nodeProcessed'
};

/**
 * Node Data Manager Class
 */
export class NodeDataManager extends EventTarget {
  constructor() {
    super();
    this.nodes = new Map(); // nodeId -> NodeData
    this.connections = new Map(); // connectionId -> connection info
    this.processingQueue = new Map(); // nodeId -> processing promise
    this.updateCallbacks = new Map(); // nodeId -> callback function
    this.reactFlowCallbacks = null; // React Flow integration callbacks
    this.flowStateContext = null; // FlowStateContext integration
    this.initialized = false;
  }

  /**
   * Set React Flow integration callbacks for edge management
   * @param {Object} callbacks - React Flow callbacks
   * @param {Function} callbacks.removeEdge - Function to remove edge from React Flow
   * @param {Function} callbacks.addEdge - Function to add edge to React Flow
   */
  setReactFlowCallbacks(callbacks) {
    this.reactFlowCallbacks = callbacks;
    console.log('React Flow callbacks registered with NodeDataManager');
  }

  /**
   * Set FlowStateContext integration for synchronization
   * @param {Object} flowStateContext - FlowStateContext instance
   */
  setFlowStateContext(flowStateContext) {
    this.flowStateContext = flowStateContext;
    console.log('FlowStateContext registered with NodeDataManager');
  }

  /**
   * Initialize the node data manager
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('Initializing Node Data Manager...');
    
    // Initialize plugin registry if not already done
    await pluginRegistry.initialize();
    
    this.initialized = true;
    console.log('Node Data Manager initialized');
  }

  /**
   * Register a node with the manager
   * @param {string} nodeId - Node ID
   * @param {Object} nodeData - Node data (old or new format)
   * @param {Function} updateCallback - Callback to update React Flow node
   */
  registerNode(nodeId, nodeData, updateCallback) {
    // Migrate old format to new format if needed
      const migratedData = this._ensureNewFormat(nodeData);
          
      
      
          // // Add nodeData validation here using zod
          // const validation = validateNodeData(migratedData);
          // console.log("Validation returns ",validation)
          // if (!validation.success) {
          //   const errorMessage = createValidationErrorMessage(validation, `Node registration for ${nodeId}`);
          //   console.error(errorMessage);
          //   throw new Error(errorMessage);
          // }
          
          // this.nodes.set(nodeId, validation.data);
    
    //this.nodes.set(nodeId,migratedData);
    // changed migratedData to nodeData
    this.nodes.set(nodeId,nodeData);
    this.updateCallbacks.set(nodeId, updateCallback);
    
    console.log(`Node ${nodeId} registered with new schema`);
    
    // Emit registration event
    //this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_DATA_UPDATED, {
    //  detail: { nodeId, nodeData: migratedData, action: 'registered' }
    //}));

    // changed migratedData to nodeData
    this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_DATA_UPDATED, {
      detail: { nodeId, nodeData: nodeData, action: 'registered' }
    }));
  }

  /**
   * Unregister a node from the manager
   * @param {string} nodeId - Node ID
   */
  unregisterNode(nodeId) {
    this.nodes.delete(nodeId);
    this.updateCallbacks.delete(nodeId);
    this.processingQueue.delete(nodeId);
    
    // Remove all connections involving this node
    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId) {
        this.connections.delete(connectionId);
      }
    }
    
    console.log(`Node ${nodeId} unregistered`);
  }

  /**
   * Get node data
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Node data
   */
  getNodeData(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Update node data
   * @param {string} nodeId - Node ID
   * @param {Object} updates - Updates to apply
   * @param {boolean} triggerProcessing - Whether to trigger processing
   */
  async updateNodeData(nodeId, updates, triggerProcessing = false) {
    const currentData = this.nodes.get(nodeId);
    if (!currentData) {
      const error = new Error(`Node ${nodeId} not found for update`);
      console.error(error.message);
      throw error;
    }

    // Validate updates using Zod schema
    // const updateValidation = validateNodeDataUpdates(updates);
    // if (!updateValidation.success) {
    //   const errorMessage = createValidationErrorMessage(updateValidation, `Node update for ${nodeId}`);
    //   console.error(errorMessage);
    //   throw new Error(errorMessage);
    // }

    // Additional JSON serialization check for output data
    if (updates.output?.data) {
      try {
        JSON.stringify(updates.output.data);
      } catch (error) {
        const validationError = new Error(`Invalid output data: ${error.message}`);
        console.error(validationError.message);
        throw validationError;
      }
    }

    // Apply updates using immutable update
    //console.log("\n-------------------------------------------------------------------")
    //console.log("nodeDataManager:updateNodeData: updates : triggerProcessing ", triggerProcessing);
    //console.log("nodeDataManager:updateNodeData: updates : ",updates);
    //console.log("nodeDataManager:updateNodeData: currentData : ",currentData)
    const updatedData = NodeData.update(currentData, updates);
    this.nodes.set(nodeId, updatedData);
    //console.log("nodeDataManager:updateNodeData: updatedData: ",updatedData)

    // Update React Flow node
    const updateCallback = this.updateCallbacks.get(nodeId);
    if (updateCallback) {
      updateCallback(nodeId, { data: updatedData });
    }

    // Emit update event
    this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_DATA_UPDATED, {
      detail: { nodeId, nodeData: updatedData, updates, action: 'updated' }
    }));

    // Sync with FlowStateContext if available
    if (this.flowStateContext?.syncWithReactFlow) {
      const reactFlowNode = {
        id: nodeId,
        type: 'auto-sync', // Will be overridden by actual type if available
        position: { x: 0, y: 0 }, // Will be maintained by React Flow
        data: updatedData,
      };
      
      // Call syncWithReactFlow to update FlowStateContext
      this.flowStateContext.syncWithReactFlow([reactFlowNode], []);
    }

    // Trigger processing if requested
    if (triggerProcessing) {
      await this.processNode(nodeId);
    }

    console.log(`Node ${nodeId} data updated and synced with FlowStateContext`);
  }

  /**
   * Add a connection between nodes
   * @param {string} sourceNodeId - Source node ID
   * @param {string} targetNodeId - Target node ID
   * @param {string} sourceHandle - Source handle ID
   * @param {string} targetHandle - Target handle ID
   * @param {string} edgeId - React Flow edge ID
   */
  async addConnection(sourceNodeId, targetNodeId, sourceHandle = 'default', targetHandle = 'default', edgeId) {
    const connectionId = `${sourceNodeId}-${targetNodeId}-${sourceHandle}-${targetHandle}`;
    console.log("addConnection", connectionId);
    
    // Get target node data to check connection policy
    const targetData = this.nodes.get(targetNodeId);
    if (!targetData) {
      console.error(`Target node ${targetNodeId} not found`);
      return;
    }

    // Check if multiple connections are allowed
    const allowMultipleConnections = targetData.input?.config?.allowMultipleConnections || false;
    
    // If single connection mode and target already has connections, remove old ones
    if (!allowMultipleConnections && targetData.input?.connections) {
      const existingConnections = Object.keys(targetData.input.connections);
      if (existingConnections.length > 0) {
        console.log(`Single connection mode: removing ${existingConnections.length} existing connections`);
        
        // Remove old connections and their React Flow edges
        for (const oldConnectionId of existingConnections) {
          const oldConnection = this.connections.get(oldConnectionId);
          if (oldConnection) {
            // Remove React Flow edge if callback is available
            if (this.reactFlowCallbacks?.removeEdge && oldConnection.edgeId) {
              this.reactFlowCallbacks.removeEdge(oldConnection.edgeId);
              console.log(`Removed React Flow edge: ${oldConnection.edgeId}`);
            }
            
            // Remove from connections map
            this.connections.delete(oldConnectionId);
          }
        }
        
        // Clear all connections from target node (single connection mode only)
        await this.updateNodeData(targetNodeId, {
          input: {
            connections: {},
            processed: {} // Clear processed data when connections change
          }
        });
      }
    }

    // Store new connection info
    this.connections.set(connectionId, {
      id: connectionId,
      edgeId,
      sourceNodeId,
      targetNodeId,
      sourceHandle,
      targetHandle,
      createdAt: new Date().toISOString()
    });

    // Create connection data and update target node
    const connectionData = ConnectionData.create(sourceNodeId, sourceHandle, targetHandle, null, null);
    
    // Update target node with new connection
    if (allowMultipleConnections) {
      // For multiple connections, add to existing connections using merge behavior
      const currentTargetData = this.nodes.get(targetNodeId);
      const existingConnections = currentTargetData.input.connections || {};
      
      await this.updateNodeData(targetNodeId, {
        input: {
          connections: {
            ...existingConnections,
            [connectionId]: connectionData
          }
        }
      });
    } else {
      // For single connections, connections were already cleared above, so set the new one
      await this.updateNodeData(targetNodeId, {
        input: {
          connections: {
            [connectionId]: connectionData
          }
        }
      });
    }

    // Emit connection event
    this.dispatchEvent(new CustomEvent(NodeDataEvents.CONNECTION_ADDED, {
      detail: { connectionId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, replaced: !allowMultipleConnections }
    }));

    // Trigger processing of target node
    await this.processNode(targetNodeId);

    console.log(`Connection added: ${sourceNodeId} -> ${targetNodeId} (multiple: ${allowMultipleConnections})`);
  }

  /**
   * Remove a connection between nodes
   * @param {string} sourceNodeId - Source node ID
   * @param {string} targetNodeId - Target node ID
   * @param {string} sourceHandle - Source handle ID
   * @param {string} targetHandle - Target handle ID
   */
  async removeConnection(sourceNodeId, targetNodeId, sourceHandle = 'default', targetHandle = 'default') {
    const connectionId = `${sourceNodeId}-${targetNodeId}-${sourceHandle}-${targetHandle}`;
    console.log("removeConnection", connectionId);
    
    // Get connection info before removing
    const connectionInfo = this.connections.get(connectionId);
    
    // Remove connection from connections map
    this.connections.delete(connectionId);

    // Update target node's input connections
    const targetData = this.nodes.get(targetNodeId);
    if (targetData && targetData.input?.connections) {
      const updatedConnections = { ...targetData.input.connections };
      delete updatedConnections[connectionId];
      
      await this.updateNodeData(targetNodeId, {
        input: {
          connections: updatedConnections,
          processed: {} // Clear processed data when connection is removed
        }
      });
      
      console.log(`Removed connection ${connectionId} from target node ${targetNodeId}`);
    }

    // Emit connection removed event
    this.dispatchEvent(new CustomEvent(NodeDataEvents.CONNECTION_REMOVED, {
      detail: { connectionId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, connectionInfo }
    }));

    console.log(`Connection removed: ${sourceNodeId} -> ${targetNodeId}`);
  }

  /**
   * Remove connection by edge ID (for React Flow integration)
   * @param {string} edgeId - React Flow edge ID
   */
  async removeConnectionByEdgeId(reactFlowEdgeId) {
    console.log("removeConnectionByEdgeId", reactFlowEdgeId);
    const REACT_FLOW_EDGE_PREFIX = "xy-edge__";
    const edgeId = reactFlowEdgeId.split(REACT_FLOW_EDGE_PREFIX)[1];
    console.log("removeConnectionByEdgeId", reactFlowEdgeId,'->',edgeId);
    // Find connection by edge ID
    let connectionToRemove = null;
    for (const [connectionId, connection] of this.connections) {
      if (connection.edgeId === edgeId) {
        connectionToRemove = { connectionId, ...connection };
        break;
      }
    }
    
    if (connectionToRemove) {
      await this.removeConnection(
        connectionToRemove.sourceNodeId,
        connectionToRemove.targetNodeId,
        connectionToRemove.sourceHandle,
        connectionToRemove.targetHandle
      );
      console.log(`Connection removed by edge ID: ${edgeId}`);
    } else {
      console.warn(`No connection found for edge ID: ${edgeId}`);
    }
  }

  /**
   * Find connection by edge ID
   * @param {string} edgeId - React Flow edge ID
   * @returns {Object|null} Connection info or null if not found
   */
  findConnectionByEdgeId(edgeId) {
    for (const [connectionId, connection] of this.connections) {
      if (connection.edgeId === edgeId) {
        return { connectionId, ...connection };
      }
    }
    return null;
  }

  /**
   * Process a node (aggregate inputs and run plugin if configured)
   * @param {string} nodeId - Node ID
   */
  async processNode(nodeId) {
    console.log(`processNode ${nodeId}`)
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) {
      console.warn(`Node ${nodeId} not found for processing`);
      return;
    }

    // Prevent concurrent processing of the same node
    if (this.processingQueue.has(nodeId)) {
      console.log(`Node ${nodeId} is already being processed`);
      return;
    }
    //console.log("processNode : Calling this._doProcessNode")
    const processingPromise = this._doProcessNode(nodeId, nodeData);
    this.processingQueue.set(nodeId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingQueue.delete(nodeId);
    }
  }

  /**
   * Internal node processing implementation
   * @private
   */
  async _doProcessNode(nodeId, nodeData) {
    try {
        // Skip processing for input nodes that generate their own data
      if (nodeData.meta.category === 'input' && 
          nodeData.output.data && 
          Object.keys(nodeData.output.data).length > 0) {
        console.log(`Skipping processing for input node ${nodeId} - has user data`);
        return;
      }
      // Set processing status
      await this.updateNodeData(nodeId, {
        output: {
          meta: {
            status: 'processing',
            timestamp: new Date().toISOString()
          }
        },
        error: {
          hasError: false,
          errors: []
        }
      });
      //console.log("_doProcessNode - emit: ",NodeDataEvents.NODE_PROCESSING)
      // Emit processing started event
      this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_PROCESSING, {
        detail: { nodeId, nodeData }
      }));

      // Aggregate input data
      const aggregatedInputs = await this._aggregateInputs(nodeId, nodeData);
      
      // Update processed inputs
      await this.updateNodeData(nodeId, {
        input: {
          processed: aggregatedInputs
        }
      });

      // Process with plugin if configured
      let result = aggregatedInputs;
      if (nodeData.plugin && nodeData.plugin.name) {
        result = await this._processWithPlugin(nodeId, nodeData, aggregatedInputs);
      }

      // Update output data
      await this.updateNodeData(nodeId, {
        output: {
          data: result,
          meta: {
            status: 'success',
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - new Date(nodeData.output.meta.timestamp).getTime()
          }
        }
      });

      // Emit processing completed event
      this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_PROCESSED, {
        detail: { nodeId, result, success: true }
      }));

      // Trigger processing of connected nodes
      await this._triggerDownstreamProcessing(nodeId);

    } catch (error) {
      console.error(`Error processing node ${nodeId}:`, error);
      
      // Update error state
      const updatedData = NodeData.addError(nodeData, {
        code: 'PROCESSING_ERROR',
        message: error.message,
        source: 'processing',
        details: error.stack
      });

      await this.updateNodeData(nodeId, {
        error: updatedData.error,
        output: {
          meta: {
            status: 'error',
            timestamp: new Date().toISOString()
          }
        }
      });

      // Emit error event
      this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_ERROR, {
        detail: { nodeId, error, nodeData }
      }));
    }
  }

  /**
   * Aggregate input data from connected nodes
   * @private
   */
  async _aggregateInputs(nodeId, nodeData) {
    //console.log("_aggregateInputs ",nodeId, nodeData);
    const aggregated = {};
    const connections = nodeData.input.connections || {};
    const updatedConnections = {};

    for (const [connectionId, connection] of Object.entries(connections)) {
      const sourceNodeData = this.nodes.get(connection.sourceNodeId);
      if (sourceNodeData && sourceNodeData.output.data) {
        // Create a labeled key for the source data
        const sourceLabel = `${sourceNodeData.meta.label}_${connection.sourceNodeId}`;
        aggregated[sourceLabel] = sourceNodeData.output.data;
        
        // Update connection with latest data and processed property
        updatedConnections[connectionId] = {
          ...connection,
          data: sourceNodeData.output.data,
          processed: sourceNodeData.output.data, // NEW: Add processed property with source data
          meta: {
            ...connection.meta,
            timestamp: new Date().toISOString(),
            dataType: typeof sourceNodeData.output.data,
            isActive: true,
            lastProcessed: new Date().toISOString() // NEW: Track when data was processed
          }
        };
      } else {
        // Keep existing connection even if source data is not available
        updatedConnections[connectionId] = connection;
      }
    }

    // Update all connections at once to avoid overwriting
    if (Object.keys(updatedConnections).length > 0) {
      await this.updateNodeData(nodeId, {
        input: {
          connections: updatedConnections
        }
      });
    }

    //console.log("_aggregateInputs aggregated :", aggregated)
    return aggregated;
  }

  /**
   * Process node data with configured plugin
   * @private
   */
  async _processWithPlugin(nodeId, nodeData, aggregatedInputs) {
    const { plugin } = nodeData;
    
    if (!pluginRegistry.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is not registered`);
    }

    // Convert aggregated inputs to ProcessingInput format
    const processingInputs = Object.entries(aggregatedInputs).map(([key, data]) => {
      const [label, sourceId] = key.split('_');
      return ProcessingInput.create({
        sourceId: sourceId || 'unknown',
        data
      });
    });

    // Create plugin context
    const context = PluginContext.create({
      nodeId,
      nodeData,
      updateNodeData: (updates) => this.updateNodeData(nodeId, updates),
      getConnectedNodes: () => this._getConnectedNodes(nodeId),
      globalContext: {}
    });

    // Process with plugin
    const result = await pluginRegistry.processWithPlugin(
      plugin.name,
      processingInputs,
      plugin.config || {},
      context
    );

    if (!result.success) {
      throw new Error(`Plugin processing failed: ${result.errors.join(', ')}`);
    }

    return result.data;
  }

  /**
   * Trigger processing of downstream connected nodes
   * @private
   */
  async _triggerDownstreamProcessing(nodeId) {
    const downstreamNodes = [];
    
    // Find nodes that have this node as input
    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId) {
        downstreamNodes.push(connection.targetNodeId);
      }
    }

    // Process downstream nodes
    const processingPromises = downstreamNodes.map(targetNodeId => 
      this.processNode(targetNodeId)
    );

    await Promise.all(processingPromises);
  }

  /**
   * Get connected nodes for a given node
   * @private
   */
  _getConnectedNodes(nodeId) {
    const connected = {
      inputs: [],
      outputs: []
    };

    for (const [connectionId, connection] of this.connections) {
      if (connection.targetNodeId === nodeId) {
        connected.inputs.push({
          nodeId: connection.sourceNodeId,
          nodeData: this.nodes.get(connection.sourceNodeId)
        });
      }
      
      if (connection.sourceNodeId === nodeId) {
        connected.outputs.push({
          nodeId: connection.targetNodeId,
          nodeData: this.nodes.get(connection.targetNodeId)
        });
      }
    }

    return connected;
  }

  /**
   * Ensure node data is in new format
   * @private
   */
  _ensureNewFormat(nodeData) {
    // Check if already in new format
    if (nodeData.meta && nodeData.input && nodeData.output && nodeData.error) {
      return nodeData;
    }

    // Migrate from old format
    console.log('Migrating node data from old format to new format');
    return SchemaMigration.migrateFromOldFormat(nodeData);
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const totalNodes = this.nodes.size;
    const processingNodes = this.processingQueue.size;
    const totalConnections = this.connections.size;
    
    const nodesByStatus = {};
    const nodesByCategory = {};
    
    for (const [nodeId, nodeData] of this.nodes) {
      const status = nodeData.output.meta.status;
      const category = nodeData.meta.category;
      
      nodesByStatus[status] = (nodesByStatus[status] || 0) + 1;
      nodesByCategory[category] = (nodesByCategory[category] || 0) + 1;
    }

    return {
      totalNodes,
      processingNodes,
      totalConnections,
      nodesByStatus,
      nodesByCategory,
      initialized: this.initialized
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    // Cancel all processing
    for (const [nodeId, promise] of this.processingQueue) {
      try {
        await promise;
      } catch (error) {
        console.warn(`Error during cleanup of node ${nodeId}:`, error);
      }
    }

    // Clear all data
    this.nodes.clear();
    this.connections.clear();
    this.processingQueue.clear();
    this.updateCallbacks.clear();
    
    this.initialized = false;
    console.log('Node Data Manager cleaned up');
  }
}

// Create singleton instance
const nodeDataManager = new NodeDataManager();

// Export singleton and class
export default nodeDataManager;

/**
 * Helper functions for React Flow integration
 */
export const ReactFlowIntegration = {
  /**
   * Handle React Flow node changes
   * @param {Array} changes - React Flow node changes
   * @param {Function} setNodes - React Flow setNodes function
   */
  handleNodeChanges: (changes, setNodes) => {
    // Apply React Flow changes first
    setNodes(nodes => {
      const updatedNodes = nodes.map(node => {
        const change = changes.find(c => c.id === node.id);
        if (change) {
          switch (change.type) {
            case 'position':
              return { ...node, position: change.position };
            case 'dimensions':
              return { ...node, ...change };
            case 'select':
              return { ...node, selected: change.selected };
            case 'remove':
              // Unregister from manager
              nodeDataManager.unregisterNode(node.id);
              return null;
            default:
              return node;
          }
        }
        return node;
      }).filter(Boolean);

      return updatedNodes;
    });
  },

  /**
   * Handle React Flow edge changes
   * @param {Array} changes - React Flow edge changes
   * @param {Function} setEdges - React Flow setEdges function
   */
  handleEdgeChanges: (changes, setEdges) => {
    setEdges(edges => {
      return edges.map(edge => {
        const change = changes.find(c => c.id === edge.id);
        if (change) {
          switch (change.type) {
            case 'select':
              return { ...edge, selected: change.selected };
            case 'remove':
              // Remove connection from manager using edge ID
              nodeDataManager.removeConnectionByEdgeId(edge.id);
              return null;
            default:
              return edge;
          }
        }
        return edge;
      }).filter(Boolean);
    });
  },

  /**
   * Handle React Flow connections
   * @param {Object} connection - React Flow connection
   * @param {Function} setEdges - React Flow setEdges function
   */
  handleConnect: (connection, setEdges) => {
    const edgeId = `${connection.source}-${connection.target}`;
    console.log("handleConnect edgeId", edgeId);
    
    // Register React Flow callbacks for edge management
    if (!nodeDataManager.reactFlowCallbacks) {
      nodeDataManager.setReactFlowCallbacks({
        removeEdge: (edgeIdToRemove) => {
          setEdges(edges => edges.filter(edge => edge.id !== edgeIdToRemove));
        },
        addEdge: (newEdge) => {
          setEdges(edges => [...edges, newEdge]);
        }
      });
    }
    
    // Add to React Flow
    setEdges(edges => [
      ...edges,
      {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle
      }
    ]);

    // Add to manager (this will handle connection replacement if needed)
    nodeDataManager.addConnection(
      connection.source,
      connection.target,
      connection.sourceHandle,
      connection.targetHandle,
      edgeId
    );
  }
};