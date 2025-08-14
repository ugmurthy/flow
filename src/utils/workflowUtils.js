/**
 * Workflow utilities for extracting and managing workflow data
 * Handles connected node identification and workflow object creation
 */

import { validateWorkflowSchema, validateWorkflowConnectivity } from './workflowValidation.js';

/**
 * Generate a unique workflow ID
 * @returns {string} - UUID v4 string
 */
export function generateWorkflowId() {
  return 'workflow_' + crypto.randomUUID();
}

/**
 * Extract connected workflow from nodes and edges
 * Only includes nodes that are part of connected components
 * @param {Array} nodes - All nodes from React Flow
 * @param {Array} edges - All edges from React Flow
 * @returns {Object} - { nodes: Array, edges: Array, connectedNodeIds: Set }
 */
export function extractConnectedWorkflow(nodes, edges) {
  if (!nodes || !edges || nodes.length === 0 || edges.length === 0) {
    return {
      nodes: [],
      edges: [],
      connectedNodeIds: new Set()
    };
  }

  // Find all nodes that are connected (have at least one edge)
  const connectedNodeIds = new Set();
  
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // Filter nodes to only include connected ones
  const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));

  // Filter edges to only include those between connected nodes
  const connectedEdges = edges.filter(edge => 
    connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
  );

  return {
    nodes: connectedNodes,
    edges: connectedEdges,
    connectedNodeIds
  };
}

/**
 * Find all connected components in the graph
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Array} - Array of connected components, each containing { nodes, edges }
 */
export function findConnectedComponents(nodes, edges) {
  if (!nodes || !edges || nodes.length === 0) {
    return [];
  }

  // Build adjacency list
  const adjacencyList = new Map();
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });

  edges.forEach(edge => {
    if (adjacencyList.has(edge.source) && adjacencyList.has(edge.target)) {
      adjacencyList.get(edge.source).add(edge.target);
      adjacencyList.get(edge.target).add(edge.source);
    }
  });

  const visited = new Set();
  const components = [];

  // DFS to find connected components
  function dfs(nodeId, currentComponent) {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    currentComponent.add(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || new Set();
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, currentComponent);
      }
    });
  }

  // Find all connected components
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = new Set();
      dfs(node.id, component);
      
      // Only include components with more than one node (connected)
      if (component.size > 1 || edges.some(edge => 
        edge.source === node.id || edge.target === node.id
      )) {
        components.push(component);
      }
    }
  });

  // Convert components to node/edge arrays
  return components.map(componentNodeIds => {
    const componentNodes = nodes.filter(node => componentNodeIds.has(node.id));
    const componentEdges = edges.filter(edge => 
      componentNodeIds.has(edge.source) && componentNodeIds.has(edge.target)
    );

    return {
      nodes: componentNodes,
      edges: componentEdges,
      nodeIds: componentNodeIds
    };
  });
}

/**
 * Get the largest connected component (main workflow)
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Object} - { nodes: Array, edges: Array } of the largest component
 */
export function getLargestConnectedComponent(nodes, edges) {
  const components = findConnectedComponents(nodes, edges);
  
  if (components.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Find the component with the most nodes
  const largestComponent = components.reduce((largest, current) => 
    current.nodes.length > largest.nodes.length ? current : largest
  );

  return {
    nodes: largestComponent.nodes,
    edges: largestComponent.edges
  };
}

/**
 * Create workflow metadata from nodes and edges
 * @param {Array} nodes - Workflow nodes
 * @param {Array} edges - Workflow edges
 * @returns {Object} - Metadata object
 */
export function createWorkflowMetadata(nodes, edges) {
  const nodeTypes = [...new Set(nodes.map(node => node.type))].sort();
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes,
    hasFormNodes: nodeTypes.some(type => type.includes('form') || type.includes('Form')),
    hasProcessNodes: nodeTypes.some(type => type.includes('process') || type.includes('Process')),
    hasOutputNodes: nodeTypes.some(type => 
      type.includes('markdown') || type.includes('fetch') || type.includes('leaf')
    )
  };
}

/**
 * Create a complete workflow object
 * @param {Object} params - Parameters for workflow creation
 * @param {string} params.name - Workflow name
 * @param {string} [params.description] - Workflow description
 * @param {Array} params.nodes - Workflow nodes
 * @param {Array} params.edges - Workflow edges
 * @param {Object} [params.viewport] - Current viewport state
 * @param {string} [params.id] - Existing workflow ID (for updates)
 * @returns {Object} - Complete workflow object
 */
export function createWorkflowObject({ name, description = '', nodes, edges, viewport = null, id = null }) {
  const now = new Date().toISOString();
  const workflowId = id || generateWorkflowId();
  
  const metadata = createWorkflowMetadata(nodes, edges);
  
  const workflow = {
    id: workflowId,
    name: name.trim(),
    description: description.trim(),
    createdAt: id ? undefined : now, // Don't update createdAt for existing workflows
    updatedAt: now,
    version: '1.0.0',
    metadata,
    workflow: {
      nodes: nodes.map(node => ({
        ...node,
        // Ensure consistent data structure
        data: {
          ...node.data
        }
      })),
      edges: edges.map(edge => ({
        ...edge
      })),
      ...(viewport && { viewport })
    }
  };

  // Remove undefined createdAt for updates
  if (workflow.createdAt === undefined) {
    delete workflow.createdAt;
  }

  return workflow;
}

/**
 * Check if current canvas has a valid workflow
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Object} - { hasWorkflow: boolean, reason?: string, nodeCount: number, edgeCount: number }
 */
export function checkWorkflowValidity(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return {
      hasWorkflow: false,
      reason: 'No nodes found on canvas',
      nodeCount: 0,
      edgeCount: 0
    };
  }

  if (!edges || edges.length === 0) {
    return {
      hasWorkflow: false,
      reason: 'No connections found - workflow must have connected nodes',
      nodeCount: nodes.length,
      edgeCount: 0
    };
  }

  const { nodes: connectedNodes, edges: connectedEdges } = extractConnectedWorkflow(nodes, edges);
  
  if (connectedNodes.length === 0) {
    return {
      hasWorkflow: false,
      reason: 'No connected nodes found',
      nodeCount: nodes.length,
      edgeCount: edges.length
    };
  }

  return {
    hasWorkflow: true,
    nodeCount: connectedNodes.length,
    edgeCount: connectedEdges.length,
    totalNodes: nodes.length,
    totalEdges: edges.length
  };
}

/**
 * Prepare workflow for saving (extract connected nodes and create workflow object)
 * @param {Object} params - Parameters
 * @param {string} params.name - Workflow name
 * @param {string} [params.description] - Workflow description
 * @param {Array} params.nodes - All nodes from canvas
 * @param {Array} params.edges - All edges from canvas
 * @param {Object} [params.viewport] - Current viewport
 * @param {string} [params.id] - Existing workflow ID for updates
 * @returns {Object} - { success: boolean, workflow?: Object, error?: string }
 */
export function prepareWorkflowForSaving({ name, description, nodes, edges, viewport, id }) {
  try {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Workflow name is required' };
    }

    // Check workflow validity
    const validity = checkWorkflowValidity(nodes, edges);
    if (!validity.hasWorkflow) {
      return { success: false, error: validity.reason };
    }

    // Extract connected workflow
    const { nodes: workflowNodes, edges: workflowEdges } = extractConnectedWorkflow(nodes, edges);

    // Create workflow object
    const workflow = createWorkflowObject({
      name,
      description,
      nodes: workflowNodes,
      edges: workflowEdges,
      viewport,
      id
    });

    // Validate the created workflow
    const validation = validateWorkflowSchema(workflow);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Workflow validation failed: ${validation.errors.join(', ')}` 
      };
    }

    const connectivityValidation = validateWorkflowConnectivity(workflow.workflow);
    if (!connectivityValidation.isValid) {
      return { 
        success: false, 
        error: connectivityValidation.error 
      };
    }

    return { success: true, workflow };

  } catch (error) {
    return { 
      success: false, 
      error: `Failed to prepare workflow: ${error.message}` 
    };
  }
}

/**
 * Calculate workflow statistics
 * @param {Object} workflow - The workflow object
 * @returns {Object} - Statistics object
 */
export function calculateWorkflowStats(workflow) {
  if (!workflow || !workflow.workflow) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      nodeTypes: [],
      complexity: 'Unknown'
    };
  }

  const { nodes, edges } = workflow.workflow;
  const nodeTypes = [...new Set(nodes.map(node => node.type))];
  
  // Simple complexity calculation
  let complexity = 'Simple';
  if (nodes.length > 10 || edges.length > 15) {
    complexity = 'Complex';
  } else if (nodes.length > 5 || edges.length > 7) {
    complexity = 'Medium';
  }

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes,
    complexity,
    hasMultipleComponents: findConnectedComponents(nodes, edges).length > 1
  };
}

/**
 * Compare two workflows for differences
 * @param {Object} workflow1 - First workflow
 * @param {Object} workflow2 - Second workflow
 * @returns {Object} - Comparison result
 */
export function compareWorkflows(workflow1, workflow2) {
  if (!workflow1 || !workflow2) {
    return { identical: false, differences: ['One or both workflows are missing'] };
  }

  const differences = [];

  // Compare basic properties
  if (workflow1.name !== workflow2.name) {
    differences.push(`Name: "${workflow1.name}" vs "${workflow2.name}"`);
  }

  // Compare node counts
  const nodes1 = workflow1.workflow?.nodes || [];
  const nodes2 = workflow2.workflow?.nodes || [];
  
  if (nodes1.length !== nodes2.length) {
    differences.push(`Node count: ${nodes1.length} vs ${nodes2.length}`);
  }

  // Compare edge counts
  const edges1 = workflow1.workflow?.edges || [];
  const edges2 = workflow2.workflow?.edges || [];
  
  if (edges1.length !== edges2.length) {
    differences.push(`Edge count: ${edges1.length} vs ${edges2.length}`);
  }

  // Compare node types
  const types1 = [...new Set(nodes1.map(n => n.type))].sort();
  const types2 = [...new Set(nodes2.map(n => n.type))].sort();
  
  if (JSON.stringify(types1) !== JSON.stringify(types2)) {
    differences.push(`Node types: [${types1.join(', ')}] vs [${types2.join(', ')}]`);
  }

  return {
    identical: differences.length === 0,
    differences
  };
}