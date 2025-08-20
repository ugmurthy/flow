/**
 * Initial nodes configuration for the ReactFlow canvas
 * Contains all default node definitions with their data structures
 */

import { InputNodeData, ProcessNodeData, OutputNodeData } from '../types/nodeSchema.js';
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
 * Creates a basic form node with common form fields
 * @returns {Object} Form node configuration
 */
export const createFormNode = () => ({
  id: 'UserForm',
  position: { x: 50, y: 50 },
  data: InputNodeData.create({
    meta: {
      label: "Form Node",
      function: "Dynamic Form",
      emoji: '📝',
      description: 'Collects user input through dynamic forms',
      category: NODE_CATEGORIES.INPUT
    },
    input: {
      config: {
        formFields: [
          { name: 'username', type: FORM_FIELD_TYPES.TEXT, label: 'Username', required: true },
          { name: 'email', type: FORM_FIELD_TYPES.EMAIL, label: 'Email Address', required: true },
          { name: 'website', type: FORM_FIELD_TYPES.URL, label: 'Website URL' },
          { name: 'age', type: FORM_FIELD_TYPES.NUMBER, label: 'Age' },
          { name: 'priority', type: FORM_FIELD_TYPES.RANGE, label: 'Priority Level', min: 1, max: 10, step: 1 },
          { name: 'appointment', type: FORM_FIELD_TYPES.DATETIME_LOCAL, label: 'Appointment Date & Time' },
          { name: 'meeting_time', type: FORM_FIELD_TYPES.TIME, label: 'Meeting Time' },
          { name: 'bio', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Biography' },
          { name: 'role', type: FORM_FIELD_TYPES.SELECT, label: 'Role', options: ROLE_OPTIONS },
          { name: 'user_id', type: FORM_FIELD_TYPES.HIDDEN, label: 'User ID' }
        ],
        validation: DEFAULT_FORM_CONFIGS.validation
      }
    },
    output: {
      data: {
        priority: 5,
        user_id: ''
      }
    }
  }),
  type: NODE_TYPES.TEMPLATE_FORM_NODE
});

/**
 * Creates an advanced form node with file uploads and checkboxes
 * @returns {Object} Advanced form node configuration
 */
export const createAdvancedFormNode = () => ({
  id: 'FormAdvanced',
  position: { x: 50, y: 150 },
  data: InputNodeData.create({
    meta: {
      label: "Advanced Form",
      function: "File & Checkbox Demo",
      emoji: '📋',
      description: 'Advanced form with file uploads and checkboxes',
      category: NODE_CATEGORIES.INPUT
    },
    input: {
      config: {
        formFields: [
          { name: 'project_name', type: FORM_FIELD_TYPES.TEXT, label: 'Project Name', required: true },
          { 
            name: 'documents', 
            type: FORM_FIELD_TYPES.FILE, 
            label: 'Upload Documents', 
            multiple: true, 
            accept: FILE_UPLOAD_CONFIG.documentTypes, 
            required: true 
          },
          { 
            name: 'profile_image', 
            type: FORM_FIELD_TYPES.FILE, 
            label: 'Profile Image', 
            accept: FILE_UPLOAD_CONFIG.imageTypes 
          },
          { name: 'terms_accepted', type: FORM_FIELD_TYPES.CHECKBOX, label: 'I agree to the terms and conditions', required: true },
          { name: 'newsletter_subscribe', type: FORM_FIELD_TYPES.CHECKBOX, label: 'Subscribe to newsletter' },
          { name: 'privacy_consent', type: FORM_FIELD_TYPES.CHECKBOX, label: 'I consent to data processing', required: true },
          { name: 'description', type: FORM_FIELD_TYPES.TEXTAREA, label: 'Project Description' }
        ],
        validation: DEFAULT_FORM_CONFIGS.validation
      }
    },
    output: {
      data: {
        newsletter_subscribe: false,
        terms_accepted: false,
        privacy_consent: false
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
        allowMultipleConnections:true
      }
    },
    output: {
      data: {}
    },
    plugin: {
      name: 'llm-processor',
      config: {
        ...DEFAULT_LLM_CONFIG,
        model: 'gpt-oss',
        inputCombinationStrategy: 'structured'
      }
    }
  }),
  type: NODE_TYPES.PROCESS_NEW
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
 * Default initial nodes array for the ReactFlow canvas
 */
export const initialNodes = [
  createFormNode(),
  createAdvancedFormNode(),
  createPromptInputNode(),
  createLLMProcessNode(),
  createAPIFetchNode(),
  createMarkdownDisplayNode(),
  createTemplateFormNode()
];

/**
 * Default initial edges array for the ReactFlow canvas
 */
export const initialEdges = [];

/**
 * Node factory functions for dynamic node creation
 */
export const nodeFactories = {
  formNode: createFormNode,
  advancedFormNode: createAdvancedFormNode,
  promptInputNode: createPromptInputNode,
  llmProcessNode: createLLMProcessNode,
  apiFetchNode: createAPIFetchNode,
  markdownDisplayNode: createMarkdownDisplayNode,
  templateFormNode: createTemplateFormNode
};