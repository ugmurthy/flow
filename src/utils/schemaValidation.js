/**
 * Schema Validation Utilities
 * Comprehensive validation for the new node data schema
 */

import { SchemaValidator } from '../types/nodeSchema.js';
import { ValidationResult } from '../types/pluginSystem.js';

/**
 * Enhanced Schema Validator with additional utilities
 */
export class EnhancedSchemaValidator extends SchemaValidator {
  
  /**
   * Validate a complete workflow (nodes and edges)
   * @param {Array} nodes - Array of React Flow nodes
   * @param {Array} edges - Array of React Flow edges
   * @returns {Object} Validation result with detailed analysis
   */
  static validateWorkflow(nodes, edges) {
    const errors = [];
    const warnings = [];
    const nodeValidations = new Map();
    const edgeValidations = new Map();
    
    // Validate individual nodes
    for (const node of nodes) {
      const validation = this.validateNode(node);
      nodeValidations.set(node.id, validation);
      
      if (!validation.isValid) {
        errors.push(...validation.errors.map(err => `Node ${node.id}: ${err}`));
      }
    }
    
    // Validate edges
    for (const edge of edges) {
      const validation = this.validateEdge(edge, nodes);
      edgeValidations.set(edge.id, validation);
      
      if (!validation.isValid) {
        errors.push(...validation.errors.map(err => `Edge ${edge.id}: ${err}`));
      }
    }
    
    // Validate workflow structure
    const structureValidation = this.validateWorkflowStructure(nodes, edges);
    if (!structureValidation.isValid) {
      errors.push(...structureValidation.errors);
    }
    warnings.push(...structureValidation.warnings);
    
    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(nodes, edges);
    if (orphanedNodes.length > 0) {
      warnings.push(`Found ${orphanedNodes.length} orphaned nodes: ${orphanedNodes.join(', ')}`);
    }
    
    // Check for circular dependencies
    const circularDeps = this.findCircularDependencies(nodes, edges);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      nodeValidations,
      edgeValidations,
      stats: {
        totalNodes: nodes.length,
        validNodes: Array.from(nodeValidations.values()).filter(v => v.isValid).length,
        totalEdges: edges.length,
        validEdges: Array.from(edgeValidations.values()).filter(v => v.isValid).length,
        orphanedNodes: orphanedNodes.length,
        circularDependencies: circularDeps.length
      }
    };
  }
  
  /**
   * Validate a React Flow edge
   * @param {Object} edge - React Flow edge
   * @param {Array} nodes - Array of nodes for reference
   * @returns {Object} Validation result
   */
  static validateEdge(edge, nodes = []) {
    const errors = [];
    
    if (!edge) {
      errors.push('Edge is required');
      return ValidationResult.error(errors);
    }
    
    // Required properties
    if (!edge.id) errors.push('Edge id is required');
    if (!edge.source) errors.push('Edge source is required');
    if (!edge.target) errors.push('Edge target is required');
    
    // Check if source and target nodes exist
    if (nodes.length > 0) {
      const sourceExists = nodes.some(n => n.id === edge.source);
      const targetExists = nodes.some(n => n.id === edge.target);
      
      if (!sourceExists) errors.push(`Source node '${edge.source}' does not exist`);
      if (!targetExists) errors.push(`Target node '${edge.target}' does not exist`);
    }
    
    // Check for self-loops
    if (edge.source === edge.target) {
      errors.push('Self-loops are not allowed');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate workflow structure
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object} Validation result
   */
  static validateWorkflowStructure(nodes, edges) {
    const errors = [];
    const warnings = [];
    
    if (nodes.length === 0) {
      warnings.push('Workflow has no nodes');
      return { isValid: true, errors, warnings };
    }
    
    // Check for at least one input node
    const inputNodes = nodes.filter(n => 
      n.data?.meta?.category === 'input' || 
      n.type === 'formNode' || 
      n.type === 'templateFormNode'
    );
    
    if (inputNodes.length === 0) {
      warnings.push('Workflow has no input nodes');
    }
    
    // Check for at least one output node
    const outputNodes = nodes.filter(n => 
      n.data?.meta?.category === 'output' || 
      n.type === 'leafNode' || 
      n.type === 'markdownNode'
    );
    
    if (outputNodes.length === 0) {
      warnings.push('Workflow has no output nodes');
    }
    
    // Check connectivity
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
    if (disconnectedNodes.length > 0 && edges.length > 0) {
      warnings.push(`${disconnectedNodes.length} nodes are not connected to the workflow`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Find orphaned nodes (nodes with no connections)
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Array} Array of orphaned node IDs
   */
  static findOrphanedNodes(nodes, edges) {
    if (edges.length === 0) {
      return nodes.map(n => n.id);
    }
    
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    return nodes
      .filter(n => !connectedNodeIds.has(n.id))
      .map(n => n.id);
  }
  
  /**
   * Find circular dependencies in the workflow
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Array} Array of node IDs forming circular dependencies
   */
  static findCircularDependencies(nodes, edges) {
    const graph = new Map();
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    // Build adjacency list
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      if (graph.has(edge.source)) {
        graph.get(edge.source).push(edge.target);
      }
    });
    
    // DFS to detect cycles
    const dfs = (nodeId, path = []) => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), nodeId]);
        }
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path]);
      }
      
      recursionStack.delete(nodeId);
    };
    
    // Check all nodes
    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }
    
    return cycles.flat();
  }
  
  /**
   * Validate node data types and constraints
   * @param {Object} nodeData - Node data to validate
   * @returns {Object} Validation result with type checking
   */
  static validateNodeDataTypes(nodeData) {
    const errors = [];
    const warnings = [];
    
    if (!nodeData) {
      return ValidationResult.error(['NodeData is required']);
    }
    
    // Validate meta section types
    if (nodeData.meta) {
      const meta = nodeData.meta;
      
      if (meta.label && typeof meta.label !== 'string') {
        errors.push('meta.label must be a string');
      }
      
      if (meta.description && typeof meta.description !== 'string') {
        errors.push('meta.description must be a string');
      }
      
      if (meta.function && typeof meta.function !== 'string') {
        errors.push('meta.function must be a string');
      }
      
      if (meta.emoji && typeof meta.emoji !== 'string') {
        errors.push('meta.emoji must be a string');
      }
      
      if (meta.version && typeof meta.version !== 'string') {
        errors.push('meta.version must be a string');
      }
      
      if (meta.capabilities && !Array.isArray(meta.capabilities)) {
        errors.push('meta.capabilities must be an array');
      }
    }
    
    // Validate input section types
    if (nodeData.input) {
      const input = nodeData.input;
      
      if (input.connections && typeof input.connections !== 'object') {
        errors.push('input.connections must be an object');
      }
      
      
      if (input.config && typeof input.config !== 'object') {
        errors.push('input.config must be an object');
      }
    }
    
    // Validate output section types
    if (nodeData.output) {
      const output = nodeData.output;
      
      if (output.data && typeof output.data !== 'object') {
        errors.push('output.data must be an object');
      }
      
      if (output.meta) {
        if (output.meta.timestamp && typeof output.meta.timestamp !== 'string') {
          errors.push('output.meta.timestamp must be a string');
        }
        
        if (output.meta.processingTime && typeof output.meta.processingTime !== 'number') {
          errors.push('output.meta.processingTime must be a number');
        }
        
        if (output.meta.dataSize && typeof output.meta.dataSize !== 'number') {
          errors.push('output.meta.dataSize must be a number');
        }
      }
    }
    
    // Validate error section types
    if (nodeData.error) {
      const error = nodeData.error;
      
      if (typeof error.hasError !== 'boolean') {
        errors.push('error.hasError must be a boolean');
      }
      
      if (!Array.isArray(error.errors)) {
        errors.push('error.errors must be an array');
      } else {
        error.errors.forEach((err, index) => {
          if (!err.code || typeof err.code !== 'string') {
            errors.push(`error.errors[${index}].code must be a string`);
          }
          if (!err.message || typeof err.message !== 'string') {
            errors.push(`error.errors[${index}].message must be a string`);
          }
          if (!err.timestamp || typeof err.timestamp !== 'string') {
            errors.push(`error.errors[${index}].timestamp must be a string`);
          }
        });
      }
    }
    
    // Validate plugin section types
    if (nodeData.plugin) {
      const plugin = nodeData.plugin;
      
      if (!plugin.name || typeof plugin.name !== 'string') {
        errors.push('plugin.name must be a string');
      }
      
      if (plugin.version && typeof plugin.version !== 'string') {
        errors.push('plugin.version must be a string');
      }
      
      if (plugin.config && typeof plugin.config !== 'object') {
        errors.push('plugin.config must be an object');
      }
      
      if (plugin.state && typeof plugin.state !== 'object') {
        errors.push('plugin.state must be an object');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate data consistency across connected nodes
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object} Validation result
   */
  static validateDataConsistency(nodes, edges) {
    const errors = [];
    const warnings = [];
    
    // Build connection map
    const connections = new Map();
    edges.forEach(edge => {
      if (!connections.has(edge.target)) {
        connections.set(edge.target, []);
      }
      connections.get(edge.target).push(edge.source);
    });
    
    // Check each node's input expectations
    for (const node of nodes) {
      const nodeConnections = connections.get(node.id) || [];
      
      if (node.data?.input?.config?.requiredInputs) {
        const requiredInputs = node.data.input.config.requiredInputs;
        
        if (nodeConnections.length < requiredInputs.length) {
          errors.push(`Node ${node.id} requires ${requiredInputs.length} inputs but has ${nodeConnections.length}`);
        }
      }
      
      // Check data type compatibility
      if (nodeConnections.length > 0 && node.data?.input?.config?.expectedDataTypes) {
        const expectedTypes = node.data.input.config.expectedDataTypes;
        
        for (const sourceId of nodeConnections) {
          const sourceNode = nodes.find(n => n.id === sourceId);
          if (sourceNode?.data?.output?.data) {
            const outputType = typeof sourceNode.data.output.data;
            if (expectedTypes && !expectedTypes.includes(outputType)) {
              warnings.push(`Data type mismatch: ${sourceId} outputs ${outputType}, ${node.id} expects ${expectedTypes.join(' or ')}`);
            }
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Generate validation report
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object} Comprehensive validation report
   */
  static generateValidationReport(nodes, edges) {
    const workflowValidation = this.validateWorkflow(nodes, edges);
    const consistencyValidation = this.validateDataConsistency(nodes, edges);
    
    // Detailed node analysis
    const nodeAnalysis = nodes.map(node => ({
      id: node.id,
      type: node.type,
      category: node.data?.meta?.category || 'unknown',
      validation: this.validateNode(node),
      typeValidation: this.validateNodeDataTypes(node.data),
      hasPlugin: !!node.data?.plugin,
      connectionCount: edges.filter(e => e.source === node.id || e.target === node.id).length
    }));
    
    // Edge analysis
    const edgeAnalysis = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      validation: this.validateEdge(edge, nodes)
    }));
    
    const allErrors = [
      ...workflowValidation.errors,
      ...consistencyValidation.errors
    ];
    
    const allWarnings = [
      ...workflowValidation.warnings,
      ...consistencyValidation.warnings
    ];
    
    return {
      isValid: allErrors.length === 0,
      summary: {
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        validNodes: nodeAnalysis.filter(n => n.validation.isValid).length,
        validEdges: edgeAnalysis.filter(e => e.validation.isValid).length
      },
      errors: allErrors,
      warnings: allWarnings,
      nodeAnalysis,
      edgeAnalysis,
      workflowStructure: workflowValidation,
      dataConsistency: consistencyValidation,
      generatedAt: new Date().toISOString()
    };
  }
}

/**
 * Validation utilities for specific use cases
 */
export const ValidationUtils = {
  /**
   * Quick validation for a single node
   * @param {Object} node - React Flow node
   * @returns {boolean} True if valid
   */
  isValidNode: (node) => {
    return EnhancedSchemaValidator.validateNode(node).isValid;
  },
  
  /**
   * Quick validation for workflow
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {boolean} True if valid
   */
  isValidWorkflow: (nodes, edges) => {
    return EnhancedSchemaValidator.validateWorkflow(nodes, edges).isValid;
  },
  
  /**
   * Get validation errors for a node
   * @param {Object} node - React Flow node
   * @returns {Array} Array of error messages
   */
  getNodeErrors: (node) => {
    return EnhancedSchemaValidator.validateNode(node).errors;
  },
  
  /**
   * Get validation warnings for a workflow
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Array} Array of warning messages
   */
  getWorkflowWarnings: (nodes, edges) => {
    return EnhancedSchemaValidator.validateWorkflow(nodes, edges).warnings;
  },
  
  /**
   * Validate and sanitize node data
   * @param {Object} nodeData - Node data to sanitize
   * @returns {Object} Sanitized node data
   */
  sanitizeNodeData: (nodeData) => {
    if (!nodeData) return null;
    
    // Ensure required structure exists
    const sanitized = {
      meta: {
        label: nodeData.meta?.label || 'Untitled Node',
        description: nodeData.meta?.description || '',
        function: nodeData.meta?.function || 'Generic Function',
        emoji: nodeData.meta?.emoji || '⚙️',
        version: nodeData.meta?.version || '1.0.0',
        category: nodeData.meta?.category || 'process',
        capabilities: Array.isArray(nodeData.meta?.capabilities) ? nodeData.meta.capabilities : [],
        ...nodeData.meta
      },
      input: {
        connections: nodeData.input?.connections || {},
        config: nodeData.input?.config || {},
        ...nodeData.input
      },
      output: {
        data: nodeData.output?.data || {},
        meta: {
          timestamp: nodeData.output?.meta?.timestamp || new Date().toISOString(),
          status: nodeData.output?.meta?.status || 'idle',
          processingTime: nodeData.output?.meta?.processingTime || null,
          dataSize: nodeData.output?.meta?.dataSize || null,
          ...nodeData.output?.meta
        },
        ...nodeData.output
      },
      error: {
        hasError: nodeData.error?.hasError || false,
        errors: Array.isArray(nodeData.error?.errors) ? nodeData.error.errors : [],
        ...nodeData.error
      },
      plugin: nodeData.plugin || null
    };
    
    return sanitized;
  }
};

// Export main validator
export default EnhancedSchemaValidator;