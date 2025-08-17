# Updated Node Schema - Addressing Feedback

## 1. React Flow Alignment and NodeData.meta Revision

Based on the React Flow Node interface, I need to align the schema properly. The React Flow Node already has `id`, `type`, `position`, etc., so our `NodeData` should not duplicate these:

```typescript
// React Flow Node structure (top-level properties as per React Flow spec)
interface Node {
  id: string; // React Flow required
  position: { x: number; y: number }; // React Flow required
  data: NodeData; // Our custom data structure
  type?: string; // React Flow node type
  style?: CSSProperties; // React Flow styling
  className?: string; // React Flow CSS class
  draggable?: boolean; // React Flow drag behavior
  selectable?: boolean; // React Flow selection
  // ... other React Flow properties
}

// Updated NodeData - no redundancy with React Flow properties
interface NodeData {
  // Node Metadata (application-specific, non-redundant with React Flow)
  meta: {
    label: string; // Display name
    description?: string; // Optional description
    function: string; // Functional description
    emoji: string; // Visual icon
    version: string; // Schema version
    category: "input" | "process" | "output";
    capabilities: string[]; // What this node can do
  };

  // Input Data Structure
  input: {
    connections: {
      [edgeId: string]: {
        sourceNodeId: string;
        sourceLabel: string;
        data: any;
        timestamp: string;
        status: "pending" | "received" | "error";
      };
    };
    processed: Record<string, any>;
    config: Record<string, any>;
  };

  // Output Data Structure
  output: {
    data: Record<string, any>;
    meta: {
      timestamp: string;
      status: "idle" | "processing" | "success" | "error";
      processingTime?: number;
      dataSize?: number;
    };
  };

  // Error Handling
  error: {
    hasError: boolean;
    errors: Array<{
      code: string;
      message: string;
      timestamp: string;
      source: "input" | "processing" | "output";
      details?: any;
    }>;
  };

  // Plugin Configuration (for Process nodes)
  plugin?: {
    name: string;
    version: string;
    config: Record<string, any>;
    state: Record<string, any>;
  };
}
```

## 2. Plugin Example - Text Processor

Here's a complete plugin example:

```typescript
import {
  INodePlugin,
  ProcessingInput,
  ProcessingOutput,
  ValidationResult,
} from "../types/nodeSchema";

export interface TextProcessorConfig {
  operation: "uppercase" | "lowercase" | "reverse" | "wordcount" | "trim";
  prefix?: string;
  suffix?: string;
  separator?: string; // For wordcount, what to use as separator
}

export class TextProcessor implements INodePlugin {
  name = "text-processor";
  version = "1.0.0";
  description = "Performs basic text processing operations on input text";

  private config: TextProcessorConfig | null = null;

  async initialize(config: TextProcessorConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
    }
    this.config = config;
  }

  async process(inputs: ProcessingInput[]): Promise<ProcessingOutput> {
    if (!this.config) {
      throw new Error("Plugin not initialized");
    }

    const startTime = Date.now();

    try {
      // Combine all text inputs
      const textInputs = inputs
        .map((input) => this.extractText(input.data))
        .filter((text) => text !== null);

      if (textInputs.length === 0) {
        throw new Error("No valid text inputs found");
      }

      const combinedText = textInputs.join(" ");
      let result: any;

      // Apply the configured operation
      switch (this.config.operation) {
        case "uppercase":
          result = combinedText.toUpperCase();
          break;
        case "lowercase":
          result = combinedText.toLowerCase();
          break;
        case "reverse":
          result = combinedText.split("").reverse().join("");
          break;
        case "wordcount":
          const separator = this.config.separator || " ";
          const words = combinedText
            .split(separator)
            .filter((word) => word.trim().length > 0);
          result = {
            text: combinedText,
            wordCount: words.length,
            words: words,
          };
          break;
        case "trim":
          result = combinedText.trim();
          break;
        default:
          throw new Error(`Unknown operation: ${this.config.operation}`);
      }

      // Apply prefix/suffix if configured
      if (typeof result === "string") {
        if (this.config.prefix) result = this.config.prefix + result;
        if (this.config.suffix) result = result + this.config.suffix;
      }

      return {
        data: {
          result,
          operation: this.config.operation,
          inputCount: textInputs.length,
          originalLength: combinedText.length,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          inputsUsed: inputs.map((i) => i.id),
          status: "success",
        },
      };
    } catch (error) {
      return {
        data: {},
        metadata: {
          processingTime: Date.now() - startTime,
          inputsUsed: inputs.map((i) => i.id),
          status: "error",
        },
        errors: [
          {
            code: "TEXT_PROCESSING_ERROR",
            message: error.message,
            details: error,
          },
        ],
      };
    }
  }

  async cleanup(): Promise<void> {
    this.config = null;
  }

  getCapabilities(): string[] {
    return ["text-transformation", "text-analysis", "string-manipulation"];
  }

  getConfigSchema(): any {
    return {
      type: "object",
      required: ["operation"],
      properties: {
        operation: {
          type: "string",
          enum: ["uppercase", "lowercase", "reverse", "wordcount", "trim"],
          description: "Text processing operation to perform",
        },
        prefix: {
          type: "string",
          description: "Text to add before the result",
        },
        suffix: {
          type: "string",
          description: "Text to add after the result",
        },
        separator: {
          type: "string",
          description: "Separator for word counting (default: space)",
        },
      },
    };
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.operation) {
      errors.push("Operation is required");
    } else if (
      !["uppercase", "lowercase", "reverse", "wordcount", "trim"].includes(
        config.operation
      )
    ) {
      errors.push("Invalid operation specified");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private extractText(data: any): string | null {
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      // Try common text fields
      return data.text || data.content || data.result || data.prompt || null;
    }
    return null;
  }
}

// Usage example:
const textProcessor = new TextProcessor();
await textProcessor.initialize({
  operation: "uppercase",
  prefix: ">>> ",
  suffix: " <<<",
});

const result = await textProcessor.process([
  {
    id: "input1",
    data: { text: "hello world" },
    metadata: {
      sourceNodeId: "form1",
      sourceType: "form",
      timestamp: "2025-01-01T00:00:00Z",
    },
  },
]);
// Result: { result: '>>> HELLO WORLD <<<', operation: 'uppercase', ... }
```

## 3. Data Transformation Plugin - Strategy Examples

Here are detailed examples for each transformation strategy:

```typescript
export class DataTransformer implements INodePlugin {
  // ... (initialization code)

  // MERGE Strategy - Combines all inputs into a single object
  private mergeInputs(inputs: ProcessingInput[]): any {
    return inputs.reduce((acc, input) => {
      if (typeof input.data === "object" && input.data !== null) {
        // Merge object properties
        return { ...acc, ...input.data };
      } else {
        // Use source node ID as key for primitive values
        return { ...acc, [input.metadata.sourceNodeId]: input.data };
      }
    }, {});
  }

  // FILTER Strategy - Filters inputs based on rules
  private filterInputs(inputs: ProcessingInput[]): any {
    const rules = this.config?.rules || [];

    return inputs
      .filter((input) => {
        return rules.every((rule) => {
          if (rule.operation === "filter") {
            // Apply filter condition
            const value = this.getNestedValue(input.data, rule.field);
            return this.evaluateCondition(value, rule.condition);
          }
          return true;
        });
      })
      .map((input) => input.data);
  }

  // MAP Strategy - Transforms each input
  private mapInputs(inputs: ProcessingInput[]): any {
    const rules = this.config?.rules || [];

    return inputs.map((input) => {
      let transformed = { ...input.data };

      rules.forEach((rule) => {
        if (rule.operation === "rename") {
          // Rename field
          if (transformed[rule.field] !== undefined) {
            transformed[rule.target] = transformed[rule.field];
            delete transformed[rule.field];
          }
        } else if (rule.operation === "transform") {
          // Apply transformation function
          const value = this.getNestedValue(transformed, rule.field);
          const newValue = this.applyTransformation(value, rule.transformation);
          this.setNestedValue(transformed, rule.target || rule.field, newValue);
        }
      });

      return transformed;
    });
  }

  // REDUCE Strategy - Reduces inputs to a single value
  private reduceInputs(inputs: ProcessingInput[]): any {
    const rules = this.config?.rules || [];
    const reduceRule = rules.find((r) => r.operation === "reduce");

    if (!reduceRule) {
      // Default: sum numeric values, concatenate strings
      return inputs.reduce((acc, input) => {
        if (typeof input.data === "number") {
          return (typeof acc === "number" ? acc : 0) + input.data;
        } else if (typeof input.data === "string") {
          return (typeof acc === "string" ? acc : "") + input.data;
        } else if (Array.isArray(input.data)) {
          return Array.isArray(acc) ? [...acc, ...input.data] : input.data;
        }
        return input.data;
      }, null);
    }

    // Apply custom reduce logic based on rule
    return inputs.reduce((acc, input) => {
      const value = this.getNestedValue(input.data, reduceRule.field);
      return this.applyReduction(acc, value, reduceRule.transformation);
    }, null);
  }

  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private evaluateCondition(value: any, condition: string): boolean {
    // Simple condition evaluation (could be enhanced with a proper parser)
    // Examples: ">10", "==active", "contains:hello"
    if (condition.startsWith(">")) {
      return Number(value) > Number(condition.slice(1));
    } else if (condition.startsWith("==")) {
      return value === condition.slice(2);
    } else if (condition.startsWith("contains:")) {
      return String(value).includes(condition.slice(9));
    }
    return true;
  }

  private applyTransformation(value: any, transformation: string): any {
    // Simple transformation functions
    switch (transformation) {
      case "uppercase":
        return String(value).toUpperCase();
      case "lowercase":
        return String(value).toLowerCase();
      case "number":
        return Number(value);
      case "string":
        return String(value);
      case "length":
        return Array.isArray(value) ? value.length : String(value).length;
      default:
        return value;
    }
  }

  private applyReduction(acc: any, value: any, operation: string): any {
    switch (operation) {
      case "sum":
        return (acc || 0) + Number(value);
      case "concat":
        return (acc || "") + String(value);
      case "max":
        return Math.max(acc || -Infinity, Number(value));
      case "min":
        return Math.min(acc || Infinity, Number(value));
      case "count":
        return (acc || 0) + 1;
      default:
        return value;
    }
  }
}

// Example configurations:

// MERGE example
const mergeConfig = {
  strategy: "merge",
};
// Input: [{ name: 'John' }, { age: 30 }]
// Output: { name: 'John', age: 30 }

// FILTER example
const filterConfig = {
  strategy: "filter",
  rules: [
    { field: "age", operation: "filter", condition: ">18" },
    { field: "status", operation: "filter", condition: "==active" },
  ],
};
// Input: [{ age: 25, status: 'active' }, { age: 16, status: 'inactive' }]
// Output: [{ age: 25, status: 'active' }]

// MAP example
const mapConfig = {
  strategy: "map",
  rules: [
    { field: "firstName", operation: "rename", target: "name" },
    { field: "name", operation: "transform", transformation: "uppercase" },
  ],
};
// Input: [{ firstName: 'john' }]
// Output: [{ name: 'JOHN' }]

// REDUCE example
const reduceConfig = {
  strategy: "reduce",
  rules: [{ field: "amount", operation: "reduce", transformation: "sum" }],
};
// Input: [{ amount: 10 }, { amount: 20 }, { amount: 30 }]
// Output: 60
```

## 4. Custom Transform Strategy

For the 'custom' strategy, users can specify JavaScript functions as strings:

```typescript
export interface CustomTransformConfig extends TransformConfig {
  strategy: 'custom';
  customFunction: string; // JavaScript function as string
  functionType: 'transform' | 'filter' | 'reduce'; // What type of operation
}

// In DataTransformer class:
private customTransform(inputs: ProcessingInput[]): any {
  if (!this.config?.customFunction) {
    throw new Error('Custom function not provided');
  }

  try {
    // Create a safe execution context
    const safeContext = {
      inputs,
      console: { log: (...args: any[]) => console.log('[Custom Transform]', ...args) },
      Math,
      Date,
      JSON,
      // Add other safe globals as needed
    };

    // Create function with restricted context
    const func = new Function(
      'context',
      `
      const { inputs, console, Math, Date, JSON } = context;
      ${this.config.customFunction}
      `
    );

    return func(safeContext);
  } catch (error) {
    throw new Error(`Custom function execution failed: ${error.message}`);
  }
}

// Example custom function configurations:

// Custom Transform Example 1: Complex data processing
const customConfig1 = {
  strategy: 'custom',
  functionType: 'transform',
  customFunction: `
    // Process user data and calculate metrics
    return inputs.map(input => {
      const user = input.data;
      return {
        ...user,
        fullName: user.firstName + ' ' + user.lastName,
        ageGroup: user.age < 18 ? 'minor' : user.age < 65 ? 'adult' : 'senior',
        accountValue: user.balance * 1.05, // 5% interest
        lastUpdated: new Date().toISOString()
      };
    });
  `
};

// Custom Transform Example 2: Data aggregation
const customConfig2 = {
  strategy: 'custom',
  functionType: 'reduce',
  customFunction: `
    // Calculate statistics from sales data
    const sales = inputs.map(input => input.data);
    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const avgSale = totalSales / sales.length;
    const maxSale = Math.max(...sales.map(s => s.amount));
    const minSale = Math.min(...sales.map(s => s.amount));

    return {
      totalSales,
      averageSale: avgSale,
      maxSale,
      minSale,
      salesCount: sales.length,
      period: {
        start: Math.min(...sales.map(s => new Date(s.date).getTime())),
        end: Math.max(...sales.map(s => new Date(s.date).getTime()))
      }
    };
  `
};

// Custom Transform Example 3: Complex filtering
const customConfig3 = {
  strategy: 'custom',
  functionType: 'filter',
  customFunction: `
    // Advanced filtering with multiple conditions
    return inputs.filter(input => {
      const data = input.data;

      // Complex business logic
      const isValidUser = data.email && data.email.includes('@');
      const isActiveAccount = data.status === 'active' && data.lastLogin;
      const hasPermissions = data.permissions && data.permissions.length > 0;
      const isNotExpired = new Date(data.expiryDate) > new Date();

      return isValidUser && isActiveAccount && hasPermissions && isNotExpired;
    }).map(input => input.data);
  `
};
```

## 5. Plugin Limitations

Current plugin limitations and considerations:

### Security Limitations

```typescript
// Security constraints for custom functions
const SECURITY_LIMITATIONS = {
  // Restricted globals - these are NOT available in custom functions
  restrictedGlobals: [
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "Worker",
    "eval",
    "Function",
    "setTimeout",
    "setInterval",
    "require",
    "import",
    "process",
    "global",
  ],

  // Execution limits
  maxExecutionTime: 5000, // 5 seconds
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxOutputSize: 10 * 1024 * 1024, // 10MB

  // Function restrictions
  maxFunctionLength: 10000, // characters
  allowedPatterns: [
    /^[a-zA-Z0-9\s\.\[\]\{\}\(\)\+\-\*\/\=\!\<\>\&\|\?\:\;\"\'\_\,\n\r\t]+$/,
  ],
};
```

### Performance Limitations

```typescript
const PERFORMANCE_LIMITATIONS = {
  // Input size limits
  maxInputCount: 1000, // Maximum number of inputs
  maxInputSize: 100 * 1024, // 100KB per input
  maxTotalInputSize: 10 * 1024 * 1024, // 10MB total

  // Processing limits
  maxProcessingTime: 30000, // 30 seconds
  maxConcurrentPlugins: 10, // Per node

  // Memory limits
  maxPluginMemory: 100 * 1024 * 1024, // 100MB per plugin
  maxTotalMemory: 500 * 1024 * 1024, // 500MB total
};
```

### Functional Limitations

```typescript
const FUNCTIONAL_LIMITATIONS = {
  // Plugin capabilities
  noFileSystemAccess: true, // Cannot read/write files
  noNetworkAccess: true, // Cannot make HTTP requests (except configured APIs)
  noSystemAccess: true, // Cannot access system resources

  // Data type limitations
  supportedDataTypes: [
    "string",
    "number",
    "boolean",
    "object",
    "array",
    "null",
    "undefined",
  ],
  unsupportedDataTypes: [
    "function",
    "symbol",
    "bigint",
    "Buffer",
    "ArrayBuffer",
  ],

  // Plugin lifecycle
  maxInitializationTime: 10000, // 10 seconds
  maxCleanupTime: 5000, // 5 seconds
  automaticCleanupAfter: 300000, // 5 minutes of inactivity
};
```

## 6. Separating Initial Data from App.jsx

Let me create a separate file for the initial nodes and edges:

```typescript
// src/data/initialWorkflowData.ts
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '../types/nodeSchema';

export const initialNodes: Node<NodeData>[] = [
  {
    id: 'f1',
    position: { x: 200, y: 50 },
    type: 'templateFormNode',
    data: {
      meta: {
        label: "Form Node",
        function: "Dynamic Form",
        emoji: '📝',
        version: '1.0.0',
        category: 'input',
        capabilities: ['user-input', 'form-validation']
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            { name: 'username', type: 'text', label: 'Username', required: true },
            { name: 'email', type: 'email', label: 'Email Address', required: true },
            { name: 'website', type: 'url', label: 'Website URL' },
            { name: 'age', type: 'number', label: 'Age' },
            { name: 'priority', type: 'range', label: 'Priority Level', min: 1, max: 10, step: 1 },
            { name: 'appointment', type: 'datetime-local', label: 'Appointment Date & Time' },
            { name: 'meeting_time', type: 'time', label: 'Meeting Time' },
            { name: 'bio', type: 'textarea', label: 'Biography' },
            { name: 'role', type: 'select', label: 'Role', options: [
              { value: 'admin', label: 'Administrator' },
              { value: 'user', label: 'User' },
              { value: 'guest', label: 'Guest' }
            ]},
            { name: 'user_id', type: 'hidden', label: 'User ID' }
          ],
          defaultValues: {
            priority: 5,
            user_id: ''
          }
        }
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      },
      error: {
        hasError: false,
        errors: []
      }
    }
  },

  {
    id: 'f2',
    position: { x: 400, y: 50 },
    type: 'templateFormNode',
    data: {
      meta: {
        label: "Advanced Form",
        function: "File & Checkbox Demo",
        emoji: '📋',
        version: '1.0.0',
        category: 'input',
        capabilities: ['user-input', 'file-upload', 'form-validation']
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            { name: 'project_name', type: 'text', label: 'Project Name', required: true },
            { name: 'documents', type: 'file', label: 'Upload Documents', multiple: true, accept: '.pdf,.doc,.docx,.txt', required: true },
            { name: 'profile_image', type: 'file', label: 'Profile Image', accept: 'image/*' },
            { name: 'terms_accepted', type: 'checkbox', label: 'I agree to the terms and conditions', required: true },
            { name: 'newsletter_subscribe', type: 'checkbox', label: 'Subscribe to newsletter' },
            { name: 'privacy_consent', type: 'checkbox', label: 'I consent to data processing', required: true },
            { name: 'description', type: 'textarea', label: 'Project Description' }
          ],
          defaultValues: {
            newsletter_subscribe: false,
            terms_accepted: false,
            privacy_consent: false
          }
        }
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      },
      error: {
        hasError: false,
        errors: []
      }
    }
  },

  {
    id: 'f3',
    position: { x: 200, y: 200 },
    type: 'templateFormNode',
    data: {
      meta: {
        label: "Prompt",
        function: "Input",
        emoji: '🖋️',
        version: '1.0.0',
        category: 'input',
        capabilities: ['text-input', 'llm-prompt']
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            { name: 'max_tokens', type: 'hidden' },
            { name: 'prompt', type: 'textarea', label: 'Prompt' },
            { name: 'model', type: 'select', label: 'Model', options: [
              { value: 'llama3.2', label: 'llama3.2' },
              { value: 'gemma3:27b', label: 'gemma3:27b' },
              { value: 'gpt-oss', label: 'gpt-oss' }
            ]}
          ],
          defaultValues: {
            prompt: "",
            model: "gpt-oss",
            max_tokens: 4096
          }
        }
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      },
      error: {
        hasError: false,
        errors: []
      }
    }
  },

  {
    id: 'llm-1',
    position: { x: 100, y: 125 },
    type: 'processNode',
    data: {
      meta: {
        label: "Ollama",
        function: "Inference",
        emoji: '⚙️',
        version: '1.0.0',
        category: 'process',
        capabilities: ['llm-processing', 'text-generation']
      },
      input: {
        connections: {},
        processed: {},
        config: {}
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      },
      error: {
        hasError: false,
        errors: []
      },
      plugin: {
        name: 'llm-processor',
        version: '1.0.0',
        config: {
          method: "POST",
          stream: false,
          url: "http://localhost:11434/api/chat",
          options: {}
        },
        state: {}
      }
    }
  },

  {
    id: 'fetch-1',
    position: { x: 400, y: 200 },
    type: 'fetchNode',
    data: {
      meta: {
        label: "API Fetch",
        function: "HTTP Request",
        emoji: '🌐',
        version: '1.0.0',
        category: 'process',
        capabilities: ['http-request', 'api-call']
      },
      input: {
        connections: {},
        processed: {},
        config: {}
      },
      output: {
        data: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
          result: null,
          error: null
        },
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      },
      error: {
        hasError: false,
        errors: []
      }
    }
  },

  {
    id: 'md-1',
    position: { x: 600, y: 50 },
    type: 'markdownNode',
    data: {
      meta: {
        label: "Markdown Display",
        function: "Renderer",
        emoji: '📝',
        version: '1.0.0',
        category: 'output',
        capabilities: ['markdown-render', 'text-display']
      },
      input: {
        connections: {},
        processed: {
          content: `# Markdown Renderer

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

> This content can be dynamically updated by connecting other nodes!`
        },
        config: {
          styleConfig: {
            width: 'auto',
            textColor: '#374151',
            fontSize: '14px'
          }
        }
      },
      output: {
        data: {
          rendered: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          status: 'success'
        }
      },
      error: {
        hasError: false,
        errors: []
      }
    }
  },

  {
    id: 'template-1',
    position: { x: 800, y: 50 },
    type: 'templateFormNode',
    data: {
      meta: {
        label: "Template Form",
        function: "Enhanced Form Node",
        emoji: '🎯',
        version: '1.0.0',
        category: 'input',
        capabilities: ['user-input', 'form-validation', 'task-management']
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            { name: 'task_name',
```
