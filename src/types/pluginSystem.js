/**
 * Plugin System Interfaces
 * Based on README-NodeSchema.md specification
 */

/**
 * Processing Input structure for plugin processing
 */
export const ProcessingInput = {
  /**
   * Create a processing input
   * @param {Object} config - Input configuration
   * @param {string} config.sourceId - Source node ID
   * @param {string} config.sourceHandle - Source handle ID
   * @param {any} config.data - Input data
   * @param {Object} config.meta - Input metadata
   * @param {string} config.meta.timestamp - When data was received
   * @param {string} config.meta.dataType - Type of data
   * @param {number} config.meta.dataSize - Size of data in bytes
   */
  create: ({
    sourceId,
    sourceHandle = 'default',
    data,
    meta = {}
  }) => ({
    sourceId,
    sourceHandle,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      dataSize: data ? JSON.stringify(data).length: 0 ,
      ...meta
    }
  })
};

/**
 * Processing Output structure for plugin results
 */
export const ProcessingOutput = {
  /**
   * Create a processing output
   * @param {Object} config - Output configuration
   * @param {any} config.data - Output data
   * @param {Object} config.meta - Output metadata
   * @param {boolean} config.success - Whether processing was successful
   * @param {Array} config.errors - Any errors that occurred
   * @param {Object} config.metrics - Processing metrics
   */
  create: ({
    data,
    meta = {},
    success = true,
    errors = [],
    metrics = {}
  }) => ({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      dataSize: JSON.stringify(data).length,
      processingTime: metrics.processingTime || null,
      ...meta
    },
    success,
    errors,
    metrics: {
      startTime: metrics.startTime || null,
      endTime: metrics.endTime || null,
      processingTime: metrics.processingTime || null,
      memoryUsage: metrics.memoryUsage || null,
      ...metrics
    }
  }),

  /**
   * Create a successful output
   * @param {any} data - Output data
   * @param {Object} meta - Optional metadata
   * @param {Object} metrics - Optional metrics
   */
  success: (data, meta = {}, metrics = {}) => {
    return ProcessingOutput.create({
      data,
      meta,
      success: true,
      errors: [],
      metrics
    });
  },

  /**
   * Create an error output
   * @param {string|Error} error - Error message or Error object
   * @param {any} data - Partial data if any
   * @param {Object} meta - Optional metadata
   * @param {Object} metrics - Optional metrics
   */
  error: (error, data = null, meta = {}, metrics = {}) => {
    const errorObj = error instanceof Error ? {
      code: error.name || 'PROCESSING_ERROR',
      message: error.message,
      stack: error.stack
    } : {
      code: 'PROCESSING_ERROR',
      message: typeof error === 'string' ? error : 'Unknown error occurred'
    };

    return ProcessingOutput.create({
      data,
      meta,
      success: false,
      errors: [errorObj],
      metrics
    });
  }
};

/**
 * Validation Result structure
 */
export const ValidationResult = {
  /**
   * Create a validation result
   * @param {boolean} isValid - Whether validation passed
   * @param {Array} errors - Validation errors
   * @param {Array} warnings - Validation warnings
   */
  create: (isValid, errors = [], warnings = []) => ({
    isValid,
    errors,
    warnings
  }),

  success: () => ValidationResult.create(true, [], []),
  
  error: (errors) => ValidationResult.create(false, Array.isArray(errors) ? errors : [errors], []),
  
  warning: (warnings, errors = []) => ValidationResult.create(errors.length === 0, errors, Array.isArray(warnings) ? warnings : [warnings])
};

/**
 * Core Plugin Interface
 * All plugins must implement this interface
 */
export const INodePlugin = {
  /**
   * Plugin metadata
   */
  name: '', // Plugin name
  version: '1.0.0', // Plugin version
  description: '', // Plugin description
  author: '', // Plugin author
  
  /**
   * Initialize the plugin with configuration
   * @param {Object} config - Plugin configuration
   * @returns {Promise<void>}
   */
  initialize: async (config) => {
    throw new Error('initialize method must be implemented');
  },

  /**
   * Process inputs and return output
   * @param {ProcessingInput[]} inputs - Array of processing inputs
   * @param {Object} config - Current plugin configuration
   * @param {Object} context - Processing context
   * @returns {Promise<ProcessingOutput>}
   */
  process: async (inputs, config, context) => {
    throw new Error('process method must be implemented');
  },

  /**
   * Cleanup plugin resources
   * @returns {Promise<void>}
   */
  cleanup: async () => {
    throw new Error('cleanup method must be implemented');
  },

  /**
   * Get plugin capabilities
   * @returns {string[]} Array of capability strings
   */
  getCapabilities: () => {
    throw new Error('getCapabilities method must be implemented');
  },

  /**
   * Get configuration schema (JSON Schema format)
   * @returns {Object} JSON Schema object
   */
  getConfigSchema: () => {
    throw new Error('getConfigSchema method must be implemented');
  },

  /**
   * Validate plugin configuration
   * @param {Object} config - Configuration to validate
   * @returns {ValidationResult}
   */
  validateConfig: (config) => {
    throw new Error('validateConfig method must be implemented');
  },

  /**
   * Get plugin status
   * @returns {Object} Status information
   */
  getStatus: () => ({
    initialized: false,
    healthy: false,
    lastError: null,
    metrics: {}
  })
};

/**
 * Base Plugin Class
 * Provides common functionality for all plugins
 */
export class BasePlugin {
  constructor(name, version = '1.0.0', description = '', author = '') {
    this.name = name;
    this.version = version;
    this.description = description;
    this.author = author;
    this.initialized = false;
    this.config = {};
    this.status = {
      initialized: false,
      healthy: false,
      lastError: null,
      metrics: {
        processCount: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        errorCount: 0,
        lastProcessedAt: null
      }
    };
  }

  /**
   * Initialize the plugin
   * @param {Object} config - Plugin configuration
   */
  async initialize(config = {}) {
    try {
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      this.config = { ...config };
      await this._doInitialize(config);
      
      this.initialized = true;
      this.status.initialized = true;
      this.status.healthy = true;
      this.status.lastError = null;
    } catch (error) {
      this.status.lastError = error.message;
      this.status.healthy = false;
      throw error;
    }
  }

  /**
   * Process inputs - includes metrics tracking
   * @param {ProcessingInput[]} inputs - Processing inputs
   * @param {Object} config - Processing configuration
   * @param {Object} context - Processing context
   */
  async process(inputs, config = {}, context = {}) {
    if (!this.initialized) {
      throw new Error(`Plugin ${this.name} is not initialized`);
    }

    const startTime = Date.now();
    
    try {
      // Merge plugin config with processing config
      const mergedConfig = { ...this.config, ...config };
      
      // Call the actual processing implementation
      const result = await this._doProcess(inputs, mergedConfig, context);
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this._updateMetrics(processingTime, true);
      
      // Add processing time to result metrics
      if (result.metrics) {
        result.metrics.processingTime = processingTime;
        result.metrics.startTime = startTime;
        result.metrics.endTime = Date.now();
      }
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateMetrics(processingTime, false);
      
      this.status.lastError = error.message;
      return ProcessingOutput.error(error, null, {}, {
        processingTime,
        startTime,
        endTime: Date.now()
      });
    }
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup() {
    try {
      await this._doCleanup();
      this.initialized = false;
      this.status.initialized = false;
    } catch (error) {
      this.status.lastError = error.message;
      throw error;
    }
  }

  /**
   * Get plugin status
   */
  getStatus() {
    return { ...this.status };
  }

  /**
   * Get default capabilities
   */
  getCapabilities() {
    return ['data-processing'];
  }

  /**
   * Get default configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {},
      additionalProperties: true
    };
  }

  /**
   * Validate configuration using JSON Schema
   */
  validateConfig(config) {
    // Basic validation - can be enhanced with a proper JSON Schema validator
    if (typeof config !== 'object' || config === null) {
      return ValidationResult.error(['Configuration must be an object']);
    }
    
    return ValidationResult.success();
  }

  /**
   * Update processing metrics
   * @private
   */
  _updateMetrics(processingTime, success) {
    const metrics = this.status.metrics;
    
    metrics.processCount++;
    metrics.totalProcessingTime += processingTime;
    metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.processCount;
    metrics.lastProcessedAt = new Date().toISOString();
    
    if (!success) {
      metrics.errorCount++;
    }
  }

  /**
   * Override this method in subclasses for actual initialization
   * @protected
   */
  async _doInitialize(config) {
    // Default implementation - override in subclasses
  }

  /**
   * Override this method in subclasses for actual processing
   * @protected
   */
  async _doProcess(inputs, config, context) {
    throw new Error('_doProcess method must be implemented in subclass');
  }

  /**
   * Override this method in subclasses for cleanup
   * @protected
   */
  async _doCleanup() {
    // Default implementation - override in subclasses
  }
}

/**
 * Plugin Context - provides context information during processing
 */
export const PluginContext = {
  /**
   * Create a plugin context
   * @param {Object} config - Context configuration
   * @param {string} config.nodeId - Current node ID
   * @param {Object} config.nodeData - Current node data
   * @param {Function} config.updateNodeData - Function to update node data
   * @param {Function} config.getConnectedNodes - Function to get connected nodes
   * @param {Object} config.globalContext - Global application context
   */
  create: ({
    nodeId,
    nodeData,
    updateNodeData,
    getConnectedNodes,
    globalContext = {}
  }) => ({
    nodeId,
    nodeData,
    updateNodeData,
    getConnectedNodes,
    globalContext,
    timestamp: new Date().toISOString()
  })
};

/**
 * Plugin Registry Interface
 */
export const IPluginRegistry = {
  /**
   * Register a plugin
   * @param {string} name - Plugin name
   * @param {INodePlugin} plugin - Plugin instance
   */
  register: (name, plugin) => {
    throw new Error('register method must be implemented');
  },

  /**
   * Unregister a plugin
   * @param {string} name - Plugin name
   */
  unregister: (name) => {
    throw new Error('unregister method must be implemented');
  },

  /**
   * Get a plugin by name
   * @param {string} name - Plugin name
   * @returns {INodePlugin|null}
   */
  get: (name) => {
    throw new Error('get method must be implemented');
  },

  /**
   * List all registered plugins
   * @returns {string[]} Array of plugin names
   */
  list: () => {
    throw new Error('list method must be implemented');
  },

  /**
   * Check if a plugin is registered
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  has: (name) => {
    throw new Error('has method must be implemented');
  },

  /**
   * Get plugin information
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin information
   */
  getInfo: (name) => {
    throw new Error('getInfo method must be implemented');
  }
};