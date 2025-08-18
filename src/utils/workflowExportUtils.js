/**
 * Workflow Export Utilities
 * Handles workflow export functionality with proper data formatting
 */

import { EXPORT_CONFIG } from '../config/appConstants.js';

/**
 * Creates export data structure for a workflow
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @param {Object} viewport - ReactFlow viewport configuration
 * @param {Object} validity - Workflow validity information
 * @param {Object} options - Optional export configuration
 * @returns {Object} Formatted export data
 */
export const createExportData = (nodes, edges, viewport, validity, options = {}) => {
  const connectedNodes = nodes.filter(n =>
    edges.some(e => e.source === n.id || e.target === n.id)
  );

  const nodeTypes = [...new Set(connectedNodes.map(n => n.type))];

  const exportData = {
    id: options.id || `export_${Date.now()}`,
    name: options.name || `Exported Workflow ${new Date().toLocaleDateString()}`,
    description: options.description || EXPORT_CONFIG.exportDescription,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: options.version || EXPORT_CONFIG.exportVersion,
    metadata: {
      nodeCount: validity.nodeCount,
      edgeCount: validity.edgeCount,
      nodeTypes
    },
    workflow: {
      nodes: connectedNodes,
      edges,
      viewport
    }
  };

  return exportData;
};

/**
 * Creates and downloads a workflow export file
 * @param {Object} exportData - The export data structure
 * @param {string} filename - Optional custom filename
 */
export const downloadWorkflowFile = (exportData, filename = null) => {
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: EXPORT_CONFIG.mimeType });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  
  const defaultFilename = `${EXPORT_CONFIG.filePrefix}${new Date().toISOString().split('T')[0]}${EXPORT_CONFIG.fileExtension}`;
  link.download = filename || defaultFilename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validates workflow data before export
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @param {Object} validity - Workflow validity information
 * @returns {Object} Validation result with success flag and messages
 */
export const validateWorkflowForExport = (nodes, edges, validity) => {
  const validation = {
    success: true,
    warnings: [],
    errors: []
  };

  // Check if workflow has valid structure
  if (!validity.hasWorkflow) {
    validation.success = false;
    validation.errors.push('No valid workflow to export');
    return validation;
  }

  // Check for disconnected nodes
  const connectedNodes = nodes.filter(n =>
    edges.some(e => e.source === n.id || e.target === n.id)
  );
  
  const disconnectedNodes = nodes.filter(n =>
    !edges.some(e => e.source === n.id || e.target === n.id)
  );

  if (disconnectedNodes.length > 0) {
    validation.warnings.push(
      `${disconnectedNodes.length} disconnected nodes will be excluded from export`
    );
  }

  // Check for minimum workflow requirements
  if (connectedNodes.length < 2) {
    validation.warnings.push('Workflow has fewer than 2 connected nodes');
  }

  if (edges.length === 0) {
    validation.warnings.push('Workflow has no connections between nodes');
  }

  return validation;
};

/**
 * Formats workflow statistics for display
 * @param {Object} validity - Workflow validity information
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @returns {Object} Formatted statistics
 */
export const formatWorkflowStats = (validity, nodes, edges) => {
  const connectedNodes = nodes.filter(n =>
    edges.some(e => e.source === n.id || e.target === n.id)
  );

  const nodeTypes = [...new Set(connectedNodes.map(n => n.type))];
  
  return {
    nodeCount: validity.nodeCount || 0,
    edgeCount: validity.edgeCount || 0,
    totalNodes: nodes.length,
    disconnectedNodes: nodes.length - connectedNodes.length,
    nodeTypes,
    hasValidWorkflow: validity.hasWorkflow
  };
};

/**
 * Exports workflow with full validation and error handling
 * @param {Function} getNodes - ReactFlow getNodes function
 * @param {Function} getEdges - ReactFlow getEdges function
 * @param {Function} getViewport - ReactFlow getViewport function
 * @param {Function} getCurrentWorkflowValidity - Workflow validity function
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result with success status
 */
export const exportWorkflowWithValidation = async (
  getNodes,
  getEdges,
  getViewport,
  getCurrentWorkflowValidity,
  options = {}
) => {
  try {
    const nodes = getNodes();
    const edges = getEdges();
    const viewport = getViewport();
    const validity = getCurrentWorkflowValidity();

    // Validate workflow
    const validation = validateWorkflowForExport(nodes, edges, validity);
    
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Create export data
    const exportData = createExportData(nodes, edges, viewport, validity, options);
    
    // Download file
    downloadWorkflowFile(exportData, options.filename);

    return {
      success: true,
      exportData,
      stats: formatWorkflowStats(validity, nodes, edges),
      warnings: validation.warnings
    };
  } catch (error) {
    console.error('Failed to export workflow:', error);
    return {
      success: false,
      errors: [error.message],
      warnings: []
    };
  }
};