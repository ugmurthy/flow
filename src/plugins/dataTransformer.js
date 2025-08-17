/**
 * Data Transformer Plugin
 * Transforms and combines input data using various strategies
 * Supports merge, filter, map, reduce, and custom transformations
 */

import { BasePlugin, ProcessingInput, ProcessingOutput, ValidationResult } from '../types/pluginSystem.js';

/**
 * Data Transformer Plugin Implementation
 */
export class DataTransformerPlugin extends BasePlugin {
  constructor() {
    super(
      'data-transformer',
      '1.0.0',
      'Transforms and combines input data with multiple strategies including merge, filter, map, reduce, and custom functions',
      'JobRunner Team'
    );
    
    this.supportedStrategies = [
      'merge',
      'filter',
      'map',
      'reduce',
      'custom',
      'extract',
      'validate',
      'format',
      'aggregate'
    ];
  }

  /**
   * Initialize the data transformer
   */
  async _doInitialize(config) {
    // Set default configuration
    this.config = {
      strategy: 'merge',
      preserveMetadata: true,
      errorHandling: 'skip', // 'skip', 'fail', 'default'
      outputFormat: 'object', // 'object', 'array', 'string', 'json'
      ...config
    };

    // Validate custom functions if provided
    if (this.config.customFunction && typeof this.config.customFunction === 'string') {
      try {
        // Test if custom function is valid JavaScript
        new Function('inputs', 'config', 'context', this.config.customFunction);
      } catch (error) {
        throw new Error(`Invalid custom function: ${error.message}`);
      }
    }

    console.log(`Data Transformer initialized with strategy: ${this.config.strategy}`);
  }

  /**
   * Process inputs using data transformation
   */
  async _doProcess(inputs, config, context) {
    const mergedConfig = { ...this.config, ...config };
    
    // Validate inputs
    if (!inputs || inputs.length === 0) {
      return ProcessingOutput.error('No inputs provided for data transformation');
    }

    try {
      // Apply transformation strategy
      const result = await this._applyTransformation(inputs, mergedConfig, context);
      
      return ProcessingOutput.success(result, {
        strategy: mergedConfig.strategy,
        inputCount: inputs.length,
        outputFormat: mergedConfig.outputFormat,
        preservedMetadata: mergedConfig.preserveMetadata
      });
      
    } catch (error) {
      return ProcessingOutput.error(error, null, {
        strategy: mergedConfig.strategy,
        inputCount: inputs.length
      });
    }
  }

  /**
   * Get plugin capabilities
   */
  getCapabilities() {
    return [
      'data-transformation',
      'data-merging',
      'data-filtering',
      'data-mapping',
      'data-reduction',
      'data-extraction',
      'data-validation',
      'data-formatting',
      'data-aggregation',
      'custom-functions'
    ];
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: this.supportedStrategies,
          default: 'merge',
          description: 'Transformation strategy to apply'
        },
        preserveMetadata: {
          type: 'boolean',
          default: true,
          description: 'Whether to preserve input metadata in output'
        },
        errorHandling: {
          type: 'string',
          enum: ['skip', 'fail', 'default'],
          default: 'skip',
          description: 'How to handle transformation errors'
        },
        outputFormat: {
          type: 'string',
          enum: ['object', 'array', 'string', 'json'],
          default: 'object',
          description: 'Format of the output data'
        },
        customFunction: {
          type: 'string',
          description: 'Custom JavaScript function for transformation (strategy: custom)'
        },
        filterCondition: {
          type: 'string',
          description: 'Filter condition expression (strategy: filter)'
        },
        mapFunction: {
          type: 'string',
          description: 'Map function expression (strategy: map)'
        },
        reduceFunction: {
          type: 'string',
          description: 'Reduce function expression (strategy: reduce)'
        },
        extractPath: {
          type: 'string',
          description: 'JSON path to extract (strategy: extract)'
        },
        validationRules: {
          type: 'object',
          description: 'Validation rules object (strategy: validate)'
        },
        formatTemplate: {
          type: 'string',
          description: 'Format template string (strategy: format)'
        },
        aggregationFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fields to aggregate (strategy: aggregate)'
        },
        mergeStrategy: {
          type: 'string',
          enum: ['shallow', 'deep', 'concat', 'override'],
          default: 'deep',
          description: 'How to merge objects (strategy: merge)'
        }
      },
      required: ['strategy'],
      additionalProperties: false
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
      return ValidationResult.error(['Configuration must be an object']);
    }

    // Validate strategy
    if (!config.strategy || !this.supportedStrategies.includes(config.strategy)) {
      errors.push(`Invalid strategy. Supported: ${this.supportedStrategies.join(', ')}`);
    }

    // Strategy-specific validation
    if (config.strategy === 'custom' && !config.customFunction) {
      errors.push('customFunction is required for custom strategy');
    }

    if (config.strategy === 'filter' && !config.filterCondition) {
      errors.push('filterCondition is required for filter strategy');
    }

    if (config.strategy === 'map' && !config.mapFunction) {
      errors.push('mapFunction is required for map strategy');
    }

    if (config.strategy === 'reduce' && !config.reduceFunction) {
      errors.push('reduceFunction is required for reduce strategy');
    }

    if (config.strategy === 'extract' && !config.extractPath) {
      errors.push('extractPath is required for extract strategy');
    }

    if (config.strategy === 'validate' && !config.validationRules) {
      errors.push('validationRules is required for validate strategy');
    }

    if (config.strategy === 'format' && !config.formatTemplate) {
      errors.push('formatTemplate is required for format strategy');
    }

    if (config.strategy === 'aggregate' && !config.aggregationFields) {
      errors.push('aggregationFields is required for aggregate strategy');
    }

    // Validate custom function syntax
    if (config.customFunction && typeof config.customFunction === 'string') {
      try {
        new Function('inputs', 'config', 'context', config.customFunction);
      } catch (error) {
        errors.push(`Invalid custom function syntax: ${error.message}`);
      }
    }

    return errors.length === 0 
      ? (warnings.length > 0 ? ValidationResult.warning(warnings) : ValidationResult.success())
      : ValidationResult.error(errors);
  }

  /**
   * Apply transformation strategy
   * @private
   */
  async _applyTransformation(inputs, config, context) {
    const { strategy } = config;
    
    switch (strategy) {
      case 'merge':
        return this._mergeInputs(inputs, config);
      case 'filter':
        return this._filterInputs(inputs, config);
      case 'map':
        return this._mapInputs(inputs, config);
      case 'reduce':
        return this._reduceInputs(inputs, config);
      case 'custom':
        return this._customTransform(inputs, config, context);
      case 'extract':
        return this._extractFromInputs(inputs, config);
      case 'validate':
        return this._validateInputs(inputs, config);
      case 'format':
        return this._formatInputs(inputs, config);
      case 'aggregate':
        return this._aggregateInputs(inputs, config);
      default:
        throw new Error(`Unsupported transformation strategy: ${strategy}`);
    }
  }

  /**
   * Merge inputs strategy
   * @private
   */
  _mergeInputs(inputs, config) {
    const { mergeStrategy = 'deep', preserveMetadata } = config;
    const data = inputs.map(input => input.data);
    
    let result;
    
    switch (mergeStrategy) {
      case 'shallow':
        result = Object.assign({}, ...data);
        break;
      case 'deep':
        result = this._deepMerge(...data);
        break;
      case 'concat':
        result = Array.isArray(data[0]) ? [].concat(...data) : data;
        break;
      case 'override':
        result = data[data.length - 1]; // Last input wins
        break;
      default:
        result = this._deepMerge(...data);
    }
    
    if (preserveMetadata) {
      result._metadata = {
        sources: inputs.map(input => ({
          sourceId: input.sourceId,
          timestamp: input.meta.timestamp
        })),
        mergeStrategy,
        mergedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(result, config);
  }

  /**
   * Filter inputs strategy
   * @private
   */
  _filterInputs(inputs, config) {
    const { filterCondition, preserveMetadata } = config;
    
    const filterFn = new Function('item', 'index', 'inputs', `return ${filterCondition}`);
    const filtered = inputs.filter((input, index) => {
      try {
        return filterFn(input.data, index, inputs);
      } catch (error) {
        if (config.errorHandling === 'fail') {
          throw error;
        }
        return false; // Skip on error
      }
    });
    
    const result = filtered.map(input => input.data);
    
    if (preserveMetadata) {
      result._metadata = {
        originalCount: inputs.length,
        filteredCount: filtered.length,
        filterCondition,
        filteredAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(result, config);
  }

  /**
   * Map inputs strategy
   * @private
   */
  _mapInputs(inputs, config) {
    const { mapFunction, preserveMetadata } = config;
    
    const mapFn = new Function('item', 'index', 'inputs', `return ${mapFunction}`);
    const mapped = inputs.map((input, index) => {
      try {
        return mapFn(input.data, index, inputs);
      } catch (error) {
        if (config.errorHandling === 'fail') {
          throw error;
        }
        return config.errorHandling === 'default' ? null : input.data;
      }
    });
    
    if (preserveMetadata) {
      mapped._metadata = {
        originalCount: inputs.length,
        mapFunction,
        mappedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(mapped, config);
  }

  /**
   * Reduce inputs strategy
   * @private
   */
  _reduceInputs(inputs, config) {
    const { reduceFunction, preserveMetadata } = config;
    
    const reduceFn = new Function('accumulator', 'current', 'index', 'inputs', `return ${reduceFunction}`);
    const data = inputs.map(input => input.data);
    
    let result;
    try {
      result = data.reduce((acc, current, index) => reduceFn(acc, current, index, data));
    } catch (error) {
      if (config.errorHandling === 'fail') {
        throw error;
      }
      result = data; // Return original data on error
    }
    
    if (preserveMetadata) {
      result._metadata = {
        originalCount: inputs.length,
        reduceFunction,
        reducedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(result, config);
  }

  /**
   * Custom transformation strategy
   * @private
   */
  _customTransform(inputs, config, context) {
    const { customFunction } = config;
    
    const customFn = new Function('inputs', 'config', 'context', customFunction);
    
    try {
      const result = customFn(inputs, config, context);
      return this._formatOutput(result, config);
    } catch (error) {
      throw new Error(`Custom function execution failed: ${error.message}`);
    }
  }

  /**
   * Extract from inputs strategy
   * @private
   */
  _extractFromInputs(inputs, config) {
    const { extractPath, preserveMetadata } = config;
    
    const extracted = inputs.map(input => {
      try {
        return this._getValueByPath(input.data, extractPath);
      } catch (error) {
        if (config.errorHandling === 'fail') {
          throw error;
        }
        return config.errorHandling === 'default' ? null : undefined;
      }
    }).filter(value => value !== undefined);
    
    if (preserveMetadata) {
      extracted._metadata = {
        extractPath,
        originalCount: inputs.length,
        extractedCount: extracted.length,
        extractedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(extracted, config);
  }

  /**
   * Validate inputs strategy
   * @private
   */
  _validateInputs(inputs, config) {
    const { validationRules, preserveMetadata } = config;
    
    const validationResults = inputs.map((input, index) => {
      const errors = [];
      const data = input.data;
      
      // Apply validation rules
      for (const [field, rules] of Object.entries(validationRules)) {
        const value = this._getValueByPath(data, field);
        
        if (rules.required && (value === undefined || value === null)) {
          errors.push(`Field '${field}' is required`);
        }
        
        if (rules.type && value !== undefined && typeof value !== rules.type) {
          errors.push(`Field '${field}' must be of type '${rules.type}'`);
        }
        
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be >= ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be <= ${rules.max}`);
        }
        
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`Field '${field}' does not match pattern`);
        }
      }
      
      return {
        index,
        data,
        valid: errors.length === 0,
        errors
      };
    });
    
    const result = {
      validItems: validationResults.filter(r => r.valid).map(r => r.data),
      invalidItems: validationResults.filter(r => !r.valid),
      summary: {
        total: inputs.length,
        valid: validationResults.filter(r => r.valid).length,
        invalid: validationResults.filter(r => !r.valid).length
      }
    };
    
    if (preserveMetadata) {
      result._metadata = {
        validationRules,
        validatedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(result, config);
  }

  /**
   * Format inputs strategy
   * @private
   */
  _formatInputs(inputs, config) {
    const { formatTemplate, preserveMetadata } = config;
    
    const formatted = inputs.map(input => {
      try {
        return this._applyTemplate(formatTemplate, input.data);
      } catch (error) {
        if (config.errorHandling === 'fail') {
          throw error;
        }
        return config.errorHandling === 'default' ? '' : JSON.stringify(input.data);
      }
    });
    
    if (preserveMetadata) {
      formatted._metadata = {
        formatTemplate,
        formattedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(formatted, config);
  }

  /**
   * Aggregate inputs strategy
   * @private
   */
  _aggregateInputs(inputs, config) {
    const { aggregationFields, preserveMetadata } = config;
    
    const aggregated = {};
    
    for (const field of aggregationFields) {
      const values = inputs.map(input => this._getValueByPath(input.data, field))
        .filter(value => value !== undefined && value !== null);
      
      if (values.length > 0) {
        const numericValues = values.filter(v => typeof v === 'number');
        
        aggregated[field] = {
          count: values.length,
          values: values,
          ...(numericValues.length > 0 && {
            sum: numericValues.reduce((a, b) => a + b, 0),
            avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues)
          })
        };
      }
    }
    
    if (preserveMetadata) {
      aggregated._metadata = {
        aggregationFields,
        inputCount: inputs.length,
        aggregatedAt: new Date().toISOString()
      };
    }
    
    return this._formatOutput(aggregated, config);
  }

  /**
   * Deep merge objects
   * @private
   */
  _deepMerge(...objects) {
    const result = {};
    
    for (const obj of objects) {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = this._deepMerge(result[key] || {}, value);
          } else {
            result[key] = value;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Get value by path (supports dot notation)
   * @private
   */
  _getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply template to data
   * @private
   */
  _applyTemplate(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this._getValueByPath(data, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Format output according to configuration
   * @private
   */
  _formatOutput(result, config) {
    const { outputFormat } = config;
    
    switch (outputFormat) {
      case 'array':
        return Array.isArray(result) ? result : [result];
      case 'string':
        return typeof result === 'string' ? result : JSON.stringify(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'object':
      default:
        return result;
    }
  }

  /**
   * Cleanup resources
   */
  async _doCleanup() {
    // Clean up any resources
    console.log('Data Transformer plugin cleaned up');
  }
}

// Export plugin instance
export default new DataTransformerPlugin();