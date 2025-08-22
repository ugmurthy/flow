/**
 * Node Data Schema - Enhanced Core Type Definitions
 * Based on COMPREHENSIVE_SCHEMA_ARCHITECTURE.md specification
 * Version 2.0.0 - Comprehensive Implementation
 */

/**
 * Enhanced ProcessedDataCollection Interface
 * Manages aggregated input data with multiple strategies
 */
export const ProcessedDataCollection = {
  /**
   * Create a ProcessedDataCollection instance
   * @param {Object} config - Configuration object
   * @param {Object} config.aggregated - Aggregated data ready for processing
   * @param {Object} config.byConnection - Individual connection data
   * @param {string} config.strategy - Processing strategy
   * @param {Object} config.meta - Collection metadata
   */
  create: ({
    aggregated = {},
    byConnection = {},
    strategy = 'merge',
    meta = {}
  } = {}) => ({
    aggregated,
    byConnection,
    strategy, // "merge" | "array" | "latest" | "priority" | "custom"
    meta: {
      lastAggregated: new Date().toISOString(),
      connectionCount: Object.keys(byConnection).length,
      totalDataSize: JSON.stringify(aggregated).length,
      aggregationMethod: strategy,
      ...meta
    }
  }),

  /**
   * Update ProcessedDataCollection immutably
   * @param {Object} collection - Current collection
   * @param {Object} updates - Updates to apply
   */
  update: (collection, updates) => ({
    ...collection,
    ...updates,
    meta: {
      ...collection.meta,
      ...updates.meta,
      lastAggregated: new Date().toISOString()
    }
  }),

  /**
   * Add connection data to collection
   * @param {Object} collection - Current collection
   * @param {string} connectionId - Connection identifier
   * @param {any} data - Connection data
   * @param {Object} metadata - Connection metadata
   */
  addConnectionData: (collection, connectionId, data, metadata = {}) => {
    const updatedByConnection = {
      ...collection.byConnection,
      [connectionId]: {
        data,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }
    };

    return ProcessedDataCollection.update(collection, {
      byConnection: updatedByConnection,
      meta: {
        connectionCount: Object.keys(updatedByConnection).length,
        totalDataSize: JSON.stringify(updatedByConnection).length
      }
    });
  }
};

/**
 * Data Directive System
 * Provides instructions for cross-node data manipulation
 */
export const DataDirective = {
  /**
   * Create a DataDirective instance
   * @param {Object} config - Directive configuration
   * @param {string} config.type - Directive type
   * @param {Object} config.target - Target specification
   * @param {any} config.payload - Directive payload
   * @param {Object} config.processing - Processing instructions
   * @param {Object} config.meta - Directive metadata
   */
  create: ({
    type,
    target,
    payload,
    processing = {},
    meta = {}
  }) => ({
    type, // "update-config" | "modify-behavior" | "transform-data" | "custom"
    target: {
      section: target.section, // "input" | "output" | "plugin" | "styling"
      path: target.path, // Dot-notation path (e.g., 'config.displayFormat')
      operation: target.operation || 'set' // "set" | "merge" | "append" | "transform"
    },
    payload,
    processing: {
      immediate: processing.immediate ?? true,
      conditional: processing.conditional || null,
      priority: processing.priority || 5,
      retryPolicy: processing.retryPolicy || null
    },
    meta: {
      source: meta.source || 'unknown',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      ...meta
    }
  }),

  /**
   * Validate directive structure
   * @param {Object} directive - Directive to validate
   */
  validate: (directive) => {
    const errors = [];
    
    if (!directive.type) errors.push('Directive type is required');
    if (!directive.target?.section) errors.push('Target section is required');
    if (!directive.target?.path) errors.push('Target path is required');
    if (directive.payload === undefined) errors.push('Payload is required');
    
    const validTypes = ['update-config', 'modify-behavior', 'transform-data', 'custom'];
    if (directive.type && !validTypes.includes(directive.type)) {
      errors.push(`Invalid directive type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    const validSections = ['input', 'output', 'plugin', 'styling'];
    if (directive.target?.section && !validSections.includes(directive.target.section)) {
      errors.push(`Invalid target section. Must be one of: ${validSections.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Unified Styling System - Node Visual State
 */
export const NodeVisualState = {
  /**
   * Create a NodeVisualState instance
   * @param {Object} overrides - Style overrides
   */
  create: (overrides = {}) => ({
    container: {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      borderWidth: 2,
      borderRadius: 8,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      opacity: 1,
      scale: 1,
      ...overrides.container
    },
    typography: {
      titleColor: '#1f2937',
      titleSize: '16px',
      titleWeight: '600',
      subtitleColor: '#6b7280',
      subtitleSize: '14px',
      fontFamily: 'Inter, sans-serif',
      ...overrides.typography
    },
    layout: {
      padding: 16,
      minWidth: 200,
      maxWidth: 600,
      minHeight: 80,
      maxHeight: 400,
      ...overrides.layout
    },
    animation: {
      duration: 200,
      easing: 'ease-in-out',
      transition: ['all'],
      ...overrides.animation
    },
    effects: {
      ...overrides.effects
    }
  }),

  // Predefined visual states
  createDefault: () => NodeVisualState.create(),
  
  createSelected: () => NodeVisualState.create({
    container: {
      borderColor: '#3b82f6',
      borderWidth: 3,
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    }
  }),
  
  createProcessing: () => NodeVisualState.create({
    container: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b'
    },
    effects: {
      pulse: true
    }
  }),
  
  createSuccess: () => NodeVisualState.create({
    container: {
      backgroundColor: '#ecfdf5',
      borderColor: '#10b981'
    }
  }),
  
  createError: () => NodeVisualState.create({
    container: {
      backgroundColor: '#fef2f2',
      borderColor: '#ef4444'
    }
  }),
  
  createDisabled: () => NodeVisualState.create({
    container: {
      opacity: 0.6,
      backgroundColor: '#f9fafb',
      borderColor: '#d1d5db'
    }
  })
};

/**
 * Handle Configuration for Node Connections
 */
export const HandleConfiguration = {
  /**
   * Create a HandleConfiguration instance
   * @param {Object} config - Handle configuration
   */
  create: ({
    id,
    type, // "source" | "target"
    position, // "top" | "right" | "bottom" | "left"
    style = {},
    behavior = {},
    label = '',
    tooltip = '',
    icon = ''
  }) => ({
    id,
    type,
    position,
    offset: { x: 0, y: 0 },
    style: {
      backgroundColor: '#3b82f6',
      borderColor: '#1e40af',
      size: 12,
      shape: 'circle', // "circle" | "square" | "diamond"
      ...style
    },
    behavior: {
      allowMultipleConnections: false,
      connectionLimit: 1,
      acceptedDataTypes: ['any'],
      validationRules: [],
      ...behavior
    },
    label,
    tooltip,
    icon
  }),

  /**
   * Create input handle configuration
   */
  createInput: (overrides = {}) => HandleConfiguration.create({
    type: 'target',
    position: 'left',
    style: {
      backgroundColor: '#6b7280',
      borderColor: '#4b5563'
    },
    ...overrides
  }),

  /**
   * Create output handle configuration
   */
  createOutput: (overrides = {}) => HandleConfiguration.create({
    type: 'source',
    position: 'right',
    style: {
      backgroundColor: '#3b82f6',
      borderColor: '#1e40af'
    },
    ...overrides
  })
};

/**
 * Enhanced Connection Data Structure
 * Comprehensive connection tracking with QoS and metadata
 */
export const ConnectionData = {
  /**
   * Create enhanced ConnectionData instance
   * @param {string} sourceNodeId - ID of the source node
   * @param {string} sourceHandle - Handle ID on source node
   * @param {string} targetHandle - Handle ID on target node
   * @param {any} data - Data received from connection
   * @param {any} processed - Processed data from source node
   * @param {Object} directive - Data directive
   */
  create: (sourceNodeId, sourceHandle = 'default', targetHandle = 'default', data = null, processed = null, directive = null) => ({
    // Connection Identity
    id: `${sourceNodeId}-${targetHandle}-${Date.now()}`,
    edgeId: '', // Will be set by React Flow
    
    // Source Information
    sourceNodeId,
    sourceHandle,
    sourceLabel: '',
    sourceType: 'unknown', // Will be populated from source node
    
    // Target Information
    targetHandle,
    
    // Data Flow
    data,
    processed,
    directive,
    
    // Enhanced Connection Metadata
    meta: {
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      isActive: true,
      lastProcessed: processed ? new Date().toISOString() : null,
      priority: 5, // Default priority (0-10)
      bandwidth: data ? JSON.stringify(data).length : 0,
      compressionType: null
    },
    
    // Quality of Service Configuration
    qos: {
      reliability: 'at-least-once', // "at-most-once" | "at-least-once" | "exactly-once"
      durability: false, // Persist across sessions
      ordering: true // Maintain data order
    }
  }),

  /**
   * Update connection data immutably
   * @param {Object} connection - Current connection
   * @param {Object} updates - Updates to apply
   */
  update: (connection, updates) => ({
    ...connection,
    ...updates,
    meta: {
      ...connection.meta,
      ...updates.meta,
      timestamp: new Date().toISOString()
    }
  }),

  /**
   * Set connection data and processed result
   * @param {Object} connection - Current connection
   * @param {any} data - New data
   * @param {any} processed - Processed data
   */
  setData: (connection, data, processed = null) => ConnectionData.update(connection, {
    data,
    processed: processed || data,
    meta: {
      dataType: typeof data,
      bandwidth: JSON.stringify(data).length,
      lastProcessed: new Date().toISOString()
    }
  })
};

/**
 * Enhanced NodeData Structure - Comprehensive Implementation
 * Version 2.0.0 with full specification compliance
 */
export const NodeData = {
  /**
   * Create a comprehensive NodeData instance
   * @param {Object} config - Configuration object
   * @param {Object} config.meta - Enhanced node metadata
   * @param {Object} config.input - Enhanced input configuration with ProcessedDataCollection
   * @param {Object} config.output - Enhanced output with directive support
   * @param {Object} config.plugin - Enhanced plugin configuration
   * @param {Object} config.styling - Unified styling system
   */
  create: (config = {}) => {
    // Handle legacy format properties at root level
    const {
      meta = {},
      input = {},
      output = {},
      plugin = null,
      styling = {},
      
      // Legacy root-level properties
      label,
      description,
      function: nodeFunction,
      emoji,
      category,
      capabilities,
      tags,
      version,
      author,
      formData,
      formFields,
      validation,
      aggregationStrategy,
      requiredInputs,
      submitBehavior,
      displayFormat,
      exportOptions,
      allowMultipleConnections,
      processingMode,
      
      ...otherProps
    } = config;

    return ({
      // === ENHANCED METADATA SECTION ===
      meta: {
        label: label || meta.label || 'Untitled Node',
        description: description || meta.description || '',
        function: nodeFunction || meta.function || 'Generic Function',
        emoji: emoji || meta.emoji || '⚙️',
        version: version || meta.version || '2.0.0',
        category: category || meta.category || 'process',
        capabilities: capabilities || meta.capabilities || [],
        tags: tags || meta.tags || [],
        author: author || meta.author || 'System',
        createdAt: meta.createdAt || new Date().toISOString(),
        updatedAt: meta.updatedAt || new Date().toISOString(),
        ...meta
      },

    // === ENHANCED INPUT SECTION ===
    input: {
      // Connection Management
      connections: input.connections || {},

      // Processed Data Collection
      processed: input.processed || ProcessedDataCollection.create({
        strategy: input.processed?.strategy || 'merge'
      }),

      // Node Configuration
      config: (() => {
        // Build the base config (without connectionPolicy)
        const baseConfig = {
          allowMultipleConnections: false,
          processingMode: 'reactive', // "reactive" | "batch" | "streaming"
          aggregationStrategy: 'merge'
        };
        
        // Default connection policy
        const defaultConnectionPolicy = {
          maxConnections: 1,
          requiredConnections: 0,
          connectionTypes: ['any']
        };
        
        // Merge input config
        const mergedConfig = {
          ...baseConfig,
          ...(input.config || {}),
          // Override with explicit root-level properties if provided (ensure they're not undefined)
          ...(allowMultipleConnections !== undefined ? { allowMultipleConnections } : {}),
          ...(processingMode ? { processingMode } : {}),
          ...(aggregationStrategy ? { aggregationStrategy } : {}),
          ...(submitBehavior ? { submitBehavior } : {}),
          ...(displayFormat ? { displayFormat } : {}),
          ...(exportOptions ? { exportOptions } : {}),
          ...(requiredInputs ? { requiredInputs } : {})
        };
        
        // Handle connectionPolicy separately - input config takes complete precedence
        if (input.config?.connectionPolicy) {
          // If input has a connectionPolicy, use it with defaults as fallback only for missing properties
          mergedConfig.connectionPolicy = {
            ...defaultConnectionPolicy,
            ...input.config.connectionPolicy
          };
        } else {
          // Use default connectionPolicy
          mergedConfig.connectionPolicy = defaultConnectionPolicy;
        }
        
        return mergedConfig;
      })(),

      // Form Fields (Input Nodes Only)
      formFields: formFields || input.formFields || [],

      // Validation Rules
      validation: validation || input.validation || {},

      // Spread remaining input properties (except config which we handled above)
      ...Object.fromEntries(
        Object.entries(input).filter(([key]) => !['config', 'connections', 'processed', 'formFields', 'validation'].includes(key))
      )
    },

      // === ENHANCED OUTPUT SECTION ===
      output: {
        // Primary Data Output
        data: output.data || formData || {},

      // Output Metadata
      meta: {
        timestamp: new Date().toISOString(),
        status: 'idle', // "idle" | "processing" | "success" | "error"
        processingTime: null,
        dataSize: null,
        inputsProcessed: 0,
        processingMethod: 'default',
        successRate: 1.0,
        ...output.meta
      },

      // Data Directives (Instructions for target nodes)
      directives: output.directives || {},

      // Cached Results
      cache: output.cache || null,

      ...output
    },

    // === ENHANCED ERROR HANDLING ===
    error: {
      hasError: false,
      errors: [],
      warnings: [],
      recoveryActions: []
    },

    // === ENHANCED PLUGIN SYSTEM ===
    plugin: plugin ? {
      name: plugin.name,
      version: plugin.version || '2.0.0',
      config: plugin.config || {},
      state: plugin.state || {},

      // Enhanced plugin features
      dependencies: plugin.dependencies || [],
      permissions: plugin.permissions || {},
      lifecycle: {
        initialized: false,
        lastProcessed: null,
        processCount: 0,
        errorCount: 0,
        ...plugin.lifecycle
      },

      ...plugin
    } : null,

    // === UNIFIED STYLING SYSTEM ===
    styling: {
      // Visual States
      states: {
        default: styling.states?.default || NodeVisualState.createDefault(),
        selected: styling.states?.selected || NodeVisualState.createSelected(),
        processing: styling.states?.processing || NodeVisualState.createProcessing(),
        success: styling.states?.success || NodeVisualState.createSuccess(),
        error: styling.states?.error || NodeVisualState.createError(),
        disabled: styling.states?.disabled || NodeVisualState.createDisabled(),
        ...styling.states
      },

      // Handle Configuration
      handles: {
        input: styling.handles?.input || [],
        output: styling.handles?.output || []
      },

      // Custom Properties
      custom: styling.custom || {},

      // Theme Integration
      theme: styling.theme || 'default',

        ...styling
      }
    });
  },

  /**
   * Enhanced update method for comprehensive NodeData
   * @param {Object} nodeData - Current node data
   * @param {Object} updates - Updates to apply
   * @returns {Object} New node data instance
   */
  update: (nodeData, updates) => {
    const newData = { ...nodeData };
    
    // Update metadata with enhanced tracking
    if (updates.meta) {
      newData.meta = {
        ...newData.meta,
        ...updates.meta,
        updatedAt: new Date().toISOString()
      };
    }
    
    // Enhanced input updates
    if (updates.input) {
      newData.input = { ...newData.input, ...updates.input };
      
      if (updates.input.connections) {
        newData.input.connections = { ...newData.input.connections, ...updates.input.connections };
      }
      
      if (updates.input.config) {
        newData.input.config = { ...newData.input.config, ...updates.input.config };
      }
      
      if (updates.input.processed) {
        newData.input.processed = ProcessedDataCollection.update(
          newData.input.processed,
          updates.input.processed
        );
      }
      
      if (updates.input.formFields) {
        newData.input.formFields = [...updates.input.formFields];
      }
      
      if (updates.input.validation) {
        newData.input.validation = { ...newData.input.validation, ...updates.input.validation };
      }
    }
    
    // Enhanced output updates
    if (updates.output) {
      newData.output = { ...newData.output, ...updates.output };
      
      if (updates.output.data) {
        newData.output.data = { ...newData.output.data, ...updates.output.data };
      }
      
      if (updates.output.meta) {
        newData.output.meta = { ...newData.output.meta, ...updates.output.meta };
      }
      
      if (updates.output.directives) {
        newData.output.directives = { ...newData.output.directives, ...updates.output.directives };
      }
      
      if (updates.output.cache) {
        newData.output.cache = updates.output.cache;
      }
    }
    
    // Enhanced error handling updates
    if (updates.error) {
      newData.error = { ...newData.error, ...updates.error };
      
      if (updates.error.errors) {
        newData.error.errors = [...updates.error.errors];
      }
      
      if (updates.error.warnings) {
        newData.error.warnings = [...updates.error.warnings];
      }
      
      if (updates.error.recoveryActions) {
        newData.error.recoveryActions = [...updates.error.recoveryActions];
      }
    }
    
    // Enhanced plugin updates
    if (updates.plugin) {
      if (newData.plugin) {
        newData.plugin = { ...newData.plugin, ...updates.plugin };
        
        if (updates.plugin.lifecycle) {
          newData.plugin.lifecycle = { ...newData.plugin.lifecycle, ...updates.plugin.lifecycle };
        }
        
        if (updates.plugin.dependencies) {
          newData.plugin.dependencies = [...updates.plugin.dependencies];
        }
        
        if (updates.plugin.permissions) {
          newData.plugin.permissions = { ...newData.plugin.permissions, ...updates.plugin.permissions };
        }
      } else {
        newData.plugin = updates.plugin;
      }
    }
    
    // Enhanced styling updates
    if (updates.styling) {
      newData.styling = { ...newData.styling, ...updates.styling };
      
      if (updates.styling.states) {
        newData.styling.states = { ...newData.styling.states, ...updates.styling.states };
      }
      
      if (updates.styling.handles) {
        newData.styling.handles = { ...newData.styling.handles, ...updates.styling.handles };
        
        if (updates.styling.handles.input) {
          newData.styling.handles.input = [...updates.styling.handles.input];
        }
        
        if (updates.styling.handles.output) {
          newData.styling.handles.output = [...updates.styling.handles.output];
        }
      }
      
      if (updates.styling.custom) {
        newData.styling.custom = { ...newData.styling.custom, ...updates.styling.custom };
      }
    }
    
    return newData;
  },

  /**
   * Add directive to node output
   * @param {Object} nodeData - Current node data
   * @param {string} targetNodeId - Target node for directive
   * @param {Object} directive - Directive to add
   */
  addDirective: (nodeData, targetNodeId, directive) => {
    const validatedDirective = DataDirective.validate(directive);
    if (!validatedDirective.isValid) {
      throw new Error(`Invalid directive: ${validatedDirective.errors.join(', ')}`);
    }

    const directiveId = `${targetNodeId}-${Date.now()}`;
    const existingDirectives = nodeData.output.directives[targetNodeId] || [];
    
    return NodeData.update(nodeData, {
      output: {
        directives: {
          ...nodeData.output.directives,
          [targetNodeId]: [
            ...existingDirectives,
            { id: directiveId, ...directive }
          ]
        }
      }
    });
  },

  /**
   * Update visual state
   * @param {Object} nodeData - Current node data
   * @param {string} stateName - State name (default, processing, success, error, etc.)
   * @param {Object} stateOverrides - State overrides
   */
  updateVisualState: (nodeData, stateName, stateOverrides) => {
    return NodeData.update(nodeData, {
      styling: {
        states: {
          [stateName]: NodeVisualState.create(stateOverrides)
        }
      }
    });
  },

  /**
   * Add connection data to processed collection
   * @param {Object} nodeData - Current node data
   * @param {string} connectionId - Connection identifier
   * @param {any} data - Connection data
   * @param {Object} metadata - Connection metadata
   */
  addConnectionData: (nodeData, connectionId, data, metadata = {}) => {
    const updatedProcessed = ProcessedDataCollection.addConnectionData(
      nodeData.input.processed,
      connectionId,
      data,
      metadata
    );

    return NodeData.update(nodeData, {
      input: {
        processed: updatedProcessed
      }
    });
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
 * Enhanced Input Node Schema - Comprehensive Implementation
 */
export const InputNodeData = {
  create: (config = {}) => {
    // Separate meta from the rest of config to avoid override issues
    const { meta = {}, ...restConfig } = config;
    
    const inputCapabilities = [
      'user-input',
      'form-data',
      'data-collection',
      'validation',
      'directive-generation',
      ...(meta.capabilities || [])
    ];
    
    const baseData = NodeData.create({
      ...restConfig,
      // Explicitly set category and capabilities at root level for NodeData.create to pick up
      category: 'input',
      capabilities: inputCapabilities,
      meta: {
        // Start with original meta but ensure category and capabilities are correct
        ...meta,
        category: 'input',
        capabilities: inputCapabilities
      },
      input: {
        // Input nodes typically don't have incoming connections but can allow external data
        config: {
          allowExternalData: false,
          autoSubmit: false,
          resetOnSubmit: false,
          submitBehavior: 'manual', // "immediate" | "batch" | "manual"
          ...config.input?.config
        },
        formFields: config.formFields || config.input?.formFields || [],
        validation: {
          rules: ['required-fields', 'format-validation'],
          mode: 'real-time', // "real-time" | "on-submit" | "on-blur"
          ...config.validation,
          ...config.input?.validation
        },
        processed: ProcessedDataCollection.create({
          strategy: 'latest', // Input nodes use latest strategy
          ...config.input?.processed
        }),
        ...config.input
      },
      output: {
        data: {
          formData: {},
          isValid: false,
          validationErrors: [],
          metadata: {
            submittedAt: null,
            submitCount: 0,
            lastModified: new Date().toISOString()
          },
          ...config.output?.data
        },
        // Input nodes can generate directives for connected nodes
        directives: config.output?.directives || {},
        ...config.output
      },
      styling: {
        states: {
          default: NodeVisualState.createDefault(),
          filled: NodeVisualState.create({
            container: {
              backgroundColor: '#f0f9ff',
              borderColor: '#0ea5e9'
            }
          }),
          invalid: NodeVisualState.create({
            container: {
              backgroundColor: '#fef2f2',
              borderColor: '#ef4444'
            }
          }),
          submitting: NodeVisualState.create({
            container: {
              backgroundColor: '#fef3c7',
              borderColor: '#f59e0b'
            },
            effects: {
              pulse: true
            }
          }),
          ...config.styling?.states
        },
        handles: {
          output: [
            HandleConfiguration.createOutput({
              id: 'form-data-out',
              behavior: {
                allowMultipleConnections: true,
                acceptedDataTypes: ['object', 'string'],
                validationRules: ['non-empty-data']
              },
              label: 'Form Data',
              tooltip: 'Outputs form data to connected nodes'
            }),
            ...(config.styling?.handles?.output || [])
          ],
          ...config.styling?.handles
        },
        ...config.styling
      },
      ...config
    });

    return baseData;
  }
};

/**
 * Enhanced Process Node Schema - Comprehensive Implementation
 */
export const ProcessNodeData = {
  create: (config = {}) => {
    // Separate meta from the rest of config to avoid override issues
    const { meta = {}, ...restConfig } = config;
    
    const processCapabilities = [
      'data-processing',
      'transformation',
      'computation',
      'multi-input',
      'directive-processing',
      ...(meta.capabilities || [])
    ];
    
    const baseData = NodeData.create({
      ...restConfig,
      // Explicitly set category and capabilities at root level for NodeData.create to pick up
      category: 'process',
      capabilities: processCapabilities,
      // Pass connection settings at root level so NodeData.create prioritizes them
      allowMultipleConnections: true,
      meta: {
        // Start with original meta but ensure category and capabilities are correct
        ...meta,
        category: 'process',
        capabilities: processCapabilities
      },
      input: {
        config: {
          allowMultipleConnections: true,
          aggregationStrategy: config.aggregationStrategy || config.input?.config?.aggregationStrategy || 'priority-merge',
          processingMode: 'reactive',
          requiredInputs: config.requiredInputs || [],
          expectedDataTypes: ['object', 'string'],
          ...config.input?.config
        },
        processed: ProcessedDataCollection.create({
          strategy: config.aggregationStrategy || config.input?.config?.aggregationStrategy || 'priority-merge',
          ...config.input?.processed
        }),
        ...config.input
      },
      output: {
        data: config.output?.data || {},
        meta: {
          processingTime: 0,
          inputsProcessed: 0,
          processingMethod: 'default',
          successRate: 1.0,
          ...config.output?.meta
        },
        ...config.output
      },
      // Process nodes require plugins
      plugin: config.plugin || {
        name: 'default-processor',
        version: '2.0.0',
        config: {
          strategy: 'merge',
          preserveMetadata: true,
          connectionHandling: {
            processIndividually: false,
            connectionPriorities: {},
            inputCombination: 'structured'
          }
        },
        lifecycle: {
          initialized: false,
          lastProcessed: null,
          processCount: 0,
          errorCount: 0
        },
        dependencies: [],
        permissions: {}
      },
      styling: {
        states: {
          default: NodeVisualState.createDefault(),
          processing: NodeVisualState.createProcessing(),
          configured: NodeVisualState.create({
            container: {
              backgroundColor: '#ecfdf5',
              borderColor: '#10b981'
            }
          }),
          error: NodeVisualState.createError(),
          ...config.styling?.states
        },
        handles: {
          input: [
            HandleConfiguration.createInput({
              id: 'multi-input',
              behavior: {
                allowMultipleConnections: true,
                connectionLimit: 10,
                acceptedDataTypes: ['string', 'object', 'array'],
                validationRules: ['data-type-compatible']
              },
              label: 'Data Input',
              tooltip: 'Accepts multiple data inputs for processing'
            }),
            ...(config.styling?.handles?.input || [])
          ],
          output: [
            HandleConfiguration.createOutput({
              id: 'processed-output',
              behavior: {
                allowMultipleConnections: true,
                acceptedDataTypes: ['string', 'object'],
                validationRules: ['processed-data']
              },
              label: 'Processed Data',
              tooltip: 'Outputs processed data to connected nodes'
            }),
            ...(config.styling?.handles?.output || [])
          ],
          ...config.styling?.handles
        },
        ...config.styling
      },
      ...config
    });

    // Force the process-specific connectionPolicy after NodeData.create() finishes
    baseData.input.config.connectionPolicy = {
      maxConnections: 10,
      requiredConnections: 1,
      connectionTypes: ['object', 'string', 'array'],
      ...config.input?.config?.connectionPolicy
    };

    // Also ensure the processed data collection uses the correct strategy
    baseData.input.processed = ProcessedDataCollection.create({
      strategy: config.aggregationStrategy || config.input?.config?.aggregationStrategy || 'priority-merge',
      ...config.input?.processed
    });

    return baseData;
  }
};

/**
 * Enhanced Output Node Schema - Comprehensive Implementation
 */
export const OutputNodeData = {
  create: (config = {}) => {
    // Separate meta from the rest of config to avoid override issues
    const { meta = {}, ...restConfig } = config;
    
    const outputCapabilities = [
      'data-display',
      'export',
      'visualization',
      'multi-input',
      'content-rendering',
      ...(meta.capabilities || [])
    ];
    
    const baseData = NodeData.create({
      ...restConfig,
      // Explicitly set category and capabilities at root level for NodeData.create to pick up
      category: 'output',
      capabilities: outputCapabilities,
      // Pass connection settings at root level so NodeData.create prioritizes them
      allowMultipleConnections: true,
      meta: {
        // Start with original meta but ensure category and capabilities are correct
        ...meta,
        category: 'output',
        capabilities: outputCapabilities
      },
      input: {
        config: {
          // Output nodes can accept multiple inputs
          allowMultipleConnections: true,
          connectionPolicy: {
            maxConnections: 5,
            requiredConnections: 0, // Output nodes can work without input
            connectionTypes: ['object', 'string', 'array'],
            ...config.input?.config?.connectionPolicy
          },
          displayFormat: config.displayFormat || config.input?.config?.displayFormat || 'markdown',
          autoUpdate: config.input?.config?.autoUpdate ?? true,
          aggregationMode: 'merge', // "latest" | "merge" | "all"
          exportOptions: {
            formats: ['json', 'csv', 'txt'],
            ...config.exportOptions,
            ...config.input?.config?.exportOptions
          },
          ...config.input?.config
        },
        processed: ProcessedDataCollection.create({
          strategy: 'merge', // Output nodes merge inputs for display
          ...config.input?.processed
        }),
        ...config.input
      },
      output: {
        data: {
          content: config.output?.data?.content || '',
          rendered: false,
          exported: null,
          displayMetadata: {
            lastRendered: null,
            renderCount: 0,
            lastExported: null,
            exportCount: 0,
            ...config.output?.data?.displayMetadata
          },
          ...config.output?.data
        },
        // Output nodes are endpoints - no directives
        directives: {},
        ...config.output
      },
      styling: {
        states: {
          default: NodeVisualState.createDefault(),
          populated: NodeVisualState.create({
            container: {
              backgroundColor: '#f0f9ff',
              borderColor: '#0ea5e9'
            }
          }),
          rendering: NodeVisualState.create({
            container: {
              backgroundColor: '#fef3c7',
              borderColor: '#f59e0b'
            },
            effects: {
              pulse: true
            }
          }),
          exported: NodeVisualState.create({
            container: {
              backgroundColor: '#f0fdf4',
              borderColor: '#22c55e'
            }
          }),
          ...config.styling?.states
        },
        handles: {
          input: [
            HandleConfiguration.createInput({
              id: 'content-input',
              behavior: {
                allowMultipleConnections: true,
                connectionLimit: 5,
                acceptedDataTypes: ['string', 'object', 'array'],
                validationRules: ['displayable-content']
              },
              label: 'Content Input',
              tooltip: 'Accepts content for display or export'
            }),
            ...(config.styling?.handles?.input || [])
          ],
          // Output nodes typically don't have output handles (endpoints)
          output: config.styling?.handles?.output || [],
          ...config.styling?.handles
        },
        ...config.styling
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