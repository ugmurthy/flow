/**
 * Application constants and configuration values
 * Centralized location for all magic numbers, URLs, and configuration objects
 */

// Application metadata
export const APP_METADATA = {
  title: 'JobRunner Workflow',
  version: 'V0.1.0',
};

// Schema initialization configuration
export const SCHEMA_CONFIG = {
  registerBuiltinPlugins: true,
  validateOnInit: true,
  pluginConfigs: {
    llmProcessor: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      maxTokens: 4096,
      temperature: 0.7
    },
    dataTransformer: {
      strategy: 'merge',
      preserveMetadata: true,
      errorHandling: 'skip'
    }
  }
};

// Default LLM configuration
export const DEFAULT_LLM_CONFIG = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  maxTokens: 4096,
  temperature: 0.7
};

// API configuration
export const API_CONFIG = {
  defaultTimeout: 30000,
  defaultUrl: 'https://jsonplaceholder.typicode.com/posts/1',
  defaultMethod: 'GET'
};

// UI Panel positions and styling
export const PANEL_CONFIG = {
  title: {
    position: 'top-center',
    className: 'text-2xl text-blue-500'
  },
  version: {
    position: 'bottom-right'
  },
  nodeTypes: {
    position: 'top-right',
    className: 'border-2 border-gray-600 p-2 rounded-lg bg-white w-64'
  }
};

// Background configuration
export const BACKGROUND_CONFIG = {
  primary: {
    variant: 'Lines',
    gap: 10,
    color: '#f1f1f1',
    id: '1'
  },
  secondary: {
    variant: 'Lines', 
    gap: 100,
    color: '#ccc',
    id: '2'
  }
};

// Node type mappings
export const NODE_TYPES = {
  PROCESS_NEW: 'processNew',
  FETCH_NODE: 'fetchNode',
  FETCH_NODE_NEW: 'fetchNodeNew',
  MARKDOWN_NODE: 'markdownNode',
  MARKDOWN_NEW: 'markdownNew',
  TEMPLATE_FORM_NODE: 'templateFormNode'
};

// Form field types
export const FORM_FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  URL: 'url',
  NUMBER: 'number',
  RANGE: 'range',
  DATETIME_LOCAL: 'datetime-local',
  TIME: 'time',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  HIDDEN: 'hidden',
  FILE: 'file',
  CHECKBOX: 'checkbox'
};

// Node categories
export const NODE_CATEGORIES = {
  INPUT: 'input',
  PROCESS: 'process',
  OUTPUT: 'output'
};

// Default form field configurations
export const DEFAULT_FORM_CONFIGS = {
  validation: {},
  aggregationStrategy: 'merge',
  displayFormat: 'markdown',
  autoUpdate: true
};

// File upload configurations
export const FILE_UPLOAD_CONFIG = {
  documentTypes: '.pdf,.doc,.docx,.txt',
  imageTypes: 'image/*'
};

// Priority options for forms
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

// Role options for forms
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'User' },
  { value: 'guest', label: 'Guest' }
];

// LLM model options
export const LLM_MODEL_OPTIONS = [
  { value: 'llama3.2', label: 'llama3.2' },
  { value: 'gemma3:27b', label: 'gemma3:27b' },
  { value: 'gpt-oss', label: 'gpt-oss' }
];

// Default markdown content
export const DEFAULT_MARKDOWN_CONTENT = `# Markdown Renderer

## Code Example
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Features
- **Bold** and *italic* text
- Lists and links
- Code blocks with syntax highlighting
- Tables and more!

## Table Example
| Feature | Status |
|---------|--------|
| Headers | ✅ |
| Lists | ✅ |
| Code | ✅ |
| Tables | ✅ |

> This content can be dynamically updated by connecting other nodes!`;

// Default style configurations
export const DEFAULT_STYLE_CONFIG = {
  width: 'auto',
  textColor: '#374151',
  fontSize: '14px'
};

// Event handling timeouts
export const EVENT_TIMEOUTS = {
  WORKFLOW_VALIDITY_UPDATE: 0
};

// Export file naming
export const EXPORT_CONFIG = {
  filePrefix: 'workflow_export_',
  fileExtension: '.json',
  mimeType: 'application/json',
  exportDescription: 'Exported from JobRunner Workflow',
  exportVersion: '1.0.0'
};