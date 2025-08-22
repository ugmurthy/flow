# Comprehensive Node Schema Architecture

## JobRunner Workflow System - Complete Specification

---

## 🎯 Executive Summary

This document presents the definitive schema architecture for the JobRunner Workflow system, designed to provide structural consistency, enhanced data flow management, and a unified styling system across all node types. This comprehensive approach eliminates inconsistencies and establishes a robust foundation for complex workflows.

## 📋 Core Design Principles

### 1. **Structural Consistency**

- Unified top-level data structure across all node types
- Consistent handling of input, output, meta, error, and plugin properties
- Standardized connection management with multiple edge support

### 2. **Data Flow Integrity**

- Input nodes automatically transfer formData to output.data
- Directive field mechanism for specifying data utilization
- Output nodes maintain faithful data replication
- Multi-connection architecture with connectionId-indexed collections

### 3. **Visual Consistency**

- Unified styling system with standardized visual states
- Consistent handle positioning and appearance
- Customizable styling properties per node type
- State-based visual feedback (idle, processing, success, error)

---

## 🏗️ Complete Schema Structure

### Base NodeData Interface

```typescript
interface NodeData {
  // === METADATA SECTION ===
  meta: {
    label: string; // Display name
    description?: string; // Optional description
    function: string; // Functional description
    emoji: string; // Visual icon
    version: string; // Schema version
    category: "input" | "process" | "output";
    capabilities: string[]; // Node capabilities
    tags: string[]; // Organizational tags
    author?: string; // Node author/creator
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
  };

  // === INPUT SECTION ===
  input: {
    // Connection Management
    connections: ConnectionCollection;

    // Processed Data from Connections
    processed: ProcessedDataCollection;

    // Node Configuration
    config: NodeConfiguration;

    // Form Fields (Input Nodes Only)
    formFields?: FormFieldDefinition[];

    // Validation Rules
    validation?: ValidationConfiguration;
  };

  // === OUTPUT SECTION ===
  output: {
    // Primary Data Output
    data: Record<string, any>;

    // Output Metadata
    meta: OutputMetadata;

    // Data Directives (Instructions for target nodes)
    directives?: DataDirectiveCollection;

    // Cached Results
    cache?: CacheConfiguration;
  };

  // === ERROR HANDLING ===
  error: {
    hasError: boolean;
    errors: NodeError[];
    warnings: NodeWarning[];
    recoveryActions?: RecoveryAction[];
  };

  // === PLUGIN SYSTEM (Process Nodes Only) ===
  plugin?: {
    name: string;
    version: string;
    config: Record<string, any>;
    state: Record<string, any>;
    dependencies?: PluginDependency[];
    lifecycle: PluginLifecycle;
  };

  // === STYLING SYSTEM ===
  styling: {
    // Visual States
    states: {
      default: NodeVisualState;
      selected: NodeVisualState;
      processing: NodeVisualState;
      success: NodeVisualState;
      error: NodeVisualState;
      disabled: NodeVisualState;
    };

    // Handle Configuration
    handles: {
      input?: HandleConfiguration[];
      output?: HandleConfiguration[];
    };

    // Custom Properties
    custom: Record<string, any>;

    // Theme Integration
    theme?: string;
  };
}
```

---

## 🔌 Enhanced Connection Management

### ConnectionCollection Interface

```typescript
interface ConnectionCollection {
  // Multiple connections indexed by connectionId
  [connectionId: string]: ConnectionData;
}

interface ConnectionData {
  // Connection Identity
  id: string; // Unique connection identifier
  edgeId: string; // React Flow edge ID

  // Source Information
  sourceNodeId: string;
  sourceHandle: string;
  sourceLabel: string;
  sourceType: NodeType;

  // Target Information
  targetHandle: string;

  // Data Flow
  data: any; // Raw data from source
  processed: any; // Processed/transformed data
  directive?: DataDirective; // Instructions for data utilization

  // Connection Metadata
  meta: {
    timestamp: string; // Last update time
    dataType: string; // Type of transmitted data
    isActive: boolean; // Connection status
    lastProcessed: string; // Last processing time
    priority: number; // Connection priority (0-10)
    bandwidth?: number; // Data size metrics
    compressionType?: string; // Data compression method
  };

  // Quality of Service
  qos: {
    reliability: "at-most-once" | "at-least-once" | "exactly-once";
    durability: boolean; // Persist across sessions
    ordering: boolean; // Maintain data order
  };
}
```

### ProcessedDataCollection Interface

```typescript
interface ProcessedDataCollection {
  // Aggregated data ready for processing
  aggregated: Record<string, any>;

  // Individual connection data (for per-connection processing)
  byConnection: {
    [connectionId: string]: {
      data: any;
      directive?: DataDirective;
      metadata: ConnectionMetadata;
    };
  };

  // Processing Strategy
  strategy: "merge" | "array" | "latest" | "priority" | "custom";

  // Aggregation Metadata
  meta: {
    lastAggregated: string;
    connectionCount: number;
    totalDataSize: number;
    aggregationMethod: string;
  };
}
```

---

## 📤 Data Directive System

### DataDirective Interface

```typescript
interface DataDirective {
  // Directive Type
  type: "update-config" | "modify-behavior" | "transform-data" | "custom";

  // Target Specification
  target: {
    section: "input" | "output" | "plugin" | "styling";
    path: string; // Dot-notation path (e.g., 'config.displayFormat')
    operation: "set" | "merge" | "append" | "transform";
  };

  // Directive Payload
  payload: any;

  // Processing Instructions
  processing: {
    immediate: boolean; // Execute immediately vs. batched
    conditional?: string; // Condition expression
    priority: number; // Execution priority
    retryPolicy?: RetryPolicy;
  };

  // Metadata
  meta: {
    source: string; // Source node identifier
    timestamp: string;
    version: string;
  };
}

interface DataDirectiveCollection {
  [directiveId: string]: DataDirective;
}
```

---

## 🎨 Unified Styling System

### NodeVisualState Interface

```typescript
interface NodeVisualState {
  // Container Styling
  container: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    boxShadow: string;
    opacity: number;
    scale: number;
  };

  // Typography
  typography: {
    titleColor: string;
    titleSize: string;
    titleWeight: string;
    subtitleColor: string;
    subtitleSize: string;
    fontFamily: string;
  };

  // Layout
  layout: {
    padding: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };

  // Animation
  animation: {
    duration: number;
    easing: string;
    transition: string[];
  };

  // Special Effects
  effects: {
    glow?: string;
    pulse?: boolean;
    shake?: boolean;
    bounce?: boolean;
  };
}

interface HandleConfiguration {
  // Handle Identity
  id: string;
  type: "source" | "target";

  // Position
  position: "top" | "right" | "bottom" | "left";
  offset?: { x: number; y: number };

  // Styling
  style: {
    backgroundColor: string;
    borderColor: string;
    size: number;
    shape: "circle" | "square" | "diamond";
  };

  // Behavior
  behavior: {
    allowMultipleConnections: boolean;
    connectionLimit?: number;
    acceptedDataTypes: string[];
    validationRules?: string[];
  };

  // Labels and Hints
  label?: string;
  tooltip?: string;
  icon?: string;
}
```

---

## 🏭 Node Type Specializations

### Input Node Schema

```typescript
interface InputNodeData extends NodeData {
  meta: {
    category: "input";
    capabilities: ["form-collection", "user-input", "data-generation"];
  };

  input: {
    formFields: FormFieldDefinition[];
    validation: ValidationConfiguration;
    config: {
      allowExternalData: boolean;
      autoSubmit: boolean;
      resetOnSubmit: boolean;
      submitBehavior: "immediate" | "batch" | "manual";
    };
  };

  output: {
    data: {
      formData: Record<string, any>; // User-submitted data
      isValid: boolean;
      validationErrors: string[];
      metadata: {
        submittedAt?: string;
        submitCount: number;
        lastModified: string;
      };
    };

    // Automatic directive generation for form data
    directives: {
      [targetNodeId: string]: DataDirective[];
    };
  };

  styling: {
    states: {
      default: NodeVisualState;
      filled: NodeVisualState; // When form has data
      invalid: NodeVisualState; // When validation fails
      submitting: NodeVisualState; // During submission
    };
  };
}
```

### Process Node Schema

```typescript
interface ProcessNodeData extends NodeData {
  meta: {
    category: "process";
    capabilities: ["data-transformation", "computation", "integration"];
  };

  input: {
    connections: ConnectionCollection;
    processed: ProcessedDataCollection;
    config: {
      aggregationStrategy: AggregationStrategy;
      allowMultipleConnections: boolean;
      connectionPolicy: ConnectionPolicy;
      processingMode: "reactive" | "batch" | "streaming";
    };
  };

  output: {
    data: Record<string, any>;
    meta: {
      processingTime: number;
      inputsProcessed: number;
      processingMethod: string;
      successRate: number;
    };
  };

  plugin: {
    name: string;
    version: string;
    config: PluginConfiguration;
    state: PluginState;

    // Enhanced plugin features
    lifecycle: {
      initialized: boolean;
      lastProcessed: string;
      processCount: number;
      errorCount: number;
    };

    dependencies: PluginDependency[];
    permissions: PluginPermissions;
  };

  styling: {
    states: {
      default: NodeVisualState;
      processing: NodeVisualState; // During plugin execution
      configured: NodeVisualState; // When plugin is properly configured
      error: NodeVisualState; // Plugin-specific errors
    };
  };
}
```

### Output Node Schema

```typescript
interface OutputNodeData extends NodeData {
  meta: {
    category: "output";
    capabilities: ["data-display", "file-export", "visualization"];
  };

  input: {
    connections: ConnectionCollection;
    processed: ProcessedDataCollection;
    config: {
      allowMultipleConnections: boolean;
      displayFormat: DisplayFormat;
      autoUpdate: boolean;
      aggregationMode: "latest" | "merge" | "all";
    };
  };

  output: {
    // Output nodes faithfully replicate input data
    data: {
      content: any; // Replicated input data
      rendered: boolean;
      exported?: ExportMetadata;
      displayMetadata: DisplayMetadata;
    };

    // No directives - output nodes are endpoints
    directives: {};
  };

  styling: {
    states: {
      default: NodeVisualState;
      populated: NodeVisualState; // When has data to display
      rendering: NodeVisualState; // During rendering process
      exported: NodeVisualState; // After export operation
    };
  };
}
```

---

## 🔧 Plugin Integration Interface

### Enhanced Plugin System

```typescript
interface NodePlugin {
  // Plugin Identity
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;

  // Lifecycle Methods
  initialize(config: PluginConfiguration): Promise<PluginInitResult>;
  process(
    inputs: ProcessingInput[],
    context: PluginContext
  ): Promise<ProcessingOutput>;
  cleanup(): Promise<void>;

  // New: Event handling
  onConnectionAdded?(connection: ConnectionData): Promise<void>;
  onConnectionRemoved?(connectionId: string): Promise<void>;
  onConfigurationChanged?(newConfig: PluginConfiguration): Promise<void>;

  // Plugin Metadata
  getCapabilities(): string[];
  getConfigSchema(): JSONSchema;
  getDependencies(): PluginDependency[];

  // New: Resource management
  getResourceRequirements(): ResourceRequirements;
  validateEnvironment(): Promise<ValidationResult>;

  // New: Multi-connection support
  supportsMultipleInputs(): boolean;
  getInputAggregationStrategies(): string[];
  processConnectionIndividually?: boolean;
}

interface PluginContext {
  nodeId: string;
  nodeData: ProcessNodeData;

  // Enhanced context methods
  updateNodeData: (updates: Partial<NodeData>) => Promise<void>;
  getConnectedNodes: () => ConnectedNodesInfo;
  sendToNode: (targetNodeId: string, data: any) => Promise<void>;

  // New: Multi-connection helpers
  getConnectionData: (
    connectionId?: string
  ) => ConnectionData | ConnectionData[];
  iterateConnections: (
    processor: ConnectionProcessor
  ) => Promise<ProcessingOutput[]>;

  // Resource access
  getGlobalContext: () => GlobalContext;
  getPluginRegistry: () => PluginRegistry;

  // Logging and monitoring
  log: (level: LogLevel, message: string, data?: any) => void;
  reportMetrics: (metrics: PluginMetrics) => void;
}
```

---

## 🌊 Multi-Connection Data Flow

### Connection Processing Patterns

```typescript
// Pattern 1: Collective Processing (Default)
interface CollectiveProcessing {
  mode: "collective";
  strategy: AggregationStrategy;
  output: ProcessingOutput; // Single output for all inputs
}

// Pattern 2: Individual Processing
interface IndividualProcessing {
  mode: "individual";
  outputs: {
    [connectionId: string]: ProcessingOutput;
  };
}

// Pattern 3: Hybrid Processing
interface HybridProcessing {
  mode: "hybrid";
  collective: ProcessingOutput; // Aggregated result
  individual: {
    // Per-connection results
    [connectionId: string]: ProcessingOutput;
  };
}

interface ProcessingInput {
  connectionId: string;
  sourceNodeId: string;
  data: any;
  directive?: DataDirective;
  metadata: ConnectionMetadata;

  // New: Processing hints
  processingHints: {
    priority: number;
    timeout?: number;
    retries?: number;
    dependencies?: string[]; // Other connection IDs this depends on
  };
}

interface ProcessingOutput {
  data: any;
  metadata: {
    processingTime: number;
    inputsUsed: string[]; // Connection IDs used
    status: "success" | "partial" | "error";
    confidence?: number; // Processing confidence score
  };
  errors?: ProcessingError[];
  warnings?: ProcessingWarning[];

  // New: Output directives
  directives?: DataDirective[];
}
```

---

## 📊 Data Integrity and Validation

### Comprehensive Validation System

```typescript
interface ValidationSystem {
  // Schema validation
  validateSchema(nodeData: NodeData): ValidationResult;

  // Data integrity checks
  validateDataIntegrity(
    sourceData: any,
    targetData: any,
    transform?: DataTransform
  ): IntegrityResult;

  // Connection validation
  validateConnections(
    connections: ConnectionCollection
  ): ConnectionValidationResult;

  // Plugin validation
  validatePluginConfiguration(
    plugin: NodePlugin,
    config: PluginConfiguration
  ): PluginValidationResult;

  // Cross-node validation
  validateWorkflowIntegrity(
    nodes: Map<string, NodeData>,
    connections: Map<string, ConnectionData>
  ): WorkflowValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];

  // Performance metrics
  validationTime: number;
  checksPerformed: number;
}
```

---

## 🚀 Implementation Examples

### Enhanced initialNodes.js Structure

```javascript
// Example: Comprehensive Form Input Node
export const createEnhancedFormNode = () => ({
  id: "enhanced-form-node",
  position: { x: 50, y: 50 },
  data: InputNodeData.create({
    meta: {
      label: "Enhanced Form Input",
      function: "Advanced Form Collection",
      emoji: "📝",
      description:
        "Collects user input with advanced validation and directives",
      category: NODE_CATEGORIES.INPUT,
      capabilities: ["form-collection", "validation", "directive-generation"],
      tags: ["user-input", "forms", "validation"],
      version: "2.0.0",
    },

    input: {
      formFields: [
        {
          name: "username",
          type: FORM_FIELD_TYPES.TEXT,
          label: "Username",
          required: true,
          validation: {
            minLength: 3,
            maxLength: 20,
            pattern: "^[a-zA-Z0-9_]+$",
          },
        },
      ],
      validation: {
        rules: ["required-fields", "format-validation"],
        mode: "real-time",
      },
      config: {
        allowExternalData: false,
        autoSubmit: false,
        submitBehavior: "manual",
      },
    },

    output: {
      data: {
        formData: {},
        isValid: false,
        validationErrors: [],
      },
      directives: {
        // Auto-generated directives for connected nodes
        "llm-processor-node": [
          {
            type: "update-config",
            target: {
              section: "plugin",
              path: "config.systemPrompt",
              operation: "set",
            },
            payload: "${formData.username}",
            processing: {
              immediate: true,
              priority: 1,
            },
          },
        ],
      },
    },

    styling: {
      states: {
        default: {
          container: {
            backgroundColor: "#ffffff",
            borderColor: "#d1d5db",
            borderWidth: 2,
            borderRadius: 8,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          },
        },
        filled: {
          container: {
            backgroundColor: "#f0f9ff",
            borderColor: "#0ea5e9",
          },
        },
        invalid: {
          container: {
            backgroundColor: "#fef2f2",
            borderColor: "#ef4444",
          },
        },
      },
      handles: {
        output: [
          {
            id: "form-data-out",
            type: "source",
            position: "right",
            style: {
              backgroundColor: "#3b82f6",
              borderColor: "#1e40af",
              size: 12,
              shape: "circle",
            },
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ["object", "string"],
            },
          },
        ],
      },
    },
  }),
  type: NODE_TYPES.ENHANCED_FORM_NODE,
});

// Example: Multi-Connection Process Node
export const createMultiConnectionLLMNode = () => ({
  id: "multi-llm-processor",
  position: { x: 400, y: 200 },
  data: ProcessNodeData.create({
    meta: {
      label: "Multi-Input LLM Processor",
      function: "Advanced Language Model Processing",
      emoji: "🤖",
      description:
        "Processes multiple inputs through LLM with connection-aware handling",
      category: NODE_CATEGORIES.PROCESS,
      capabilities: ["llm-processing", "multi-input", "directive-processing"],
    },

    input: {
      connections: {}, // Will be populated dynamically
      config: {
        aggregationStrategy: "priority-merge",
        allowMultipleConnections: true,
        connectionPolicy: {
          maxConnections: 5,
          requiredConnections: 1,
          connectionTypes: ["form-data", "text", "json"],
        },
        processingMode: "reactive",
      },
    },

    plugin: {
      name: "enhanced-llm-processor",
      version: "2.0.0",
      config: {
        provider: "ollama",
        model: "llama3.2",
        maxTokens: 4096,
        temperature: 0.7,

        // New: Multi-connection configuration
        connectionHandling: {
          processIndividually: false,
          connectionPriorities: {},
          inputCombination: "structured",
        },
      },
      lifecycle: {
        initialized: false,
        processCount: 0,
        errorCount: 0,
      },
      dependencies: [
        {
          name: "ollama-client",
          version: "^1.0.0",
          required: true,
        },
      ],
    },

    styling: {
      states: {
        default: {
          container: {
            backgroundColor: "#fafafa",
            borderColor: "#8b5cf6",
          },
        },
        processing: {
          container: {
            backgroundColor: "#fef3c7",
            borderColor: "#f59e0b",
          },
          effects: {
            pulse: true,
          },
        },
        configured: {
          container: {
            backgroundColor: "#ecfdf5",
            borderColor: "#10b981",
          },
        },
      },
      handles: {
        input: [
          {
            id: "multi-input",
            type: "target",
            position: "left",
            behavior: {
              allowMultipleConnections: true,
              connectionLimit: 5,
              acceptedDataTypes: ["string", "object", "array"],
            },
          },
        ],
        output: [
          {
            id: "llm-output",
            type: "source",
            position: "right",
            behavior: {
              allowMultipleConnections: true,
              acceptedDataTypes: ["string", "object"],
            },
          },
        ],
      },
    },
  }),
  type: NODE_TYPES.ENHANCED_PROCESS_NODE,
});
```

---

## 📈 Migration Strategy

Since we're in early development, we can implement this comprehensive schema by:

1. **Phase 1**: Update core schema interfaces in `src/types/nodeSchema.js`
2. **Phase 2**: Enhance `nodeDataManager.js` for multi-connection support
3. **Phase 3**: Update all node components to use the new styling system
4. **Phase 4**: Implement directive system and data integrity validation
5. **Phase 5**: Update `initialNodes.js` with comprehensive node definitions

---

## 🏁 Benefits Summary

### ✅ **Structural Consistency**

- Unified schema across all node types
- Standardized connection management
- Consistent error handling and metadata

### ✅ **Enhanced Data Flow**

- Directive-based data routing
- Multi-connection architecture
- Data integrity preservation

### ✅ **Visual Consistency**

- Unified styling system
- State-based visual feedback
- Customizable appearance per node type

### ✅ **Plugin Integration**

- Clear plugin interfaces
- Multi-connection plugin support
- Resource management and validation

### ✅ **Developer Experience**

- Comprehensive type definitions
- Validation and error reporting
- Extensive configuration options

This comprehensive schema architecture provides a robust, scalable foundation for complex workflows while maintaining clean separation of concerns and excellent developer experience.
