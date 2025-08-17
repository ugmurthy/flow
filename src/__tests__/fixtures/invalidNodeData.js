/**
 * Invalid test data fixtures for negative testing
 * These represent invalid node data structures that should fail validation
 */

// Invalid Meta Data Samples
export const invalidMetaData = {
  missingLabel: {
    function: "Dynamic Form",
    emoji: '📝',
    category: "input"
  },
  emptyLabel: {
    label: "",
    function: "Dynamic Form",
    emoji: '📝',
    category: "input"
  },
  missingFunction: {
    label: "Form Node",
    emoji: '📝',
    category: "input"
  },
  emptyFunction: {
    label: "Form Node",
    function: "",
    emoji: '📝',
    category: "input"
  },
  missingEmoji: {
    label: "Form Node",
    function: "Dynamic Form",
    category: "input"
  },
  emptyEmoji: {
    label: "Form Node",
    function: "Dynamic Form",
    emoji: '',
    category: "input"
  },
  invalidCategory: {
    label: "Form Node",
    function: "Dynamic Form",
    emoji: '📝',
    category: "invalid-category"
  },
  missingCategory: {
    label: "Form Node",
    function: "Dynamic Form",
    emoji: '📝'
  },
  wrongTypes: {
    label: 123,
    function: true,
    emoji: null,
    category: "input",
    version: 456,
    capabilities: "not-an-array"
  }
};

// Invalid Input Data Samples
export const invalidInputData = {
  invalidConnections: {
    connections: "not-an-object",
    processed: {},
    config: {}
  },
  invalidConnectionData: {
    connections: {
      "conn-1": {
        sourceNodeId: 123, // should be string
        sourceHandle: null,
        targetHandle: undefined,
        data: "valid",
        meta: "invalid-meta" // should be object
      }
    },
    processed: {},
    config: {}
  },
  missingConnectionMeta: {
    connections: {
      "conn-1": {
        sourceNodeId: "node-1",
        sourceHandle: "default",
        targetHandle: "default",
        data: null
        // missing meta
      }
    },
    processed: {},
    config: {}
  },
  invalidConnectionMeta: {
    connections: {
      "conn-1": {
        sourceNodeId: "node-1",
        sourceHandle: "default",
        targetHandle: "default",
        data: null,
        meta: {
          timestamp: 123, // should be string
          dataType: null, // should be string
          isActive: "true" // should be boolean
        }
      }
    },
    processed: {},
    config: {}
  },
  wrongTypes: {
    connections: [],
    processed: "not-an-object",
    config: null
  }
};

// Invalid Output Data Samples
export const invalidOutputData = {
  missingMeta: {
    data: {}
    // missing meta
  },
  invalidMeta: {
    data: {},
    meta: "not-an-object"
  },
  missingTimestamp: {
    data: {},
    meta: {
      status: "idle"
      // missing timestamp
    }
  },
  invalidTimestamp: {
    data: {},
    meta: {
      timestamp: 123456, // should be string
      status: "idle"
    }
  },
  missingStatus: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z"
      // missing status
    }
  },
  invalidStatus: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "invalid-status"
    }
  },
  invalidProcessingTime: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "success",
      processingTime: "not-a-number"
    }
  },
  invalidDataSize: {
    data: {},
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "success",
      dataSize: true
    }
  },
  wrongTypes: {
    data: "not-an-object",
    meta: {
      timestamp: "2024-01-01T00:00:00.000Z",
      status: "idle",
      processingTime: "string",
      dataSize: [],
      skipAutoProcessing: "not-boolean"
    }
  }
};

// Invalid Error Data Samples
export const invalidErrorData = {
  missingHasError: {
    errors: []
    // missing hasError
  },
  invalidHasError: {
    hasError: "not-boolean",
    errors: []
  },
  missingErrors: {
    hasError: false
    // missing errors array
  },
  invalidErrors: {
    hasError: true,
    errors: "not-an-array"
  },
  invalidErrorDetail: {
    hasError: true,
    errors: [
      {
        code: 123, // should be string
        message: null, // should be string
        source: undefined, // should be string
        timestamp: true, // should be string
        details: "can be anything"
      }
    ]
  },
  missingErrorFields: {
    hasError: true,
    errors: [
      {
        // missing all required fields
        details: { extra: "info" }
      }
    ]
  },
  emptyErrorFields: {
    hasError: true,
    errors: [
      {
        code: "",
        message: "",
        source: "",
        timestamp: ""
      }
    ]
  }
};

// Invalid Plugin Data Samples
export const invalidPluginData = {
  invalidStructure: {
    name: 123, // should be string
    version: null, // should be string
    config: "not-an-object",
    state: []
  },
  missingName: {
    version: "1.0.0",
    config: {},
    state: {}
    // missing name
  },
  emptyName: {
    name: "",
    version: "1.0.0",
    config: {},
    state: {}
  },
  wrongTypes: {
    name: true,
    version: 456,
    config: "string",
    state: null
  }
};

// Invalid Complete Node Data Samples
export const invalidCompleteNodeData = {
  notAnObject: "not-an-object",
  nullValue: null,
  undefinedValue: undefined,
  emptyObject: {},
  missingMeta: {
    input: {},
    output: { data: {}, meta: { timestamp: "2024-01-01T00:00:00.000Z", status: "idle" } },
    error: { hasError: false, errors: [] },
    plugin: null
  },
  missingInput: {
    meta: { label: "Test", function: "Test", emoji: "📝", category: "input" },
    output: { data: {}, meta: { timestamp: "2024-01-01T00:00:00.000Z", status: "idle" } },
    error: { hasError: false, errors: [] },
    plugin: null
  },
  missingOutput: {
    meta: { label: "Test", function: "Test", emoji: "📝", category: "input" },
    input: { connections: {}, processed: {}, config: {} },
    error: { hasError: false, errors: [] },
    plugin: null
  },
  missingError: {
    meta: { label: "Test", function: "Test", emoji: "📝", category: "input" },
    input: { connections: {}, processed: {}, config: {} },
    output: { data: {}, meta: { timestamp: "2024-01-01T00:00:00.000Z", status: "idle" } },
    plugin: null
  },
  allInvalid: {
    meta: invalidMetaData.missingLabel,
    input: invalidInputData.wrongTypes,
    output: invalidOutputData.missingMeta,
    error: invalidErrorData.missingHasError,
    plugin: invalidPluginData.invalidStructure
  }
};

// Invalid Update Data Samples
export const invalidUpdateData = {
  notAnObject: "not-an-object",
  invalidMeta: {
    meta: {
      label: 123, // should be string
      category: "invalid-category"
    }
  },
  invalidInput: {
    input: {
      connections: "not-an-object"
    }
  },
  invalidOutput: {
    output: {
      meta: {
        status: "invalid-status"
      }
    }
  },
  invalidError: {
    error: {
      hasError: "not-boolean"
    }
  },
  invalidPlugin: {
    plugin: {
      name: 123
    }
  }
};

// Edge Cases for Boundary Testing
export const edgeCaseData = {
  extremelyLongStrings: {
    meta: {
      label: "x".repeat(10000),
      function: "y".repeat(5000),
      emoji: "🎯".repeat(1000),
      description: "z".repeat(50000),
      category: "input"
    }
  },
  specialCharacters: {
    meta: {
      label: "Test\n\r\t\0\u0001",
      function: "Function with 特殊字符 and émojis 🚀",
      emoji: '🎯\u200B\uFEFF',
      category: "input"
    }
  },
  largeArrays: {
    meta: {
      label: "Test",
      function: "Test",
      emoji: "📝",
      category: "input",
      capabilities: new Array(10000).fill("capability")
    }
  },
  deeplyNestedObjects: {
    input: {
      connections: {},
      processed: {},
      config: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  deepValue: "nested"
                }
              }
            }
          }
        }
      }
    }
  }
};