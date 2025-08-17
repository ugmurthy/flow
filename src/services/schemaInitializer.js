/**
 * Schema Initializer
 * Sets up the new node schema system, registers plugins, and provides migration utilities
 */

import pluginRegistry from './pluginRegistry.js';
import nodeDataManager from './nodeDataManager.js';
import llmProcessor from '../plugins/llmProcessor.js';
import dataTransformer from '../plugins/dataTransformer.js';
import { SchemaMigration } from '../types/nodeSchema.js';
import { EnhancedSchemaValidator } from '../utils/schemaValidation.js';

/**
 * Schema System Initializer
 */
export class SchemaInitializer {
  constructor() {
    this.initialized = false;
    this.plugins = new Map();
    this.migrationStats = {
      nodesProcessed: 0,
      nodesMigrated: 0,
      errors: []
    };
  }

  /**
   * Initialize the complete schema system
   * @param {Object} options - Initialization options
   * @param {boolean} options.registerBuiltinPlugins - Whether to register built-in plugins
   * @param {boolean} options.validateOnInit - Whether to validate system on initialization
   * @param {Object} options.pluginConfigs - Plugin configurations
   */
  async initialize(options = {}) {
    const {
      registerBuiltinPlugins = true,
      validateOnInit = true,
      pluginConfigs = {}
    } = options;

    if (this.initialized) {
      console.log('Schema system already initialized');
      return;
    }

    console.log('Initializing Node Schema System...');

    try {
      // Step 1: Initialize plugin registry
      await pluginRegistry.initialize();
      console.log('✓ Plugin registry initialized');

      // Step 2: Initialize node data manager
      await nodeDataManager.initialize();
      console.log('✓ Node data manager initialized');

      // Step 3: Register built-in plugins
      if (registerBuiltinPlugins) {
        await this._registerBuiltinPlugins(pluginConfigs);
        console.log('✓ Built-in plugins registered');
      }

      // Step 4: Validate system if requested
      if (validateOnInit) {
        const validation = await this._validateSystem();
        if (!validation.isValid) {
          console.warn('System validation warnings:', validation.warnings);
        }
        console.log('✓ System validation completed');
      }

      this.initialized = true;
      console.log('🎉 Node Schema System initialized successfully');

      // Emit initialization event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('schemaSystemInitialized', {
          detail: { 
            timestamp: new Date().toISOString(),
            pluginCount: pluginRegistry.list().length
          }
        }));
      }

    } catch (error) {
      console.error('Failed to initialize schema system:', error);
      throw error;
    }
  }

  /**
   * Register built-in plugins
   * @private
   */
  async _registerBuiltinPlugins(pluginConfigs) {
    const plugins = [
      {
        name: 'llm-processor',
        plugin: llmProcessor,
        config: pluginConfigs.llmProcessor || {
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'llama3.2',
          maxTokens: 4096,
          temperature: 0.7
        }
      },
      {
        name: 'data-transformer',
        plugin: dataTransformer,
        config: pluginConfigs.dataTransformer || {
          strategy: 'merge',
          preserveMetadata: true,
          errorHandling: 'skip'
        }
      }
    ];

    for (const { name, plugin, config } of plugins) {
      try {
        await pluginRegistry.register(name, plugin, {
          autoInitialize: true,
          config
        });
        this.plugins.set(name, { plugin, config });
        console.log(`  ✓ Registered plugin: ${name}`);
      } catch (error) {
        console.error(`  ✗ Failed to register plugin ${name}:`, error.message);
      }
    }
  }

  /**
   * Validate the system
   * @private
   */
  async _validateSystem() {
    const warnings = [];
    const errors = [];

    // Check plugin registry
    const registryStats = pluginRegistry.getStats();
    if (registryStats.totalPlugins === 0) {
      warnings.push('No plugins registered');
    }
    if (registryStats.healthyPlugins < registryStats.totalPlugins) {
      warnings.push(`${registryStats.totalPlugins - registryStats.healthyPlugins} plugins are not healthy`);
    }

    // Check node data manager
    const managerStats = nodeDataManager.getStats();
    if (!managerStats.initialized) {
      errors.push('Node data manager not initialized');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        registry: registryStats,
        manager: managerStats
      }
    };
  }

  /**
   * Migrate existing workflow to new schema
   * @param {Array} nodes - Array of React Flow nodes
   * @param {Array} edges - Array of React Flow edges
   * @returns {Object} Migration result
   */
  async migrateWorkflow(nodes, edges) {
    console.log(`Starting migration of ${nodes.length} nodes and ${edges.length} edges...`);
    
    this.migrationStats = {
      nodesProcessed: 0,
      nodesMigrated: 0,
      errors: []
    };

    const migratedNodes = [];
    const migrationReport = [];

    for (const node of nodes) {
      this.migrationStats.nodesProcessed++;
      
      try {
        // Check if node already uses new schema
        const validation = EnhancedSchemaValidator.validateNodeDataTypes(node.data);
        
        if (validation.isValid) {
          // Already in new format
          migratedNodes.push(node);
          migrationReport.push({
            nodeId: node.id,
            status: 'already_migrated',
            message: 'Node already uses new schema'
          });
        } else {
          // Migrate to new format
          const migratedData = SchemaMigration.migrateFromOldFormat(node.data);
          
          // Validate migrated data
          const migratedValidation = EnhancedSchemaValidator.validateNodeDataTypes(migratedData);
          
          if (migratedValidation.isValid) {
            migratedNodes.push({
              ...node,
              data: migratedData
            });
            this.migrationStats.nodesMigrated++;
            migrationReport.push({
              nodeId: node.id,
              status: 'migrated',
              message: 'Successfully migrated to new schema'
            });
          } else {
            // Migration failed validation
            migratedNodes.push(node); // Keep original
            this.migrationStats.errors.push({
              nodeId: node.id,
              error: 'Migration validation failed',
              details: migratedValidation.errors
            });
            migrationReport.push({
              nodeId: node.id,
              status: 'failed',
              message: 'Migration validation failed',
              errors: migratedValidation.errors
            });
          }
        }
      } catch (error) {
        // Migration error
        migratedNodes.push(node); // Keep original
        this.migrationStats.errors.push({
          nodeId: node.id,
          error: error.message,
          details: error.stack
        });
        migrationReport.push({
          nodeId: node.id,
          status: 'error',
          message: error.message
        });
      }
    }

    // Validate the complete migrated workflow
    const workflowValidation = EnhancedSchemaValidator.validateWorkflow(migratedNodes, edges);

    const result = {
      success: this.migrationStats.errors.length === 0,
      stats: this.migrationStats,
      migratedNodes,
      edges, // Edges don't need migration
      migrationReport,
      workflowValidation,
      summary: {
        totalNodes: nodes.length,
        migratedNodes: this.migrationStats.nodesMigrated,
        alreadyMigrated: this.migrationStats.nodesProcessed - this.migrationStats.nodesMigrated - this.migrationStats.errors.length,
        errors: this.migrationStats.errors.length,
        workflowValid: workflowValidation.isValid
      }
    };

    console.log('Migration completed:', result.summary);
    return result;
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      initialized: this.initialized,
      pluginRegistry: pluginRegistry.getStats(),
      nodeDataManager: nodeDataManager.getStats(),
      registeredPlugins: Array.from(this.plugins.keys()),
      migrationStats: this.migrationStats
    };
  }

  /**
   * Register a custom plugin
   * @param {string} name - Plugin name
   * @param {Object} plugin - Plugin instance
   * @param {Object} config - Plugin configuration
   * @param {boolean} autoInitialize - Whether to initialize immediately
   */
  async registerPlugin(name, plugin, config = {}, autoInitialize = true) {
    if (!this.initialized) {
      throw new Error('Schema system not initialized. Call initialize() first.');
    }

    try {
      await pluginRegistry.register(name, plugin, {
        autoInitialize,
        config
      });
      
      this.plugins.set(name, { plugin, config });
      console.log(`Custom plugin '${name}' registered successfully`);
      
      return true;
    } catch (error) {
      console.error(`Failed to register custom plugin '${name}':`, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   * @param {string} name - Plugin name
   */
  async unregisterPlugin(name) {
    try {
      await pluginRegistry.unregister(name);
      this.plugins.delete(name);
      console.log(`Plugin '${name}' unregistered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin '${name}':`, error);
      throw error;
    }
  }

  /**
   * Get plugin information
   * @param {string} name - Plugin name
   */
  getPluginInfo(name) {
    return pluginRegistry.getInfo(name);
  }

  /**
   * List all registered plugins
   */
  listPlugins() {
    return pluginRegistry.getAllInfo();
  }

  /**
   * Cleanup the schema system
   */
  async cleanup() {
    if (!this.initialized) {
      return;
    }

    console.log('Cleaning up schema system...');

    try {
      // Cleanup node data manager
      await nodeDataManager.cleanup();
      
      // Cleanup plugin registry
      await pluginRegistry.cleanup();
      
      // Clear local state
      this.plugins.clear();
      this.migrationStats = {
        nodesProcessed: 0,
        nodesMigrated: 0,
        errors: []
      };
      
      this.initialized = false;
      console.log('Schema system cleaned up successfully');
    } catch (error) {
      console.error('Error during schema system cleanup:', error);
      throw error;
    }
  }
}

// Create singleton instance
const schemaInitializer = new SchemaInitializer();

// Export singleton and class
export default schemaInitializer;

/**
 * Convenience functions for common operations
 */
export const SchemaUtils = {
  /**
   * Quick initialization with default settings
   */
  quickInit: async () => {
    return await schemaInitializer.initialize({
      registerBuiltinPlugins: true,
      validateOnInit: true
    });
  },

  /**
   * Initialize with custom plugin configurations
   * @param {Object} pluginConfigs - Plugin configurations
   */
  initWithConfig: async (pluginConfigs) => {
    return await schemaInitializer.initialize({
      registerBuiltinPlugins: true,
      validateOnInit: true,
      pluginConfigs
    });
  },

  /**
   * Migrate a workflow and return the result
   * @param {Array} nodes - Nodes to migrate
   * @param {Array} edges - Edges (passed through)
   */
  migrateWorkflow: async (nodes, edges) => {
    if (!schemaInitializer.initialized) {
      await schemaInitializer.initialize();
    }
    return await schemaInitializer.migrateWorkflow(nodes, edges);
  },

  /**
   * Get current system status
   */
  getStatus: () => {
    return schemaInitializer.getSystemStatus();
  }
};