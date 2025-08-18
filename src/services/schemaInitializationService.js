/**
 * Schema Initialization Service
 * Handles the initialization of the schema system with proper configuration
 */

import schemaInitializer from './schemaInitializer.js';
import { SCHEMA_CONFIG } from '../config/appConstants.js';

/**
 * Initializes the schema system with default configuration
 * @param {Object} customConfig - Optional custom configuration to override defaults
 * @returns {Promise<void>}
 */
export const initializeSchemaSystem = async (customConfig = {}) => {
  try {
    const config = {
      ...SCHEMA_CONFIG,
      ...customConfig,
      pluginConfigs: {
        ...SCHEMA_CONFIG.pluginConfigs,
        ...customConfig.pluginConfigs
      }
    };

    await schemaInitializer.initialize(config);
    console.log('Schema system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize schema system:', error);
    throw error;
  }
};

/**
 * Initializes the schema system with custom plugin configurations
 * @param {Object} pluginConfigs - Custom plugin configurations
 * @returns {Promise<void>}
 */
export const initializeWithCustomPlugins = async (pluginConfigs) => {
  return initializeSchemaSystem({ pluginConfigs });
};

/**
 * Initializes the schema system in development mode with additional logging
 * @returns {Promise<void>}
 */
export const initializeForDevelopment = async () => {
  const devConfig = {
    ...SCHEMA_CONFIG,
    validateOnInit: true,
    pluginConfigs: {
      ...SCHEMA_CONFIG.pluginConfigs,
      llmProcessor: {
        ...SCHEMA_CONFIG.pluginConfigs.llmProcessor,
        temperature: 0.1 // Lower temperature for more consistent dev results
      }
    }
  };

  return initializeSchemaSystem(devConfig);
};

/**
 * Initializes the schema system in production mode with optimized settings
 * @returns {Promise<void>}
 */
export const initializeForProduction = async () => {
  const prodConfig = {
    ...SCHEMA_CONFIG,
    validateOnInit: false, // Skip validation in production for faster startup
    pluginConfigs: {
      ...SCHEMA_CONFIG.pluginConfigs,
      dataTransformer: {
        ...SCHEMA_CONFIG.pluginConfigs.dataTransformer,
        errorHandling: 'log' // Log errors instead of skipping in production
      }
    }
  };

  return initializeSchemaSystem(prodConfig);
};

/**
 * Gets the current schema system status
 * @returns {Object} Schema system status information
 */
export const getSchemaSystemStatus = () => {
  try {
    return schemaInitializer.getSystemStatus();
  } catch (error) {
    console.error('Failed to get schema system status:', error);
    return { initialized: false, error: error.message };
  }
};

/**
 * Reinitializes the schema system (useful for testing or configuration changes)
 * @param {Object} newConfig - New configuration to use
 * @returns {Promise<void>}
 */
export const reinitializeSchemaSystem = async (newConfig = {}) => {
  try {
    await schemaInitializer.cleanup();
    await initializeSchemaSystem(newConfig);
  } catch (error) {
    console.error('Failed to reinitialize schema system:', error);
    throw error;
  }
};