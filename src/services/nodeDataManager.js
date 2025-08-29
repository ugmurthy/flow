/**
 * Node Data Manager
 * Manages node data using the new schema and provides event-driven updates
 * Replaces the old 100ms polling system with efficient event-based communication
 */

import { NodeData, ConnectionData, SchemaMigration, DataDirective } from '../types/nodeSchema.js';
import { ProcessingInput, PluginContext } from '../types/pluginSystem.js';
import { validateNodeData, validateNodeDataUpdates, createValidationErrorMessage, validateInput} from '../types/nodeDataValidation.js';
import { DirectiveValidator } from '../types/enhancedValidation.js';
import { DirectiveProcessor } from './directiveProcessor.js';
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
    this.globalContext = null; // Global context for ExecuteWorkflow control
    this.directiveProcessor = null; // DirectiveProcessor instance
    this.executeWorkflowUnsubscribe = null; // Subscription cleanup function
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
    console.log('<core> nodeDataManager: React Flow callbacks registered with NodeDataManager');
  }

  /**
   * Set FlowStateContext integration for synchronization
   * @param {Object} flowStateContext - FlowStateContext instance
   */
  setFlowStateContext(flowStateContext) {
    this.flowStateContext = flowStateContext;
    console.log('<core> nodeDataManager: FlowStateContext registered with NodeDataManager');
  }

  /**
   * Set Global Context and register for executeWorkflow changes
   * @param {Object} globalContext - Global context containing executeWorkflow flag
   */
  setGlobalContext(globalContext) {
    this.globalContext = globalContext;
    
    // Clean up previous subscription
    if (this.executeWorkflowUnsubscribe) {
      this.executeWorkflowUnsubscribe();
    }

    // Register for executeWorkflow state changes
    if (globalContext?.registerExecuteWorkflowCallback) {
      console.log('<core> nodeDataManager: 🔔 Registering executeWorkflow callback...');
      this.executeWorkflowUnsubscribe = globalContext.registerExecuteWorkflowCallback(
        (newValue, prevValue) => this._handleExecuteWorkflowChange(newValue, prevValue)
      );
      console.log('<core> nodeDataManager: ✅ ExecuteWorkflow callback registered successfully');
    } else {
      console.warn('<core> nodeDataManager: ⚠️ GlobalContext does not have registerExecuteWorkflowCallback method');
    }

    console.log('<core> nodeDataManager: ✅ Global context registered with executeWorkflow monitoring');
    console.log('<core> nodeDataManager: Current executeWorkflow value:', globalContext?.executeWorkflow);
  }

  /**
   * Handle executeWorkflow state changes - RETROACTIVE CASCADE TRIGGER
   * @private
   */
  async _handleExecuteWorkflowChange(newValue, prevValue) {
    console.log(`<core> nodeDataManager: ExecuteWorkflow changed: ${prevValue} → ${newValue}`);
    
    // 🔍 DIAGNOSTIC: Check timing issue
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC - newValue param: ${newValue}, globalContext.executeWorkflow: ${this.globalContext?.executeWorkflow}`);

    // Only trigger retroactive cascade when going from false to true
    if (prevValue === false && newValue === true) {
      console.log('<core> nodeDataManager: 🚀 Triggering retroactive cascade processing...');
      
      // Debug: Check current state before cascade
      const stats = this.getRetroactiveCascadeStats();
      console.log('<core> nodeDataManager: Cascade stats before trigger:', stats);
      console.log('<core> nodeDataManager: Total nodes:', this.nodes.size);
      console.log('<core> nodeDataManager: Total connections:', this.connections.size);
      
      // List all nodes and their status
      for (const [nodeId, nodeData] of this.nodes) {
        console.log(`<core> nodeDataManager: Node ${nodeId} status: ${nodeData.output?.meta?.status}, hasData: ${!!(nodeData.output?.data && Object.keys(nodeData.output.data).length > 0)}`);
      }
      
      await this._triggerRetroactiveCascade(newValue); // Pass newValue to cascade
    }
  }

  /**
   * Trigger retroactive cascade for stalled nodes
   * @private
   */
  async _triggerRetroactiveCascade(executeWorkflowValue = null) {
    try {
      // Find all nodes with output data that could trigger downstream processing
      const stalledRootNodes = this._findStalledRootNodes();

      if (stalledRootNodes.length === 0) {
        console.log('<core> nodeDataManager: No stalled nodes found for retroactive cascade');
        return;
      }

      console.log(
        `<core> nodeDataManager: Found ${stalledRootNodes.length} stalled root nodes:`,
        stalledRootNodes.map((n) => n.nodeId)
      );

      // Emit retroactive cascade started event
      this.dispatchEvent(new CustomEvent('RETROACTIVE_CASCADE_STARTED', {
        detail: {
          rootNodes: stalledRootNodes.map((n) => n.nodeId),
          timestamp: new Date().toISOString(),
        }
      }));

      // Process each stalled root node which will trigger downstream cascades
      const processingPromises = stalledRootNodes.map(async (rootNode) => {
        console.log(`<core> nodeDataManager: 🎯 Processing stalled root node: ${rootNode.nodeId}`);

        // 🔍 DIAGNOSTIC: Log the executeWorkflow value being passed
        console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC - executeWorkflowValue passed to cascade: ${executeWorkflowValue}`);

        // Trigger processing with retroactive source and override executeWorkflow
        const result = await this.processNode(rootNode.nodeId, {
          source: 'retroactive_cascade',
          force: false, // Don't force - let normal executeWorkflow logic apply (should be true now)
          overrideExecuteWorkflow: executeWorkflowValue // 🔧 FIX: Pass the correct executeWorkflow value
        });
        
        return { nodeId: rootNode.nodeId, result };
      });

      const results = await Promise.all(processingPromises);
      
      // Emit retroactive cascade completed event
      this.dispatchEvent(new CustomEvent('RETROACTIVE_CASCADE_COMPLETED', {
        detail: {
          processedRootNodes: results.length,
          results: results,
          timestamp: new Date().toISOString(),
        }
      }));

      console.log(`<core> nodeDataManager: ✅ Retroactive cascade completed for ${results.length} root nodes`);
      
    } catch (error) {
      console.error('<core> nodeDataManager: Retroactive cascade failed:', error);

      // Emit error event
      this.dispatchEvent(new CustomEvent('RETROACTIVE_CASCADE_ERROR', {
        detail: {
          error: error.message,
          timestamp: new Date().toISOString(),
        }
      }));
    }
  }

  /**
   * Find nodes that have output data but stalled downstream processing
   * @private
   */
  _findStalledRootNodes() {
    const stalledRootNodes = [];

    for (const [nodeId, nodeData] of this.nodes) {
      // Check if node has output data
      const hasOutputData = nodeData.output?.data && Object.keys(nodeData.output.data).length > 0;
      if (!hasOutputData) continue;

      // Check if this node has downstream connections
      const hasDownstreamConnections = this._hasDownstreamConnections(nodeId);
      if (!hasDownstreamConnections) continue;

      // Check if downstream nodes are in a "waiting" or "stale" state
      const hasStaleDownstream = this._hasStaleDownstreamNodes(nodeId, nodeData);
      if (hasStaleDownstream) {
        stalledRootNodes.push({ nodeId, nodeData });
      }
    }

    return stalledRootNodes;
  }

  /**
   * Check if a node has downstream connections
   * @private
   */
  _hasDownstreamConnections(nodeId) {
    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if downstream nodes are stale (haven't processed recent source data)
   * @private
   */
  _hasStaleDownstreamNodes(sourceNodeId, sourceNodeData) {
    const sourceTimestamp = new Date(sourceNodeData.output?.meta?.timestamp || 0).getTime();

    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === sourceNodeId) {
        const targetNode = this.nodes.get(connection.targetNodeId);
        if (!targetNode) continue;

        const targetTimestamp = new Date(targetNode.output?.meta?.timestamp || 0).getTime();
        const targetStatus = targetNode.output?.meta?.status;

        // Consider downstream stale if:
        // 1. Target is in "waiting" state (paused by executeWorkflow)
        // 2. Target hasn't been processed at all (no timestamp)
        // 3. Target was processed before source data was updated
        const isStale = targetStatus === 'waiting' ||
                        !targetTimestamp ||
                        targetTimestamp < sourceTimestamp;

        if (isStale) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get retroactive cascade statistics
   */
  getRetroactiveCascadeStats() {
    const stalledNodes = this._findStalledRootNodes();
    const waitingNodes = Array.from(this.nodes.values())
      .filter(node => node.output?.meta?.status === 'waiting');

    return {
      stalledRootNodes: stalledNodes.length,
      stalledNodeIds: stalledNodes.map((n) => n.nodeId),
      waitingNodes: waitingNodes.length,
      waitingNodeIds: waitingNodes.map(node => this._getNodeId(node)),
      totalNodes: this.nodes.size,
      totalConnections: this.connections.size,
      canTriggerRetroactive: stalledNodes.length > 0,
    };
  }

  // Helper to get node ID from node data
  _getNodeId(nodeData) {
    // Find the node ID from the nodes Map
    for (const [nodeId, data] of this.nodes) {
      if (data === nodeData) return nodeId;
    }
    return 'unknown';
  }

  /**
   * Initialize the node data manager
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('<core> nodeDataManager: Initializing Node Data Manager...');
    
    // Initialize plugin registry if not already done
    await pluginRegistry.initialize();
    
    // Initialize directive processor
    this.directiveProcessor = new DirectiveProcessor(this);
    console.log('<core> nodeDataManager: DirectiveProcessor initialized');
    
    this.initialized = true;
    console.log('<core> nodeDataManager: Node Data Manager initialized');
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
      
    this.nodes.set(nodeId,nodeData);
    this.updateCallbacks.set(nodeId, updateCallback);
    
    console.log(`<core> nodeDataManager: Node ${nodeId} registered, dispatchEvent<NODE_DATA_UPDATED>`);
    
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
    
    console.log(`<core> nodeDataManager: Node ${nodeId} unregistered`);
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
    console.log(`<core> nodeDataManager: updateNodeData ${nodeId}\nUpdates: `,updates,"\nTrigger: ",triggerProcessing)
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
    console.log(`<core> nodeDataManager: updates to ${nodeId} : ${JSON.stringify(updates,null,2)}`)
    const updatedData = NodeData.update(currentData, updates);
    this.nodes.set(nodeId, updatedData);
    //console.log("nodeDataManager:updateNodeData: updatedData: ",updatedData)

    // Update React Flow node
    const updateCallback = this.updateCallbacks.get(nodeId);
    if (updateCallback) {
      console.log(`<core> nodeDataManager: Node ${nodeId}  updateCallback - update react flow`)
      updateCallback(nodeId, updatedData);
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
      console.log(`<core> nodeDataManager: Node ${nodeId} triggering f(processNode)`)
      await this.processNode(nodeId);
    }

    console.log(`<core> nodeDataManager: Node ${nodeId} data updated and synced with FlowStateContext`);
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
    console.log("<core> nodeDataManager: addConnection", connectionId);
    
    // Get target node data to check connection policy
    const targetData = this.nodes.get(targetNodeId);
    if (!targetData) {
      console.error(`Target node ${targetNodeId} not found`);
      return;
    }

    // Check if multiple connections are allowed
    const allowMultipleConnections = targetData.input?.config?.allowMultipleConnections || false;
    console.log("<core> nodeDataManager: addConnection: multiConnection? ", allowMultipleConnections);
    // If single connection mode and target already has connections, remove old ones
    if (!allowMultipleConnections && targetData.input?.connections) {
      const existingConnections = Object.keys(targetData.input.connections);
      if (existingConnections.length > 0) {
        console.log(`<core> nodeDataManager: Single connection mode: removing ${existingConnections.length} existing connections`);
        
        // Remove old connections and their React Flow edges
        for (const oldConnectionId of existingConnections) {
          const oldConnection = this.connections.get(oldConnectionId);
          if (oldConnection) {
            // Remove React Flow edge if callback is available
            if (this.reactFlowCallbacks?.removeEdge && oldConnection.edgeId) {
              this.reactFlowCallbacks.removeEdge(oldConnection.edgeId);
              console.log(`<core> nodeDataManager: Removed React Flow edge: ${oldConnection.edgeId}`);
            }
            
            // Remove from connections map
            this.connections.delete(oldConnectionId);
          }
        }
        
        // Clear all connections from target node (single connection mode only)
        await this.updateNodeData(targetNodeId, {
          input: {
            connections: {}
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
    console.log("<core> nodeDataManager: addConnection dispatchEvent <CONNECTION_ADDED>\n" );
    this.dispatchEvent(new CustomEvent(NodeDataEvents.CONNECTION_ADDED, {
      detail: { connectionId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, replaced: !allowMultipleConnections }
    }));

    // ✨ ENHANCED: Connection-triggered execution with proper executeWorkflow control
    const executeWorkflow = this.globalContext?.executeWorkflow ?? true;
    
    if (executeWorkflow) {
      // Check if source node has data to process
      const sourceData = this.nodes.get(sourceNodeId);
      if (sourceData?.output?.data && Object.keys(sourceData.output.data).length > 0) {
        console.log(`<core> nodeDataManager: ▶️ Connection-triggered execution: processing ${targetNodeId}`);
        
        // Trigger target processing with connection source context
        const result = await this.processNode(targetNodeId, {
          source: 'connection',
          connectionId,
          sourceNodeId
        });
        
        if (result.status === 'completed') {
          console.log(`<core> nodeDataManager: ✅ Connection-triggered processing completed for ${targetNodeId}`);
        }
      } else {
        console.log(`<core> nodeDataManager: ⏸️ Connection created but source ${sourceNodeId} has no data to process`);
      }
    } else {
      console.log(`<core> nodeDataManager: ⏸️ Connection created but executeWorkflow is disabled - target ${targetNodeId} will wait`);
      
      // Mark target node as waiting for workflow execution
      const targetData = this.nodes.get(targetNodeId);
      if (targetData && !targetData.output?.data) {
        await this.updateNodeData(targetNodeId, {
          output: {
            meta: {
              status: 'waiting',
              timestamp: new Date().toISOString(),
              pauseReason: 'executeWorkflow_disabled',
              pauseSource: 'connection',
              waitingFor: sourceNodeId
            }
          }
        }, false);
      }
    }

    console.log(`<core> nodeDataManager: Connection added: ${sourceNodeId} -> ${targetNodeId} (multiple: ${allowMultipleConnections})`);
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
          connections: updatedConnections
        }
      });
      
      console.log(`<core> nodeDataManager: Removed connection ${connectionId} from target node ${targetNodeId}`);
    }

    // Emit connection removed event
    this.dispatchEvent(new CustomEvent(NodeDataEvents.CONNECTION_REMOVED, {
      detail: { connectionId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, connectionInfo }
    }));

    console.log(`<core> nodeDataManager: Connection removed: ${sourceNodeId} -> ${targetNodeId}`);
  }

  /**
   * Remove connection by edge ID (for React Flow integration)
   * @param {string} edgeId - React Flow edge ID
   */
  async removeConnectionByEdgeId(reactFlowEdgeId) {
    console.log("removeConnectionByEdgeId", reactFlowEdgeId);
    const REACT_FLOW_EDGE_PREFIX = "xy-edge__";
    // Handle both cases: with and without React Flow prefix
    const edgeId = reactFlowEdgeId.includes(REACT_FLOW_EDGE_PREFIX)
      ? reactFlowEdgeId.split(REACT_FLOW_EDGE_PREFIX)[1]
      : reactFlowEdgeId;
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
      console.log(`<core> nodeDataManager: Connection removed by edge ID: ${edgeId}`);
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
   * Process a node with comprehensive executeWorkflow control
   * @param {string} nodeId - Node ID
   * @param {Object} options - Processing options
   * @param {boolean} options.manual - Bypass executeWorkflow (for manual buttons)
   * @param {boolean} options.force - Force execution regardless of executeWorkflow
   * @param {string} options.source - Source of processing request for logging
   * @param {boolean} options.overrideExecuteWorkflow - Override executeWorkflow value for this processing
   */
  async processNode(nodeId, options = {}) {
    console.log(`<core> nodeDataManager: f(processNode) ${nodeId}`, options);
    const nodeData = this.nodes.get(nodeId);
    if (!nodeData) {
      console.warn(`Node ${nodeId} not found for processing`);
      return { status: 'error', reason: 'node_not_found' };
    }

    // Prevent concurrent processing of the same node
    if (this.processingQueue.has(nodeId)) {
      console.log(`<core> nodeDataManager: Node ${nodeId} is already being processed`);
      return { status: 'already_processing' };
    }

    // ✨ CORE FIX: executeWorkflow Gate with bypass options and override support
    const { manual = false, force = false, source = 'unknown', overrideExecuteWorkflow = null } = options;
    const executeWorkflow = overrideExecuteWorkflow !== null ? overrideExecuteWorkflow : (this.globalContext?.executeWorkflow ?? true);
    const isInputNode = nodeData.meta.category === 'input';
    const shouldBypass = manual || force;

    // 🔍 DIAGNOSTIC: Log the executeWorkflow resolution
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC processNode - overrideExecuteWorkflow: ${overrideExecuteWorkflow}, globalContext: ${this.globalContext?.executeWorkflow}, final: ${executeWorkflow}`);

    if (!executeWorkflow && !shouldBypass) {
      // Special handling for input nodes - allow processing own data, block downstream
      if (isInputNode) {
        console.log(`<core> nodeDataManager: Input node ${nodeId} processing allowed (user data entry)`);
        // Process input node but prevent downstream cascade in _doProcessNode
        const processingPromise = this._doProcessNode(nodeId, nodeData, { preventDownstream: true });
        this.processingQueue.set(nodeId, processingPromise);
        
        try {
          const result = await processingPromise;
          return { status: 'completed', result, downstreamBlocked: true };
        } finally {
          this.processingQueue.delete(nodeId);
        }
      } else {
        console.log(`<core> nodeDataManager: ⏸️ Workflow execution paused - skipping processing for ${nodeId} (source: ${source})`);
        
        // Emit workflow paused event for UI feedback
        this._emitWorkflowPausedEvent(nodeId, source);
        
        // Mark node as waiting (enhanced status)
        await this.updateNodeData(nodeId, {
          output: {
            meta: {
              status: 'waiting',
              timestamp: new Date().toISOString(),
              pauseReason: 'executeWorkflow_disabled',
              pauseSource: source
            }
          }
        }, false); // Don't trigger processing
        
        return { status: 'paused', reason: 'executeWorkflow_disabled', source };
      }
    }

    console.log(`<core> nodeDataManager: Executing ${nodeId} (executeWorkflow: ${executeWorkflow}, manual: ${manual}, force: ${force})`);
    const processingPromise = this._doProcessNode(nodeId, nodeData, options);
    this.processingQueue.set(nodeId, processingPromise);

    try {
      const result = await processingPromise;
      return { status: 'completed', result };
    } finally {
      this.processingQueue.delete(nodeId);
    }
  }

  /**
   * Internal node processing implementation
   * @private
   */
  async _doProcessNode(nodeId, nodeData, options = {}) {
    const { preventDownstream = false } = options;
    try {
        // Skip processing for input nodes that generate their own data
      if (nodeData.meta.category === 'input' && 
          nodeData.output.data && 
          Object.keys(nodeData.output.data).length > 0) {

          console.log(`<core> nodeDataManager: Skipping processing for input node ${nodeId} - has user data`);
          //_triggerDownStreamProcessing(forInputNodes)
          console.log(`<core> nodeDataManager f(_triggerDownstreamProcessing): ${nodeId}`)
          await this._triggerDownstreamProcessing(nodeId, options.overrideExecuteWorkflow)
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

      // Emit processing started event
      this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_PROCESSING, {
        detail: { nodeId, nodeData }
      }));

      // Aggregate input data
      const aggregatedInputs = await this._aggregateInputs(nodeId, nodeData);

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

      // Process any directives generated by this node
      const outputDirectives = nodeData.output?.directives;
      if (outputDirectives && Object.keys(outputDirectives).length > 0) {
        console.log(`<core> nodeDataManager: Processing directives from ${nodeId}`);
        if (this.directiveProcessor) {
          await this.directiveProcessor.processDirectives(nodeId, outputDirectives);
        } else {
          // Fallback to legacy directive processing
          await this.processDirectives(nodeId, outputDirectives);
        }
      }

      // Emit processing completed event
      this.dispatchEvent(new CustomEvent(NodeDataEvents.NODE_PROCESSED, {
        detail: { nodeId, result, success: true, downstreamBlocked: preventDownstream }
      }));

      // Clear FlowStateContext processing state
      if (this.flowStateContext?.setNodeProcessing) {
        this.flowStateContext.setNodeProcessing(nodeId, false);
      }

      // ✨ ENHANCED: Conditional downstream processing
      if (!preventDownstream) {
        await this._triggerDownstreamProcessing(nodeId, options.overrideExecuteWorkflow);
      } else {
        console.log(`<core> nodeDataManager: Downstream processing blocked for ${nodeId} (executeWorkflow disabled)`);
      }

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

      // Clear FlowStateContext processing state on error
      if (this.flowStateContext?.setNodeProcessing) {
        this.flowStateContext.setNodeProcessing(nodeId, false);
      }
    }
  }

  /**
   * Aggregate input data from connected nodes with enhanced strategies
   * @public for testing
   */
  async _aggregateInputs(nodeId, nodeData) {
    console.log(`<core> nodeDataManager: _aggregateInputs for ${nodeId}`);
    const strategy = nodeData.input.processed?.strategy || 'merge';
    const connections = nodeData.input.connections || {};

    console.log(`<core> nodeDataManager: Using aggregation strategy: ${strategy}`);

    // Update connections with latest data first
    const updatedConnections = await this._updateConnectionData(connections);
    
    // Update node with connection data
    if (Object.keys(updatedConnections).length > 0) {
      await this.updateNodeData(nodeId, {
        input: {
          connections: updatedConnections
        }
      });
    }

    try {
      // Apply aggregation strategy
      switch (strategy) {
        case 'priority':
          return this._aggregateByPriority(updatedConnections);
        case 'array':
          return this._aggregateToArray(updatedConnections);
        case 'latest':
          return this._aggregateLatest(updatedConnections);
        case 'custom':
          return this._aggregateCustom(nodeData, updatedConnections);
        default:
          return this._aggregateMerge(updatedConnections);
      }
    } catch (error) {
      console.error(`<core> nodeDataManager: Aggregation failed for ${nodeId}:`, error);
      
      // Add error to node
      const errorData = NodeData.addError(nodeData, {
        code: 'AGGREGATION_ERROR',
        message: `Aggregation failed: ${error.message}`,
        source: 'aggregation',
        details: { strategy, error: error.stack }
      });
      
      await this.updateNodeData(nodeId, { error: errorData.error });
      
      // Return empty object instead of throwing
      return {};
    }
  }

  /**
   * Update connection data with latest source data
   * @private
   */
  async _updateConnectionData(connections) {
    const updatedConnections = {};

    for (const [connectionId, connection] of Object.entries(connections)) {
      const sourceNodeData = this.nodes.get(connection.sourceNodeId);
      if (sourceNodeData && sourceNodeData.output.data) {
        // Update connection with latest data and processed property
        const now = new Date().toISOString();
        updatedConnections[connectionId] = {
          ...connection,
          data: sourceNodeData.output.data,
          processed: sourceNodeData.output.data,
          meta: {
            ...connection.meta,
            timestamp: connection.meta.timestamp || now, // Keep original timestamp for connection creation
            dataType: typeof sourceNodeData.output.data,
            isActive: true,
            // Only update lastProcessed if it's not already set, or if significant time has passed
            lastProcessed: connection.meta.lastProcessed || now
          }
        };
      } else {
        // Keep existing connection even if source data is not available
        updatedConnections[connectionId] = connection;
      }
    }

    return updatedConnections;
  }

  /**
   * Aggregate data using merge strategy (default)
   * @private
   */
  _aggregateMerge(connections) {
    console.log(`<core> nodeDataManager: Aggregating using merge strategy`);
    const aggregated = {};

    for (const [connectionId, connection] of Object.entries(connections)) {
      if (connection.data) {
        const sourceLabel = `${connection.sourceNodeId}`;
        if (typeof connection.data === 'object' && !Array.isArray(connection.data)) {
          // Merge objects
          Object.assign(aggregated, connection.data);
        } else {
          // Store non-objects with source label
          aggregated[sourceLabel] = connection.data;
        }
      }
    }

    return aggregated;
  }

  /**
   * Aggregate data by priority (highest priority wins conflicts)
   * @private
   */
  _aggregateByPriority(connections) {
    console.log(`<core> nodeDataManager: Aggregating using priority strategy`);
    const sortedConnections = Object.entries(connections)
      .sort(([, a], [, b]) => (a.meta?.priority || 5) - (b.meta?.priority || 5));

    const aggregated = {};
    
    // Process from lowest to highest priority so higher priority overwrites lower
    for (const [connectionId, connection] of sortedConnections) {
      if (connection.data) {
        if (typeof connection.data === 'object' && !Array.isArray(connection.data)) {
          // Higher priority data overwrites lower priority
          Object.assign(aggregated, connection.data);
        } else {
          const sourceLabel = `${connection.sourceNodeId}`;
          aggregated[sourceLabel] = connection.data;
        }
      }
    }

    return aggregated;
  }

  /**
   * Aggregate data into arrays (preserves all data)
   * @private
   */
  _aggregateToArray(connections) {
    console.log(`<core> nodeDataManager: Aggregating using array strategy`);
    const aggregated = {
      connections: [],
      data: []
    };

    for (const [connectionId, connection] of Object.entries(connections)) {
      if (connection.data) {
        aggregated.connections.push({
          id: connectionId,
          sourceId: connection.sourceNodeId,
          priority: connection.meta?.priority || 5,
          timestamp: connection.meta?.timestamp
        });
        aggregated.data.push(connection.data);
      }
    }

    return aggregated;
  }

  /**
   * Use only the latest data (by timestamp)
   * @private
   */
  _aggregateLatest(connections) {
    console.log(`<core> nodeDataManager: Aggregating using latest strategy`);
    let latestConnection = null;
    let latestTimestamp = null;

    for (const [connectionId, connection] of Object.entries(connections)) {
      if (connection.data) {
        // Use meta.lastProcessed for comparison if available, otherwise use timestamp
        const timestampString = connection.meta?.lastProcessed || connection.meta?.timestamp;
        if (timestampString) {
          const timestamp = new Date(timestampString).getTime();
          if (!latestTimestamp || timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestConnection = connection;
          }
        }
      }
    }

    if (latestConnection) {
      return {
        latest: latestConnection.data,
        source: latestConnection.sourceNodeId,
        timestamp: latestConnection.meta?.lastProcessed || latestConnection.meta?.timestamp
      };
    }

    return {};
  }

  /**
   * Use custom aggregation strategy defined in plugin config
   * @private
   */
  _aggregateCustom(nodeData, connections) {
    console.log(`<core> nodeDataManager: Aggregating using custom strategy`);
    
    // Check all possible locations for custom handler
    const customHandler = nodeData.plugin?.config?.customAggregationHandler ||
                         nodeData.input?.processed?.customAggregationHandler ||
                         nodeData.input?.config?.customAggregationHandler;
    
    if (typeof customHandler === 'function') {
      try {
        return customHandler(connections, nodeData);
      } catch (error) {
        console.error(`<core> nodeDataManager: Custom aggregation failed:`, error);
        // Re-throw to let the aggregation error handling catch it
        throw error;
      }
    }

    console.warn(`<core> nodeDataManager: No custom aggregation handler found, falling back to merge`);
    return this._aggregateMerge(connections);
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
  async _triggerDownstreamProcessing(nodeId, overrideExecuteWorkflow = null) {
    // 🔍 DIAGNOSTIC: Use override if provided, otherwise check globalContext
    const executeWorkflow = overrideExecuteWorkflow !== null ? overrideExecuteWorkflow : (this.globalContext?.executeWorkflow ?? true);
    
    // 🔍 DIAGNOSTIC: Log the values being used
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC _triggerDownstreamProcessing - nodeId: ${nodeId}`);
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC - overrideExecuteWorkflow: ${overrideExecuteWorkflow}`);
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC - globalContext.executeWorkflow: ${this.globalContext?.executeWorkflow}`);
    console.log(`<core> nodeDataManager: 🔍 DIAGNOSTIC - final executeWorkflow: ${executeWorkflow}`);
    
    if (!executeWorkflow) {
      console.log(`<core> nodeDataManager: ⏸️ Workflow execution paused - skipping downstream processing for ${nodeId}`);
      this._emitWorkflowPausedEvent(nodeId);
      return;
    }

    console.log(`<core> nodeDataManager: ▶️ Executing downstream processing for ${nodeId}`);
    const downstreamNodes = [];
    
    // Find nodes that have this node as input
    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId) {
        downstreamNodes.push(connection.targetNodeId);
      }
    }

    // Process downstream nodes
    const processingPromises = downstreamNodes.map(targetNodeId =>
      this.processNode(targetNodeId,{force:false,source:"retroactive_cascade",overrideExecuteWorkflow:true})
    );

    await Promise.all(processingPromises);
  }

  /**
   * Enhanced workflow paused event with detailed context
   * @private
   */
  _emitWorkflowPausedEvent(nodeId, source = 'unknown') {
    const nodeData = this.nodes.get(nodeId);
    const hasUpstreamData = this._hasUpstreamData(nodeId);
    
    this.dispatchEvent(new CustomEvent('WORKFLOW_EXECUTION_PAUSED', {
      detail: {
        nodeId,
        timestamp: new Date().toISOString(),
        reason: 'executeWorkflow_disabled',
        source: source, // 'connection', 'manual', 'cascade', 'api'
        canResume: true,
        hasUpstreamData,
        nodeCategory: nodeData?.meta?.category,
        estimatedDownstreamNodes: this._countDownstreamNodes(nodeId)
      }
    }));
  }

  /**
   * Check if node has upstream data available
   * @private
   */
  _hasUpstreamData(nodeId) {
    const nodeData = this.nodes.get(nodeId);
    const connections = nodeData?.input?.connections || {};
    
    for (const [connectionId, connection] of Object.entries(connections)) {
      const sourceData = this.nodes.get(connection.sourceNodeId);
      if (sourceData?.output?.data && Object.keys(sourceData.output.data).length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Count downstream nodes for a given node
   * @private
   */
  _countDownstreamNodes(nodeId) {
    let count = 0;
    for (const [connectionId, connection] of this.connections) {
      if (connection.sourceNodeId === nodeId) {
        count++;
      }
    }
    return count;
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
    console.log('<core> nodeDataManager: Migrating node data from old format to new format');
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
   * Process data directives for cross-node communication (Legacy method)
   * @param {string} nodeId - Node ID that generated directives
   * @param {Object} directives - Directives to process
   * @deprecated Use DirectiveProcessor instead
   */
  async processDirectives(nodeId, directives) {
    console.log(`<core> nodeDataManager: Processing directives from ${nodeId} (legacy method)`, Object.keys(directives));
    
    for (const [targetNodeId, nodeDirectives] of Object.entries(directives)) {
      if (Array.isArray(nodeDirectives)) {
        for (const directive of nodeDirectives) {
          try {
            await this._applyDirective(targetNodeId, directive);
          } catch (error) {
            console.error(`<core> nodeDataManager: Failed to apply directive to ${targetNodeId}:`, error);
            await this._handleDirectiveError(nodeId, targetNodeId, directive, error);
          }
        }
      }
    }
  }

  /**
   * Apply a single directive to a target node
   * @private
   */
  async _applyDirective(targetNodeId, directive) {
    console.log(`<core> nodeDataManager: Applying directive to ${targetNodeId}`, directive.type);
    
    // Validate directive structure
    const validation = DirectiveValidator.validateDirectiveStructure(directive);
    if (!validation.isValid) {
      throw new Error(`Invalid directive: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Get target node data
    const targetData = this.getNodeData(targetNodeId);
    if (!targetData) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    // Validate target path exists
    const pathValidation = DirectiveValidator.validateTargetPath(directive, targetData);
    if (!pathValidation.isValid) {
      console.warn(`<core> nodeDataManager: Target path validation warnings:`, pathValidation.warnings);
    }

    // Apply directive based on processing instructions
    if (directive.processing?.immediate !== false) {
      await this._processDirectiveImmediate(targetNodeId, directive);
    } else {
      await this._queueDirectiveForBatch(targetNodeId, directive);
    }
  }

  /**
   * Process directive immediately
   * @private
   */
  async _processDirectiveImmediate(targetNodeId, directive) {
    const targetData = this.getNodeData(targetNodeId);
    
    // Combine section and path to get full path
    const fullPath = directive.target.section
      ? `${directive.target.section}.${directive.target.path}`
      : directive.target.path;
    
    console.log(`<core> nodeDataManager: Processing directive with full path: ${fullPath}`);
    
    const updatedData = this._applyDirectiveToPath(
      targetData,
      fullPath,
      directive.payload,
      directive.target.operation
    );
    
    await this.updateNodeData(targetNodeId, updatedData);
    console.log(`<core> nodeDataManager: Applied directive immediately to ${targetNodeId}`);
  }

  /**
   * Queue directive for batch processing
   * @private
   */
  async _queueDirectiveForBatch(targetNodeId, directive) {
    // For now, process immediately (batch processing can be implemented later)
    console.log(`<core> nodeDataManager: Queueing directive for batch processing (processing immediately for now)`);
    await this._processDirectiveImmediate(targetNodeId, directive);
  }

  /**
   * Apply directive to a specific path in node data
   * @private
   */
  _applyDirectiveToPath(nodeData, path, payload, operation = 'set') {
    console.log(`<core> nodeDataManager: Applying directive to path: ${path}, operation: ${operation}, payload:`, payload);
    
    const pathParts = path.split('.');
    const updates = {};
    let current = updates;
    
    // Build nested update structure preserving existing data
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      // Get the existing value at this level to preserve other properties
      const existingSection = this._getValueAtPath(nodeData, pathParts.slice(0, i + 1).join('.'));
      current[part] = { ...(existingSection || {}) };
      current = current[part];
    }
    
    const finalKey = pathParts[pathParts.length - 1];
    
    // Apply operation
    switch (operation) {
      case 'set':
        current[finalKey] = payload;
        break;
      case 'merge':
        if (typeof payload === 'object' && !Array.isArray(payload)) {
          const existingValue = this._getValueAtPath(nodeData, path);
          current[finalKey] = {
            ...(existingValue || {}),
            ...payload
          };
        } else {
          current[finalKey] = payload;
        }
        break;
      case 'append':
        const existing = this._getValueAtPath(nodeData, path);
        if (Array.isArray(existing)) {
          current[finalKey] = [...existing, payload];
        } else if (typeof existing === 'string') {
          current[finalKey] = existing + payload;
        } else {
          current[finalKey] = payload;
        }
        break;
      case 'transform':
        if (typeof payload === 'function') {
          const existingValue = this._getValueAtPath(nodeData, path);
          current[finalKey] = payload(existingValue);
        } else {
          current[finalKey] = payload;
        }
        break;
      default:
        current[finalKey] = payload;
    }
    
    console.log(`<core> nodeDataManager: Created updates for directive:`, JSON.stringify(updates, null, 2));
    return updates;
  }

  /**
   * Get value at a specific path in object
   * @private
   */
  _getValueAtPath(obj, path) {
    const pathParts = path.split('.');
    let current = obj;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Handle directive processing errors
   * @private
   */
  async _handleDirectiveError(sourceNodeId, targetNodeId, directive, error) {
    console.error(`<core> nodeDataManager: Directive error - Source: ${sourceNodeId}, Target: ${targetNodeId}`, error);
    
    // Add error to source node
    const sourceData = this.getNodeData(sourceNodeId);
    if (sourceData) {
      const errorData = NodeData.addError(sourceData, {
        code: 'DIRECTIVE_PROCESSING_ERROR',
        message: `Failed to apply directive to ${targetNodeId}: ${error.message}`,
        source: 'directive-processing',
        details: {
          targetNodeId,
          directiveType: directive.type,
          directivePath: directive.target?.path
        }
      });
      
      await this.updateNodeData(sourceNodeId, { error: errorData.error });
    }
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

    // Cleanup executeWorkflow subscription
    if (this.executeWorkflowUnsubscribe) {
      this.executeWorkflowUnsubscribe();
      this.executeWorkflowUnsubscribe = null;
    }

    // Cleanup directive processor
    if (this.directiveProcessor) {
      await this.directiveProcessor.cleanup();
      this.directiveProcessor = null;
    }

    // Clear all data
    this.nodes.clear();
    this.connections.clear();
    this.processingQueue.clear();
    this.updateCallbacks.clear();
    
    this.initialized = false;
    console.log('<core> nodeDataManager: Node Data Manager cleaned up');
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