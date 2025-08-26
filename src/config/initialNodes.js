/**
 * Enhanced Initial Nodes Configuration - Phase 8 Implementation
 * Contains comprehensive node definitions with enhanced schema architecture
 * Version 2.0.0 - Full specification compliance
 */

import {
  InputNodeData,
  ProcessNodeData,
  OutputNodeData,
  ProcessedDataCollection,
  DataDirective,
  NodeVisualState,
  HandleConfiguration
} from '../types/nodeSchema.js';
import {
  NODE_TYPES,
  NODE_CATEGORIES,
  FORM_FIELD_TYPES,
  ROLE_OPTIONS,
  LLM_MODEL_OPTIONS,
  PRIORITY_OPTIONS,
  FILE_UPLOAD_CONFIG,
  DEFAULT_LLM_CONFIG,
  API_CONFIG,
  DEFAULT_MARKDOWN_CONTENT,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_FORM_CONFIGS
} from './appConstants.js';

/**
 * Enhanced Form Node - Phase 8 Implementation
 * Features: Advanced validation, directive generation, multi-state styling
 * @returns {Object} Enhanced form node configuration
 */
export const createEnhancedFormNode = () => ({
  id: 'enhanced-form-node',
  position: { x: 50, y: 50 },
  data: InputNodeData.create({
    meta: {
      label: "Enhanced Form Input",
      function: "Advanced Form Collection",
      emoji: "📝",
      description: "Collects user input with advanced validation and directives",
      category: NODE_CATEGORIES.INPUT,
      capabilities: ['form-collection', 'validation', 'directive-generation', 'multi-connection'],
      tags: ['user-input', 'forms', 'validation', 'enhanced'],
      version: '2.0.0',
      author: 'JobRunner System'
    },
    input: {
      processed: ProcessedDataCollection.create({
        strategy: 'latest', // Input nodes use latest strategy
        meta: {
          inputSource: 'user-form',
          validationActive: true
        }
      }),
      config: {
        allowExternalData: false,
        autoSubmit: false,
        resetOnSubmit: false,
        submitBehavior: 'manual',
        connectionPolicy: {
          maxConnections: 2, // Allow some external data connections
          requiredConnections: 0,
          connectionTypes: ['object', 'string']
        },
        formFields: [
        { name: 'username', type: FORM_FIELD_TYPES.TEXT, label: 'Username', required: true, validation: { minLength: 3 } },
        { name: 'email', type: FORM_FIELD_TYPES.EMAIL, label: 'Email Address', required: true },
        { name: 'website', type: FORM_FIELD_TYPES.URL, label: 'Website URL' },
        { name: 'age', type: FORM_FIELD_TYPES.NUMBER, label: 'Age', min: 13, max: 120 },
        { name: 'priority', type: FORM_FIELD_TYPES.RANGE, label: 'Priority Level', min: 1, max: 10, step: 1 },
        { name: 'appointment', type: FORM_FIELD_TYPES.DATETIME_LOCAL, label: 'Appointment Date & Time' },
        { name: 'meeting_time', type: FORM_FIELD_TYPES.TIME, label: 'Meeting Time' },
        { name: 'bio', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Biography', maxLength: 500 },
        { name: 'role', type: FORM_FIELD_TYPES.SELECT, label: 'Role', options: ROLE_OPTIONS, required: true },
        { name: 'user_id', type: FORM_FIELD_TYPES.HIDDEN, label: 'User ID' }
      ],
      },
      
      validation: {
        mode: 'real-time',
        rules: ['required-fields', 'format-validation', 'custom-rules'],
        customValidators: {
          uniqueEmail: true,
          strongPassword: false
        }
      }
    },
    output: {
      data: {
        formData: {
          priority: 5,
          user_id: '',
          role: 'user'
        },
        isValid: false,
        validationErrors: [],
        metadata: {
          submittedAt: null,
          submitCount: 0,
          lastModified: new Date().toISOString(),
          formVersion: '2.0.0'
        }
      },
      // Enhanced directive generation for connected nodes
      directives: {
        // Auto-generate directives based on form state
        'validation-target': [
          DataDirective.create({
            type: 'update-config',
            target: {
              section: 'styling',
              path: 'states.current',
              operation: 'set'
            },
            payload: 'success',
            processing: {
              immediate: true,
              conditional: 'form.isValid === true'
            },
            meta: {
              source: 'enhanced-form-validation',
              description: 'Updates connected node styling based on form validity'
            }
          })
        ]
      }
    },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        filled: NodeVisualState.create({
          container: {
            backgroundColor: '#f0f9ff',
            borderColor: '#0ea5e9',
            borderWidth: 2
          },
          typography: {
            titleColor: '#0369a1'
          }
        }),
        invalid: NodeVisualState.create({
          container: {
            backgroundColor: '#fef2f2',
            borderColor: '#ef4444',
            borderWidth: 3
          },
          typography: {
            titleColor: '#dc2626'
          },
          effects: {
            shake: true
          }
        }),
        submitting: NodeVisualState.create({
          container: {
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b'
          },
          effects: {
            pulse: true,
            loading: true
          }
        }),
        success: NodeVisualState.create({
          container: {
            backgroundColor: '#f0fdf4',
            borderColor: '#22c55e'
          },
          effects: {
            glow: true
          }
        })
      },
      handles: {
        input: [
          HandleConfiguration.createInput({
            id: 'external-data-in',
            behavior: {
              allowMultipleConnections: false,
              acceptedDataTypes: ['object'],
              validationRules: ['form-compatible-data']
            },
            label: 'External Data',
            tooltip: 'Accepts external data to pre-populate form fields'
          })
        ],
        output: [
          HandleConfiguration.createOutput({
            id: 'form-data-out',
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ['object', 'string'],
              validationRules: ['non-empty-data']
            },
            label: 'Form Data',
            tooltip: 'Outputs validated form data to connected nodes',
            style: {
              backgroundColor: '#10b981',
              borderColor: '#065f46'
            }
          }),
          HandleConfiguration.createOutput({
            id: 'validation-out',
            position: 'bottom',
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ['object'],
              validationRules: ['validation-data']
            },
            label: 'Validation',
            tooltip: 'Outputs validation status and errors',
            style: {
              backgroundColor: '#f59e0b',
              borderColor: '#92400e'
            }
          })
        ]
      },
      theme: 'enhanced-form',
      custom: {
        formLayout: 'vertical',
        fieldSpacing: 16,
        animateTransitions: true
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Enhanced Advanced Form Node - Phase 8 Implementation
 * Features: File uploads, multi-media handling, complex validation
 * @returns {Object} Enhanced advanced form node configuration
 */
export const createEnhancedAdvancedFormNode = () => ({
  id: 'enhanced-advanced-form',
  position: { x: 50, y: 200 },
  data: InputNodeData.create({
    meta: {
      label: "Advanced File Form",
      function: "Multi-Media Form Collection",
      emoji: '📋',
      description: 'Advanced form with file uploads, multi-media, and complex validation',
      category: NODE_CATEGORIES.INPUT,
      capabilities: ['file-upload', 'multi-media', 'advanced-validation', 'data-export'],
      tags: ['files', 'media', 'validation', 'compliance'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({
        strategy: 'merge',
        meta: {
          fileProcessingEnabled: true,
          maxFileSize: '10MB',
          allowedTypes: ['documents', 'images']
        }
      }),
      config: {
        allowExternalData: true,
        autoSubmit: false,
        fileProcessing: {
          maxSize: 10485760, // 10MB
          validation: true,
          preview: true,
          compression: true
        },
        formFields: [
        {
          name: 'project_name',
          type: FORM_FIELD_TYPES.TEXT,
          label: 'Project Name',
          required: true,
          validation: { minLength: 3, pattern: '^[a-zA-Z0-9\\s-_]+$' }
        },
        {
          name: 'documents',
          type: FORM_FIELD_TYPES.FILE,
          label: 'Upload Documents',
          multiple: true,
          accept: FILE_UPLOAD_CONFIG.documentTypes,
          required: true,
          validation: { maxFiles: 5, maxSize: '5MB' }
        },
        {
          name: 'profile_image',
          type: FORM_FIELD_TYPES.FILE,
          label: 'Profile Image',
          accept: FILE_UPLOAD_CONFIG.imageTypes,
          validation: { maxSize: '2MB', dimensions: '500x500' }
        },
        {
          name: 'terms_accepted',
          type: FORM_FIELD_TYPES.CHECKBOX,
          label: 'I agree to the terms and conditions',
          required: true,
          validation: { mustBeTrue: true }
        },
        { name: 'newsletter_subscribe', type: FORM_FIELD_TYPES.CHECKBOX, label: 'Subscribe to newsletter' },
        {
          name: 'privacy_consent',
          type: FORM_FIELD_TYPES.CHECKBOX,
          label: 'I consent to data processing',
          required: true,
          validation: { mustBeTrue: true }
        },
        {
          name: 'description',
          type: FORM_FIELD_TYPES.TEXTAREA,
          label: 'Project Description',
          validation: { minLength: 10, maxLength: 1000 }
        }
      ],
      },
      
      validation: {
        mode: 'real-time',
        rules: ['required-fields', 'file-validation', 'compliance-check'],
        fileValidation: {
          enabled: true,
          scanForVirus: false,
          validateMimeType: true
        }
      }
    },
    output: {
      data: {
        formData: {
          newsletter_subscribe: false,
          terms_accepted: false,
          privacy_consent: false
        },
        fileMetadata: {
          totalFiles: 0,
          totalSize: 0,
          processedFiles: []
        },
        complianceStatus: {
          termsAccepted: false,
          privacyConsent: false,
          dataProcessingCompliant: false
        }
      },
      directives: {
        'compliance-validator': [
          DataDirective.create({
            type: 'modify-behavior',
            target: {
              section: 'input',
              path: 'config.validationLevel',
              operation: 'set'
            },
            payload: 'strict',
            processing: {
              conditional: 'compliance.dataProcessingCompliant === true'
            },
            meta: {
              source: 'compliance-system'
            }
          })
        ]
      }
    },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        uploading: NodeVisualState.create({
          container: {
            backgroundColor: '#e0f2fe',
            borderColor: '#0277bd'
          },
          effects: {
            progress: true
          }
        }),
        validating: NodeVisualState.create({
          container: {
            backgroundColor: '#fff3e0',
            borderColor: '#f57c00'
          },
          effects: {
            pulse: true
          }
        }),
        compliant: NodeVisualState.create({
          container: {
            backgroundColor: '#e8f5e8',
            borderColor: '#2e7d32'
          },
          effects: {
            checkmark: true
          }
        })
      },
      handles: {
        output: [
          HandleConfiguration.createOutput({
            id: 'form-data-out',
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ['object'],
              validationRules: ['complete-form-data']
            },
            label: 'Form & Files',
            tooltip: 'Complete form data with file metadata'
          }),
          HandleConfiguration.createOutput({
            id: 'files-out',
            position: 'bottom',
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ['array', 'object'],
              validationRules: ['file-data']
            },
            label: 'Files Only',
            tooltip: 'File data and metadata only',
            style: {
              backgroundColor: '#7c3aed',
              borderColor: '#5b21b6'
            }
          })
        ]
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Enhanced Prompt Input Node - Phase 8 Implementation
 * Features: Advanced LLM configuration, prompt templating, context injection
 * @returns {Object} Enhanced prompt input node configuration
 */
export const createEnhancedPromptInputNode = () => ({
  id: 'enhanced-prompt-input',
  position: { x: 50, y: 400 },
  data: InputNodeData.create({
    meta: {
      label: "AI Prompt Studio",
      function: "Advanced LLM Input",
      emoji: '🖋️',
      description: 'Advanced prompt input with templating and context injection',
      category: NODE_CATEGORIES.INPUT,
      capabilities: ['prompt-templating', 'context-injection', 'model-selection', 'parameter-tuning'],
      tags: ['llm', 'ai', 'prompt', 'templating'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({
        strategy: 'merge',
        meta: { contextInjection: true, templateProcessing: true }
      }),
      config: {
        allowExternalData: true,
        contextInjection: { enabled: true, maxContextLength: 4000, injectionPoint: 'before-prompt' },
        formFields: [
        { name: 'prompt_template', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Prompt Template', required: true },
        { name: 'model', type: FORM_FIELD_TYPES.SELECT, label: 'Model', options: LLM_MODEL_OPTIONS, required: true },
        { name: 'max_tokens', type: FORM_FIELD_TYPES.NUMBER, label: 'Max Tokens', min: 10, max: 8192, value: DEFAULT_LLM_CONFIG.maxTokens },
        { name: 'temperature', type: FORM_FIELD_TYPES.RANGE, label: 'Temperature', min: 0, max: 2, step: 0.1, value: DEFAULT_LLM_CONFIG.temperature }
      ]
      },
      
    },
    output: { data:{}
      //data: { processedPrompt: "", model: DEFAULT_LLM_CONFIG.model, parameters: { max_tokens: DEFAULT_LLM_CONFIG.maxTokens, temperature: DEFAULT_LLM_CONFIG.temperature } }
    },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        template_valid: NodeVisualState.create({ container: { backgroundColor: '#f0f9ff', borderColor: '#0284c7' } }),
        ready_for_processing: NodeVisualState.create({ container: { backgroundColor: '#ecfdf5', borderColor: '#059669' }, effects: { glow: true } })
      },
      handles: {
        input: [HandleConfiguration.createInput({ id: 'context-injection', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['string', 'object'] }, label: 'Context' })],
        output: [HandleConfiguration.createOutput({ id: 'processed-prompt-out', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['object'] }, label: 'Processed Prompt' })]
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Creates a prompt input node for LLM interactions
 * @returns {Object} Prompt input node configuration
 */
export const createPromptInputNode = () => ({
  id: 'Prompt',
  position: { x: 50, y: 250 },
  data: InputNodeData.create({
    meta: {
      label: "Prompt",
      function: "LLM Input",
      emoji: '🖋️',
      description: 'Input node for LLM prompts and model selection',
      category: NODE_CATEGORIES.INPUT
    },
    input: {
      config: {
        formFields: [
          { name: 'max_tokens', type: FORM_FIELD_TYPES.HIDDEN },
          { name: 'prompt', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Prompt' },
          { name: 'model', type: FORM_FIELD_TYPES.SELECT, label: 'Model', options: LLM_MODEL_OPTIONS }
        ],
        validation: DEFAULT_FORM_CONFIGS.validation
      }
    },
    output: {
      data: {
        prompt: "",
        model: DEFAULT_LLM_CONFIG.model,
        max_tokens: DEFAULT_LLM_CONFIG.maxTokens
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Enhanced LLM Process Node - Phase 8 Implementation
 * Features: Multi-input aggregation, advanced processing strategies, performance monitoring
 */
export const createEnhancedLLMProcessNode = () => ({
  id: 'enhanced-llm-processor',
  position: { x: 400, y: 250 },
  data: ProcessNodeData.create({
    meta: {
      label: "AI Processing Engine",
      function: "Advanced LLM Inference",
      emoji: '🧠',
      description: 'Advanced LLM processing with multi-input aggregation and monitoring',
      capabilities: ['multi-input-processing', 'context-aware-inference', 'performance-monitoring'],
      tags: ['ai', 'llm', 'processing'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({ strategy: 'priority-merge' }),
      config: { allowMultipleConnections: true, aggregationStrategy: 'priority-merge', processingMode: 'streaming' }
    },
    output: { data: { response: '', streaming: false, metadata: { processingTime: 0, tokensGenerated: 0 } } },
    plugin: { name: 'llm-processor', version: '2.0.0', config: { ...DEFAULT_LLM_CONFIG, model: 'llama3.2', streaming: { enabled: true } } },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        processing: NodeVisualState.create({ container: { backgroundColor: '#e0f2fe', borderColor: '#0277bd' }, effects: { pulse: true } }),
        streaming: NodeVisualState.create({ container: { backgroundColor: '#f3e5f5', borderColor: '#7b1fa2' }, effects: { stream: true } })
      },
      handles: {
        input: [
          HandleConfiguration.createInput({ id: 'primary-prompt', behavior: { allowMultipleConnections: false, acceptedDataTypes: ['object', 'string'] }, label: 'Primary Prompt' }),
          HandleConfiguration.createInput({ id: 'context-data', position: 'top', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['string', 'object', 'array'] }, label: 'Context' })
        ],
        output: [HandleConfiguration.createOutput({ id: 'response-output', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['string', 'object'] }, label: 'Response' })]
      }
    }
  }),
  type: NODE_TYPES.PROCESS_NEW
});

/**
 * Creates an LLM process node
 * @returns {Object} LLM process node configuration
 */
export const createLLMProcessNode = () => ({
  id: 'llm',
  position: { x: 100, y: 125 },
  data: ProcessNodeData.create({
    meta: {
      label: "Ollama LLM",
      function: "LLM Inference",
      emoji: '⚙️',
      description: 'Processes text using Ollama LLM'
    },
    input: {
      config: {
        aggregationStrategy: DEFAULT_FORM_CONFIGS.aggregationStrategy,
        requiredInputs: ['prompt'],
        expectedDataTypes: ['object', 'string'],
        allowMultipleConnections:false
      }
    },
    output: {
      data: {}
    },
    plugin: {
      name: 'llm-processor',
      config: {
        ...DEFAULT_LLM_CONFIG,
        model: 'llama3.2',
        inputCombinationStrategy: 'structured'
      }
    }
  }),
  type: NODE_TYPES.PROCESS_NEW
});

/**
 * Enhanced API Fetch Node - Phase 8 Implementation
 * Features: Multi-endpoint support, request chaining, response caching
 */
export const createEnhancedAPIFetchNode = () => ({
  id: 'enhanced-api-fetch',
  position: { x: 600, y: 400 },
  data: ProcessNodeData.create({
    meta: {
      label: "API Gateway",
      function: "Advanced HTTP Client",
      emoji: '🌐',
      description: 'Advanced API client with multi-endpoint support and caching',
      capabilities: ['multi-endpoint', 'request-chaining', 'response-caching'],
      tags: ['api', 'http', 'caching'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({ strategy: 'merge' }),
      config: { allowMultipleConnections: true, requestConfig: { url: API_CONFIG.defaultUrl, method: API_CONFIG.defaultMethod, timeout: API_CONFIG.defaultTimeout, caching: { enabled: true, ttl: 300000 } } }
    },
    output: { data: { result: null, status: 'idle', error: null, responseTime: null, cacheHit: false, metadata: { endpoint: '', method: '', timestamp: new Date().toISOString() } } },
    plugin: { name: 'api-fetch-processor', version: '2.0.0', config: { caching: { enabled: true, maxCacheSize: 100 }, retryLogic: { enabled: true, maxRetries: 3 } } },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        requesting: NodeVisualState.create({ container: { backgroundColor: '#e3f2fd', borderColor: '#1976d2' }, effects: { pulse: true } }),
        cached: NodeVisualState.create({ container: { backgroundColor: '#f3e5f5', borderColor: '#7b1fa2' } }),
        success: NodeVisualState.createSuccess()
      },
      handles: {
        input: [HandleConfiguration.createInput({ id: 'request-config', behavior: { allowMultipleConnections: false, acceptedDataTypes: ['object'] }, label: 'Config' })],
        output: [HandleConfiguration.createOutput({ id: 'response-data', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['object'] }, label: 'Response' })]
      }
    }
  }),
  type: NODE_TYPES.FETCH_NODE_NEW
});

/**
 * Enhanced Markdown Display Node - Phase 8 Implementation
 * Features: Multi-source aggregation, live editing, export capabilities
 */
export const createEnhancedMarkdownDisplayNode = () => ({
  id: 'enhanced-markdown-display',
  position: { x: 800, y: 150 },
  data: OutputNodeData.create({
    meta: {
      label: "Markdown Renderer Pro",
      function: "Advanced Content Display",
      emoji: '📝',
      description: 'Advanced markdown renderer with multi-source aggregation',
      capabilities: ['multi-source-rendering', 'live-editing', 'export-formats'],
      tags: ['markdown', 'rendering', 'export'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({ strategy: 'merge' }),
      config: { allowMultipleConnections: true, displayFormat: 'markdown', autoUpdate: true, renderingOptions: { syntaxHighlighting: true, mathRendering: true } }
    },
    output: { data: { content: DEFAULT_MARKDOWN_CONTENT, rendered: true, wordCount: 45, lastUpdated: new Date().toISOString() } },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        rendering: NodeVisualState.create({ container: { backgroundColor: '#f8f9fa', borderColor: '#6c757d' } }),
        populated: NodeVisualState.create({ container: { backgroundColor: '#e3f2fd', borderColor: '#1976d2' } })
      },
      handles: {
        input: [
          HandleConfiguration.createInput({ id: 'primary-content', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['string', 'object'] }, label: 'Content' }),
          HandleConfiguration.createInput({ id: 'metadata-input', position: 'top', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['object'] }, label: 'Metadata' })
        ]
      }
    }
  }),
  type: NODE_TYPES.MARKDOWN_NEW
});

/**
 * Enhanced Template Form Node - Phase 8 Implementation
 * Features: Dynamic templates, workflow integration, advanced validation
 */
export const createEnhancedTemplateFormNode = () => ({
  id: 'enhanced-template-form',
  position: { x: 50, y: 600 },
  data: InputNodeData.create({
    meta: {
      label: "Smart Template Form",
      function: "Dynamic Template System",
      emoji: '🎯',
      description: 'Dynamic template-based form with workflow integration',
      capabilities: ['dynamic-templates', 'workflow-integration', 'conditional-fields'],
      tags: ['templates', 'workflow', 'dynamic'],
      version: '2.0.0'
    },
    input: {
      processed: ProcessedDataCollection.create({ strategy: 'latest' }),
      config: { allowExternalData: true, templateEngine: { enabled: true, conditionalFields: true, dataBinding: true } },
      formFields: [
        { name: 'task_name', type: FORM_FIELD_TYPES.TEXT, label: 'Task Name', required: true },
        { name: 'priority', type: FORM_FIELD_TYPES.SELECT, label: 'Priority', options: PRIORITY_OPTIONS },
        { name: 'due_date', type: FORM_FIELD_TYPES.DATETIME_LOCAL, label: 'Due Date' },
        { name: 'completion', type: FORM_FIELD_TYPES.RANGE, label: 'Completion %', min: 0, max: 100, step: 5 },
        { name: 'notes', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Notes' },
        { name: 'active', type: FORM_FIELD_TYPES.CHECKBOX, label: 'Active Task' }
      ]
    },
    output: { data: { formData: { priority: 'medium', completion: 0, active: true }, templateMetadata: { templateVersion: '2.0.0', fieldsRendered: [] } } },
    styling: {
      states: {
        default: NodeVisualState.createDefault(),
        template_loading: NodeVisualState.create({ container: { backgroundColor: '#fff3e0', borderColor: '#f57c00' } }),
        ready: NodeVisualState.create({ container: { backgroundColor: '#e8f5e8', borderColor: '#2e7d32' } })
      },
      handles: {
        input: [HandleConfiguration.createInput({ id: 'template-config', behavior: { allowMultipleConnections: false, acceptedDataTypes: ['object'] }, label: 'Template Config' })],
        output: [HandleConfiguration.createOutput({ id: 'template-data-out', behavior: { allowMultipleConnections: true, acceptedDataTypes: ['object'] }, label: 'Template Data' })]
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Creates an API fetch node
 * @returns {Object} API fetch node configuration
 */
export const createAPIFetchNode = () => ({
  id: 'fetchAPI',
  position: { x: 400, y: 200 },
  data: ProcessNodeData.create({
    meta: {
      label: "API Fetch",
      function: "HTTP Request",
      emoji: '🌐',
      description: 'Performs HTTP requests to external APIs'
    },
    input: {
      config: {
        url: API_CONFIG.defaultUrl,
        method: API_CONFIG.defaultMethod,
        headers: {},
        timeout: API_CONFIG.defaultTimeout,
        autoFetch: true
      }
    },
    output: {
      data: {
        result: null,
        status: 'idle',
        error: null,
        responseTime: null,
        statusCode: null
      }
    }
  }),
  type: NODE_TYPES.FETCH_NODE_NEW
});

/**
 * Creates a markdown display node
 * @returns {Object} Markdown display node configuration
 */
export const createMarkdownDisplayNode = () => ({
  id: 'markDown',
  position: { x: 600, y: 50 },
  data: OutputNodeData.create({
    meta: {
      label: "Markdown Display",
      function: "Renderer",
      emoji: '📝',
      description: 'Renders markdown content with syntax highlighting'
    },
    input: {
      config: {
        allowMultipleConnections:true,
        displayFormat: DEFAULT_FORM_CONFIGS.displayFormat,
        autoUpdate: DEFAULT_FORM_CONFIGS.autoUpdate,
        styleConfig: DEFAULT_STYLE_CONFIG,
        
      }
    },
    output: {
      data: {
        content: DEFAULT_MARKDOWN_CONTENT,
        wordCount: 45,
        lastUpdated: new Date().toISOString()
      }
    }
  }),
  type: NODE_TYPES.MARKDOWN_NEW
});

/**
 * Creates a template form node for task management
 * @returns {Object} Template form node configuration
 */
export const createTemplateFormNode = () => ({
  id: 'form',
  position: { x: 50, y: 350 },
  data: InputNodeData.create({
    meta: {
      label: "Template Form",
      function: "Enhanced Form Node",
      emoji: '🎯',
      description: 'Template-based form for task management',
      category: NODE_CATEGORIES.INPUT
    },
    input: {
      config: {
        formFields: [
          { name: 'task_name', type: FORM_FIELD_TYPES.TEXT, label: 'Task Name', required: true },
          { name: 'priority', type: FORM_FIELD_TYPES.SELECT, label: 'Priority', options: PRIORITY_OPTIONS },
          { name: 'due_date', type: FORM_FIELD_TYPES.DATETIME_LOCAL, label: 'Due Date' },
          { name: 'completion', type: FORM_FIELD_TYPES.RANGE, label: 'Completion %', min: 0, max: 100, step: 5 },
          { name: 'notes', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Notes' },
          { name: 'active', type: FORM_FIELD_TYPES.CHECKBOX, label: 'Active Task' }
        ],
        validation: DEFAULT_FORM_CONFIGS.validation
      }
    },
    output: {
      data: {
        priority: 'medium',
        completion: 0,
        active: true
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Enhanced Initial Nodes Array - Phase 8 Implementation
 * Contains all enhanced nodes with comprehensive schema compliance
 */
export const initialNodes = [
  createEnhancedFormNode(),
  createEnhancedAdvancedFormNode(),
  createEnhancedPromptInputNode(),
  createEnhancedLLMProcessNode(),
  createEnhancedAPIFetchNode(),
  createEnhancedMarkdownDisplayNode(),
  createEnhancedTemplateFormNode()
];

/**
 * Default initial edges array for the ReactFlow canvas
 * Enhanced with connection metadata
 */
export const initialEdges = []
/*[
  // Example multi-connection setup demonstrating Phase 8 capabilities
 
  {
    id: 'prompt-to-llm-context',
    source: 'enhanced-prompt-input',
    target: 'enhanced-llm-processor',
    sourceHandle: 'default',
    targetHandle: 'default',
    type: 'smoothstep',
    data: {
      connectionType: 'context-injection',
      priority: 8,
      validation: ['context-compatible']
    }
  },
  {
    id: 'llm-to-markdown',
    source: 'enhanced-llm-processor',
    target: 'enhanced-markdown-display',
    sourceHandle: 'default',
    targetHandle: 'default',
    type: 'smoothstep',
    animated: true,
    data: {
      connectionType: 'output-display',
      priority: 9,
      validation: ['llm-to-display-compatible']
    }
  }
];
*/

/**
 * Enhanced Node Factory Functions - Phase 8 Implementation
 * Provides both enhanced and legacy node creation functions
 */
export const nodeFactories = {
  // Enhanced Phase 8 factories
  enhancedFormNode: createEnhancedFormNode,
  enhancedAdvancedFormNode: createEnhancedAdvancedFormNode,
  enhancedPromptInputNode: createEnhancedPromptInputNode,
  enhancedLLMProcessNode: createEnhancedLLMProcessNode,
  enhancedAPIFetchNode: createEnhancedAPIFetchNode,
  enhancedMarkdownDisplayNode: createEnhancedMarkdownDisplayNode,
  enhancedTemplateFormNode: createEnhancedTemplateFormNode,
  
  // Legacy factories for backward compatibility
  formNode: createEnhancedFormNode, // Redirect to enhanced version
  advancedFormNode: createEnhancedAdvancedFormNode,
  promptInputNode: createEnhancedPromptInputNode,
  llmProcessNode: createEnhancedLLMProcessNode,
  apiFetchNode: createEnhancedAPIFetchNode,
  markdownDisplayNode: createEnhancedMarkdownDisplayNode,
  templateFormNode: createEnhancedTemplateFormNode
};

/**
 * Phase 8 Node Categories for Enhanced Organization
 */
export const ENHANCED_NODE_CATEGORIES = {
  ENHANCED_INPUT: {
    label: 'Enhanced Input Nodes',
    description: 'Advanced input nodes with multi-connection support and directive generation',
    nodes: [
      'enhancedFormNode',
      'enhancedAdvancedFormNode',
      'enhancedPromptInputNode',
      'enhancedTemplateFormNode'
    ]
  },
  ENHANCED_PROCESS: {
    label: 'Enhanced Process Nodes',
    description: 'Advanced processing nodes with multi-input aggregation and monitoring',
    nodes: [
      'enhancedLLMProcessNode',
      'enhancedAPIFetchNode'
    ]
  },
  ENHANCED_OUTPUT: {
    label: 'Enhanced Output Nodes',
    description: 'Advanced output nodes with multi-source rendering and export capabilities',
    nodes: [
      'enhancedMarkdownDisplayNode'
    ]
  }
};

/**
 * Phase 8 Workflow Templates
 * Pre-configured node combinations demonstrating enhanced capabilities
 */
export const ENHANCED_WORKFLOW_TEMPLATES = {
  AI_PROCESSING_PIPELINE: {
    name: 'AI Processing Pipeline',
    description: 'Complete AI workflow with form input, prompt processing, and markdown output',
    nodes: [
      { factory: 'enhancedFormNode', position: { x: 50, y: 100 } },
      { factory: 'enhancedPromptInputNode', position: { x: 50, y: 300 } },
      { factory: 'enhancedLLMProcessNode', position: { x: 400, y: 200 } },
      { factory: 'enhancedMarkdownDisplayNode', position: { x: 800, y: 200 } }
    ],
    connections: [
      { from: 0, to: 2, sourceHandle: 'form-data-out', targetHandle: 'primary-prompt' },
      { from: 1, to: 2, sourceHandle: 'processed-prompt-out', targetHandle: 'context-data' },
      { from: 2, to: 3, sourceHandle: 'response-output', targetHandle: 'primary-content' }
    ]
  },
  MULTI_SOURCE_AGGREGATION: {
    name: 'Multi-Source Data Aggregation',
    description: 'Demonstrates multi-connection capabilities with data aggregation',
    nodes: [
      { factory: 'enhancedFormNode', position: { x: 50, y: 100 } },
      { factory: 'enhancedAdvancedFormNode', position: { x: 50, y: 300 } },
      { factory: 'enhancedAPIFetchNode', position: { x: 400, y: 200 } },
      { factory: 'enhancedMarkdownDisplayNode', position: { x: 800, y: 200 } }
    ],
    connections: [
      { from: 0, to: 3, sourceHandle: 'form-data-out', targetHandle: 'primary-content' },
      { from: 1, to: 3, sourceHandle: 'form-data-out', targetHandle: 'metadata-input' },
      { from: 2, to: 3, sourceHandle: 'response-data', targetHandle: 'primary-content' }
    ]
  }
};