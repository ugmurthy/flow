/**
 * Valid test data fixtures extracted from initialNodes
 * These represent valid node data structures for testing
 */

// Valid Meta Data Samples
export const validMetaData = {
  inputNode: {
    label: "Form Node",
    function: "Dynamic Form",
    emoji: '📝',
    description: 'Collects user input through dynamic forms',
    category: "input",
    version: "1.0.0",
    capabilities: []
  },
  processNode: {
    label: "Ollama LLM",
    function: "LLM Inference",
    emoji: '⚙️',
    description: 'Processes text using Ollama LLM',
    category: "process",
    version: "1.0.0",
    capabilities: ["text-processing", "ai-inference"]
  },
  outputNode: {
    label: "Markdown Display",
    function: "Renderer",
    emoji: '📝',
    description: 'Renders markdown content with syntax highlighting',
    category: "output",
    version: "1.0.0",
    capabilities: ["rendering", "markdown"]
  }
};

// Valid Input Data Samples
export const validInputData = {
  formNode: {
    connections: {},
    processed: {},
    config: {
      formFields: [
        { name: 'username', type: 'text', label: 'Username', required: true },
        { name: 'email', type: 'email', label: 'Email Address', required: true },
        { name: 'role', type: 'select', label: 'Role', options: [
          { value: 'admin', label: 'Administrator' },
          { value: 'user', label: 'User' }
        ]}
      ],
      validation: {}
    }
  },
  processNode: {
    connections: {
      "input-1": {
        sourceNodeId: "f1",
        sourceHandle: "default",
        targetHandle: "default",
        data: { prompt: "Hello world" },
        meta: {
          timestamp: "2024-01-01T00:00:00.000Z",
          dataType: "string",
          isActive: true
        }
      }
    },
    processed: { lastProcessed: "2024-01-01T00:00:00.000Z" },
    config: {
      aggregationStrategy: 'merge',
      requiredInputs: ['prompt'],
      expectedDataTypes: ['object', 'string']
    }
  },
  outputNode: {
    connections: {},
    processed: {},
    config: {
      displayFormat: 'markdown',
      autoUpdate: true,
      styleConfig: {
        width: 'auto',
        textColor: '#374151',
        fontSize: '14px'
      }
    }
  }
};

// Valid Output Data Samples
export const validOutputData = {
  idle: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "idle"
    }
  },
  processing: {
    data: { progress: 0.5 },
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "processing",
      processingTime: null,
      dataSize: null
    }
  },
  success: {
    data: { 
      result: "Generated content",
      wordCount: 45,
      lastUpdated: "2024-01-01T00:00:00.000Z"
    },
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "success",
      processingTime: 1500,
      dataSize: 1024,
      skipAutoProcessing: false
    }
  },
  error: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "error",
      processingTime: 500,
      dataSize: 0
    }
  }
};

// Valid Error Data Samples
export const validErrorData = {
  noErrors: {
    hasError: false,
    errors: []
  },
  withErrors: {
    hasError: true,
    errors: [
      {
        code: "VALIDATION_ERROR",
        message: "Invalid input format",
        source: "input-validator",
        timestamp: "2024-01-01T00:00:00.000Z",
        details: { field: "email", received: "invalid-email" }
      },
      {
        code: "PROCESSING_ERROR",
        message: "Failed to process data",
        source: "llm-processor",
        timestamp: "2024-01-01T00:00:00.000Z"
      }
    ]
  }
};

// Valid Plugin Data Samples
export const validPluginData = {
  null: null,
  undefined: undefined,
  llmProcessor: {
    name: 'llm-processor',
    version: '1.0.0',
    config: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      maxTokens: 4096,
      temperature: 0.7
    },
    state: {
      isConnected: true,
      lastUsed: "2024-01-01T00:00:00.000Z"
    }
  },
  dataTransformer: {
    name: 'data-transformer',
    version: '2.1.0',
    config: {
      strategy: 'merge',
      preserveMetadata: true
    },
    state: {}
  }
};

// Complete Valid Node Data Samples
export const validCompleteNodeData = {
  inputNode: {
    meta: validMetaData.inputNode,
    input: validInputData.formNode,
    output: validOutputData.idle,
    error: validErrorData.noErrors,
    plugin: validPluginData.null
  },
  processNode: {
    meta: validMetaData.processNode,
    input: validInputData.processNode,
    output: validOutputData.processing,
    error: validErrorData.noErrors,
    plugin: validPluginData.llmProcessor
  },
  outputNode: {
    meta: validMetaData.outputNode,
    input: validInputData.outputNode,
    output: validOutputData.success,
    error: validErrorData.noErrors,
    plugin: validPluginData.undefined
  }
};

// Valid Update Data Samples (partial)
export const validUpdateData = {
  metaOnly: {
    meta: {
      label: "Updated Label",
      description: "Updated description"
    }
  },
  outputOnly: {
    output: {
      data: { newResult: "Updated result" }
    }
  },
  multipleFields: {
    meta: {
      label: "Multi Update"
    },
    output: {
      data: { status: "updated" },
      meta: {
        timestamp: "2024-01-01T01:00:00.000Z",
        status: "success"
      }
    }
  }
};