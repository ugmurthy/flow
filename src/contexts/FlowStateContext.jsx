/**
 * Unified Flow State Context
 * Single source of truth for all node/edge/validation data
 * Eliminates synchronization issues between React Flow, NodeDataManager, and components
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { produce } from 'immer';
import { debouncedValidator } from '../utils/debouncedValidation.js';
import { validationCache } from '../utils/validationCache.js';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { validateWorkflowOptimized, createContextBoundValidator } from '../utils/workflowValidationOptimized.js';
import nodeDataManager from '../services/nodeDataManager.js';

// Create the context
const FlowStateContext = createContext();

// Initial state structure
const initialState = {
  // Node state
  nodes: new Map(),
  nodeProcessing: new Set(),
  nodeErrors: new Map(),

  // Edge state
  edges: new Map(),
  connections: new Map(),

  // Validation state
  validation: {
    cache: new Map(),
    pending: new Set(),
    debounceTimers: new Map(),
    lastValidation: null,
    isValid: false,
  },

  // Synchronization state
  sync: {
    reactFlowVersion: 0,
    nodeDataVersion: 0,
    lastSyncTimestamp: 0,
    conflicts: new Map(),
    isProcessing: false,
  },

  // Performance monitoring
  performance: {
    validationTimes: [],
    syncTimes: [],
    renderTimes: [],
    lastUpdate: Date.now(),
  },
};

// Action types
const ActionTypes = {
  UPDATE_NODE: 'UPDATE_NODE',
  UPDATE_EDGE: 'UPDATE_EDGE',
  REMOVE_NODE: 'REMOVE_NODE',
  REMOVE_EDGE: 'REMOVE_EDGE',
  SET_VALIDATION_RESULT: 'SET_VALIDATION_RESULT',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  RESOLVE_CONFLICT: 'RESOLVE_CONFLICT',
  SET_PROCESSING: 'SET_PROCESSING',
  CLEAR_PROCESSING: 'CLEAR_PROCESSING',
  UPDATE_SYNC_VERSION: 'UPDATE_SYNC_VERSION',
  BATCH_UPDATE: 'BATCH_UPDATE',
};

// State reducer with Immer for efficient immutable updates
const flowStateReducer = produce((draft, action) => {
  switch (action.type) {
    case ActionTypes.UPDATE_NODE:
      draft.nodes.set(action.nodeId, action.nodeData);
      draft.sync.nodeDataVersion += 1;
      draft.sync.lastSyncTimestamp = Date.now();
      break;

    case ActionTypes.UPDATE_EDGE:
      draft.edges.set(action.edgeId, action.edgeData);
      draft.sync.reactFlowVersion += 1;
      draft.sync.lastSyncTimestamp = Date.now();
      break;

    case ActionTypes.REMOVE_NODE:
      draft.nodes.delete(action.nodeId);
      draft.nodeProcessing.delete(action.nodeId);
      draft.nodeErrors.delete(action.nodeId);
      
      // Remove connections involving this node
      for (const [connectionId, connection] of draft.connections) {
        if (connection.sourceNodeId === action.nodeId || connection.targetNodeId === action.nodeId) {
          draft.connections.delete(connectionId);
        }
      }
      
      draft.sync.nodeDataVersion += 1;
      break;

    case ActionTypes.REMOVE_EDGE:
      draft.edges.delete(action.edgeId);
      
      // Remove corresponding connection
      for (const [connectionId, connection] of draft.connections) {
        if (connection.edgeId === action.edgeId) {
          draft.connections.delete(connectionId);
          break;
        }
      }
      
      draft.sync.reactFlowVersion += 1;
      break;

    case ActionTypes.SET_VALIDATION_RESULT:
      draft.validation.cache.set(action.key, action.result);
      draft.validation.pending.delete(action.key);
      draft.validation.lastValidation = action.result;
      draft.validation.isValid = action.result.hasWorkflow || false;
      break;

    case ActionTypes.INVALIDATE_CACHE:
      action.keys.forEach((key) => draft.validation.cache.delete(key));
      break;

    case ActionTypes.SYNC_CONFLICT:
      draft.sync.conflicts.set(action.nodeId, action.conflict);
      break;

    case ActionTypes.RESOLVE_CONFLICT:
      draft.sync.conflicts.delete(action.nodeId);
      break;

    case ActionTypes.SET_PROCESSING:
      draft.nodeProcessing.add(action.nodeId);
      draft.sync.isProcessing = draft.nodeProcessing.size > 0;
      break;

    case ActionTypes.CLEAR_PROCESSING:
      draft.nodeProcessing.delete(action.nodeId);
      draft.sync.isProcessing = draft.nodeProcessing.size > 0;
      break;

    case ActionTypes.UPDATE_SYNC_VERSION:
      if (action.source === 'reactflow') {
        draft.sync.reactFlowVersion = action.version;
      } else if (action.source === 'nodedata') {
        draft.sync.nodeDataVersion = action.version;
      }
      draft.sync.lastSyncTimestamp = Date.now();
      break;

    case ActionTypes.BATCH_UPDATE:
      // Apply multiple updates atomically with Immer
      action.updates.forEach((update) => {
        // Recursively apply each update within the same draft
        flowStateReducer.original(draft, update);
      });
      break;

    default:
      // No changes needed for unknown actions
      break;
  }
});

// Store original reducer for batch updates
flowStateReducer.original = (draft, action) => {
  switch (action.type) {
    case ActionTypes.UPDATE_NODE:
      draft.nodes.set(action.nodeId, action.nodeData);
      draft.sync.nodeDataVersion += 1;
      draft.sync.lastSyncTimestamp = Date.now();
      break;
    case ActionTypes.UPDATE_EDGE:
      draft.edges.set(action.edgeId, action.edgeData);
      draft.sync.reactFlowVersion += 1;
      draft.sync.lastSyncTimestamp = Date.now();
      break;
    case ActionTypes.REMOVE_NODE:
      draft.nodes.delete(action.nodeId);
      draft.nodeProcessing.delete(action.nodeId);
      draft.nodeErrors.delete(action.nodeId);
      for (const [connectionId, connection] of draft.connections) {
        if (connection.sourceNodeId === action.nodeId || connection.targetNodeId === action.nodeId) {
          draft.connections.delete(connectionId);
        }
      }
      draft.sync.nodeDataVersion += 1;
      break;
    case ActionTypes.REMOVE_EDGE:
      draft.edges.delete(action.edgeId);
      for (const [connectionId, connection] of draft.connections) {
        if (connection.edgeId === action.edgeId) {
          draft.connections.delete(connectionId);
          break;
        }
      }
      draft.sync.reactFlowVersion += 1;
      break;
    case ActionTypes.SET_VALIDATION_RESULT:
      draft.validation.cache.set(action.key, action.result);
      draft.validation.pending.delete(action.key);
      draft.validation.lastValidation = action.result;
      draft.validation.isValid = action.result.hasWorkflow || false;
      break;
    case ActionTypes.INVALIDATE_CACHE:
      action.keys.forEach((key) => draft.validation.cache.delete(key));
      break;
    case ActionTypes.SYNC_CONFLICT:
      draft.sync.conflicts.set(action.nodeId, action.conflict);
      break;
    case ActionTypes.RESOLVE_CONFLICT:
      draft.sync.conflicts.delete(action.nodeId);
      break;
    case ActionTypes.SET_PROCESSING:
      draft.nodeProcessing.add(action.nodeId);
      draft.sync.isProcessing = draft.nodeProcessing.size > 0;
      break;
    case ActionTypes.CLEAR_PROCESSING:
      draft.nodeProcessing.delete(action.nodeId);
      draft.sync.isProcessing = draft.nodeProcessing.size > 0;
      break;
    case ActionTypes.UPDATE_SYNC_VERSION:
      if (action.source === 'reactflow') {
        draft.sync.reactFlowVersion = action.version;
      } else if (action.source === 'nodedata') {
        draft.sync.nodeDataVersion = action.version;
      }
      draft.sync.lastSyncTimestamp = Date.now();
      break;
  }
};

// Context Provider Component
export const FlowStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(flowStateReducer, initialState);
  const validationCacheRef = useRef(validationCache);
  const debouncedValidatorRef = useRef(debouncedValidator);
  const performanceMonitorRef = useRef(performanceMonitor);

  // Optimized validation function using the new validation system
  const validateWorkflow = useCallback(async (nodes, edges, options = {}) => {
    try {
      const nodesArray = Array.isArray(nodes) ? nodes : Array.from(nodes.values());
      const edgesArray = Array.isArray(edges) ? edges : Array.from(edges.values());
      
      // Use the optimized validation system
      const result = await validateWorkflowOptimized(nodesArray, edgesArray, {
        priority: options.priority || 'validation',
        force: options.force || false,
        includeStats: true,
        includeConnectivity: true,
        includeSchema: options.includeSchema || false,
      });

      // Update state with validation result
      const cacheKey = validationCacheRef.current.generateCacheKey(nodesArray, edgesArray);
      dispatch({
        type: ActionTypes.SET_VALIDATION_RESULT,
        key: cacheKey,
        result,
      });

      return result;
    } catch (error) {
      console.error('Optimized validation error:', error);
      throw error;
    }
  }, []);

  // Debounced validation with different priorities
  const debouncedValidateWorkflow = useCallback((nodes, edges, type = 'validation') => {
    const key = `workflow-${nodes.size || nodes.length}-${edges.size || edges.length}`;
    
    return debouncedValidatorRef.current.debounceValidation(
      key,
      () => validateWorkflow(nodes, edges),
      type
    );
  }, [validateWorkflow]);

  // Helper functions for change detection
  const detectNodeChanges = useCallback((currentNodes, newNodes) => {
    const changes = [];
    
    newNodes.forEach(newNode => {
      const currentNode = currentNodes.get(newNode.id);
      if (!currentNode || JSON.stringify(currentNode.data) !== JSON.stringify(newNode.data)) {
        changes.push({
          id: newNode.id,
          data: newNode,
          type: currentNode ? 'update' : 'add'
        });
      }
    });
    
    return changes;
  }, []);

  const detectEdgeChanges = useCallback((currentEdges, newEdges) => {
    const changes = [];
    
    newEdges.forEach(newEdge => {
      const currentEdge = currentEdges.get(newEdge.id);
      if (!currentEdge || JSON.stringify(currentEdge) !== JSON.stringify(newEdge)) {
        changes.push({
          id: newEdge.id,
          data: newEdge,
          type: currentEdge ? 'update' : 'add'
        });
      }
    });
    
    return changes;
  }, []);

  // Synchronization functions
  const syncWithReactFlow = useCallback((reactFlowNodes, reactFlowEdges) => {
    const measurement = performanceMonitorRef.current.startMeasurement('sync');
    
    try {
      // Detect changes using helper functions
      const nodeChanges = detectNodeChanges(state.nodes, reactFlowNodes);
      const edgeChanges = detectEdgeChanges(state.edges, reactFlowEdges);

      // Apply node changes
      nodeChanges.forEach((change) => {
        dispatch({
          type: ActionTypes.UPDATE_NODE,
          nodeId: change.id,
          nodeData: change.data,
        });
      });

      // Apply edge changes
      edgeChanges.forEach((change) => {
        dispatch({
          type: ActionTypes.UPDATE_EDGE,
          edgeId: change.id,
          edgeData: change.data,
        });
      });

      // Invalidate affected cache entries
      if (nodeChanges.length > 0 || edgeChanges.length > 0) {
        const changedNodeIds = nodeChanges.map((c) => c.id);
        const changedEdgeIds = edgeChanges.map((c) => c.id);
        
        validationCacheRef.current.invalidateByDependencies(changedNodeIds, changedEdgeIds);
        
        // Trigger debounced validation
        debouncedValidateWorkflow(reactFlowNodes, reactFlowEdges, 'nodeUpdate');
      }

      performanceMonitorRef.current.endMeasurement(measurement);
    } catch (error) {
      performanceMonitorRef.current.endMeasurement(measurement);
      console.error('Sync error:', error);
    }
  }, [state.nodes, state.edges, detectNodeChanges, detectEdgeChanges, debouncedValidateWorkflow]);

  // Node operations
  const updateNode = useCallback((nodeId, nodeData) => {
    dispatch({
      type: ActionTypes.UPDATE_NODE,
      nodeId,
      nodeData,
    });
  }, []);

  const removeNode = useCallback((nodeId) => {
    dispatch({
      type: ActionTypes.REMOVE_NODE,
      nodeId,
    });
  }, []);

  // Edge operations
  const updateEdge = useCallback((edgeId, edgeData) => {
    dispatch({
      type: ActionTypes.UPDATE_EDGE,
      edgeId,
      edgeData,
    });
  }, []);

  const removeEdge = useCallback((edgeId) => {
    dispatch({
      type: ActionTypes.REMOVE_EDGE,
      edgeId,
    });
  }, []);

  // Processing state management
  const setNodeProcessing = useCallback((nodeId, isProcessing) => {
    dispatch({
      type: isProcessing ? ActionTypes.SET_PROCESSING : ActionTypes.CLEAR_PROCESSING,
      nodeId,
    });
  }, []);

  // Selector functions for performance optimization
  const selectNode = useCallback((nodeId) => state.nodes.get(nodeId), [state.nodes]);
  const selectEdge = useCallback((edgeId) => state.edges.get(edgeId), [state.edges]);
  const selectValidation = useCallback(() => state.validation, [state.validation]);
  const selectProcessingNodes = useCallback(() => state.nodeProcessing, [state.nodeProcessing]);
  const selectSyncState = useCallback(() => state.sync, [state.sync]);

  // Performance monitoring and NodeDataManager integration
  useEffect(() => {
    // Register FlowStateContext with NodeDataManager for synchronization
    nodeDataManager.setFlowStateContext({
      syncWithReactFlow
    });

    const interval = setInterval(() => {
      performanceMonitorRef.current.recordMemoryUsage();
      performanceMonitorRef.current.recordCacheHitRate(
        validationCacheRef.current.getStats().hitRate
      );
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(interval);
      // Clean up the connection when component unmounts
      nodeDataManager.setFlowStateContext(null);
    };
  }, [syncWithReactFlow]);

  // Context value
  const contextValue = {
    // State
    state,
    
    // Actions
    dispatch,
    updateNode,
    removeNode,
    updateEdge,
    removeEdge,
    setNodeProcessing,
    
    // Validation
    validateWorkflow,
    debouncedValidateWorkflow,
    
    // Synchronization
    syncWithReactFlow,
    
    // Selectors
    selectNode,
    selectEdge,
    selectValidation,
    selectProcessingNodes,
    selectSyncState,
    
    // Utilities
    getStats: () => ({
      nodes: state.nodes.size,
      edges: state.edges.size,
      processing: state.nodeProcessing.size,
      validation: state.validation,
      sync: state.sync,
      performance: performanceMonitorRef.current.getStats(),
      cache: validationCacheRef.current.getStats(),
    }),
    
    // Performance monitoring
    performanceMonitor: performanceMonitorRef.current,
    validationCache: validationCacheRef.current,
    debouncedValidator: debouncedValidatorRef.current,
  };

  return (
    <FlowStateContext.Provider value={contextValue}>
      {children}
    </FlowStateContext.Provider>
  );
};

// Custom hook to use the FlowState context
export const useFlowState = () => {
  const context = useContext(FlowStateContext);
  if (!context) {
    throw new Error('useFlowState must be used within a FlowStateProvider');
  }
  return context;
};

// Selective subscription hooks for performance optimization
export const useFlowStateNode = (nodeId) => {
  const { selectNode } = useFlowState();
  const node = selectNode(nodeId);
  return node?.data || null; // Return just the NodeData part, not the full React Flow node
};

export const useFlowStateEdge = (edgeId) => {
  const { selectEdge } = useFlowState();
  return selectEdge(edgeId);
};

export const useFlowStateValidation = () => {
  const { selectValidation } = useFlowState();
  return selectValidation();
};

export const useFlowStateProcessing = () => {
  const { selectProcessingNodes } = useFlowState();
  return selectProcessingNodes();
};

export const useFlowStateSync = () => {
  const { selectSyncState } = useFlowState();
  return selectSyncState();
};

// Export action types for external use
export { ActionTypes };