/**
 * Zod validation schemas for NodeData
 * Provides runtime validation and type safety for node data structures
 */

import { z } from 'zod';

// Node metadata schema
const MetaSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  function: z.string().min(1, "Function is required"),
  emoji: z.string().min(1, "Emoji is required"),
  version: z.string().default('1.0.0'),
  category: z.enum(['input', 'process', 'output'], {
    errorMap: () => ({ message: "Category must be 'input', 'process', or 'output'" })
  }),
  capabilities: z.array(z.string()).default([])
});

// Connection data schema
const ConnectionDataSchema = z.object({
  sourceNodeId: z.string(),
  sourceHandle: z.string().default('default'),
  targetHandle: z.string().default('default'),
  data: z.any().nullable(),
  meta: z.object({
    timestamp: z.string(),
    dataType: z.string(),
    isActive: z.boolean()
  })
});

// Input schema
const InputSchema = z.object({
  connections: z.record(ConnectionDataSchema).default({}),
  processed: z.record(z.any()).default({}),
  config: z.record(z.any()).default({})
});

// Output metadata schema
const OutputMetaSchema = z.object({
  timestamp: z.string(),
  status: z.enum(['idle', 'processing', 'success', 'error']),
  processingTime: z.number().nullable().optional(),
  dataSize: z.number().nullable().optional(),
  skipAutoProcessing: z.boolean().optional()
});

// Output schema
const OutputSchema = z.object({
  data: z.record(z.any()).default({}),
  meta: OutputMetaSchema
});

// Error detail schema
const ErrorDetailSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().min(1),
  details: z.any().optional()
});

// Error schema
const ErrorSchema = z.object({
  hasError: z.boolean(),
  errors: z.array(ErrorDetailSchema)
});

// PluginSchema
const PluginSchema = z.object({
  name: z.string().min(3,{message:"Plugin name must be min 3 chars long"}),
  version: z.string().default('1.0.0'),
  config: z.record(z.any()).default({}),
  state: z.record(z.any()).default({})
}).nullish();



// Main NodeData schema
export const NodeDataSchema = z.object({
  meta: MetaSchema,
  input: InputSchema,
  output: OutputSchema,
  error: ErrorSchema,
  plugin: PluginSchema
});

// Partial schema for updates (all fields optional)
export const NodeDataUpdateSchema = z.object({
  meta: MetaSchema.partial().optional(),
  input: InputSchema.partial().optional(),
  output: OutputSchema.partial().optional(),
  error: ErrorSchema.partial().optional(),
  plugin: PluginSchema.optional()
}).partial();

/**
 * Validate meta section of NodeData
 * @param {Object} meta - Meta data to validate
 * @returns {Object} Validation result
 */
export const validateMeta = (meta) => {
  
  try {
    const validatedMeta = MetaSchema.parse(meta);
    
    return {
      success: true,
      data: validatedMeta,
      errors: [],
      section: 'meta'
    };
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      path: `meta.${(err.path || []).join('.')}`,
      message: err.message || 'Unknown meta validation error',
      code: err.code || 'META_VALIDATION_ERROR',
      received: err.received,
      section: 'meta' 
    }));
    
    return {
      success: false,
      data: null,
      errors,
      section: 'meta'
    };
  }
};

/**
 * Validate input section of NodeData
 * @param {Object} input - Input data to validate
 * @returns {Object} Validation result
 */
export const validateInput = (input) => {
  try {

  try {
    const validatedInput = InputSchema.parse(input);
    console.log("nodeDataValidation -  inputSchema.parse ",validateInput);
    return {
      success: true,
      data: validatedInput,
      errors: [],
      section: 'input'
    };
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      path: `input.${(err.path || []).join('.')}`,
      message: err.message || 'Unknown input validation error',
      code: err.code || 'INPUT_VALIDATION_ERROR',
      received: err.received,
      section: 'input'
    }));
    console.log("ValidateInput: Returning directly")
    return {
      success: false,
      data: null,
      errors,
      section: 'input'
    };
  }
} catch (e) {
 
}
};

/**
 * Validate output section of NodeData
 * @param {Object} output - Output data to validate
 * @returns {Object} Validation result
 */
export const validateOutput = (output) => {
  try {
    const validatedOutput = OutputSchema.parse(output);
    return {
      success: true,
      data: validatedOutput,
      errors: [],
      section: 'output'
    };
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      path: `output.${(err.path || []).join('.')}`,
      message: err.message || 'Unknown output validation error',
      code: err.code || 'OUTPUT_VALIDATION_ERROR',
      received: err.received,
      section: 'output'
    }));
    
    return {
      success: false,
      data: null,
      errors,
      section: 'output'
    };
  }
};

/**
 * Validate error section of NodeData
 * @param {Object} errorData - Error data to validate
 * @returns {Object} Validation result
 */
export const validateError = (errorData) => {
  try {
    const validatedError = ErrorSchema.parse(errorData);
    return {
      success: true,
      data: validatedError,
      errors: [],
      section: 'error'
    };
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      path: `error.${(err.path || []).join('.')}`,
      message: err.message || 'Unknown error section validation error',
      code: err.code || 'ERROR_VALIDATION_ERROR',
      received: err.received,
      section: 'error'
    }));
    
    return {
      success: false,
      data: null,
      errors,
      section: 'error'
    };
  }
};

/**
 * Validate plugin section of NodeData
 * @param {Object} plugin - Plugin data to validate
 * @returns {Object} Validation result
 */
export const validatePlugin = (plugin) => {

  try {
    const validatedPlugin = PluginSchema.parse(plugin);
    return {
      success: true,
      data: validatedPlugin,
      errors: [],
      section: 'plugin'
    };
  } catch (error) {
    const errors = (error.errors || []).map(err => ({
      path: `plugin.${(err.path || []).join('.')}`,
      message: err.message || 'Unknown plugin validation error',
      code: err.code || 'PLUGIN_VALIDATION_ERROR',
      received: err.received,
      section: 'plugin'
    }));
    
    return {
      success: false,
      data: null,
      errors,
      section: 'plugin'
    };
  }
};

/**
 * Validate complete NodeData structure with granular section validation
 * @param {Object} nodeData - Node data to validate
 * @returns {Object} Validation result with detailed section information
 */
export const validateNodeData = (nodeData) => {
  if (!nodeData || typeof nodeData !== 'object') {
    return {
      success: false,
      data: null,
      errors: [{
        path: 'nodeData',
        message: 'NodeData must be a valid object',
        code: 'INVALID_NODE_DATA',
        received: typeof nodeData,
        section: 'root'
      }],
      sectionsValidated: {},
      failedSections: ['root']
    };
  }

  const results = {
    meta: nodeData.meta ? validateMeta(nodeData.meta) : { success: false, errors: [{ path: 'meta', message: 'Meta section is required', code: 'MISSING_META', section: 'meta' }] },
    input: nodeData.input ? validateInput(nodeData.input) : { success: false, errors: [{ path: 'input', message: 'Input section is required', code: 'MISSING_INPUT', section: 'input' }] },
    output: nodeData.output ? validateOutput(nodeData.output) : { success: false, errors: [{ path: 'output', message: 'Output section is required', code: 'MISSING_OUTPUT', section: 'output' }] },
    error: nodeData.error ? validateError(nodeData.error) : { success: false, errors: [{ path: 'error', message: 'Error section is required', code: 'MISSING_ERROR', section: 'error' }] },
    plugin: validatePlugin(nodeData.plugin) // Plugin can be null/undefined
  };

  const allErrors = [];
  const sectionsValidated = {};
  const failedSections = [];
  const validatedData = {};

  // Process each section result
  Object.entries(results).forEach(([section, result]) => {
    sectionsValidated[section] = result.success;
    
    if (result.success) {
      validatedData[section] = result.data;
    } else {
      failedSections.push(section);
      allErrors.push(...result.errors);
    }
  });

  const overallSuccess = Object.values(sectionsValidated).every(success => success);

  return {
    success: overallSuccess,
    data: overallSuccess ? validatedData : null,
    errors: allErrors,
    sectionsValidated,
    failedSections,
    validSections: Object.keys(sectionsValidated).filter(section => sectionsValidated[section])
  };
};

/**
 * Validate NodeData updates (partial validation)
 * @param {Object} updates - Updates to validate
 * @returns {Object} Validation result
 */
export const validateNodeDataUpdates = (updates) => {
  try {
    const validatedUpdates = NodeDataUpdateSchema.parse(updates);
    return {
      success: true,
      data: validatedUpdates,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: (error.errors || []).map(err => ({
        path: (err.path || []).join('.'),
        message: err.message || 'Unknown validation error',
        code: err.code || 'VALIDATION_ERROR',
        received: err.received
      }))
    };
  }
};

/**
 * Safe validation that doesn't throw errors
 * @param {Object} nodeData - Node data to validate
 * @returns {Object} Safe validation result
 */
export const safeValidateNodeData = (nodeData) => {
  const result = NodeDataSchema.safeParse(nodeData);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: []
    };
  } else {
    return {
      success: false,
      data: nodeData, // Return original data on validation failure
      errors: (result.error?.errors || []).map(err => ({
        path: (err.path || []).join('.'),
        message: err.message || 'Unknown validation error',
        code: err.code || 'VALIDATION_ERROR',
        received: err.received
      }))
    };
  }
};

/**
 * Validate only specific sections of NodeData
 * @param {Object} nodeData - Node data to validate
 * @param {Array<string>} sections - Array of section names to validate ['meta', 'input', 'output', 'error', 'plugin']
 * @returns {Object} Validation result for specified sections
 */
export const validateNodeDataSections = (nodeData, sections = ['meta', 'input', 'output', 'error', 'plugin']) => {
  if (!nodeData || typeof nodeData !== 'object') {
    return {
      success: false,
      data: null,
      errors: [{
        path: 'nodeData',
        message: 'NodeData must be a valid object',
        code: 'INVALID_NODE_DATA',
        received: typeof nodeData,
        section: 'root'
      }],
      sectionsValidated: {},
      failedSections: ['root'],
      requestedSections: sections
    };
  }

  const validators = {
    meta: validateMeta,
    input: validateInput,
    output: validateOutput,
    error: validateError,
    plugin: validatePlugin
  };

  const results = {};
  const allErrors = [];
  const sectionsValidated = {};
  const failedSections = [];
  const validatedData = {};

  sections.forEach(section => {
    if (!validators[section]) {
      const error = {
        path: section,
        message: `Unknown section: ${section}`,
        code: 'UNKNOWN_SECTION',
        section: 'validation'
      };
      allErrors.push(error);
      failedSections.push(section);
      sectionsValidated[section] = false;
      return;
    }

    const sectionData = nodeData[section];
    const isRequired = ['meta', 'input', 'output', 'error'].includes(section);
    
    if (!sectionData && isRequired) {
      const error = {
        path: section,
        message: `${section.charAt(0).toUpperCase() + section.slice(1)} section is required`,
        code: `MISSING_${section.toUpperCase()}`,
        section
      };
      allErrors.push(error);
      failedSections.push(section);
      sectionsValidated[section] = false;
    } else {
      const result = validators[section](sectionData);
      sectionsValidated[section] = result.success;
      
      if (result.success) {
        validatedData[section] = result.data;
      } else {
        failedSections.push(section);
        allErrors.push(...result.errors);
      }
    }
  });

  const overallSuccess = Object.values(sectionsValidated).every(success => success);

  return {
    success: overallSuccess,
    data: overallSuccess ? validatedData : null,
    errors: allErrors,
    sectionsValidated,
    failedSections,
    validSections: Object.keys(sectionsValidated).filter(section => sectionsValidated[section]),
    requestedSections: sections
  };
};

/**
 * Validate specific node categories with additional rules
 */
export const validateInputNodeData = (nodeData) => {
  const baseValidation = validateNodeData(nodeData);
  
  if (!baseValidation.success) {
    return baseValidation;
  }
  
  // Additional validation for input nodes
  if (baseValidation.data.meta.category === 'input') {
    const errors = [];
    
    // Input nodes should have form fields configuration
    if (!baseValidation.data.input.config.formFields) {
      errors.push({
        path: 'input.config.formFields',
        message: 'Input nodes should have formFields configuration',
        code: 'MISSING_FORM_FIELDS',
        section: 'input'
      });
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        data: baseValidation.data,
        errors: [...baseValidation.errors, ...errors],
        sectionsValidated: baseValidation.sectionsValidated,
        failedSections: baseValidation.failedSections,
        validSections: baseValidation.validSections
      };
    }
  }
  
  return baseValidation;
};

/**
 * Validate process node data with additional rules
 */
export const validateProcessNodeData = (nodeData) => {
  const baseValidation = validateNodeData(nodeData);
  
  if (!baseValidation.success) {
    return baseValidation;
  }
  
  // Additional validation for process nodes
  if (baseValidation.data.meta.category === 'process') {
    const errors = [];
    
    // Process nodes should have aggregation strategy
    if (!baseValidation.data.input.config.aggregationStrategy) {
      errors.push({
        path: 'input.config.aggregationStrategy',
        message: 'Process nodes should have aggregationStrategy configuration',
        code: 'MISSING_AGGREGATION_STRATEGY',
        section: 'input'
      });
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        data: baseValidation.data,
        errors: [...baseValidation.errors, ...errors],
        sectionsValidated: baseValidation.sectionsValidated,
        failedSections: baseValidation.failedSections,
        validSections: baseValidation.validSections
      };
    }
  }
  
  return baseValidation;
};

/**
 * Create a validation error message from validation result with section details
 * @param {Object} validationResult - Result from validation function
 * @param {string} context - Context for the error (e.g., "node registration")
 * @returns {string} Formatted error message
 */
export const createValidationErrorMessage = (validationResult, context = 'validation') => {
  if (validationResult.success) {
    return null;
  }
  
  // Group errors by section for better readability
  const errorsBySection = {};
  validationResult.errors.forEach(error => {
    const section = error.section || 'unknown';
    if (!errorsBySection[section]) {
      errorsBySection[section] = [];
    }
    errorsBySection[section].push(error);
  });

  const sectionMessages = Object.entries(errorsBySection).map(([section, errors]) => {
    const errorMessages = errors.map(error => {
      const receivedInfo = error.received !== undefined ? ` (received: ${JSON.stringify(error.received)})` : '';
      return `  • ${error.path}: ${error.message}${receivedInfo}`;
    });
    
    return `${section.toUpperCase()} SECTION:\n${errorMessages.join('\n')}`;
  });

  const failedSectionsInfo = validationResult.failedSections
    ? `\nFailed sections: ${validationResult.failedSections.join(', ')}`
    : '';
  
  const validSectionsInfo = validationResult.validSections && validationResult.validSections.length > 0
    ? `\nValid sections: ${validationResult.validSections.join(', ')}`
    : '';

  return `${context} failed:${failedSectionsInfo}${validSectionsInfo}\n\n${sectionMessages.join('\n\n')}`;
};

/**
 * Create a summary of validation results for quick overview
 * @param {Object} validationResult - Result from validation function
 * @returns {Object} Validation summary
 */
export const createValidationSummary = (validationResult) => {
  if (validationResult.success) {
    return {
      status: 'success',
      message: 'All sections validated successfully',
      totalSections: Object.keys(validationResult.sectionsValidated || {}).length,
      validSections: validationResult.validSections || [],
      failedSections: []
    };
  }

  const totalSections = Object.keys(validationResult.sectionsValidated || {}).length;
  const validSections = validationResult.validSections || [];
  const failedSections = validationResult.failedSections || [];
  
  return {
    status: 'failed',
    message: `${failedSections.length} of ${totalSections} sections failed validation`,
    totalSections,
    validSections,
    failedSections,
    totalErrors: validationResult.errors.length,
    errorsBySection: validationResult.errors.reduce((acc, error) => {
      const section = error.section || 'unknown';
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {})
  };
};