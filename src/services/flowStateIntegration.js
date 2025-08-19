/**
 * Flow State Integration Service
 * Integrates the new FlowStateContext and SynchronizationManager with existing systems
 */

import { createSynchronizationManager } from './synchronizationManager.js';
import nodeDataManager, { NodeDataEvents } from './nodeDataManager.js';
import { debouncedValidator } from '../utils/debouncedValidation.js';
import { validationCache } from '../utils/validationCache.js';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { validateWorkflowByChangeType } from '../utils/workflowValidationOptimized.js';

/**
 * Flow State Integration Manager
 * Coordinates between FlowStateContext, NodeDataManager, and React Flow
 */
export class FlowStateIntegrationManager {
  constructor() {
    this.flowStateContext = null;
    this.syncManager = null;
    this.reactFlowInstance = null;
    this.isInitialized = false;
    this.eventListeners = new Map();
    
    // Performance tracking
    this.stats = {
      syncOperations: 0,
      validationCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Initialize the integration manager
   * @param {Object} flowStateContext - FlowStateContext instance
   * @param {Object} reactFlowInstance - React Flow instance
   */
  async initialize(flowStateContext, reactFlowInstance) {
    if (this.isInitialized) {
      console.warn('FlowStateIntegrationManager already initialized');
      return;
    }

    this.flowStateContext = flowStateContext;
    this.reactFlowInstance = reactFlowInstance;

    // Initialize NodeDataManager if not already done
    await nodeDataManager.initialize();

    // Create synchronization manager
    this.syncManager = createSynchronizationManager(
      flowStateContext,
      nodeDataManager,
      reactFlowInstance
    );

    // Set up event listeners
    this.setupEventListeners();

    // Set up React Flow callbacks for NodeDataManager
    this.setupReactFlowCallbacks();

    this.isInitialized = true;
    console.log('FlowStateIntegrationManager initialized successfully');
  }

  /**
   * Set up event listeners for synchronization
   */
  setupEventListeners() {
    // Listen to NodeDataManager events
    const handleNodeDataUpdated = (event) => {
      this.handleNodeDataManagerEvent('nodeDataUpdated', event.detail);
    };

    const handleConnectionAdded = (event) => {
      this.handleNodeDataManagerEvent('connectionAdded', event.detail);
    };

    const handleConnectionRemoved = (event) => {
      this.handleNodeDataManagerEvent('connectionRemoved', event.detail);
    };

    const handleNodeProcessing = (event) => {
      this.handleNodeDataManagerEvent('nodeProcessing', event.detail);
    };

    const handleNodeProcessed = (event) => {
      this.handleNodeDataManagerEvent('nodeProcessed', event.detail);
    };

    const handleNodeError = (event) => {
      this.handleNodeDataManagerEvent('nodeError', event.detail);
    };

    // Add event listeners
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdated);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSING, handleNodeProcessing);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSED, handleNodeProcessed);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_ERROR, handleNodeError);

    // Store listeners for cleanup
    this.eventListeners.set('nodeDataUpdated', handleNodeDataUpdated);
    this.eventListeners.set('connectionAdded', handleConnectionAdded);
    this.eventListeners.set('connectionRemoved', handleConnectionRemoved);
    this.eventListeners.set('nodeProcessing', handleNodeProcessing);
    this.eventListeners.set('nodeProcessed', handleNodeProcessed);
    this.eventListeners.set('nodeError', handleNodeError);
  }

  /**
   * Set up React Flow callbacks for NodeDataManager
   */
  setupReactFlowCallbacks() {
    if (!this.reactFlowInstance) return;

    nodeDataManager.setReactFlowCallbacks({
      removeEdge: (edgeId) => {
        if (this.reactFlowInstance.setEdges) {
          this.reactFlowInstance.setEdges(edges => 
            edges.filter(edge => edge.id !== edgeId)
          );
        }
      },
      addEdge: (newEdge) => {
        if (this.reactFlowInstance.setEdges) {
          this.reactFlowInstance.setEdges(edges => [...edges, newEdge]);
        }
      },
    });
  }

  /**
   * Handle NodeDataManager events and sync with FlowState
   * @param {string} eventType - Type of event
   * @param {Object} eventDetail - Event detail data
   */
  async handleNodeDataManagerEvent(eventType, eventDetail) {
    if (!this.syncManager || !this.flowStateContext) return;

    const measurement = performanceMonitor.startMeasurement('sync');
    this.stats.syncOperations++;

    try {
      const changes = this.convertNodeDataEventToChanges(eventType, eventDetail);
      if (changes.length > 0) {
        await this.syncManager.synchronize('nodedata', changes);
      }
    } catch (error) {
      console.error('Error handling NodeDataManager event:', error);
    } finally {
      performanceMonitor.endMeasurement(measurement);
    }
  }

  /**
   * Convert NodeDataManager events to sync changes
   * @param {string} eventType - Event type
   * @param {Object} eventDetail - Event detail
   * @returns {Array} Array of changes
   */
  convertNodeDataEventToChanges(eventType, eventDetail) {
    const changes = [];

    switch (eventType) {
      case 'nodeDataUpdated':
        changes.push({
          type: 'nodeDataUpdated',
          nodeId: eventDetail.nodeId,
          nodeData: eventDetail.nodeData,
          timestamp: Date.now(),
        });
        break;

      case 'connectionAdded':
        changes.push({
          type: 'connectionAdded',
          sourceNodeId: eventDetail.sourceNodeId,
          targetNodeId: eventDetail.targetNodeId,
          sourceHandle: eventDetail.sourceHandle,
          targetHandle: eventDetail.targetHandle,
          timestamp: Date.now(),
        });
        break;

      case 'connectionRemoved':
        changes.push({
          type: 'connectionRemoved',
          sourceNodeId: eventDetail.sourceNodeId,
          targetNodeId: eventDetail.targetNodeId,
          sourceHandle: eventDetail.sourceHandle,
          targetHandle: eventDetail.targetHandle,
          timestamp: Date.now(),
        });
        break;

      case 'nodeProcessing':
        if (this.flowStateContext.setNodeProcessing) {
          this.flowStateContext.setNodeProcessing(eventDetail.nodeId, true);
        }
        break;

      case 'nodeProcessed':
        if (this.flowStateContext.setNodeProcessing) {
          this.flowStateContext.setNodeProcessing(eventDetail.nodeId, false);
        }
        break;

      case 'nodeError':
        // Handle node errors in FlowState
        if (this.flowStateContext.dispatch) {
          this.flowStateContext.dispatch({
            type: 'SET_NODE_ERROR',
            nodeId: eventDetail.nodeId,
            error: eventDetail.error,
          });
        }
        break;
    }

    return changes;
  }

  /**
   * Handle React Flow changes and sync with NodeDataManager
   * @param {string} changeType - Type of change ('nodes' or 'edges')
   * @param {Array} changes - Array of React Flow changes
   */
  async handleReactFlowChanges(changeType, changes) {
    if (!this.syncManager) return;

    const measurement = performanceMonitor.startMeasurement('sync');
    this.stats.syncOperations++;

    try {
      const syncChanges = this.convertReactFlowChangesToSync(changeType, changes);
      if (syncChanges.length > 0) {
        await this.syncManager.synchronize('reactflow', syncChanges);
      }
    } catch (error) {
      console.error('Error handling React Flow changes:', error);
    } finally {
      performanceMonitor.endMeasurement(measurement);
    }
  }

  /**
   * Convert React Flow changes to sync format
   * @param {string} changeType - Type of change
   * @param {Array} changes - React Flow changes
   * @returns {Array} Sync changes
   */
  convertReactFlowChangesToSync(changeType, changes) {
    return changes.map(change => ({
      ...change,
      changeType,
      timestamp: Date.now(),
      source: 'reactflow',
    }));
  }

  /**
   * Handle React Flow connections
   * @param {Object} connection - React Flow connection
   */
  async handleReactFlowConnection(connection) {
    if (!this.syncManager) return;

    const measurement = performanceMonitor.startMeasurement('sync');
    this.stats.syncOperations++;

    try {
      const syncChange = {
        type: 'add',
        connection,
        timestamp: Date.now(),
        source: 'reactflow',
      };

      await this.syncManager.synchronize('reactflow', [syncChange]);
    } catch (error) {
      console.error('Error handling React Flow connection:', error);
    } finally {
      performanceMonitor.endMeasurement(measurement);
    }
  }

  /**
   * Perform optimized workflow validation with change type awareness
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @param {string} changeType - Type of change that triggered validation
   * @returns {Promise} Validation result
   */
  async validateWorkflow(nodes, edges, changeType = 'default') {
    if (!this.flowStateContext) return null;

    const measurement = performanceMonitor.startMeasurement('validation');
    this.stats.validationCalls++;

    try {
      // Use optimized validation with change type awareness
      const result = await validateWorkflowByChangeType(nodes, edges, changeType);
      
      if (result.fromCache) {
        this.stats.cacheHits++;
      } else {
        this.stats.cacheMisses++;
      }

      performanceMonitor.endMeasurement(measurement);
      return result;
    } catch (error) {
      performanceMonitor.endMeasurement(measurement);
      console.error('Optimized validation error:', error);
      throw error;
    }
  }

  /**
   * Get integration statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      syncManager: this.syncManager?.getStats(),
      nodeDataManager: nodeDataManager.getStats(),
      validationCache: validationCache.getStats(),
      performanceMonitor: performanceMonitor.getStats(),
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Remove event listeners
    for (const [eventType, listener] of this.eventListeners) {
      nodeDataManager.removeEventListener(eventType, listener);
    }
    this.eventListeners.clear();

    // Reset sync manager
    if (this.syncManager) {
      this.syncManager.reset();
    }

    // Clear caches
    validationCache.clear();
    debouncedValidator.clearAll();

    this.isInitialized = false;
    console.log('FlowStateIntegrationManager cleaned up');
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setPerformanceMonitoringEnabled(enabled) {
    performanceMonitor.setEnabled(enabled);
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    return {
      integration: this.stats,
      performance: performanceMonitor.getSummary(),
      cache: validationCache.getStats(),
      sync: this.syncManager?.getStats(),
    };
  }
}

// Create singleton instance
export const flowStateIntegration = new FlowStateIntegrationManager();

// Export enhanced React Flow event handlers that use the integration
export const createEnhancedNodeChangeHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return async (changes) => {
    // Handle changes with integration
    await flowStateIntegration.handleReactFlowChanges('nodes', changes);
    
    // Call original handlers
    if (markUnsavedChanges) markUnsavedChanges();
    if (updateWorkflowValidity) updateWorkflowValidity();
  };
};

export const createEnhancedEdgeChangeHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return async (changes) => {
    console.log('Enhanced edge change handler called:', changes);
    
    // CRITICAL FIX: Handle edge removals with NodeDataManager
    for (const change of changes) {
      if (change.type === 'remove') {
        try {
          await nodeDataManager.removeConnectionByEdgeId(change.id);
          console.log(`Connection removed from NodeDataManager for edge: ${change.id}`);
        } catch (error) {
          console.error('Failed to remove connection from NodeDataManager:', error);
        }
      }
    }
    
    // Handle changes with integration
    await flowStateIntegration.handleReactFlowChanges('edges', changes);
    
    // Dispatch CustomEvent for workflow validation (existing behavior)
    setTimeout(() => {
      const appContent = document.querySelector('[data-workflow-content]');
      if (appContent) {
        console.log("Enhanced handler dispatching 'edgesChanged' event");
        appContent.dispatchEvent(new CustomEvent('edgesChanged', { detail: changes }));
      }
    }, 0);
    
    // Call original handlers
    if (markUnsavedChanges) markUnsavedChanges();
    if (updateWorkflowValidity) updateWorkflowValidity();
  };
};

export const createEnhancedConnectionHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return async (connection) => {
    console.log('Enhanced connection handler called:', connection);
    
    // CRITICAL FIX: Call NodeDataManager.addConnection directly
    const edgeId = `${connection.source}-${connection.target}`;
    try {
      await nodeDataManager.addConnection(
        connection.source,
        connection.target,
        connection.sourceHandle || 'default',
        connection.targetHandle || 'default',
        edgeId
      );
      console.log(`Connection added to NodeDataManager: ${connection.source} -> ${connection.target}`);
    } catch (error) {
      console.error('Failed to add connection to NodeDataManager:', error);
    }
    
    // Handle connection with integration
    await flowStateIntegration.handleReactFlowConnection(connection);
    
    // Dispatch CustomEvent for workflow validation (existing behavior)
    setTimeout(() => {
      const appContent = document.querySelector('[data-workflow-content]');
      if (appContent) {
        console.log("Enhanced handler dispatching 'connected' event");
        appContent.dispatchEvent(new CustomEvent('connected', { detail: connection }));
      }
    }, 0);
    
    // Call original handlers
    if (markUnsavedChanges) markUnsavedChanges();
    if (updateWorkflowValidity) updateWorkflowValidity();
  };
};

// Export utility functions
export const IntegrationUtils = {
  /**
   * Initialize the integration system
   * @param {Object} flowStateContext - FlowStateContext instance
   * @param {Object} reactFlowInstance - React Flow instance
   */
  initialize: async (flowStateContext, reactFlowInstance) => {
    await flowStateIntegration.initialize(flowStateContext, reactFlowInstance);
  },

  /**
   * Get integration status
   * @returns {Object} Status information
   */
  getStatus: () => ({
    initialized: flowStateIntegration.isInitialized,
    stats: flowStateIntegration.getStats(),
    performance: flowStateIntegration.getPerformanceSummary(),
  }),

  /**
   * Validate workflow with caching and debouncing
   * @param {Array} nodes - Nodes array
   * @param {Array} edges - Edges array
   * @param {string} priority - Validation priority
   * @returns {Promise} Validation result
   */
  validateWorkflow: async (nodes, edges, priority) => {
    return await flowStateIntegration.validateWorkflow(nodes, edges, priority);
  },

  /**
   * Clean up integration
   */
  cleanup: async () => {
    await flowStateIntegration.cleanup();
  },
};