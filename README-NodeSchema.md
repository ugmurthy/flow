# Node Data Schema Design - Complete Specification

## Executive Summary

This document presents a comprehensive redesign of the node data structure for the JobRunner Workflow system. The new schema addresses critical issues in the current implementation while providing a robust foundation for future enhancements.

## Current Problems Addressed

### 1. **Inconsistent Data Structure**

- **Problem**: Each node type handles data differently, making maintenance difficult
- **Solution**: Standardized schema with consistent `meta`, `input`, `output`, `error`, and `ui` sections

### 2. **Mixed Data Concerns**

- **Problem**: `formData` contains both input and output data, causing confusion
- **Solution**: Clear separation with dedicated `input` and `output` structures

### 3. **No Standardized Error Handling**

- **Problem**: Errors handled ad-hoc across different nodes
- **Solution**: Comprehensive `error` structure with categorized error tracking

### 4. **Complex Input Aggregation**

- **Problem**: Each node manually combines connected data with 100ms polling
- **Solution**: Standardized input aggregation with event-driven updates

### 5. **No Plugin Architecture**

- **Problem**: Processing logic hardcoded in components
- **Solution**: Extensible plugin system with well-defined interfaces

### 6. **Limited Multiple Input Support**

- **Problem**: Difficult to handle multiple input edges effectively
- **Solution**: Native support for multiple inputs with flexible aggregation strategies

## Key Documents

### 📋 [Node Data Schema Specification](./node-data-schema.md)

Complete technical specification of the new node data structure including:

- Core schema interfaces
- Node type specific schemas (Input, Process, Output)
- Plugin architecture design
- Multiple input handling strategies
- Migration approach

### 🛠️ [Implementation Guide](./implementation-guide.md)

Practical implementation details including:

- TypeScript type definitions
- Plugin registry implementation
- Built-in plugins (LLM Processor, Data Transformer)
- Node data manager utilities
- Updated component examples
- Migration strategy

### 📊 [Architecture Diagrams](./schema-architecture-diagram.md)

Visual representations of:

- System overview with Mermaid diagrams
- Node type hierarchy
- Data flow architecture
- Plugin system structure
- Error handling flow
- Migration path visualization

## Core Schema Structure

```typescript
interface NodeData {
  meta: {
    id: string;
    type: string;
    label: string;
    function: string;
    emoji: string;
    category: "input" | "process" | "output";
    capabilities: string[];
  };

  input: {
    connections: Record<string, ConnectionData>;
    processed: Record<string, any>;
    config: Record<string, any>;
  };

  output: {
    data: Record<string, any>;
    meta: {
      timestamp: string;
      status: "idle" | "processing" | "success" | "error";
      processingTime?: number;
    };
  };

  error: {
    hasError: boolean;
    errors: Array<{
      code: string;
      message: string;
      source: "input" | "processing" | "output";
      timestamp: string;
    }>;
  };

  plugin?: {
    name: string;
    version: string;
    config: Record<string, any>;
  };

  ui: {
    position: { x: number; y: number };
    style?: Record<string, any>;
  };
}
```

## Plugin System Highlights

### Built-in Plugins

#### 🤖 LLM Processor

- Processes text inputs using Large Language Models
- Supports multiple LLM providers (Ollama, OpenAI, etc.)
- Configurable model parameters
- Automatic input combination for multiple sources

#### 🔄 Data Transformer

- Transforms and combines input data
- Multiple strategies: merge, filter, map, reduce, custom
- Rule-based transformations
- Custom JavaScript function support

### Plugin Interface

```typescript
interface INodePlugin {
  name: string;
  version: string;

  initialize(config: any): Promise<void>;
  process(inputs: ProcessingInput[]): Promise<ProcessingOutput>;
  cleanup(): Promise<void>;

  getCapabilities(): string[];
  getConfigSchema(): JSONSchema;
  validateConfig(config: any): ValidationResult;
}
```

## Key Benefits

### 🎯 **Consistency**

- Standardized structure across all node types
- Predictable data access patterns
- Easier debugging and maintenance

### 🔧 **Separation of Concerns**

- Clear distinction between input, output, and errors
- Plugin-based processing logic
- UI state separated from business logic

### 🚀 **Extensibility**

- Plugin architecture for custom processing
- Support for third-party integrations
- Easy addition of new node capabilities

### ⚡ **Performance**

- Event-driven updates instead of polling
- Efficient data flow management
- Optimized memory usage

### 🔗 **Multiple Input Support**

- Native support for multiple input edges
- Flexible aggregation strategies
- Complex workflow patterns enabled

### 🛡️ **Error Handling**

- Comprehensive error tracking
- Categorized error sources
- Recovery and retry mechanisms

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Implement core schema interfaces
- [ ] Create migration utilities
- [ ] Update one node type (Process) as proof of concept
- [ ] Basic plugin registry implementation

### Phase 2: Plugin System (Weeks 3-4)

- [ ] Implement built-in plugins (LLM, DataTransformer)
- [ ] Create plugin configuration UI
- [ ] Update remaining node types
- [ ] Add plugin validation and error handling

### Phase 3: Enhancement (Weeks 5-6)

- [ ] Real-time data flow updates
- [ ] Advanced error handling and recovery
- [ ] Performance optimizations
- [ ] Documentation and testing

### Phase 4: Migration (Week 7)

- [ ] Migrate existing workflows
- [ ] Remove old schema support
- [ ] Final testing and validation

## Migration Strategy

### Backward Compatibility

1. **Dual Schema Support**: Run both old and new schemas simultaneously
2. **Gradual Migration**: Convert nodes one type at a time
3. **Data Migration**: Utilities to convert existing workflow data
4. **Fallback Mechanisms**: Graceful degradation for unsupported features

### Migration Utilities

```typescript
// Convert old node data to new schema
function migrateNodeData(oldData: any): NodeData {
  return {
    meta: {
      id: oldData.id || generateId(),
      type: inferNodeType(oldData),
      label: oldData.label,
      function: oldData.function,
      emoji: oldData.emoji,
      category: inferCategory(oldData.type),
      capabilities: [],
    },
    input: {
      connections: {},
      processed: {},
      config: oldData.formFields ? { formFields: oldData.formFields } : {},
    },
    output: {
      data: oldData.formData || {},
      meta: {
        timestamp: new Date().toISOString(),
        status: "idle",
      },
    },
    error: { hasError: false, errors: [] },
    ui: {
      position: oldData.position || { x: 0, y: 0 },
    },
  };
}
```

## Testing Strategy

### Unit Tests

- Schema validation
- Plugin functionality
- Data migration utilities
- Error handling scenarios

### Integration Tests

- Node communication
- Plugin system integration
- Workflow execution
- Error recovery

### Performance Tests

- Data flow efficiency
- Memory usage optimization
- Large workflow handling
- Plugin execution performance

## Risk Assessment

### Low Risk

- ✅ Schema implementation
- ✅ Basic plugin system
- ✅ Migration utilities

### Medium Risk

- ⚠️ Complex workflow migration
- ⚠️ Plugin performance optimization
- ⚠️ Real-time update implementation

### High Risk

- 🔴 Breaking changes to existing workflows
- 🔴 Plugin security and sandboxing
- 🔴 Large-scale data migration

## Success Metrics

### Technical Metrics

- **Code Maintainability**: Reduced complexity in node components
- **Performance**: Elimination of 100ms polling, faster data updates
- **Extensibility**: Easy addition of new plugins and node types
- **Error Reduction**: Comprehensive error tracking and handling

### User Experience Metrics

- **Workflow Reliability**: Fewer workflow execution failures
- **Development Speed**: Faster implementation of new features
- **Plugin Adoption**: Usage of custom plugins by developers

## Next Steps

1. **Review and Approval**: Stakeholder review of the proposed schema
2. **Prototype Development**: Build a working prototype with one node type
3. **Plugin Development**: Create the first built-in plugins
4. **Migration Planning**: Detailed migration plan for existing workflows
5. **Implementation**: Execute the phased implementation plan

## Conclusion

This new node data schema provides a robust, extensible foundation for the JobRunner Workflow system. It addresses current limitations while enabling future enhancements through a well-designed plugin architecture. The phased implementation approach ensures minimal disruption to existing workflows while providing clear benefits from day one.

The schema's emphasis on separation of concerns, standardization, and extensibility will significantly improve the system's maintainability and enable rapid development of new features and integrations.

---

**For questions or clarifications, please refer to the detailed documentation files or contact the development team.**
