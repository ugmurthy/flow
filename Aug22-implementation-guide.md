# Implementation Guide

## Comprehensive Schema Architecture - JobRunner Workflow System

### August 22, 2025 - Complete Implementation Plan

---

## 🎯 Overview

This guide provides step-by-step instructions for implementing the comprehensive schema architecture in the JobRunner Workflow system. Since we're in early development, this guide focuses on clean implementation without backward compatibility concerns.

---

## 📋 Implementation Phases

### Phase 1: Core Schema Foundation (Week 1)

#### 1.1 Update Core Types (`src/types/nodeSchema.js`)

```javascript
/**
 * Enhanced NodeData with comprehensive structure
 */
export const NodeData = {
  create: ({
    meta = {},
    input = {},
    output = {},
    plugin = null,
    styling = {},
  } = {}) => ({
    // === METADATA SECTION ===
    meta: {
      label: meta.label || "Untitled Node",
      description: meta.description || "",
      function: meta.function || "Generic Function",
      emoji: meta.emoji || "⚙️",
      version: meta.version || "2.0.0",
      category: meta.category || "process",
      capabilities: meta.capabilities || [],
      tags: meta.tags || [],
      author: meta.author || "System",
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: meta.updatedAt || new Date().toISOString(),
      ...meta,
    },

    // === INPUT SECTION ===
    input: {
      connections: input.connections || {},
      processed: {
        aggregated: {},
        byConnection: {},
        strategy: input.processed?.strategy || "merge",
        meta: {
          lastAggregated: new Date().toISOString(),
          connectionCount: 0,
          totalDataSize: 0,
          aggregationMethod: "default",
        },
        ...input.processed,
      },
      config: input.config || {},
      formFields: input.formFields || [],
      validation: input.validation || {},
      ...input,
    },

    // === OUTPUT SECTION ===
    output: {
      data: output.data || {},
      meta: {
        timestamp: new Date().toISOString(),
        status: "idle",
        processingTime: null,
        dataSize: null,
        ...output.meta,
      },
      directives: output.directives || {},
      cache: output.cache || null,
      ...output,
    },

    // === ERROR HANDLING ===
    error: {
      hasError: false,
      errors: [],
      warnings: [],
      recoveryActions: [],
      ...input.error,
    },

    // === PLUGIN SYSTEM ===
    plugin: plugin
      ? {
          name: plugin.name,
          version: plugin.version || "1.0.0",
          config: plugin.config || {},
          state: plugin.state || {},
          dependencies: plugin.dependencies || [],
          lifecycle: {
            initialized: false,
            lastProcessed: null,
            processCount: 0,
            errorCount: 0,
            ...plugin.lifecycle,
          },
          ...plugin,
        }
      : null,

    // === STYLING SYSTEM ===
    styling: {
      states: {
        default: createDefaultVisualState(),
        selected: createSelectedVisualState(),
        processing: createProcessingVisualState(),
        success: createSuccessVisualState(),
        error: createErrorVisualState(),
        disabled: createDisabledVisualState(),
        ...styling.states,
      },
      handles: {
        input: styling.handles?.input || [],
        output: styling.handles?.output || [],
      },
      custom: styling.custom || {},
      theme: styling.theme || "default",
    },
  }),
};
```

#### 1.2 Create Visual State Helpers

```javascript
// Visual state creation helpers
export const createDefaultVisualState = () => ({
  container: {
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    borderWidth: 2,
    borderRadius: 8,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    opacity: 1,
    scale: 1,
  },
  typography: {
    titleColor: "#1f2937",
    titleSize: "16px",
    titleWeight: "600",
    subtitleColor: "#6b7280",
    subtitleSize: "14px",
    fontFamily: "Inter, sans-serif",
  },
  layout: {
    padding: 16,
    minWidth: 200,
    maxWidth: 600,
    minHeight: 80,
    maxHeight: 400,
  },
  animation: {
    duration: 200,
    easing: "ease-in-out",
    transition: ["all"],
  },
  effects: {},
});

export const createProcessingVisualState = () => ({
  ...createDefaultVisualState(),
  container: {
    ...createDefaultVisualState().container,
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
  },
  effects: {
    pulse: true,
  },
});

export const createSuccessVisualState = () => ({
  ...createDefaultVisualState(),
  container: {
    ...createDefaultVisualState().container,
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
  },
});

export const createErrorVisualState = () => ({
  ...createDefaultVisualState(),
  container: {
    ...createDefaultVisualState().container,
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
  },
});
```

#### 1.3 Enhanced Connection Data Structure

```javascript
export const ConnectionData = {
  create: (
    sourceNodeId,
    sourceHandle = "default",
    targetHandle = "default",
    data = null,
    processed = null,
    directive = null
  ) => ({
    id: `${sourceNodeId}-${targetHandle}-${Date.now()}`,
    edgeId: "", // Will be set by React Flow
    sourceNodeId,
    sourceHandle,
    targetHandle,
    sourceLabel: "", // Will be populated from source node
    sourceType: "unknown", // Will be populated from source node
    data,
    processed,
    directive,
    meta: {
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      isActive: true,
      lastProcessed: processed ? new Date().toISOString() : null,
      priority: 5, // Default priority
      bandwidth: data ? JSON.stringify(data).length : 0,
      compressionType: null,
    },
    qos: {
      reliability: "at-least-once",
      durability: false,
      ordering: true,
    },
  }),
};
```

#### 1.4 Data Directive System

```javascript
export const DataDirective = {
  create: ({ type, target, payload, processing = {}, meta = {} }) => ({
    type,
    target: {
      section: target.section,
      path: target.path,
      operation: target.operation || "set",
    },
    payload,
    processing: {
      immediate: processing.immediate ?? true,
      conditional: processing.conditional || null,
      priority: processing.priority || 5,
      retryPolicy: processing.retryPolicy || null,
    },
    meta: {
      source: meta.source || "unknown",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      ...meta,
    },
  }),
};
```

---

### Phase 2: Enhanced Node Components (Week 2)

#### 2.1 Update Input Node Component (`src/components/EnhancedFormNode.jsx`)

```javascript
import React, { memo, useEffect, useState, useCallback } from "react";
import { Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { InputNodeData, DataDirective } from "../types/nodeSchema.js";
import nodeDataManager from "../services/nodeDataManager.js";
import { useFlowState } from "../contexts/FlowStateContext.jsx";

function EnhancedFormNode({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  const { updateNode } = useFlowState();

  const [nodeData, setNodeData] = useState(null);
  const [formData, setFormData] = useState({});

  // Initialize node with enhanced schema
  useEffect(() => {
    const initializeNode = async () => {
      let newNodeData;
      if (data.styling && data.input?.processed) {
        newNodeData = data; // Already enhanced
      } else {
        // Convert to enhanced schema
        newNodeData = InputNodeData.create({
          meta: {
            label: data.label || "Enhanced Form Node",
            function: data.function || "Advanced Form Collection",
            emoji: data.emoji || "📝",
            description: "Collects user input with directive generation",
            category: "input",
            capabilities: [
              "form-collection",
              "validation",
              "directive-generation",
            ],
            tags: ["user-input", "forms"],
          },
          input: {
            formFields: data.formFields || [],
            validation: data.validation || {},
            config: {
              allowExternalData: false,
              autoSubmit: false,
              submitBehavior: "manual",
            },
          },
          output: {
            data: {
              formData: data.formData || {},
              isValid: false,
              validationErrors: [],
            },
          },
          styling: {
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
        });
      }

      setNodeData(newNodeData);
      setFormData(newNodeData.output.data.formData || {});

      // Register with node data manager
      nodeDataManager.registerNode(currentNodeId, newNodeData, updateNodeData);
    };

    initializeNode();
  }, [currentNodeId, data, updateNodeData]);

  // Generate directives automatically when form data changes
  const generateDirectives = useCallback(
    (formData) => {
      const directives = {};

      // Example: Generate directive for LLM nodes
      if (formData.prompt) {
        directives["llm-processor"] = [
          {
            type: "update-config",
            target: {
              section: "plugin",
              path: "config.systemPrompt",
              operation: "set",
            },
            payload: formData.prompt,
            processing: {
              immediate: true,
              priority: 1,
            },
            meta: {
              source: currentNodeId,
            },
          },
        ];
      }

      return directives;
    },
    [currentNodeId]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (newFormData) => {
      const directives = generateDirectives(newFormData);

      await nodeDataManager.updateNodeData(
        currentNodeId,
        {
          output: {
            data: {
              formData: newFormData,
              isValid: true,
              validationErrors: [],
            },
            directives,
          },
        },
        true
      ); // Trigger processing

      setFormData(newFormData);
    },
    [currentNodeId, generateDirectives]
  );

  // Apply styling based on current state
  const getNodeStyle = () => {
    if (!nodeData?.styling?.states) return {};

    const hasData = Object.keys(formData).length > 0;
    const state = hasData ? "filled" : "default";
    const visualState = nodeData.styling.states[state];

    return {
      backgroundColor: visualState?.container?.backgroundColor,
      borderColor: visualState?.container?.borderColor,
      borderWidth: visualState?.container?.borderWidth,
      borderRadius: visualState?.container?.borderRadius,
      boxShadow: visualState?.container?.boxShadow,
    };
  };

  if (!nodeData) return <div>Loading...</div>;

  return (
    <div className="group relative">
      <div
        className="px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] transition-all duration-200"
        style={getNodeStyle()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">{nodeData.meta.emoji}</span>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {nodeData.meta.label}
            </div>
            <div className="text-sm text-gray-500">
              {nodeData.meta.function}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-2">
          {nodeData.input.formFields.map((field, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <input
                type={field.type}
                value={formData[field.name] || ""}
                onChange={(e) => {
                  const newFormData = {
                    ...formData,
                    [field.name]: e.target.value,
                  };
                  setFormData(newFormData);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required={field.required}
              />
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleSubmit(formData)}
          className="mt-3 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Submit
        </button>

        {/* Data Preview */}
        {Object.keys(formData).length > 0 && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <strong>Data:</strong> {JSON.stringify(formData, null, 2)}
          </div>
        )}

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default memo(EnhancedFormNode);
```

#### 2.2 Update Process Node Component (`src/components/EnhancedProcessNode.jsx`)

```javascript
import React, { memo, useEffect, useState, useCallback } from "react";
import { Handle, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { ProcessNodeData } from "../types/nodeSchema.js";
import nodeDataManager, {
  NodeDataEvents,
} from "../services/nodeDataManager.js";
import pluginRegistry from "../services/pluginRegistry.js";

function EnhancedProcessNode({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();

  const [nodeData, setNodeData] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("idle");
  const [connectionCount, setConnectionCount] = useState(0);

  // Initialize enhanced process node
  useEffect(() => {
    const initializeNode = async () => {
      let newNodeData;
      if (data.styling && data.input?.processed) {
        newNodeData = data;
      } else {
        newNodeData = ProcessNodeData.create({
          meta: {
            label: data.label || "Enhanced Process Node",
            function: data.function || "Multi-Input Processing",
            emoji: data.emoji || "⚙️",
            description: "Processes multiple inputs with advanced capabilities",
            category: "process",
            capabilities: [
              "data-processing",
              "multi-input",
              "directive-processing",
            ],
          },
          input: {
            config: {
              aggregationStrategy: "priority-merge",
              allowMultipleConnections: true,
              connectionPolicy: {
                maxConnections: 10,
                requiredConnections: 1,
                connectionTypes: ["object", "string", "array"],
              },
              processingMode: "reactive",
            },
          },
          plugin: data.plugin || {
            name: "enhanced-data-processor",
            version: "2.0.0",
            config: {
              strategy: "merge",
              preserveMetadata: true,
              connectionHandling: {
                processIndividually: false,
                connectionPriorities: {},
                inputCombination: "structured",
              },
            },
          },
          styling: {
            states: {
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
                    connectionLimit: 10,
                    acceptedDataTypes: ["string", "object", "array"],
                  },
                },
              ],
              output: [
                {
                  id: "processed-output",
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
        });
      }

      setNodeData(newNodeData);
      nodeDataManager.registerNode(currentNodeId, newNodeData, updateNodeData);
    };

    initializeNode();
  }, [currentNodeId, data, updateNodeData]);

  // Listen for processing events
  useEffect(() => {
    const handleProcessing = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus("processing");
      }
    };

    const handleProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus(event.detail.success ? "success" : "error");
      }
    };

    const handleConnectionAdded = (event) => {
      if (event.detail.targetNodeId === currentNodeId) {
        setConnectionCount((prev) => prev + 1);
      }
    };

    const handleConnectionRemoved = (event) => {
      if (event.detail.targetNodeId === currentNodeId) {
        setConnectionCount((prev) => Math.max(0, prev - 1));
      }
    };

    nodeDataManager.addEventListener(
      NodeDataEvents.NODE_PROCESSING,
      handleProcessing
    );
    nodeDataManager.addEventListener(
      NodeDataEvents.NODE_PROCESSED,
      handleProcessed
    );
    nodeDataManager.addEventListener(
      NodeDataEvents.CONNECTION_ADDED,
      handleConnectionAdded
    );
    nodeDataManager.addEventListener(
      NodeDataEvents.CONNECTION_REMOVED,
      handleConnectionRemoved
    );

    return () => {
      nodeDataManager.removeEventListener(
        NodeDataEvents.NODE_PROCESSING,
        handleProcessing
      );
      nodeDataManager.removeEventListener(
        NodeDataEvents.NODE_PROCESSED,
        handleProcessed
      );
      nodeDataManager.removeEventListener(
        NodeDataEvents.CONNECTION_ADDED,
        handleConnectionAdded
      );
      nodeDataManager.removeEventListener(
        NodeDataEvents.CONNECTION_REMOVED,
        handleConnectionRemoved
      );
    };
  }, [currentNodeId]);

  // Get styling based on current state
  const getNodeStyle = () => {
    if (!nodeData?.styling?.states) return {};

    const state =
      processingStatus === "processing"
        ? "processing"
        : processingStatus === "success"
        ? "success"
        : processingStatus === "error"
        ? "error"
        : nodeData.plugin?.lifecycle?.initialized
        ? "configured"
        : "default";

    const visualState = nodeData.styling.states[state];

    return {
      backgroundColor: visualState?.container?.backgroundColor,
      borderColor: visualState?.container?.borderColor,
      borderWidth: visualState?.container?.borderWidth,
      borderRadius: visualState?.container?.borderRadius,
      boxShadow: visualState?.container?.boxShadow,
    };
  };

  // Manual processing trigger
  const handleManualProcess = useCallback(async () => {
    await nodeDataManager.processNode(currentNodeId);
  }, [currentNodeId]);

  if (!nodeData) return <div>Loading...</div>;

  return (
    <div className="group relative">
      <div
        className="px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] transition-all duration-200"
        style={getNodeStyle()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">{nodeData.meta.emoji}</span>
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">
              {nodeData.meta.label}
            </div>
            <div className="text-sm text-gray-500">
              {nodeData.meta.function}
            </div>
            {nodeData.plugin && (
              <div className="text-xs text-blue-600">
                Plugin: {nodeData.plugin.name}
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <span>Connections: {connectionCount}</span>
          <span>Status: {processingStatus}</span>
        </div>

        {/* Processing Button */}
        <button
          onClick={handleManualProcess}
          disabled={processingStatus === "processing"}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 disabled:opacity-50"
        >
          {processingStatus === "processing" ? "Processing..." : "Process Data"}
        </button>

        {/* Connection Info */}
        {connectionCount > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <strong>Multi-Input Processing:</strong>
            <div>Strategy: {nodeData.input.processed.strategy}</div>
            <div>Mode: {nodeData.input.config.processingMode}</div>
          </div>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-purple-500 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default memo(EnhancedProcessNode);
```

#### 2.3 Update Output Node Component (`src/components/EnhancedOutputNode.jsx`)

```javascript
import React, { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { OutputNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';

function EnhancedOutputNode({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();

  const [nodeData, setNodeData] = useState(null);
  const [displayContent, setDisplayContent] = useState('');
  const [renderingStatus, setRenderingStatus] = useState('idle');

  // Initialize enhanced output node
  useEffect(() => {
    const initializeNode = async () => {
      let newNodeData;
      if (data.styling && data.input?.processed) {
        newNodeData = data;
      } else {
        newNodeData = OutputNodeData.create({
          meta: {
            label: data.label || 'Enhanced Output Node',
            function: data.function || 'Multi-Input Display',
            emoji: data.emoji || '📄',
            description: 'Displays data from multiple sources with integrity preservation',
            category: 'output',
            capabilities: ['data-display', 'multi-input', 'content-rendering']
          },
          input: {
            config: {
              allowMultipleConnections: true,
              displayFormat: 'markdown',
              autoUpdate: true,
              aggregationMode: 'merge'
            }
          },
          output: {
            data: {
              content: '',
              rendered: false,
              displayMetadata: {
                lastRendered: null,
                renderCount: 0
              }
            }
          },
          styling: {
            states: {
              populated: {
                container: {
                  backgroundColor: '#f0f9ff',
                  borderColor: '#0ea5e9'
                }
              },
              rendering: {
                container: {
                  backgroundColor: '#fef3c7',
                  borderColor: '#f59e0b'
                },
                effects: {
                  pulse: true
                }
              }
            },
            handles: {
              input: [{
                id: 'content-input',
                type: 'target',
                position: 'left',
                behavior: {
                  allowMultipleConnections: true,
                  acceptedDataTypes: ['string', 'object', 'array']
                }
              }]
            }
          }
        });
      }

      setNodeData(newNodeData);
      setDisplayContent(newNodeData.output.data.content || '');
      nodeDataManager.registerNode(currentNodeId, newNodeData, updateNodeData);
    };

    initializeNode();
  }, [currentNodeId, data, updateNodeData]);

  // Listen for data updates and maintain data integrity
  useEffect(() => {
    const handleDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;

        // Faithful data replication from input connections
        const connections = updatedNodeData.input.connections || {};
        const processedConnections = Object.values(connections).filter(conn => conn.processed);

        if (processedConnections.length > 0) {
          setRenderingStatus('rendering');

          let content = '';
          if (updatedNodeData.input.config.aggregationMode === 'merge') {
            // Merge all input data
            content = processedConnections
              .map(conn => {
                if (typeof conn.processed === 'string') {
                  return conn.processed;
                } else if (typeof conn.processed === 'object') {
                  return JSON.stringify(conn.processed, null, 2);
                }
                return String(conn.processed);
              })
              .join('\n\n---\n\n');
          } else {
            // Use latest data
            const latestConnection = processedConnections
              .sort((a, b) => new Date(b.meta.timestamp) - new Date(a.meta.timestamp))[0];
            content = typeof latestConnection.processed === 'string'
              ? latestConnection.processed
              : JSON.stringify(latestConnection.processed, null, 2);
          }

          setDisplayContent(content);

          // Update node data with faithful replication
          nodeDataManager.updateNodeData(currentNodeId, {
            output: {
              data: {
                content,
                rendered: true,
                displayMetadata: {
                  lastRendered: new Date().toISOString(),
                  renderCount: (updatedNodeData.output.data.displayMetadata?.renderCount || 0) + 1
                }
              }
            }
          });

          setTimeout(() => setRenderingStatus('populated'), 500);
        }
      }
    };

    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleDataUpdate);

    return () => {
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleDataUpdate);
    };
  }, [currentNodeId]);

  // Get styling based on current state
  const getNodeStyle = () => {
    if (!nodeData?.styling?.states) return {};

    const state = renderingStatus === 'rendering' ? 'rendering' :
                  displayContent ? 'populated' : 'default';

    const visualState = nodeData.styling.states[state];

    return {
      backgroundColor: visualState?.container?.backgroundColor,
      borderColor: visualState?.container?.borderColor,
      borderWidth: visualState?.container?.borderWidth,
      borderRadius: visualState?.container?.borderRadius,
      boxShadow: visualState?.container?.boxShadow
    };
  };

  if (!nodeData) return <div>Loading...</div>;

  return (
    <div className="group relative">
      <div
        className="px-4 py-3 shadow-md rounded-lg border-2 min-w-[300px] max-w-[600px] transition-all duration-200"
        style={getNodeStyle()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
          <span className="text-xl">{nodeData.meta.emoji}</span>
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">
              {nodeData.meta.label}
            </div>
            <div className="text-sm text-gray-500">
              {nodeData.meta.function}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {renderingStatus}
          </div>
        </div>

        {/* Content Display */}
        <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
          {displayContent ? (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {displayContent}
            </pre>
          ) : (
            <div className="text-gray-400 text-center py-4">
              No content to display
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        {nodeData.output.data.displayMetadata?.renderCount > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Renders: {nodeData.output.data.displayMetadata.renderCount}</span>
            {nodeData.output.data.displayMetadata.lastRendered && (
              <span>
                Last: {new Date(nodeData.output.data.displayMetadata.lastRendered).toLocaleTimeString()}
              </span>
            )}
          </div
```
