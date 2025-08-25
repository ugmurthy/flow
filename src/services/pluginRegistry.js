/**
 * Plugin Registry Implementation
 * Manages registration, lifecycle, and access to plugins
 */

import { IPluginRegistry, ValidationResult } from '../types/pluginSystem.js';
import { EnhancedPlugin, pluginResourceManager, MultiConnectionPluginAdapter } from '../types/enhancedPluginSystem.js';

/**
 * Plugin Registry - Singleton implementation
 */
class PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.pluginInfo = new Map();
    this.initialized = false;
    this.resourceManager = pluginResourceManager;
    this.enhancedPlugins = new Map(); // Store enhanced plugin wrappers
  }

  /**
   * Initialize the plugin registry
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('Initializing Plugin Registry...');
    this.initialized = true;
  }

  /**
   * Register a plugin
   * @param {string} name - Plugin name
   * @param {INodePlugin} plugin - Plugin instance
   * @param {Object} options - Registration options
   * @param {boolean} options.autoInitialize - Whether to initialize plugin immediately
   * @param {Object} options.config - Initial plugin configuration
   */
  async register(name, plugin, options = {}) {
    const { autoInitialize = false, config = {} } = options;

    // Validate plugin name
    if (!name || typeof name !== 'string') {
      throw new Error('Plugin name must be a non-empty string');
    }

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    // Validate plugin interface
    const validation = this._validatePlugin(plugin);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Store plugin
      this.plugins.set(name, plugin);
      
      // Store plugin information
      this.pluginInfo.set(name, {
        name: plugin.name || name,
        version: plugin.version || '1.0.0',
        description: plugin.description || '',
        author: plugin.author || '',
        capabilities: plugin.getCapabilities ? plugin.getCapabilities() : [],
        configSchema: plugin.getConfigSchema ? plugin.getConfigSchema() : {},
        registeredAt: new Date().toISOString(),
        initialized: false,
        status: plugin.getStatus ? plugin.getStatus() : { healthy: false },
        isEnhanced: plugin instanceof EnhancedPlugin,
        supportsMultipleInputs: plugin.supportsMultipleInputs ? plugin.supportsMultipleInputs() : false,
        aggregationStrategies: plugin.getInputAggregationStrategies ? plugin.getInputAggregationStrategies() : [],
        resourceRequirements: plugin.getResourceRequirements ? plugin.getResourceRequirements() : null
      });

      // Set up resource monitoring for enhanced plugins
      if (plugin instanceof EnhancedPlugin && plugin.getResourceRequirements) {
        const requirements = plugin.getResourceRequirements();
        this.resourceManager.setResourceLimits(name, requirements);
      }

      // Auto-initialize if requested
      if (autoInitialize) {
        await this._initializePlugin(name, config);
      }

      console.log(`Plugin '${name}' registered successfully`);
      return true;
    } catch (error) {
      // Cleanup on failure
      this.plugins.delete(name);
      this.pluginInfo.delete(name);
      throw new Error(`Failed to register plugin '${name}': ${error.message}`);
    }
  }

  /**
   * Unregister a plugin
   * @param {string} name - Plugin name
   */
  async unregister(name) {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is not registered`);
    }

    try {
      const plugin = this.plugins.get(name);
      const info = this.pluginInfo.get(name);

      // Cleanup plugin if initialized
      if (info.initialized && plugin.cleanup) {
        await plugin.cleanup();
      }

      // Remove from registry
      this.plugins.delete(name);
      this.pluginInfo.delete(name);

      console.log(`Plugin '${name}' unregistered successfully`);
      return true;
    } catch (error) {
      throw new Error(`Failed to unregister plugin '${name}': ${error.message}`);
    }
  }

  /**
   * Get a plugin by name
   * @param {string} name - Plugin name
   * @returns {INodePlugin|null}
   */
  get(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * List all registered plugins
   * @returns {string[]} Array of plugin names
   */
  list() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if a plugin is registered
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  has(name) {
    return this.plugins.has(name);
  }

  /**
   * Get plugin information
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin information
   */
  getInfo(name) {
    const info = this.pluginInfo.get(name);
    if (!info) {
      return null;
    }

    // Update status from plugin if available
    const plugin = this.plugins.get(name);
    if (plugin && plugin.getStatus) {
      info.status = plugin.getStatus();
    }

    return { ...info };
  }

  /**
   * Get all plugin information
   * @returns {Object[]} Array of plugin information
   */
  getAllInfo() {
    return this.list().map(name => this.getInfo(name)).filter(Boolean);
  }

  /**
   * Initialize a plugin
   * @param {string} name - Plugin name
   * @param {Object} config - Plugin configuration
   */
  async initializePlugin(name, config = {}) {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is not registered`);
    }

    return await this._initializePlugin(name, config);
  }

  /**
   * Process data using a plugin
   * @param {string} pluginName - Plugin name
   * @param {ProcessingInput[]} inputs - Processing inputs
   * @param {Object} config - Processing configuration
   * @param {Object} context - Processing context
   * @returns {Promise<ProcessingOutput>}
   */
  async processWithPlugin(pluginName, inputs, config = {}, context = {}) {
    const plugin = this.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    const info = this.getInfo(pluginName);
    if (!info.initialized) {
      throw new Error(`Plugin '${pluginName}' is not initialized`);
    }

    if (!plugin.process) {
      throw new Error(`Plugin '${pluginName}' does not implement process method`);
    }

    return await plugin.process(inputs, config, context);
  }

  /**
   * Process multiple connections using an enhanced plugin
   * @param {string} pluginName - Plugin name
   * @param {Map<string, ProcessingInput[]>} connections - Map of connection ID to inputs
   * @param {Object} context - Processing context
   * @returns {Promise<ProcessingOutput>}
   */
  async processConnectionsWithPlugin(pluginName, connections, context = {}) {
    const plugin = this.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    const info = this.getInfo(pluginName);
    if (!info.initialized) {
      throw new Error(`Plugin '${pluginName}' is not initialized`);
    }

    // Check if plugin supports multi-connection processing
    if (plugin.processConnections) {
      return await plugin.processConnections(connections, context);
    }

    // If plugin doesn't support multi-connection, try to adapt it
    if (!info.supportsMultipleInputs) {
      const adaptedPlugin = this.getOrCreateEnhancedWrapper(pluginName);
      return await adaptedPlugin.processConnections(connections, context);
    }

    throw new Error(`Plugin '${pluginName}' does not support multi-connection processing`);
  }

  /**
   * Get plugins by capability
   * @param {string} capability - Capability to search for
   * @returns {string[]} Array of plugin names that have the capability
   */
  getPluginsByCapability(capability) {
    const matchingPlugins = [];
    
    for (const [name, info] of this.pluginInfo) {
      if (info.capabilities.includes(capability)) {
        matchingPlugins.push(name);
      }
    }
    
    return matchingPlugins;
  }

  /**
   * Get plugins by category
   * @param {string} category - Category to filter by
   * @returns {string[]} Array of plugin names in the category
   */
  getPluginsByCategory(category) {
    // This could be enhanced to support plugin categories
    return this.list().filter(name => {
      const info = this.getInfo(name);
      return info.capabilities.some(cap => cap.includes(category));
    });
  }

  /**
   * Validate plugin configuration
   * @param {string} pluginName - Plugin name
   * @param {Object} config - Configuration to validate
   * @returns {ValidationResult}
   */
  validatePluginConfig(pluginName, config) {
    const plugin = this.get(pluginName);
    if (!plugin) {
      return ValidationResult.error([`Plugin '${pluginName}' is not registered`]);
    }

    if (!plugin.validateConfig) {
      return ValidationResult.success();
    }

    return plugin.validateConfig(config);
  }

  /**
   * Get or create an enhanced wrapper for a regular plugin
   * @param {string} pluginName - Plugin name
   * @returns {EnhancedPlugin} Enhanced plugin wrapper
   */
  getOrCreateEnhancedWrapper(pluginName) {
    console.log('[DEBUG] getOrCreateEnhancedWrapper called for:', pluginName);
    
    if (this.enhancedPlugins.has(pluginName)) {
      const existing = this.enhancedPlugins.get(pluginName);
      console.log('[DEBUG] Returning existing enhanced wrapper, initialized:', existing.initialized);
      return existing;
    }

    const basePlugin = this.get(pluginName);
    if (!basePlugin) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    console.log('[DEBUG] Creating new MultiConnectionPluginAdapter for:', pluginName);
    const enhancedWrapper = new MultiConnectionPluginAdapter(basePlugin);
    
    // Initialize the adapter if the base plugin is initialized
    const baseInfo = this.getInfo(pluginName);
    if (baseInfo && baseInfo.initialized) {
      console.log('[DEBUG] Auto-initializing adapter since base plugin is initialized');
      enhancedWrapper.initialized = true;
      enhancedWrapper.status.initialized = true;
      enhancedWrapper.status.healthy = true;
    }
    
    this.enhancedPlugins.set(pluginName, enhancedWrapper);
    console.log('[DEBUG] Created and stored enhanced wrapper, initialized:', enhancedWrapper.initialized);
    
    return enhancedWrapper;
  }

  /**
   * Get plugins that support multi-connection processing
   * @returns {string[]} Array of plugin names
   */
  getMultiConnectionPlugins() {
    const multiConnectionPlugins = [];
    
    for (const [name, info] of this.pluginInfo) {
      if (info.supportsMultipleInputs || info.isEnhanced) {
        multiConnectionPlugins.push(name);
      }
    }
    
    return multiConnectionPlugins;
  }

  /**
   * Get plugins by aggregation strategy support
   * @param {string} strategy - Aggregation strategy
   * @returns {string[]} Array of plugin names
   */
  getPluginsByAggregationStrategy(strategy) {
    const matchingPlugins = [];
    
    for (const [name, info] of this.pluginInfo) {
      if (info.aggregationStrategies.includes(strategy)) {
        matchingPlugins.push(name);
      }
    }
    
    return matchingPlugins;
  }

  /**
   * Check resource requirements for all plugins
   * @returns {Object} Resource check results
   */
  checkAllResourceRequirements() {
    const results = {};
    
    for (const name of this.list()) {
      const plugin = this.get(name);
      if (plugin instanceof EnhancedPlugin) {
        const validation = plugin.validateEnvironment();
        const limits = this.resourceManager.checkResourceLimits(name);
        
        results[name] = {
          environmentValidation: validation,
          resourceLimits: limits,
          requirements: plugin.getResourceRequirements()
        };
      }
    }
    
    return results;
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    const plugins = this.getAllInfo();
    const initialized = plugins.filter(p => p.initialized).length;
    const healthy = plugins.filter(p => p.status.healthy).length;
    const enhanced = plugins.filter(p => p.isEnhanced).length;
    const multiConnection = plugins.filter(p => p.supportsMultipleInputs).length;
    
    const capabilityCount = {};
    const strategyCount = {};
    
    plugins.forEach(plugin => {
      plugin.capabilities.forEach(cap => {
        capabilityCount[cap] = (capabilityCount[cap] || 0) + 1;
      });
      
      plugin.aggregationStrategies.forEach(strategy => {
        strategyCount[strategy] = (strategyCount[strategy] || 0) + 1;
      });
    });

    return {
      totalPlugins: plugins.length,
      initializedPlugins: initialized,
      healthyPlugins: healthy,
      enhancedPlugins: enhanced,
      multiConnectionPlugins: multiConnection,
      capabilityDistribution: capabilityCount,
      aggregationStrategyDistribution: strategyCount,
      registryInitialized: this.initialized,
      resourceMonitoring: this.resourceManager.monitoring
    };
  }

  /**
   * Cleanup all plugins
   */
  async cleanup() {
    console.log('[DEBUG] Starting plugin registry cleanup...');
    const cleanupPromises = [];
    
    // Cleanup regular plugins
    for (const [name, plugin] of this.plugins) {
      const info = this.pluginInfo.get(name);
      if (info.initialized && plugin.cleanup) {
        cleanupPromises.push(
          plugin.cleanup().catch(error => {
            console.error(`Error cleaning up plugin '${name}':`, error);
          })
        );
      }
    }

    // Cleanup enhanced plugin wrappers
    console.log('[DEBUG] Cleaning up enhanced plugin wrappers:', this.enhancedPlugins.size);
    for (const [name, enhancedPlugin] of this.enhancedPlugins) {
      if (enhancedPlugin.cleanup) {
        cleanupPromises.push(
          enhancedPlugin.cleanup().catch(error => {
            console.error(`Error cleaning up enhanced plugin wrapper '${name}':`, error);
          })
        );
      }
    }

    await Promise.all(cleanupPromises);
    
    // Cleanup resource manager
    console.log('[DEBUG] Cleaning up resource manager...');
    if (this.resourceManager && this.resourceManager.cleanup) {
      await this.resourceManager.cleanup();
    }
    
    this.plugins.clear();
    this.pluginInfo.clear();
    this.enhancedPlugins.clear();
    this.initialized = false;
    
    console.log('[DEBUG] Plugin registry cleaned up successfully');
  }

  /**
   * Private method to initialize a plugin
   * @private
   */
  async _initializePlugin(name, config) {
    const plugin = this.plugins.get(name);
    const info = this.pluginInfo.get(name);

    if (info.initialized) {
      console.warn(`Plugin '${name}' is already initialized`);
      return true;
    }

    try {
      if (plugin.initialize) {
        await plugin.initialize(config);
      }
      
      info.initialized = true;
      info.initializedAt = new Date().toISOString();
      info.config = config;
      
      console.log(`Plugin '${name}' initialized successfully`);
      return true;
    } catch (error) {
      info.initialized = false;
      throw new Error(`Failed to initialize plugin '${name}': ${error.message}`);
    }
  }

  /**
   * Private method to validate plugin interface
   * @private
   */
  _validatePlugin(plugin) {
    const errors = [];

    if (!plugin) {
      errors.push('Plugin is required');
      return ValidationResult.error(errors);
    }

    // Check required methods (validateConfig is optional for test scenarios)
    const requiredMethods = ['getCapabilities', 'getConfigSchema'];
    requiredMethods.forEach(method => {
      if (typeof plugin[method] !== 'function') {
        errors.push(`Plugin must implement ${method} method`);
      }
    });

    // validateConfig is preferred but not required
    if (plugin.validateConfig !== undefined && typeof plugin.validateConfig !== 'function') {
      errors.push('Plugin validateConfig method must be a function if provided');
    }

    // Check optional but important methods
    if (plugin.process && typeof plugin.process !== 'function') {
      errors.push('Plugin process method must be a function');
    }

    if (plugin.initialize && typeof plugin.initialize !== 'function') {
      errors.push('Plugin initialize method must be a function');
    }

    if (plugin.cleanup && typeof plugin.cleanup !== 'function') {
      errors.push('Plugin cleanup method must be a function');
    }

    return errors.length === 0 ? ValidationResult.success() : ValidationResult.error(errors);
  }
}

// Create singleton instance
const pluginRegistry = new PluginRegistry();

// Export singleton instance and class
export default pluginRegistry;

/**
 * Plugin Registry Helper Functions
 */
export const PluginRegistryHelpers = {
  /**
   * Register multiple plugins at once
   * @param {Array} plugins - Array of {name, plugin, options} objects
   */
  async registerMultiple(plugins) {
    const results = [];
    
    for (const { name, plugin, options } of plugins) {
      try {
        await pluginRegistry.register(name, plugin, options);
        results.push({ name, success: true });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    return results;
  },

  /**
   * Initialize all registered plugins
   * @param {Object} globalConfig - Global configuration for all plugins
   */
  async initializeAll(globalConfig = {}) {
    const plugins = pluginRegistry.list();
    const results = [];
    
    for (const name of plugins) {
      try {
        const info = pluginRegistry.getInfo(name);
        if (!info.initialized) {
          await pluginRegistry.initializePlugin(name, globalConfig[name] || {});
          results.push({ name, success: true });
        }
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    return results;
  },

  /**
   * Get plugin recommendations based on capabilities
   * @param {string[]} requiredCapabilities - Required capabilities
   * @returns {Object[]} Array of recommended plugins with scores
   */
  getRecommendations(requiredCapabilities) {
    const recommendations = [];
    
    for (const name of pluginRegistry.list()) {
      const info = pluginRegistry.getInfo(name);
      const matchingCapabilities = info.capabilities.filter(cap => 
        requiredCapabilities.includes(cap)
      );
      
      if (matchingCapabilities.length > 0) {
        const score = matchingCapabilities.length / requiredCapabilities.length;
        recommendations.push({
          name,
          score,
          matchingCapabilities,
          info
        });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score);
  }
};