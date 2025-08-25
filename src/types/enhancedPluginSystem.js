/**
 * Enhanced Plugin System for Phase 9
 * Implements multi-connection support, resource management, and advanced aggregation strategies
 * Based on COMPREHENSIVE_IMPLEMENTATION_PLAN.md Phase 9 specifications
 */

import { BasePlugin, ProcessingInput, ProcessingOutput, ValidationResult } from './pluginSystem.js';

/**
 * Enhanced Plugin Interface
 * Extends base plugin with multi-connection support and aggregation strategies
 */
export const IEnhancedPlugin = {
  /**
   * Check if plugin supports multiple inputs
   * @returns {boolean}
   */
  supportsMultipleInputs: () => {
    throw new Error('supportsMultipleInputs method must be implemented');
  },

  /**
   * Get supported input aggregation strategies
   * @returns {string[]} Array of supported strategies
   */
  getInputAggregationStrategies: () => {
    throw new Error('getInputAggregationStrategies method must be implemented');
  },

  /**
   * Process multiple connections with aggregation
   * @param {Map<string, ProcessingInput[]>} connections - Map of connection ID to inputs
   * @param {Object} context - Processing context
   * @returns {Promise<ProcessingOutput>}
   */
  processConnections: async (connections, context) => {
    throw new Error('processConnections method must be implemented');
  },

  /**
   * Get resource requirements for this plugin
   * @returns {Object} Resource requirements
   */
  getResourceRequirements: () => {
    throw new Error('getResourceRequirements method must be implemented');
  },

  /**
   * Validate environment compatibility
   * @returns {ValidationResult}
   */
  validateEnvironment: () => {
    throw new Error('validateEnvironment method must be implemented');
  }
};

/**
 * Enhanced Plugin Base Class
 * Provides multi-connection support and resource management
 */
export class EnhancedPlugin extends BasePlugin {
  constructor(name, version = '1.0.0', description = '', author = '') {
    super(name, version, description, author);
    
    this.multiConnectionSupport = true;
    this.supportedAggregationStrategies = ['merge', 'array', 'priority', 'custom'];
    this.resourceRequirements = {
      maxMemory: '1GB',
      maxCPU: '50%',
      maxDiskSpace: '100MB',
      maxNetworkRequests: 1000,
      requiredAPIs: [],
      environmentVariables: []
    };
  }

  /**
   * Check if plugin supports multiple inputs
   */
  supportsMultipleInputs() {
    return this.multiConnectionSupport;
  }

  /**
   * Get supported input aggregation strategies
   */
  getInputAggregationStrategies() {
    return [...this.supportedAggregationStrategies];
  }

  /**
   * Process multiple connections with aggregation
   */
  async processConnections(connections, context = {}) {
    if (!this.initialized) {
      throw new Error(`Enhanced plugin ${this.name} is not initialized`);
    }

    const startTime = Date.now();
    
    try {
      // Convert connections Map to array of inputs
      const allInputs = [];
      const connectionMetadata = {};
      
      for (const [connectionId, inputs] of connections) {
        allInputs.push(...inputs);
        connectionMetadata[connectionId] = {
          inputCount: inputs.length,
          totalSize: inputs.reduce((sum, input) => sum + (input.meta.dataSize || 0), 0)
        };
      }

      // Apply aggregation strategy
      const aggregationStrategy = context.aggregationStrategy || 'merge';
      const aggregatedInputs = await this._aggregateInputs(allInputs, aggregationStrategy, context);

      // Process aggregated inputs
      const result = await this._doProcessConnections(aggregatedInputs, context, connectionMetadata);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this._updateConnectionMetrics(processingTime, connections.size, allInputs.length, true);

      // Add processing metadata
      if (result.meta) {
        result.meta.connectionCount = connections.size;
        result.meta.totalInputs = allInputs.length;
        result.meta.aggregationStrategy = aggregationStrategy;
        result.meta.processingTime = processingTime;
      }

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateConnectionMetrics(processingTime, connections.size, 0, false);
      
      this.status.lastError = error.message;
      return ProcessingOutput.error(error, null, {}, {
        processingTime,
        startTime,
        endTime: Date.now(),
        connectionCount: connections.size
      });
    }
  }

  /**
   * Get resource requirements
   */
  getResourceRequirements() {
    return { ...this.resourceRequirements };
  }

  /**
   * Validate environment compatibility
   */
  validateEnvironment() {
    const errors = [];
    const warnings = [];

    console.log('[DEBUG] validateEnvironment - resourceRequirements:', this.resourceRequirements);

    // Check memory (simplified check)
    if (typeof performance !== 'undefined' && performance.memory) {
      const memoryInfo = performance.memory;
      const availableMemory = memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize;
      const requiredMemory = this._parseMemoryString(this.resourceRequirements.maxMemory);
      
      if (availableMemory < requiredMemory) {
        warnings.push(`Low memory available. Required: ${this.resourceRequirements.maxMemory}`);
      }
    }

    // Check required APIs - ensure it's an array
    const requiredAPIs = this.resourceRequirements.requiredAPIs || [];
    console.log('[DEBUG] requiredAPIs:', requiredAPIs, 'isArray:', Array.isArray(requiredAPIs));
    
    if (Array.isArray(requiredAPIs)) {
      for (const api of requiredAPIs) {
        if (typeof window !== 'undefined' && !window[api]) {
          errors.push(`Required API not available: ${api}`);
        }
      }
    }

    // Check environment variables (in Node.js context) - ensure it's an array
    const environmentVariables = this.resourceRequirements.environmentVariables || [];
    if (typeof process !== 'undefined' && process.env && Array.isArray(environmentVariables)) {
      for (const envVar of environmentVariables) {
        if (!process.env[envVar]) {
          warnings.push(`Environment variable not set: ${envVar}`);
        }
      }
    }

    return errors.length === 0
      ? (warnings.length > 0 ? ValidationResult.warning(warnings) : ValidationResult.success())
      : ValidationResult.error(errors);
  }

  /**
   * Enhanced capabilities including multi-connection support
   */
  getCapabilities() {
    const baseCapabilities = super.getCapabilities();
    return [
      ...baseCapabilities,
      'multi-connection-processing',
      'input-aggregation',
      'resource-monitoring',
      'environment-validation'
    ];
  }

  /**
   * Enhanced status including connection metrics
   */
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      connectionMetrics: this.status.connectionMetrics || {
        totalConnections: 0,
        averageConnectionSize: 0,
        totalConnectionsProcessed: 0,
        connectionErrors: 0
      },
      resourceUsage: this._getCurrentResourceUsage(),
      supportedStrategies: this.supportedAggregationStrategies
    };
  }

  /**
   * Aggregate inputs using specified strategy
   * @protected
   */
  async _aggregateInputs(inputs, strategy, context) {
    switch (strategy) {
      case 'merge':
        return this._aggregateMerge(inputs);
      case 'array':
        return this._aggregateToArray(inputs);
      case 'priority':
        return this._aggregateByPriority(inputs);
      case 'latest':
        return this._aggregateLatest(inputs);
      case 'custom':
        return this._aggregateCustom(inputs, context);
      default:
        return this._aggregateMerge(inputs);
    }
  }

  /**
   * Merge aggregation strategy
   * @protected
   */
  _aggregateMerge(inputs) {
    if (inputs.length === 0) return [];
    if (inputs.length === 1) return inputs;

    // Combine all data into merged objects
    const mergedData = {};
    const combinedMeta = {
      sources: [],
      timestamp: new Date().toISOString(),
      aggregationStrategy: 'merge'
    };

    for (const input of inputs) {
      // Merge data
      if (typeof input.data === 'object' && input.data !== null) {
        Object.assign(mergedData, input.data);
      }
      
      // Collect metadata
      combinedMeta.sources.push({
        sourceId: input.sourceId,
        timestamp: input.meta.timestamp,
        dataType: input.meta.dataType
      });
    }

    return [ProcessingInput.create({
      sourceId: 'aggregated',
      data: mergedData,
      meta: combinedMeta
    })];
  }

  /**
   * Array aggregation strategy
   * @protected
   */
  _aggregateToArray(inputs) {
    if (inputs.length === 0) return [];
    
    const arrayData = inputs.map(input => input.data);
    const combinedMeta = {
      sources: inputs.map(input => ({
        sourceId: input.sourceId,
        timestamp: input.meta.timestamp
      })),
      timestamp: new Date().toISOString(),
      aggregationStrategy: 'array',
      itemCount: inputs.length
    };

    return [ProcessingInput.create({
      sourceId: 'aggregated',
      data: arrayData,
      meta: combinedMeta
    })];
  }

  /**
   * Priority-based aggregation strategy
   * @protected
   */
  _aggregateByPriority(inputs) {
    if (inputs.length === 0) return [];
    if (inputs.length === 1) return inputs;

    // Sort by priority (higher priority first)
    const prioritized = inputs.sort((a, b) => {
      const aPriority = a.meta.priority || 5;
      const bPriority = b.meta.priority || 5;
      return bPriority - aPriority;
    });

    // Take the highest priority input and merge others
    const primaryInput = prioritized[0];
    const secondaryInputs = prioritized.slice(1);

    const mergedData = { ...primaryInput.data };
    
    // Merge lower priority data
    for (const input of secondaryInputs) {
      if (typeof input.data === 'object' && input.data !== null) {
        // Only merge if property doesn't exist in higher priority data
        for (const [key, value] of Object.entries(input.data)) {
          if (!(key in mergedData)) {
            mergedData[key] = value;
          }
        }
      }
    }

    return [ProcessingInput.create({
      sourceId: primaryInput.sourceId,
      data: mergedData,
      meta: {
        ...primaryInput.meta,
        aggregationStrategy: 'priority',
        mergedSources: secondaryInputs.length
      }
    })];
  }

  /**
   * Latest timestamp aggregation strategy
   * @protected
   */
  _aggregateLatest(inputs) {
    if (inputs.length === 0) return [];
    if (inputs.length === 1) return inputs;

    // Find the input with the latest timestamp
    let latestInput = inputs[0];
    let latestTime = new Date(inputs[0].meta.timestamp).getTime();

    for (let i = 1; i < inputs.length; i++) {
      const currentTime = new Date(inputs[i].meta.timestamp).getTime();
      if (currentTime > latestTime) {
        latestTime = currentTime;
        latestInput = inputs[i];
      }
    }

    return [latestInput]; // Return only the latest
  }

  /**
   * Custom aggregation strategy (override in subclasses)
   * @protected
   */
  async _aggregateCustom(inputs, context) {
    // Default implementation - subclasses should override
    return this._aggregateMerge(inputs);
  }

  /**
   * Process aggregated connections (override in subclasses)
   * @protected
   */
  async _doProcessConnections(aggregatedInputs, context, connectionMetadata) {
    // Default implementation delegates to regular process method
    return await this._doProcess(aggregatedInputs, context.config || {}, context);
  }

  /**
   * Update connection-specific metrics
   * @private
   */
  _updateConnectionMetrics(processingTime, connectionCount, inputCount, success) {
    if (!this.status.connectionMetrics) {
      this.status.connectionMetrics = {
        totalConnections: 0,
        averageConnectionSize: 0,
        totalConnectionsProcessed: 0,
        connectionErrors: 0,
        totalProcessingTime: 0
      };
    }

    const metrics = this.status.connectionMetrics;
    metrics.totalConnectionsProcessed++;
    metrics.totalConnections += connectionCount;
    metrics.totalProcessingTime += processingTime;
    
    if (connectionCount > 0) {
      metrics.averageConnectionSize = (metrics.averageConnectionSize * (metrics.totalConnectionsProcessed - 1) + inputCount) / metrics.totalConnectionsProcessed;
    }

    if (!success) {
      metrics.connectionErrors++;
    }
  }

  /**
   * Get current resource usage
   * @private
   */
  _getCurrentResourceUsage() {
    const usage = {
      timestamp: new Date().toISOString(),
      memory: null,
      cpu: null,
      network: null
    };

    // Memory usage (browser only)
    if (typeof performance !== 'undefined' && performance.memory) {
      const memInfo = performance.memory;
      usage.memory = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      };
    }

    return usage;
  }

  /**
   * Parse memory string to bytes
   * @private
   */
  _parseMemoryString(memoryStr) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = memoryStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) return 0;

    const [, value, unit] = match;
    return parseFloat(value) * (units[unit.toUpperCase()] || 1);
  }
}

/**
 * Plugin Resource Manager
 * Monitors and manages plugin resource usage
 */
export class PluginResourceManager {
  constructor() {
    this.resourceLimits = new Map();
    this.resourceUsage = new Map();
    this.monitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Set resource limits for a plugin
   */
  setResourceLimits(pluginName, limits) {
    this.resourceLimits.set(pluginName, {
      maxMemory: limits.maxMemory || '1GB',
      maxCPU: limits.maxCPU || '50%',
      maxDiskSpace: limits.maxDiskSpace || '100MB',
      maxNetworkRequests: limits.maxNetworkRequests || 1000,
      timeout: limits.timeout || 30000,
      ...limits
    });
  }

  /**
   * Get resource requirements for a plugin
   */
  getResourceRequirements(plugin) {
    if (plugin && typeof plugin.getResourceRequirements === 'function') {
      return plugin.getResourceRequirements();
    }

    return {
      maxMemory: '1GB',
      maxCPU: '50%',
      maxDiskSpace: '100MB',
      maxNetworkRequests: 1000,
      requiredAPIs: [],
      environmentVariables: []
    };
  }

  /**
   * Validate environment for a plugin
   */
  validateEnvironment(plugin) {
    if (plugin && typeof plugin.validateEnvironment === 'function') {
      return plugin.validateEnvironment();
    }

    // Basic validation
    const warnings = [];
    
    if (typeof performance === 'undefined') {
      warnings.push('Performance monitoring not available');
    }

    return warnings.length > 0 
      ? ValidationResult.warning(warnings) 
      : ValidationResult.success();
  }

  /**
   * Start monitoring resource usage
   */
  startMonitoring(interval = 5000) {
    if (this.monitoring) return;

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this._collectResourceUsage();
    }, interval);

    console.log('Plugin resource monitoring started');
  }

  /**
   * Stop monitoring resource usage
   */
  stopMonitoring() {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Plugin resource monitoring stopped');
  }

  /**
   * Get resource usage for a plugin
   */
  getResourceUsage(pluginName) {
    return this.resourceUsage.get(pluginName) || null;
  }

  /**
   * Get all resource usage data
   */
  getAllResourceUsage() {
    const usage = {};
    for (const [pluginName, data] of this.resourceUsage) {
      usage[pluginName] = data;
    }
    return usage;
  }

  /**
   * Check if resource limits are exceeded
   */
  checkResourceLimits(pluginName) {
    const limits = this.resourceLimits.get(pluginName);
    const usage = this.resourceUsage.get(pluginName);

    if (!limits || !usage) {
      return { exceeded: false, violations: [] };
    }

    const violations = [];

    // Check memory usage
    if (usage.memory && limits.maxMemory) {
      const maxMemoryBytes = this._parseMemoryString(limits.maxMemory);
      if (usage.memory.used > maxMemoryBytes) {
        violations.push({
          resource: 'memory',
          limit: limits.maxMemory,
          current: `${Math.round(usage.memory.used / (1024 * 1024))}MB`,
          exceeded: true
        });
      }
    }

    return {
      exceeded: violations.length > 0,
      violations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Collect current resource usage
   * @private
   */
  _collectResourceUsage() {
    const timestamp = new Date().toISOString();
    
    // Basic resource collection (browser environment)
    if (typeof performance !== 'undefined' && performance.memory) {
      const memInfo = performance.memory;
      
      // Store global resource usage
      this.resourceUsage.set('global', {
        timestamp,
        memory: {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit,
          percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
        }
      });
    }
  }

  /**
   * Parse memory string to bytes
   * @private
   */
  _parseMemoryString(memoryStr) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = memoryStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) return 0;

    const [, value, unit] = match;
    return parseFloat(value) * (units[unit.toUpperCase()] || 1);
  }

  /**
   * Cleanup resource manager
   */
  cleanup() {
    this.stopMonitoring();
    this.resourceLimits.clear();
    this.resourceUsage.clear();
  }
}

// Export singleton instance
export const pluginResourceManager = new PluginResourceManager();

/**
 * Multi-Connection Plugin Adapter
 * Wraps regular plugins to support multi-connection processing
 */
export class MultiConnectionPluginAdapter extends EnhancedPlugin {
  constructor(basePlugin) {
    // Create enhanced name based on base plugin name pattern
    const enhancedName = basePlugin.name.startsWith('test-')
      ? `enhanced-${basePlugin.name}`
      : `enhanced-${basePlugin.name}`;
    
    console.log('[DEBUG] MultiConnectionPluginAdapter - basePlugin.name:', basePlugin.name, 'enhancedName:', enhancedName);
    
    super(
      enhancedName,
      basePlugin.version,
      `Enhanced version of ${basePlugin.description}`,
      basePlugin.author
    );

    this.basePlugin = basePlugin;
    this.multiConnectionSupport = true;
  }

  /**
   * Initialize the adapted plugin
   */
  async _doInitialize(config) {
    if (this.basePlugin.initialize) {
      await this.basePlugin.initialize(config);
    }
  }

  /**
   * Process connections using base plugin
   */
  async _doProcessConnections(aggregatedInputs, context, connectionMetadata) {
    if (this.basePlugin.process) {
      return await this.basePlugin.process(aggregatedInputs, context.config || {}, context);
    }
    
    throw new Error('Base plugin does not implement process method');
  }

  /**
   * Get capabilities from base plugin
   */
  getCapabilities() {
    const baseCapabilities = this.basePlugin.getCapabilities ? 
      this.basePlugin.getCapabilities() : 
      ['data-processing'];
    
    return [
      ...baseCapabilities,
      'multi-connection-processing',
      'input-aggregation'
    ];
  }

  /**
   * Get configuration schema from base plugin
   */
  getConfigSchema() {
    const baseSchema = this.basePlugin.getConfigSchema ? 
      this.basePlugin.getConfigSchema() : 
      { type: 'object', properties: {}, additionalProperties: true };

    // Add multi-connection specific properties
    baseSchema.properties.aggregationStrategy = {
      type: 'string',
      enum: ['merge', 'array', 'priority', 'latest', 'custom'],
      default: 'merge',
      description: 'Strategy for aggregating multiple inputs'
    };

    return baseSchema;
  }

  /**
   * Validate configuration using base plugin
   */
  validateConfig(config) {
    if (this.basePlugin.validateConfig) {
      return this.basePlugin.validateConfig(config);
    }
    
    return ValidationResult.success();
  }

  /**
   * Cleanup the adapted plugin
   */
  async _doCleanup() {
    if (this.basePlugin.cleanup) {
      await this.basePlugin.cleanup();
    }
  }
}