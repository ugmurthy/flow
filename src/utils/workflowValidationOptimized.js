/**
 * Optimized Workflow Validation Utilities
 * Uses debounced validation, caching, and performance monitoring
 */

import { debouncedValidator } from './debouncedValidation.js';
import { validationCache } from './validationCache.js';
import { performanceMonitor } from './performanceMonitor.js';
import { validateWorkflowConnectivity, validateWorkflowSchema } from './workflowValidation.js';

/**
 * Enhanced workflow validation with debouncing and caching
 * @param {Array} nodes - Array of workflow nodes
 * @param {Array} edges - Array of workflow edges
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
export const validateWorkflowOptimized = async (nodes, edges, options = {}) => {
  const {
    priority = 'validation',
    force = false,
    includeSchema = false,
    includeConnectivity = true,
    includeStats = true,
  } = options;

  const measurement = performanceMonitor.startMeasurement('validation');
  
  try {
    // Generate cache key
    const cacheKey = validationCache.generateCacheKey(nodes, edges);
    
    // Check cache first (unless forced)
    if (!force) {
      const cached = validationCache.get(nodes, edges);
      if (cached) {
        performanceMonitor.endMeasurement(measurement);
        return {
          ...cached,
          fromCache: true,
          timestamp: Date.now(),
        };
      }
    }

    // Use debounced validation for non-critical operations
    if (priority !== 'critical') {
      return await debouncedValidator.debounceValidation(
        cacheKey,
        () => performValidation(nodes, edges, { includeSchema, includeConnectivity, includeStats }),
        priority
      );
    }

    // Perform immediate validation for critical operations
    const result = await performValidation(nodes, edges, { includeSchema, includeConnectivity, includeStats });
    
    // Cache the result
    validationCache.set(nodes, edges, result);
    
    performanceMonitor.endMeasurement(measurement);
    return result;
    
  } catch (error) {
    performanceMonitor.endMeasurement(measurement);
    console.error('Optimized validation error:', error);
    throw error;
  }
};

/**
 * Perform the actual validation
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
async function performValidation(nodes, edges, options) {
  const result = {
    isValid: true,
    hasWorkflow: false,
    errors: [],
    warnings: [],
    nodeCount: nodes.length,
    edgeCount: edges.length,
    connectedNodeCount: 0,
    disconnectedNodeCount: 0,
    nodeTypes: [],
    timestamp: Date.now(),
    validationTime: 0,
  };

  const startTime = Date.now();

  try {
    // Basic connectivity validation
    if (options.includeConnectivity) {
      const connectivityResult = validateWorkflowConnectivity({ nodes, edges });
      result.isValid = connectivityResult.isValid;
      result.hasWorkflow = connectivityResult.isValid;
      
      if (!connectivityResult.isValid && connectivityResult.error) {
        result.errors.push(connectivityResult.error);
      }
    }

    // Schema validation (optional)
    if (options.includeSchema) {
      const schemaResult = validateWorkflowSchema({ 
        id: 'temp-workflow',
        name: 'Validation Workflow',
        workflow: { nodes, edges },
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodeTypes: [...new Set(nodes.map(n => n.type))],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      });
      
      if (!schemaResult.isValid) {
        result.errors.push(...schemaResult.errors);
        result.isValid = false;
      }
    }

    // Calculate statistics
    if (options.includeStats) {
      const connectedNodeIds = new Set();
      edges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      result.connectedNodeCount = connectedNodeIds.size;
      result.disconnectedNodeCount = nodes.length - connectedNodeIds.size;
      result.nodeTypes = [...new Set(nodes.map(n => n.type))];

      // Add warnings for disconnected nodes
      if (result.disconnectedNodeCount > 0) {
        result.warnings.push(`${result.disconnectedNodeCount} disconnected nodes found`);
      }

      // Add workflow health metrics
      result.health = calculateWorkflowHealth(result);
    }

    result.validationTime = Date.now() - startTime;
    return result;

  } catch (error) {
    result.validationTime = Date.now() - startTime;
    result.isValid = false;
    result.errors.push(`Validation error: ${error.message}`);
    return result;
  }
}

/**
 * Calculate workflow health score
 * @param {Object} validationResult - Validation result
 * @returns {Object} Health metrics
 */
function calculateWorkflowHealth(validationResult) {
  const health = {
    score: 0,
    grade: 'F',
    issues: [],
    recommendations: [],
  };

  // Calculate base score
  if (validationResult.hasWorkflow) health.score += 40;
  if (validationResult.connectedNodeCount >= 2) health.score += 30;
  if (validationResult.edgeCount > 0) health.score += 20;
  if (validationResult.disconnectedNodeCount === 0) health.score += 10;

  // Assign grade
  if (health.score >= 90) health.grade = 'A';
  else if (health.score >= 80) health.grade = 'B';
  else if (health.score >= 70) health.grade = 'C';
  else if (health.score >= 60) health.grade = 'D';
  else health.grade = 'F';

  // Identify issues and recommendations
  if (!validationResult.hasWorkflow) {
    health.issues.push('No valid workflow structure');
    health.recommendations.push('Connect nodes to create a workflow');
  }

  if (validationResult.disconnectedNodeCount > 0) {
    health.issues.push(`${validationResult.disconnectedNodeCount} disconnected nodes`);
    health.recommendations.push('Connect or remove disconnected nodes');
  }

  if (validationResult.connectedNodeCount < 2) {
    health.issues.push('Workflow needs at least 2 connected nodes');
    health.recommendations.push('Add more nodes and connections');
  }

  if (validationResult.edgeCount === 0) {
    health.issues.push('No connections between nodes');
    health.recommendations.push('Add edges to connect nodes');
  }

  return health;
}

/**
 * Validate workflow with different priority levels
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} changeType - Type of change that triggered validation
 * @returns {Promise<Object>} Validation result
 */
export const validateWorkflowByChangeType = async (nodes, edges, changeType) => {
  const priorityMap = {
    'nodeAdd': 'nodeUpdate',
    'nodeRemove': 'critical',
    'nodeUpdate': 'nodeUpdate',
    'edgeAdd': 'edgeUpdate',
    'edgeRemove': 'critical',
    'edgeUpdate': 'edgeUpdate',
    'position': 'validation',
    'select': 'validation',
    'default': 'validation',
  };

  const priority = priorityMap[changeType] || priorityMap.default;
  
  return await validateWorkflowOptimized(nodes, edges, {
    priority,
    includeStats: priority === 'critical',
    includeSchema: priority === 'critical',
  });
};

/**
 * Batch validate multiple workflows
 * @param {Array} workflows - Array of workflow objects
 * @param {Object} options - Validation options
 * @returns {Promise<Array>} Array of validation results
 */
export const batchValidateWorkflows = async (workflows, options = {}) => {
  const { concurrency = 3 } = options;
  const results = [];
  
  // Process workflows in batches to avoid overwhelming the system
  for (let i = 0; i < workflows.length; i += concurrency) {
    const batch = workflows.slice(i, i + concurrency);
    const batchPromises = batch.map(workflow => 
      validateWorkflowOptimized(workflow.nodes, workflow.edges, {
        ...options,
        priority: 'validation',
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Get validation statistics
 * @returns {Object} Validation statistics
 */
export const getValidationStats = () => {
  return {
    cache: validationCache.getStats(),
    debouncer: debouncedValidator.getStats(),
    performance: performanceMonitor.getStats(),
  };
};

/**
 * Clear validation caches and reset statistics
 */
export const resetValidationSystem = () => {
  validationCache.clear();
  debouncedValidator.clearAll();
  performanceMonitor.clear();
};

/**
 * Configure validation system
 * @param {Object} config - Configuration options
 */
export const configureValidationSystem = (config) => {
  if (config.debounceTimeouts) {
    debouncedValidator.updateConfig(config.debounceTimeouts);
  }
  
  if (config.cacheSettings) {
    validationCache.updateConfig(config.cacheSettings);
  }
  
  if (config.performanceMonitoring !== undefined) {
    performanceMonitor.setEnabled(config.performanceMonitoring);
  }
};

/**
 * Create a validation function bound to specific FlowState context
 * @param {Object} flowStateContext - FlowState context
 * @returns {Function} Bound validation function
 */
export const createContextBoundValidator = (flowStateContext) => {
  return async (priority = 'validation', options = {}) => {
    const nodes = Array.from(flowStateContext.state.nodes.values());
    const edges = Array.from(flowStateContext.state.edges.values());
    
    return await validateWorkflowOptimized(nodes, edges, {
      priority,
      ...options,
    });
  };
};

/**
 * Validation middleware for React Flow events
 * @param {Function} originalHandler - Original event handler
 * @param {Object} flowStateContext - FlowState context
 * @returns {Function} Enhanced event handler with validation
 */
export const withValidation = (originalHandler, flowStateContext) => {
  return async (...args) => {
    // Call original handler first
    const result = await originalHandler(...args);
    
    // Trigger validation after the change
    setTimeout(async () => {
      try {
        const validator = createContextBoundValidator(flowStateContext);
        await validator('nodeUpdate');
      } catch (error) {
        console.error('Validation middleware error:', error);
      }
    }, 0);
    
    return result;
  };
};

// Export validation utilities
export const ValidationUtils = {
  validateWorkflowOptimized,
  validateWorkflowByChangeType,
  batchValidateWorkflows,
  getValidationStats,
  resetValidationSystem,
  configureValidationSystem,
  createContextBoundValidator,
  withValidation,
  calculateWorkflowHealth,
};