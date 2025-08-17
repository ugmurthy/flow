# Node Data Schema Implementation Guide

## Overview

This guide provides practical implementation examples for the standardized node data schema, including migration strategies, plugin system implementation, and updated component code.

## Core Implementation Files

### 1. Type Definitions (`src/types/nodeSchema.ts`)

```typescript
// React Flow Node structure (top-level properties as per React Flow spec)
export interface Node {
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

// Base Node Data Interface - no redundancy with React Flow properties
export interface NodeData {
  meta: NodeMeta;
  input: NodeInput;
  output: NodeOutput;
  error: NodeError;
  plugin?: NodePlugin;
}

export interface NodeMeta {
  label: string;
  description?: string;
  function: string;
  emoji: string;
  version: string;
  category: "input" | "process" | "output";
  capabilities: string[];
}

export interface NodeInput {
  connections: Record<string, ConnectionData>;
  processed: Record<string, any>;
  config: Record<string, any>;
}

export interface ConnectionData {
  sourceNodeId: string;
  sourceLabel: string;
  data: any;
  timestamp: string;
  status: "pending" | "received" | "error";
}

export interface NodeOutput {
  data: Record<string, any>;
  meta: {
    timestamp: string;
    status: "idle" | "processing" | "success" | "error";
    processingTime?: number;
    dataSize?: number;
  };
}

export interface NodeError {
  hasError: boolean;
  errors: Array<{
    code: string;
    message: string;
    timestamp: string;
    source: "input" | "processing" | "output";
    details?: any;
  }>;
}

export interface NodePlugin {
  name: string;
  version: string;
  config: Record<string, any>;
  state: Record<string, any>;
}

// Plugin System Interfaces
export interface INodePlugin {
  name: string;
  version: string;
  description: string;

  initialize(config: any): Promise<void>;
  process(inputs: ProcessingInput[]): Promise<ProcessingOutput>;
  cleanup(): Promise<void>;

  getCapabilities(): string[];
  getConfigSchema(): any; // JSONSchema
  validateConfig(config: any): ValidationResult;
}

export interface ProcessingInput {
  id: string;
  data: any;
  metadata: {
    sourceNodeId: string;
    sourceType: string;
    timestamp: string;
  };
}

export interface ProcessingOutput {
  data: any;
  metadata: {
    processingTime: number;
    inputsUsed: string[];
    status: "success" | "partial" | "error";
  };
  errors?: ProcessingError[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
}
```

### 2. Plugin Registry (`src/plugins/PluginRegistry.ts`)

```typescript
import { INodePlugin } from "../types/nodeSchema";

export class PluginRegistry {
  private plugins: Map<string, INodePlugin> = new Map();
  private instances: Map<string, INodePlugin> = new Map();

  registerPlugin(plugin: INodePlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  async getPlugin(name: string, config?: any): Promise<INodePlugin | null> {
    const pluginClass = this.plugins.get(name);
    if (!pluginClass) return null;

    const instanceKey = `${name}_${JSON.stringify(config)}`;

    if (!this.instances.has(instanceKey)) {
      const instance = Object.create(pluginClass);
      if (config) {
        await instance.initialize(config);
      }
      this.instances.set(instanceKey, instance);
    }

    return this.instances.get(instanceKey) || null;
  }

  getAvailablePlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginCapabilities(name: string): string[] {
    const plugin = this.plugins.get(name);
    return plugin ? plugin.getCapabilities() : [];
  }
}

// Global plugin registry instance
export const pluginRegistry = new PluginRegistry();
```

### 3. Built-in Plugins

#### LLM Processor Plugin (`src/plugins/LLMProcessor.ts`)

```typescript
import {
  INodePlugin,
  ProcessingInput,
  ProcessingOutput,
  ValidationResult,
} from "../types/nodeSchema";

export interface LLMConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  apiEndpoint: string;
  systemPrompt?: string;
}

export class LLMProcessor implements INodePlugin {
  name = "llm-processor";
  version = "1.0.0";
  description = "Processes inputs using Large Language Models";

  private config: LLMConfig | null = null;

  async initialize(config: LLMConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid LLM config: ${validation.errors.join(", ")}`);
    }
    this.config = config;
  }

  async process(inputs: ProcessingInput[]): Promise<ProcessingOutput> {
    if (!this.config) {
      throw new Error("Plugin not initialized");
    }

    const startTime = Date.now();

    try {
      // Combine all inputs into a single prompt
      const combinedPrompt = this.combineInputs(inputs);

      // Prepare request body
      const requestBody = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature || 0.7,
        stream: false,
        messages: [
          ...(this.config.systemPrompt
            ? [{ role: "system", content: this.config.systemPrompt }]
            : []),
          { role: "user", content: combinedPrompt },
        ],
      };

      // Make API call
      const response = await fetch(this.config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      const content =
        result?.message?.content ||
        result?.choices?.[0]?.message?.content ||
        "No response";

      return {
        data: {
          result: content,
          model: this.config.model,
          tokensUsed: result.usage?.total_tokens || 0,
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
            code: "LLM_PROCESSING_ERROR",
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
    return ["text-generation", "text-completion", "conversation"];
  }

  getConfigSchema(): any {
    return {
      type: "object",
      required: ["model", "maxTokens", "apiEndpoint"],
      properties: {
        model: { type: "string" },
        maxTokens: { type: "number", minimum: 1, maximum: 32000 },
        temperature: { type: "number", minimum: 0, maximum: 2 },
        apiEndpoint: { type: "string", format: "uri" },
        systemPrompt: { type: "string" },
      },
    };
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.model) errors.push("Model is required");
    if (!config.maxTokens || config.maxTokens < 1)
      errors.push("Valid maxTokens is required");
    if (!config.apiEndpoint) errors.push("API endpoint is required");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private combineInputs(inputs: ProcessingInput[]): string {
    if (inputs.length === 0) return "";

    if (inputs.length === 1) {
      const input = inputs[0];
      return typeof input.data === "string"
        ? input.data
        : JSON.stringify(input.data);
    }

    // Multiple inputs - create structured prompt
    const sections = inputs.map((input, index) => {
      const data =
        typeof input.data === "string"
          ? input.data
          : JSON.stringify(input.data, null, 2);
      return `Input ${index + 1} (from ${
        input.metadata.sourceNodeId
      }):\n${data}`;
    });

    return sections.join("\n\n");
  }
}
```

#### Data Transformer Plugin (`src/plugins/DataTransformer.ts`)

```typescript
import {
  INodePlugin,
  ProcessingInput,
  ProcessingOutput,
  ValidationResult,
} from "../types/nodeSchema";

export interface TransformConfig {
  strategy: "merge" | "filter" | "map" | "reduce" | "custom";
  rules?: TransformRule[];
  customFunction?: string; // JavaScript function as string
}

export interface TransformRule {
  field: string;
  operation: "rename" | "filter" | "transform";
  target?: string;
  condition?: string;
  transformation?: string;
}

export class DataTransformer implements INodePlugin {
  name = "data-transformer";
  version = "1.0.0";
  description = "Transforms and combines input data using various strategies";

  private config: TransformConfig | null = null;

  async initialize(config: TransformConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(
        `Invalid transformer config: ${validation.errors.join(", ")}`
      );
    }
    this.config = config;
  }

  async process(inputs: ProcessingInput[]): Promise<ProcessingOutput> {
    if (!this.config) {
      throw new Error("Plugin not initialized");
    }

    const startTime = Date.now();

    try {
      let result: any;

      switch (this.config.strategy) {
        case "merge":
          result = this.mergeInputs(inputs);
          break;
        case "filter":
          result = this.filterInputs(inputs);
          break;
        case "map":
          result = this.mapInputs(inputs);
          break;
        case "reduce":
          result = this.reduceInputs(inputs);
          break;
        case "custom":
          result = this.customTransform(inputs);
          break;
        default:
          throw new Error(
            `Unknown transformation strategy: ${this.config.strategy}`
          );
      }

      return {
        data: { result, strategy: this.config.strategy },
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
            code: "TRANSFORM_ERROR",
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
    return [
      "data-merge",
      "data-filter",
      "data-map",
      "data-reduce",
      "custom-transform",
    ];
  }

  getConfigSchema(): any {
    return {
      type: "object",
      required: ["strategy"],
      properties: {
        strategy: {
          type: "string",
          enum: ["merge", "filter", "map", "reduce", "custom"],
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              operation: {
                type: "string",
                enum: ["rename", "filter", "transform"],
              },
              target: { type: "string" },
              condition: { type: "string" },
              transformation: { type: "string" },
            },
          },
        },
        customFunction: { type: "string" },
      },
    };
  }

  validateConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config.strategy) {
      errors.push("Strategy is required");
    }

    if (config.strategy === "custom" && !config.customFunction) {
      errors.push("Custom function is required for custom strategy");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private mergeInputs(inputs: ProcessingInput[]): any {
    return inputs.reduce((acc, input) => {
      if (typeof input.data === "object" && input.data !== null) {
        return { ...acc, ...input.data };
      }
      return { ...acc, [input.id]: input.data };
    }, {});
  }

  private filterInputs(inputs: ProcessingInput[]): any {
    // Apply filter rules if configured
    return inputs
      .filter((input) => {
        // Implement filtering logic based on rules
        return true; // Placeholder
      })
      .map((input) => input.data);
  }

  private mapInputs(inputs: ProcessingInput[]): any {
    return inputs.map((input) => {
      // Apply mapping rules if configured
      return input.data; // Placeholder
    });
  }

  private reduceInputs(inputs: ProcessingInput[]): any {
    // Implement reduce logic based on rules
    return inputs.reduce((acc, input) => {
      // Placeholder reduction logic
      return acc;
    }, {});
  }

  private customTransform(inputs: ProcessingInput[]): any {
    if (!this.config?.customFunction) {
      throw new Error("Custom function not provided");
    }

    try {
      // Create a safe function execution context
      const func = new Function("inputs", this.config.customFunction);
      return func(inputs);
    } catch (error) {
      throw new Error(`Custom function execution failed: ${error.message}`);
    }
  }
}
```

### 4. Node Data Manager (`src/utils/NodeDataManager.ts`)

```typescript
import { NodeData, ConnectionData } from "../types/nodeSchema";

export class NodeDataManager {
  /**
   * Create a new node with standardized schema
   */
  static createNode(
    type: string,
    label: string,
    position: { x: number; y: number },
    config: any = {}
  ): NodeData {
    return {
      meta: {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        label,
        function: config.function || "Processing",
        emoji: config.emoji || "⚙️",
        version: "1.0.0",
        category: this.inferCategory(type),
        capabilities: config.capabilities || [],
      },
      input: {
        connections: {},
        processed: {},
        config: config.input || {},
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
      plugin: config.plugin || undefined,
      ui: {
        position,
        size: config.size,
        collapsed: false,
        selected: false,
        style: config.style || {},
      },
    };
  }

  /**
   * Update node input connection
   */
  static updateConnection(
    nodeData: NodeData,
    edgeId: string,
    connectionData: Partial<ConnectionData>
  ): NodeData {
    return {
      ...nodeData,
      input: {
        ...nodeData.input,
        connections: {
          ...nodeData.input.connections,
          [edgeId]: {
            ...nodeData.input.connections[edgeId],
            ...connectionData,
            timestamp: new Date().toISOString(),
          },
        },
      },
    };
  }

  /**
   * Update node output
   */
  static updateOutput(
    nodeData: NodeData,
    outputData: any,
    status: "idle" | "processing" | "success" | "error" = "success"
  ): NodeData {
    return {
      ...nodeData,
      output: {
        data: outputData,
        meta: {
          timestamp: new Date().toISOString(),
          status,
          processingTime: nodeData.output.meta.processingTime,
          dataSize: JSON.stringify(outputData).length,
        },
      },
      error:
        status === "error" ? nodeData.error : { hasError: false, errors: [] },
    };
  }

  /**
   * Add error to node
   */
  static addError(
    nodeData: NodeData,
    error: {
      code: string;
      message: string;
      source: "input" | "processing" | "output";
      details?: any;
    }
  ): NodeData {
    return {
      ...nodeData,
      error: {
        hasError: true,
        errors: [
          ...nodeData.error.errors,
          {
            ...error,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      output: {
        ...nodeData.output,
        meta: {
          ...nodeData.output.meta,
          status: "error",
        },
      },
    };
  }

  /**
   * Clear all errors
   */
  static clearErrors(nodeData: NodeData): NodeData {
    return {
      ...nodeData,
      error: {
        hasError: false,
        errors: [],
      },
    };
  }

  /**
   * Aggregate input data based on strategy
   */
  static aggregateInputs(
    connections: Record<string, ConnectionData>,
    strategy: "merge" | "array" | "latest" = "merge"
  ): any {
    const validConnections = Object.values(connections).filter(
      (conn) => conn.status === "received"
    );

    if (validConnections.length === 0) return {};

    switch (strategy) {
      case "merge":
        return validConnections.reduce((acc, conn) => {
          if (typeof conn.data === "object" && conn.data !== null) {
            return { ...acc, ...conn.data };
          }
          return { ...acc, [conn.sourceNodeId]: conn.data };
        }, {});

      case "array":
        return validConnections.map((conn) => ({
          sourceId: conn.sourceNodeId,
          data: conn.data,
          timestamp: conn.timestamp,
        }));

      case "latest":
        const latest = validConnections.reduce((latest, conn) =>
          new Date(conn.timestamp) > new Date(latest.timestamp) ? conn : latest
        );
        return latest.data;

      default:
        return {};
    }
  }

  private static inferCategory(type: string): "input" | "process" | "output" {
    if (type.includes("form") || type.includes("input")) return "input";
    if (
      type.includes("markdown") ||
      type.includes("display") ||
      type.includes("output")
    )
      return "output";
    return "process";
  }
}
```

### 5. Updated Process Node Component (`src/components/ProcessNodeV2.tsx`)

```typescript
import React, { memo, useCallback, useEffect, useState } from "react";
import { Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { NodeData } from "../types/nodeSchema";
import { pluginRegistry } from "../plugins/PluginRegistry";
import { NodeDataManager } from "../utils/NodeDataManager";
import ButtonPanel from "./ButtonPanel";
import ViewButton from "./ViewButton";
import ConnectionBadge from "./ConnectionBadge";

interface ProcessNodeProps {
  data: NodeData;
}

function ProcessNodeV2({ data }: ProcessNodeProps) {
  const { updateNodeData } = useReactFlow();
  const nodeId = useNodeId();
  const [isProcessing, setIsProcessing] = useState(false);

  // Process inputs when they change
  const processInputs = useCallback(async () => {
    if (!data.plugin || isProcessing) return;

    const validConnections = Object.values(data.input.connections).filter(
      (conn) => conn.status === "received"
    );

    if (validConnections.length === 0) return;

    setIsProcessing(true);

    try {
      // Update status to processing
      updateNodeData(
        nodeId,
        NodeDataManager.updateOutput(data, {}, "processing")
      );

      // Get plugin instance
      const plugin = await pluginRegistry.getPlugin(
        data.plugin.name,
        data.plugin.config
      );
      if (!plugin) {
        throw new Error(`Plugin ${data.plugin.name} not found`);
      }

      // Prepare inputs for plugin
      const inputs = validConnections.map((conn) => ({
        id: conn.sourceNodeId,
        data: conn.data,
        metadata: {
          sourceNodeId: conn.sourceNodeId,
          sourceType: "unknown", // Could be enhanced with node type registry
          timestamp: conn.timestamp,
        },
      }));

      // Process inputs
      const result = await plugin.process(inputs);

      // Update node with results
      if (result.errors && result.errors.length > 0) {
        let updatedData = data;
        result.errors.forEach((error) => {
          updatedData = NodeDataManager.addError(updatedData, {
            code: error.code,
            message: error.message,
            source: "processing",
            details: error.details,
          });
        });
        updateNodeData(nodeId, updatedData);
      } else {
        updateNodeData(
          nodeId,
          NodeDataManager.updateOutput(data, result.data, "success")
        );
      }
    } catch (error) {
      const errorData = NodeDataManager.addError(data, {
        code: "PROCESSING_ERROR",
        message: error.message,
        source: "processing",
        details: error,
      });
      updateNodeData(nodeId, errorData);
    } finally {
      setIsProcessing(false);
    }
  }, [data, nodeId, updateNodeData, isProcessing]);

  // Trigger processing when inputs change
  useEffect(() => {
    const hasNewInputs = Object.values(data.input.connections).some(
      (conn) => conn.status === "received"
    );

    if (hasNewInputs && !isProcessing) {
      processInputs();
    }
  }, [data.input.connections, processInputs, isProcessing]);

  // Get status styling
  const getStatusStyling = () => {
    if (data.error.hasError) return "border-red-400 bg-red-50";
    if (isProcessing) return "border-blue-400 bg-blue-50";
    if (data.output.meta.status === "success")
      return "border-green-400 bg-green-50";
    return "border-stone-400 bg-white";
  };

  return (
    <div className="group relative">
      {/* Hover Buttons */}
      <ButtonPanel>
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(data, null, 2)}\`\`\``}
          title="Node Data"
          className="hover:bg-gray-50"
        />
      </ButtonPanel>

      {/* Connection Badge */}
      <ConnectionBadge />

      {/* Main Node Container */}
      <div
        className={`px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] relative ${getStatusStyling()}`}
      >
        {/* Node Content */}
        <div className="flex items-center gap-3">
          {/* Icon Section */}
          <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
            <span className="text-xl">{data.meta.emoji}</span>
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">
              {data.meta.label}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {data.meta.function}
            </div>
            {data.plugin && (
              <div className="text-xs text-blue-600 truncate">
                Plugin: {data.plugin.name}
              </div>
            )}
            <div className="text-xs text-gray-400">
              Status: {isProcessing ? "Processing..." : data.output.meta.status}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {data.error.hasError && (
          <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
            {data.error.errors[data.error.errors.length - 1]?.message}
          </div>
        )}

        {/* React Flow Handles */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full !border-2 !border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default memo(ProcessNodeV2);
```

## Migration Strategy

### Phase 1: Gradual Migration

1. Implement new schema alongside existing structure
2. Create migration utilities to convert old data to new format
3. Update one node type at a time

### Phase 2: Plugin System Integration

1. Register built-in plugins
2. Update Process nodes to use plugin system
3. Create plugin configuration UI

### Phase 3: Enhanced Features

1. Real-time data flow updates
2. Advanced error handling and recovery
3. Performance optimizations

This implementation provides a robust, extensible foundation for the workflow system with clear separation of concerns and comprehensive plugin architecture.
