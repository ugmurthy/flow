# Node Data Schema Specification

## Overview

This document defines a standardized data schema for all nodes in the JobRunner Workflow system, providing consistent structure for input/output handling, error management, and plugin mechanisms.

## Core Schema Structure

```typescript
interface NodeData {
  // Node Metadata (immutable properties)
  meta: {
    id: string; // Unique node identifier
    type: string; // Node type (formNode, processNode, etc.)
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
    // Direct inputs from connected nodes
    connections: {
      [edgeId: string]: {
        sourceNodeId: string;
        sourceLabel: string;
        data: any; // Output data from source node
        timestamp: string; // When data was received
        status: "pending" | "received" | "error";
      };
    };

    // Aggregated/processed input data
    processed: {
      [key: string]: any; // Combined and processed input data
    };

    // Configuration/form data specific to this node
    config: {
      [key: string]: any; // Node-specific configuration
    };
  };

  // Output Data Structure
  output: {
    // Primary output data
    data: {
      [key: string]: any; // Processed output data
    };

    // Metadata about the output
    meta: {
      timestamp: string; // When output was generated
      status: "idle" | "processing" | "success" | "error";
      processingTime?: number; // Time taken to process (ms)
      dataSize?: number; // Size of output data
    };
  };

  // Error Handling
  error: {
    hasError: boolean;
    errors: Array<{
      code: string; // Error code
      message: string; // Human readable message
      timestamp: string; // When error occurred
      source: "input" | "processing" | "output";
      details?: any; // Additional error context
    }>;
  };

  // Plugin Configuration (for Process nodes)
  plugin?: {
    name: string; // Plugin identifier
    version: string; // Plugin version
    config: {
      [key: string]: any; // Plugin-specific configuration
    };
    state: {
      [key: string]: any; // Plugin runtime state
    };
  };

  // UI State (for rendering)
  ui: {
    position: { x: number; y: number };
    size?: { width: number; height: number };
    collapsed?: boolean;
    selected?: boolean;
    style?: {
      [key: string]: any; // Custom styling
    };
  };
}
```

## Node Type Specific Schemas

### Input Nodes (Form Nodes)

```typescript
interface InputNodeData extends NodeData {
  meta: {
    category: "input";
    capabilities: ["user-input", "form-validation"];
  };

  input: {
    config: {
      formFields: FormField[]; // Form field definitions
      validation: ValidationRules;
      defaultValues: { [key: string]: any };
    };
  };

  output: {
    data: {
      formData: { [key: string]: any }; // User submitted data
      isValid: boolean;
      validationErrors: string[];
    };
  };
}
```

### Process Nodes

```typescript
interface ProcessNodeData extends NodeData {
  meta: {
    category: "process";
    capabilities: ["data-transformation", "plugin-execution"];
  };

  plugin: {
    name: string; // e.g., 'llm-processor', 'data-transformer'
    version: string;
    config: {
      // Plugin-specific configuration
    };
  };

  input: {
    connections: {
      // Multiple input connections supported
    };
    processed: {
      // Aggregated input data ready for processing
    };
  };

  output: {
    data: {
      result: any; // Primary processing result
      metadata: {
        inputsProcessed: number;
        processingMethod: string;
      };
    };
  };
}
```

### Output Nodes (Display Nodes)

```typescript
interface OutputNodeData extends NodeData {
  meta: {
    category: "output";
    capabilities: ["data-display", "file-export"];
  };

  input: {
    connections: {
      // Single or multiple input connections
    };
    processed: {
      content: any; // Content to display/export
      format: string; // Content format (markdown, json, etc.)
    };
  };

  output: {
    data: {
      rendered: boolean; // Whether content has been rendered
      exported?: {
        filename: string;
        timestamp: string;
      };
    };
  };
}
```

## Plugin Architecture

### Plugin Interface

```typescript
interface NodePlugin {
  name: string;
  version: string;
  description: string;

  // Plugin lifecycle methods
  initialize(config: any): Promise<void>;
  process(inputs: ProcessingInput[]): Promise<ProcessingOutput>;
  cleanup(): Promise<void>;

  // Plugin metadata
  getCapabilities(): string[];
  getConfigSchema(): JSONSchema;
  validateConfig(config: any): ValidationResult;
}

interface ProcessingInput {
  id: string; // Input identifier
  data: any; // Input data
  metadata: {
    sourceNodeId: string;
    sourceType: string;
    timestamp: string;
  };
}

interface ProcessingOutput {
  data: any; // Processed output
  metadata: {
    processingTime: number;
    inputsUsed: string[];
    status: "success" | "partial" | "error";
  };
  errors?: ProcessingError[];
}
```

### Built-in Plugins

#### LLM Processor Plugin

```typescript
interface LLMProcessorConfig {
  model: string; // Model name
  maxTokens: number;
  temperature: number;
  apiEndpoint: string;
  systemPrompt?: string;
}

class LLMProcessor implements NodePlugin {
  async process(inputs: ProcessingInput[]): Promise<ProcessingOutput> {
    // Combine all inputs into a single prompt
    const combinedPrompt = this.combineInputs(inputs);

    // Call LLM API
    const result = await this.callLLMAPI(combinedPrompt);

    return {
      data: { result: result.content },
      metadata: {
        processingTime: result.processingTime,
        inputsUsed: inputs.map((i) => i.id),
        status: "success",
      },
    };
  }
}
```

#### Data Transformer Plugin

```typescript
interface DataTransformerConfig {
  transformationType: "merge" | "filter" | "map" | "reduce";
  transformationRules: TransformationRule[];
}

class DataTransformer implements NodePlugin {
  async process(inputs: ProcessingInput[]): Promise<ProcessingOutput> {
    // Apply transformation rules to inputs
    const transformed = this.applyTransformations(inputs);

    return {
      data: transformed,
      metadata: {
        processingTime: Date.now() - startTime,
        inputsUsed: inputs.map((i) => i.id),
        status: "success",
      },
    };
  }
}
```

## Multiple Input Handling

### Input Aggregation Strategy

```typescript
interface InputAggregator {
  // Combine multiple inputs based on strategy
  aggregate(inputs: ProcessingInput[], strategy: AggregationStrategy): any;
}

type AggregationStrategy =
  | "merge" // Merge all inputs into single object
  | "array" // Keep inputs as array
  | "latest" // Use only the most recent input
  | "priority" // Use input based on priority rules
  | "custom"; // Use custom aggregation function

// Example usage in Process node
const aggregatedInput = inputAggregator.aggregate(
  node.input.connections,
  "merge"
);
```

### Edge Data Mapping

```typescript
interface EdgeDataMapping {
  edgeId: string;
  sourceField: string; // Field from source node output
  targetField: string; // Field in target node input
  transformation?: (data: any) => any; // Optional data transformation
}

// Example: Map 'result' from LLM node to 'content' in Markdown node
const mapping: EdgeDataMapping = {
  edgeId: "edge-1",
  sourceField: "output.data.result",
  targetField: "input.processed.content",
  transformation: (data) => data.toString(),
};
```

## Migration Strategy

### Phase 1: Schema Implementation

1. Create new schema interfaces
2. Implement data migration utilities
3. Update core node components to use new schema

### Phase 2: Plugin System

1. Implement plugin interface
2. Create built-in plugins (LLM, DataTransformer)
3. Update Process nodes to use plugins

### Phase 3: Enhanced Features

1. Implement advanced input aggregation
2. Add real-time data flow updates
3. Enhance error handling and recovery

## Benefits of New Schema

1. **Consistency**: All nodes follow the same data structure
2. **Separation of Concerns**: Clear distinction between input, output, and errors
3. **Extensibility**: Plugin system allows custom processing logic
4. **Maintainability**: Standardized structure easier to debug and extend
5. **Performance**: Efficient data flow without constant polling
6. **Error Handling**: Comprehensive error tracking and recovery
7. **Multiple Inputs**: Native support for complex data flows

## Implementation Examples

### Updated Process Node

```typescript
function ProcessNode({ data }: { data: ProcessNodeData }) {
  const plugin = usePlugin(data.plugin.name);

  const processInputs = useCallback(async () => {
    if (!plugin || data.input.connections.length === 0) return;

    try {
      const inputs = Object.values(data.input.connections)
        .filter((conn) => conn.status === "received")
        .map((conn) => ({
          id: conn.sourceNodeId,
          data: conn.data,
          metadata: {
            sourceNodeId: conn.sourceNodeId,
            sourceType: "unknown", // Would be populated from node registry
            timestamp: conn.timestamp,
          },
        }));

      const result = await plugin.process(inputs);

      updateNodeData(nodeId, {
        ...data,
        output: {
          data: result.data,
          meta: {
            timestamp: new Date().toISOString(),
            status: "success",
            processingTime: result.metadata.processingTime,
          },
        },
        error: { hasError: false, errors: [] },
      });
    } catch (error) {
      updateNodeData(nodeId, {
        ...data,
        error: {
          hasError: true,
          errors: [
            {
              code: "PROCESSING_ERROR",
              message: error.message,
              timestamp: new Date().toISOString(),
              source: "processing",
              details: error,
            },
          ],
        },
      });
    }
  }, [plugin, data, nodeId]);

  // Rest of component implementation...
}
```

This schema provides a robust foundation for the workflow system with clear separation of concerns, extensible plugin architecture, and comprehensive error handling.
