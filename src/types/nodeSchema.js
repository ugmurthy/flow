/**
 * Node Data Schema - Core Type Definitions
 * Based on README-NodeSchema.md specification
 */

/**
 * Connection data structure for tracking input connections
 */
export const ConnectionData = {
  /**
   * @param {string} sourceNodeId - ID of the source node
   * @param {string} sourceHandle - Handle ID on source node
   * @param {string} targetHandle - Handle ID on target node
   * @param {any} data - Data received from connection
   * @param {any} processed - Processed data from source node
   * @param {Object} meta - Connection metadata
   * @param {string} meta.timestamp - When connection was established
   * @param {string} meta.dataType - Type of data being transmitted
   * @param {boolean} meta.isActive - Whether connection is active
   * @param {string} meta.lastProcessed - When data was last processed
   */
  create: (sourceNodeId, sourceHandle = 'default', targetHandle = 'default', data = null, processed = null) => ({
    sourceNodeId,
    sourceHandle,
    targetHandle,
    data,
    processed, // NEW: Processed data from source node
    meta: {
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      isActive: true,
      lastProcessed: processed ? new Date().toISOString() : null // NEW: Track when data was processed
    }
  })
};

/**
 * Core NodeData structure - replaces the old formData approach
 */
export const NodeData = {
  /**
   * Create a new NodeData instance
   * @param {Object} config - Configuration object
   * @param {Object} config.meta - Node metadata
   * @param {string} config.meta.label - Display name
   * @param {string} config.meta.description - Optional description
   * @param {string} config.meta.function - Functional description
   * @param {string} config.meta.emoji - Visual icon
   * @param {string} config.meta.version - Schema version
   * @param {string} config.meta.category - Node category: "input" | "process" | "output"
   * @param {string[]} config.meta.capabilities - What this node can do
   * @param {Object} config.input - Input configuration
   * @param {Object} config.output - Output data
   * @param {Object} config.plugin - Plugin configuration
   */
  create: ({
    meta = {},
    input = {},
    output = {},
    plugin = null
  } = {}) => ({
    meta: {
      label: meta.label || 'Untitled Node',
      description: meta.description || '',
      function: meta.function || 'Generic Function',
      emoji: meta.emoji || '⚙️',
      version: meta.version || '1.0.0',
      category: meta.category || 'process',
      capabilities: meta.capabilities || [],
      ...meta
    },
    input: {
      connections: input.connections || {},
      processed: input.processed || {},
      config: input.config || {},
      ...input
    },
    output: {
      data: output.data || {},
      meta: {
        timestamp: new Date().toISOString(),
        status: 'idle',
        processingTime: null,
        dataSize: null,
        ...output.meta
      },
      ...output
    },
    error: {
      hasError: false,
      errors: []
    },
    plugin: plugin ? {
      name: plugin.name,
      version: plugin.version || '1.0.0',
      config: plugin.config || {},
      state: plugin.state || {},
      ...plugin
    } : null
  }),

  /**
   * Update node data immutably
   * @param {Object} nodeData - Current node data
   * @param {Object} updates - Updates to apply
   * @returns {Object} New node data instance
   */
  update: (nodeData, updates) => {
    const newData = { ...nodeData };
    
    if (updates.meta) {
      newData.meta = { ...newData.meta, ...updates.meta };
    }
    
    if (updates.input) {
      newData.input = { ...newData.input, ...updates.input };
      if (updates.input.connections) {
        newData.input.connections = { ...newData.input.connections, ...updates.input.connections };
      }
      if (updates.input.processed) {
        newData.input.processed = { ...newData.input.processed, ...updates.input.processed };
      }
      if (updates.input.config) {
        newData.input.config = { ...newData.input.config, ...updates.input.config };
      }
    }
    
    if (updates.output) {
      newData.output = { ...newData.output, ...updates.output };
      if (updates.output.data) {
        newData.output.data = { ...newData.output.data, ...updates.output.data };
      }
      if (updates.output.meta) {
        newData.output.meta = { ...newData.output.meta, ...updates.output.meta };
      }
    }
    
    if (updates.error) {
      newData.error = { ...newData.error, ...updates.error };
      if (updates.error.errors) {
        newData.error.errors = [...updates.error.errors];
      }
    }
    
    if (updates.plugin) {
      newData.plugin = newData.plugin ? { ...newData.plugin, ...updates.plugin } : updates.plugin;
    }
    
    return newData;
  },

  /**
   * Add an error to the node
   * @param {Object} nodeData - Current node data
   * @param {Object} error - Error to add
   * @param {string} error.code - Error code
   * @param {string} error.message - Error message
   * @param {string} error.source - Error source: "input" | "processing" | "output"
   * @param {any} error.details - Additional error details
   */
  addError: (nodeData, error) => {
    const newError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      source: error.source || 'processing',
      timestamp: new Date().toISOString(),
      details: error.details || null
    };

    return NodeData.update(nodeData, {
      error: {
        hasError: true,
        errors: [...nodeData.error.errors, newError]
      }
    });
  },

  /**
   * Clear all errors from the node
   * @param {Object} nodeData - Current node data
   */
  clearErrors: (nodeData) => {
    return NodeData.update(nodeData, {
      error: {
        hasError: false,
        errors: []
      }
    });
  },

  /**
   * Set output data and update status
   * @param {Object} nodeData - Current node data
   * @param {any} data - Output data
   * @param {Object} meta - Optional metadata updates
   */
  setOutput: (nodeData, data, meta = {}) => {
    const dataSize = JSON.stringify(data).length;
    
    return NodeData.update(nodeData, {
      output: {
        data,
        meta: {
          timestamp: new Date().toISOString(),
          status: 'success',
          dataSize,
          ...meta
        }
      }
    });
  },

  /**
   * Set processing status
   * @param {Object} nodeData - Current node data
   * @param {string} status - Status: "idle" | "processing" | "success" | "error"
   * @param {Object} meta - Optional metadata
   */
  setStatus: (nodeData, status, meta = {}) => {
    return NodeData.update(nodeData, {
      output: {
        meta: {
          status,
          timestamp: new Date().toISOString(),
          ...meta
        }
      }
    });
  }
};

/**
 * React Flow Node structure (extends React Flow's base Node)
 */
export const Node = {
  /**
   * Create a new React Flow compatible node
   * @param {Object} config - Node configuration
   * @param {string} config.id - Unique node ID
   * @param {Object} config.position - Node position {x, y}
   * @param {Object} config.data - NodeData instance
   * @param {string} config.type - React Flow node type
   * @param {Object} config.style - CSS styles
   * @param {string} config.className - CSS class name
   * @param {boolean} config.draggable - Whether node is draggable
   * @param {boolean} config.selectable - Whether node is selectable
   */
  create: ({
    id,
    position = { x: 0, y: 0 },
    data,
    type = 'default',
    style = {},
    className = '',
    draggable = true,
    selectable = true,
    ...otherProps
  }) => ({
    id,
    position,
    data,
    type,
    style,
    className,
    draggable,
    selectable,
    ...otherProps
  })
};

/**
 * Node type specific schemas
 */

/**
 * Input Node Schema - for nodes that collect user input
 */
export const InputNodeData = {
  create: (config = {}) => {
    const baseData = NodeData.create({
      meta: {
        category: 'input',
        capabilities: ['user-input', 'form-data', 'data-collection'],
        ...config.meta
      },
      input: {
        config: {
          formFields: config.formFields || [],
          validation: config.validation || {},
          ...config.input?.config
        },
        ...config.input
      },
      ...config
    });

    return baseData;
  }
};

/**
 * Process Node Schema - for nodes that transform data
 */
export const ProcessNodeData = {
  create: (config = {}) => {
    const baseData = NodeData.create({
      meta: {
        category: 'process',
        capabilities: ['data-processing', 'transformation', 'computation'],
        ...config.meta
      },
      input: {
        config: {
          aggregationStrategy: config.aggregationStrategy || 'merge',
          requiredInputs: config.requiredInputs || [],
          ...config.input?.config
        },
        ...config.input
      },
      ...config
    });

    return baseData;
  }
};

/**
 * Output Node Schema - for nodes that display or export data
 */
export const OutputNodeData = {
  create: (config = {}) => {
    const baseData = NodeData.create({
      meta: {
        category: 'output',
        capabilities: ['data-display', 'export', 'visualization'],
        ...config.meta
      },
      input: {
        config: {
          displayFormat: config.displayFormat || 'json',
          exportOptions: config.exportOptions || {},
          ...config.input?.config
        },
        ...config.input
      },
      ...config
    });

    return baseData;
  }
};

/**
 * Schema validation utilities
 */
export class SchemaValidator {
  /**
   * Validate NodeData structure
   * @param {Object} nodeData - Node data to validate
   * @returns {Object} Validation result
   */
  static validateNodeData(nodeData) {
    const errors = [];
    
    if (!nodeData) {
      errors.push('NodeData is required');
      return { isValid: false, errors };
    }

    // Validate meta section
    if (!nodeData.meta) {
      errors.push('meta section is required');
    } else {
      if (!nodeData.meta.label) errors.push('meta.label is required');
      if (!nodeData.meta.function) errors.push('meta.function is required');
      if (!nodeData.meta.emoji) errors.push('meta.emoji is required');
      if (!nodeData.meta.category) errors.push('meta.category is required');
      if (!['input', 'process', 'output'].includes(nodeData.meta.category)) {
        errors.push('meta.category must be "input", "process", or "output"');
      }
    }

    // Validate input section
    if (!nodeData.input) {
      errors.push('input section is required');
    } else {
      if (!nodeData.input.connections) errors.push('input.connections is required');
      if (!nodeData.input.processed) errors.push('input.processed is required');
      if (!nodeData.input.config) errors.push('input.config is required');
    }

    // Validate output section
    if (!nodeData.output) {
      errors.push('output section is required');
    } else {
      if (!nodeData.output.data) errors.push('output.data is required');
      if (!nodeData.output.meta) errors.push('output.meta is required');
      else {
        if (!nodeData.output.meta.timestamp) errors.push('output.meta.timestamp is required');
        if (!nodeData.output.meta.status) errors.push('output.meta.status is required');
        if (!['idle', 'processing', 'success', 'error'].includes(nodeData.output.meta.status)) {
          errors.push('output.meta.status must be "idle", "processing", "success", or "error"');
        }
      }
    }

    // Validate error section
    if (!nodeData.error) {
      errors.push('error section is required');
    } else {
      if (typeof nodeData.error.hasError !== 'boolean') errors.push('error.hasError must be boolean');
      if (!Array.isArray(nodeData.error.errors)) errors.push('error.errors must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate React Flow Node structure
   * @param {Object} node - React Flow node to validate
   * @returns {Object} Validation result
   */
  static validateNode(node) {
    const errors = [];
    
    if (!node) {
      errors.push('Node is required');
      return { isValid: false, errors };
    }

    if (!node.id) errors.push('Node id is required');
    if (!node.position) errors.push('Node position is required');
    else {
      if (typeof node.position.x !== 'number') errors.push('Node position.x must be a number');
      if (typeof node.position.y !== 'number') errors.push('Node position.y must be a number');
    }
    if (!node.data) errors.push('Node data is required');

    // Validate the NodeData if present
    if (node.data) {
      const nodeDataValidation = SchemaValidator.validateNodeData(node.data);
      if (!nodeDataValidation.isValid) {
        errors.push(...nodeDataValidation.errors.map(err => `data.${err}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Migration utilities for converting old schema to new schema
 */
export const SchemaMigration = {
  /**
   * Convert old node data format to new NodeData format
   * @param {Object} oldData - Old node data format
   * @returns {Object} New NodeData format
   */
  migrateFromOldFormat: (oldData) => {
    if (!oldData) return NodeData.create();

    // Extract old format properties
    const {
      label = 'Migrated Node',
      function: nodeFunction = 'Generic Function',
      emoji = '⚙️',
      formData = {},
      formFields = [],
      ...otherProps
    } = oldData;

    // Determine category based on old type or properties
    let category = 'process';
    if (formFields && formFields.length > 0) {
      category = 'input';
    } else if (oldData.type === 'leafNode' || oldData.type === 'markdownNode') {
      category = 'output';
    }

    // Create new NodeData
    const newData = NodeData.create({
      meta: {
        label,
        function: nodeFunction,
        emoji,
        category,
        capabilities: SchemaMigration._inferCapabilities(oldData),
        version: '1.0.0'
      },
      input: {
        config: {
          formFields: formFields || [],
          // Preserve other old config
          ...otherProps
        }
      },
      output: {
        data: formData || {}
      }
    });

    return newData;
  },

  /**
   * Infer capabilities from old node data
   * @private
   */
  _inferCapabilities: (oldData) => {
    const capabilities = [];
    
    if (oldData.formFields && oldData.formFields.length > 0) {
      capabilities.push('user-input', 'form-data');
    }
    
    if (oldData.type === 'processNode') {
      capabilities.push('data-processing', 'transformation');
    }
    
    if (oldData.type === 'fetchNode') {
      capabilities.push('http-request', 'api-integration');
    }
    
    if (oldData.type === 'markdownNode') {
      capabilities.push('markdown-rendering', 'text-display');
    }
    
    return capabilities;
  }
};