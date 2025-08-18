/**
 * ReactFlow Event Utilities
 * Handles ReactFlow event processing and node data management integration
 */

import nodeDataManager from '../services/nodeDataManager.js';
import { EVENT_TIMEOUTS } from '../config/appConstants.js';

/**
 * Processes node changes and handles NodeDataManager integration
 * @param {Array} changes - ReactFlow node changes array
 * @returns {Promise<void>}
 */
export const processNodeChanges = async (changes) => {
  console.log("Processing node changes:", changes.length);
  
  // Handle node removals in NodeDataManager
  for (const change of changes) {
    if (change.type === 'remove') {
      try {
        nodeDataManager.unregisterNode(change.id);
        console.log(`Node ${change.id} unregistered from NodeDataManager`);
      } catch (error) {
        console.error(`Failed to unregister node ${change.id}:`, error);
      }
    }
  }
};

/**
 * Processes edge changes and handles NodeDataManager integration
 * @param {Array} changes - ReactFlow edge changes array
 * @returns {Promise<void>}
 */
export const processEdgeChanges = async (changes) => {
  console.log("Processing edge changes:", changes.length);
  
  // Handle edge removals in NodeDataManager
  for (const change of changes) {
    if (change.type === 'remove') {
      try {
        // Use the new removeConnectionByEdgeId method for proper cleanup
        await nodeDataManager.removeConnectionByEdgeId(change.id);
        console.log(`Connection removed from NodeDataManager by edge ID: ${change.id}`);
      } catch (error) {
        console.error('Failed to remove connection from NodeDataManager:', error);
      }
    }
  }
};

/**
 * Processes new connections and handles NodeDataManager integration
 * @param {Object} connection - ReactFlow connection object
 * @returns {Promise<void>}
 */
export const processNewConnection = async (connection) => {
  console.log("Processing new connection:", connection);
  
  try {
    const edgeId = `${connection.source}-${connection.target}`;
    
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
};

/**
 * Dispatches custom events for workflow validation
 * @param {string} eventType - Type of event to dispatch
 * @param {any} detail - Event detail data
 */
export const dispatchWorkflowEvent = (eventType, detail) => {
  const appContent = document.querySelector('[data-workflow-content]');
  if (appContent) {
    appContent.dispatchEvent(new CustomEvent(eventType, { detail }));
  }
};

/**
 * Creates a comprehensive node change handler
 * @param {Function} markUnsavedChanges - Function to mark workflow as having unsaved changes
 * @param {Function} updateWorkflowValidity - Function to update workflow validity
 * @returns {Function} Node change handler function
 */
export const createNodeChangeHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return (changes) => {
    // Let React Flow handle the changes first, then trigger our handlers
    setTimeout(async () => {
      await processNodeChanges(changes);
      
      // Mark workflow as having unsaved changes
      markUnsavedChanges();
      
      // Dispatch custom event for workflow validation
      dispatchWorkflowEvent('nodesChanged', changes);
      
      // Trigger workflow validity update after state change
      setTimeout(updateWorkflowValidity, EVENT_TIMEOUTS.WORKFLOW_VALIDITY_UPDATE);
    }, 0);
  };
};

/**
 * Creates a comprehensive edge change handler
 * @param {Function} markUnsavedChanges - Function to mark workflow as having unsaved changes
 * @param {Function} updateWorkflowValidity - Function to update workflow validity
 * @returns {Function} Edge change handler function
 */
export const createEdgeChangeHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return (changes) => {
    // Let React Flow handle the changes first, then trigger our handlers
    setTimeout(async () => {
      await processEdgeChanges(changes);
      
      // Mark workflow as having unsaved changes
      markUnsavedChanges();
      
      // Dispatch custom event for workflow validation
      dispatchWorkflowEvent('edgesChanged', changes);
      
      // Trigger workflow validity update after state change
      setTimeout(updateWorkflowValidity, EVENT_TIMEOUTS.WORKFLOW_VALIDITY_UPDATE);
    }, 0);
  };
};

/**
 * Creates a comprehensive connection handler
 * @param {Function} markUnsavedChanges - Function to mark workflow as having unsaved changes
 * @param {Function} updateWorkflowValidity - Function to update workflow validity
 * @returns {Function} Connection handler function
 */
export const createConnectionHandler = (markUnsavedChanges, updateWorkflowValidity) => {
  return (connection) => {
    // Let React Flow handle the connection first, then trigger our handlers
    setTimeout(async () => {
      // Dispatch custom event for workflow validation
      dispatchWorkflowEvent('connected', connection);
      
      // Process the new connection
      await processNewConnection(connection);
      
      // Mark workflow as having unsaved changes
      markUnsavedChanges();
      
      // Trigger workflow validity update after connection
      setTimeout(updateWorkflowValidity, EVENT_TIMEOUTS.WORKFLOW_VALIDITY_UPDATE);
    }, 0);
  };
};

/**
 * Extracts edge connection information from edge ID
 * @param {string} edgeId - Edge identifier
 * @returns {Object|null} Connection information or null if invalid
 */
export const extractConnectionFromEdgeId = (edgeId) => {
  const edgeParts = edgeId.split('-');
  
  if (edgeParts.length >= 2) {
    // Handle both simple "source-target" and full "source-target-sourceHandle-targetHandle" formats
    return {
      source: edgeParts[0],
      target: edgeParts[1],
      sourceHandle: edgeParts[2] || 'default',
      targetHandle: edgeParts[3] || 'default'
    };
  }
  
  return null;
};

/**
 * Validates connection before processing
 * @param {Object} connection - Connection object to validate
 * @param {Object} targetNodeData - Target node data for validation
 * @returns {Object} Validation result
 */
export const validateConnection = (connection, targetNodeData = null) => {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!connection.source) {
    validation.valid = false;
    validation.errors.push('Connection missing source node');
  }

  if (!connection.target) {
    validation.valid = false;
    validation.errors.push('Connection missing target node');
  }

  if (connection.source === connection.target) {
    validation.valid = false;
    validation.errors.push('Cannot connect node to itself');
  }

  // Check multiple connection policy if target node data is available
  if (targetNodeData && targetNodeData.input?.connections) {
    const allowMultipleConnections = targetNodeData.input?.config?.allowMultipleConnections || false;
    const existingConnections = Object.keys(targetNodeData.input.connections);
    
    if (!allowMultipleConnections && existingConnections.length > 0) {
      validation.warnings.push(`Target node allows only single connection. Existing connection will be replaced.`);
    }
  }

  return validation;
};

/**
 * Enhanced connection processing with validation
 * @param {Object} connection - ReactFlow connection object
 * @param {Object} targetNodeData - Target node data for validation
 * @returns {Promise<Object>} Processing result
 */
export const processConnectionWithValidation = async (connection, targetNodeData = null) => {
  console.log("Processing connection with validation:", connection);
  
  // Validate connection
  const validation = validateConnection(connection, targetNodeData);
  
  if (!validation.valid) {
    const error = new Error(`Connection validation failed: ${validation.errors.join(', ')}`);
    console.error(error.message);
    throw error;
  }
  
  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn('Connection warnings:', validation.warnings);
  }
  
  // Process the connection
  await processNewConnection(connection);
  
  return {
    success: true,
    validation,
    connection
  };
};

/**
 * Creates event listeners for workflow validation updates
 * @param {Function} updateWorkflowValidity - Function to update workflow validity
 * @returns {Object} Event listener management functions
 */
export const createWorkflowEventListeners = (updateWorkflowValidity) => {
  const handleNodesChanged = () => updateWorkflowValidity();
  const handleEdgesChanged = () => updateWorkflowValidity();
  const handleConnected = () => updateWorkflowValidity();

  const addListeners = () => {
    const element = document.querySelector('[data-workflow-content]');
    if (element) {
      element.addEventListener('nodesChanged', handleNodesChanged);
      element.addEventListener('edgesChanged', handleEdgesChanged);
      element.addEventListener('connected', handleConnected);
    }
  };

  const removeListeners = () => {
    const element = document.querySelector('[data-workflow-content]');
    if (element) {
      element.removeEventListener('nodesChanged', handleNodesChanged);
      element.removeEventListener('edgesChanged', handleEdgesChanged);
      element.removeEventListener('connected', handleConnected);
    }
  };

  return {
    addListeners,
    removeListeners
  };
};