/**
 * Workflow validation utilities
 * Handles schema validation and data integrity checks for workflows
 */

/**
 * Validate workflow schema
 * @param {Object} workflow - The workflow object to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateWorkflowSchema(workflow) {
  const errors = [];

  // Check required top-level fields
  if (!workflow) {
    errors.push('Workflow object is required');
    return { isValid: false, errors };
  }

  if (!workflow.id || typeof workflow.id !== 'string') {
    errors.push('Workflow ID is required and must be a string');
  }

  if (!workflow.name || typeof workflow.name !== 'string') {
    errors.push('Workflow name is required and must be a string');
  }

  if (workflow.name && workflow.name.trim().length === 0) {
    errors.push('Workflow name cannot be empty');
  }

  if (workflow.name && workflow.name.length > 100) {
    errors.push('Workflow name cannot exceed 100 characters');
  }

  if (workflow.description && typeof workflow.description !== 'string') {
    errors.push('Workflow description must be a string');
  }

  if (workflow.description && workflow.description.length > 500) {
    errors.push('Workflow description cannot exceed 500 characters');
  }

  if (!workflow.createdAt || !isValidISODate(workflow.createdAt)) {
    errors.push('Workflow createdAt is required and must be a valid ISO date string');
  }

  if (!workflow.updatedAt || !isValidISODate(workflow.updatedAt)) {
    errors.push('Workflow updatedAt is required and must be a valid ISO date string');
  }

  if (!workflow.version || typeof workflow.version !== 'string') {
    errors.push('Workflow version is required and must be a string');
  }

  // Validate metadata
  if (!workflow.metadata || typeof workflow.metadata !== 'object') {
    errors.push('Workflow metadata is required and must be an object');
  } else {
    const metadataErrors = validateMetadata(workflow.metadata);
    errors.push(...metadataErrors);
  }

  // Validate workflow data
  if (!workflow.workflow || typeof workflow.workflow !== 'object') {
    errors.push('Workflow data is required and must be an object');
  } else {
    const workflowDataErrors = validateWorkflowData(workflow.workflow);
    errors.push(...workflowDataErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate workflow metadata
 * @param {Object} metadata - The metadata object
 * @returns {string[]} - Array of error messages
 */
function validateMetadata(metadata) {
  const errors = [];

  if (typeof metadata.nodeCount !== 'number' || metadata.nodeCount < 0) {
    errors.push('Metadata nodeCount must be a non-negative number');
  }

  if (typeof metadata.edgeCount !== 'number' || metadata.edgeCount < 0) {
    errors.push('Metadata edgeCount must be a non-negative number');
  }

  if (!Array.isArray(metadata.nodeTypes)) {
    errors.push('Metadata nodeTypes must be an array');
  } else {
    metadata.nodeTypes.forEach((type, index) => {
      if (typeof type !== 'string') {
        errors.push(`Metadata nodeTypes[${index}] must be a string`);
      }
    });
  }

  return errors;
}

/**
 * Validate workflow data (nodes and edges)
 * @param {Object} workflowData - The workflow data object
 * @returns {string[]} - Array of error messages
 */
function validateWorkflowData(workflowData) {
  const errors = [];

  // Validate nodes
  if (!Array.isArray(workflowData.nodes)) {
    errors.push('Workflow nodes must be an array');
  } else {
    workflowData.nodes.forEach((node, index) => {
      const nodeErrors = validateNode(node, index);
      errors.push(...nodeErrors);
    });
  }

  // Validate edges
  if (!Array.isArray(workflowData.edges)) {
    errors.push('Workflow edges must be an array');
  } else {
    workflowData.edges.forEach((edge, index) => {
      const edgeErrors = validateEdge(edge, index);
      errors.push(...edgeErrors);
    });
  }

  // Validate viewport (optional)
  if (workflowData.viewport) {
    const viewportErrors = validateViewport(workflowData.viewport);
    errors.push(...viewportErrors);
  }

  return errors;
}

/**
 * Validate a single node
 * @param {Object} node - The node object
 * @param {number} index - The node index for error reporting
 * @returns {string[]} - Array of error messages
 */
function validateNode(node, index) {
  const errors = [];

  if (!node || typeof node !== 'object') {
    errors.push(`Node[${index}] must be an object`);
    return errors;
  }

  if (!node.id || typeof node.id !== 'string') {
    errors.push(`Node[${index}] id is required and must be a string`);
  }

  if (!node.type || typeof node.type !== 'string') {
    errors.push(`Node[${index}] type is required and must be a string`);
  }

  if (!node.position || typeof node.position !== 'object') {
    errors.push(`Node[${index}] position is required and must be an object`);
  } else {
    if (typeof node.position.x !== 'number') {
      errors.push(`Node[${index}] position.x must be a number`);
    }
    if (typeof node.position.y !== 'number') {
      errors.push(`Node[${index}] position.y must be a number`);
    }
  }

  if (!node.data || typeof node.data !== 'object') {
    errors.push(`Node[${index}] data is required and must be an object`);
  }

  return errors;
}

/**
 * Validate a single edge
 * @param {Object} edge - The edge object
 * @param {number} index - The edge index for error reporting
 * @returns {string[]} - Array of error messages
 */
function validateEdge(edge, index) {
  const errors = [];

  if (!edge || typeof edge !== 'object') {
    errors.push(`Edge[${index}] must be an object`);
    return errors;
  }

  if (!edge.id || typeof edge.id !== 'string') {
    errors.push(`Edge[${index}] id is required and must be a string`);
  }

  if (!edge.source || typeof edge.source !== 'string') {
    errors.push(`Edge[${index}] source is required and must be a string`);
  }

  if (!edge.target || typeof edge.target !== 'string') {
    errors.push(`Edge[${index}] target is required and must be a string`);
  }

  return errors;
}

/**
 * Validate viewport object
 * @param {Object} viewport - The viewport object
 * @returns {string[]} - Array of error messages
 */
function validateViewport(viewport) {
  const errors = [];

  if (typeof viewport.x !== 'number') {
    errors.push('Viewport x must be a number');
  }

  if (typeof viewport.y !== 'number') {
    errors.push('Viewport y must be a number');
  }

  if (typeof viewport.zoom !== 'number' || viewport.zoom <= 0) {
    errors.push('Viewport zoom must be a positive number');
  }

  return errors;
}

/**
 * Check if a string is a valid ISO date
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - True if valid ISO date
 */
function isValidISODate(dateString) {
  if (typeof dateString !== 'string') return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString() === dateString;
}

/**
 * Validate workflow name format
 * @param {string} name - The workflow name
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateWorkflowName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Workflow name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Workflow name cannot be empty' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Workflow name cannot exceed 100 characters' };
  }

  // Check for invalid characters (optional - adjust based on requirements)
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'Workflow name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validate workflow description
 * @param {string} description - The workflow description
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateWorkflowDescription(description) {
  if (!description) {
    return { isValid: true }; // Description is optional
  }

  if (typeof description !== 'string') {
    return { isValid: false, error: 'Description must be a string' };
  }

  if (description.length > 500) {
    return { isValid: false, error: 'Description cannot exceed 500 characters' };
  }

  return { isValid: true };
}

/**
 * Validate that a workflow has connected nodes
 * @param {Object} workflowData - The workflow data with nodes and edges
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateWorkflowConnectivity(workflowData) {
  if (!workflowData || !workflowData.nodes || !workflowData.edges) {
    return { isValid: false, error: 'Invalid workflow data structure' };
  }

  if (workflowData.nodes.length === 0) {
    return { isValid: false, error: 'Workflow must contain at least one node' };
  }

  if (workflowData.edges.length === 0) {
    return { isValid: false, error: 'Workflow must contain connected nodes (at least one edge)' };
  }

  // Check that all edges reference valid nodes
  const nodeIds = new Set(workflowData.nodes.map(node => node.id));
  
  for (const edge of workflowData.edges) {
    if (!nodeIds.has(edge.source)) {
      return { isValid: false, error: `Edge references invalid source node: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { isValid: false, error: `Edge references invalid target node: ${edge.target}` };
    }
  }

  return { isValid: true };
}

/**
 * Sanitize workflow name for safe storage
 * @param {string} name - The workflow name
 * @returns {string} - Sanitized name
 */
export function sanitizeWorkflowName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name.trim().substring(0, 100);
}

/**
 * Sanitize workflow description for safe storage
 * @param {string} description - The workflow description
 * @returns {string} - Sanitized description
 */
export function sanitizeWorkflowDescription(description) {
  if (!description || typeof description !== 'string') {
    return '';
  }

  return description.trim().substring(0, 500);
}