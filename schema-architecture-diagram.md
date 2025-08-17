# Node Data Schema Architecture

## System Overview Diagram

```mermaid
graph TB
    subgraph "React Flow Node Structure"
        ReactFlowNode["React Flow Node"]
        ReactFlowNode --> NodeId["id: string"]
        ReactFlowNode --> Position["position: {x, y}"]
        ReactFlowNode --> NodeType["type?: string"]
        ReactFlowNode --> Style["style?: CSSProperties"]
        ReactFlowNode --> NodeData["data: NodeData"]
    end

    subgraph "Node Data Schema"
        NodeData --> Meta["meta: NodeMeta"]
        NodeData --> Input["input: NodeInput"]
        NodeData --> Output["output: NodeOutput"]
        NodeData --> Error["error: NodeError"]
        NodeData --> Plugin["plugin?: NodePlugin"]
    end

    subgraph "Input Structure"
        Input --> Connections["connections: ConnectionData[]"]
        Input --> Processed["processed: Object"]
        Input --> Config["config: Object"]

        Connections --> ConnData["ConnectionData"]
        ConnData --> SourceId["sourceNodeId"]
        ConnData --> SourceLabel["sourceLabel"]
        ConnData --> Data["data: any"]
        ConnData --> Timestamp["timestamp"]
        ConnData --> Status["status: pending|received|error"]
    end

    subgraph "Output Structure"
        Output --> OutData["data: Object"]
        Output --> OutMeta["meta: OutputMeta"]

        OutMeta --> OutTimestamp["timestamp"]
        OutMeta --> OutStatus["status: idle|processing|success|error"]
        OutMeta --> ProcessTime["processingTime?"]
        OutMeta --> DataSize["dataSize?"]
    end

    subgraph "Plugin System"
        Plugin --> PluginName["name: string"]
        Plugin --> PluginVersion["version: string"]
        Plugin --> PluginConfig["config: Object"]
        Plugin --> PluginState["state: Object"]

        PluginRegistry["Plugin Registry"]
        PluginRegistry --> LLMPlugin["LLM Processor"]
        PluginRegistry --> DataTransformer["Data Transformer"]
        PluginRegistry --> CustomPlugin["Custom Plugins..."]

        INodePlugin["INodePlugin Interface"]
        INodePlugin --> Initialize["initialize()"]
        INodePlugin --> Process["process()"]
        INodePlugin --> Cleanup["cleanup()"]
        INodePlugin --> GetCapabilities["getCapabilities()"]
    end

    subgraph "Data Flow"
        InputNode["Input Node"] --> ProcessNode["Process Node"]
        ProcessNode --> OutputNode["Output Node"]

        ProcessNode --> PluginExecution["Plugin Execution"]
        PluginExecution --> InputAggregation["Input Aggregation"]
        PluginExecution --> DataProcessing["Data Processing"]
        PluginExecution --> OutputGeneration["Output Generation"]
        PluginExecution --> ErrorHandling["Error Handling"]
    end
```

## Node Type Hierarchy

```mermaid
classDiagram
    class NodeData {
        +meta: NodeMeta
        +input: NodeInput
        +output: NodeOutput
        +error: NodeError
        +plugin?: NodePlugin
    }

    class InputNodeData {
        +meta.category: 'input'
        +input.config.formFields: FormField[]
        +output.data.formData: Object
        +output.data.isValid: boolean
    }

    class ProcessNodeData {
        +meta.category: 'process'
        +plugin: NodePlugin
        +input.connections: ConnectionData[]
        +output.data.result: any
    }

    class OutputNodeData {
        +meta.category: 'output'
        +input.processed.content: any
        +output.data.rendered: boolean
    }

    NodeData <|-- InputNodeData
    NodeData <|-- ProcessNodeData
    NodeData <|-- OutputNodeData

    class INodePlugin {
        <<interface>>
        +name: string
        +version: string
        +initialize(config)
        +process(inputs): ProcessingOutput
        +cleanup()
        +getCapabilities(): string[]
    }

    class LLMProcessor {
        +process(inputs): ProcessingOutput
        -combineInputs(inputs): string
        -callLLMAPI(prompt): APIResponse
    }

    class DataTransformer {
        +process(inputs): ProcessingOutput
        -mergeInputs(inputs): Object
        -filterInputs(inputs): Array
        -mapInputs(inputs): Array
    }

    INodePlugin <|.. LLMProcessor
    INodePlugin <|.. DataTransformer
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant Node as Process Node
    participant Manager as NodeDataManager
    participant Registry as PluginRegistry
    participant Plugin as Node Plugin
    participant API as External API

    UI->>Node: Input data changes
    Node->>Manager: Update connection data
    Manager->>Node: Updated NodeData

    Node->>Node: Detect input changes
    Node->>Registry: Get plugin instance
    Registry->>Plugin: Return plugin

    Node->>Plugin: process(inputs)
    Plugin->>Plugin: Aggregate inputs
    Plugin->>API: Make external call (if needed)
    API->>Plugin: Return response
    Plugin->>Node: Return ProcessingOutput

    Node->>Manager: Update output data
    Manager->>Node: Updated NodeData
    Node->>UI: Render updated state
```

## Plugin Architecture

```mermaid
graph LR
    subgraph "Plugin System"
        Registry[Plugin Registry]
        Interface[INodePlugin Interface]

        subgraph "Built-in Plugins"
            LLM[LLM Processor]
            Transform[Data Transformer]
            HTTP[HTTP Client]
            FileIO[File I/O]
        end

        subgraph "Custom Plugins"
            Custom1[Custom Plugin 1]
            Custom2[Custom Plugin 2]
            CustomN[Custom Plugin N]
        end

        Registry --> Interface
        Interface --> LLM
        Interface --> Transform
        Interface --> HTTP
        Interface --> FileIO
        Interface --> Custom1
        Interface --> Custom2
        Interface --> CustomN
    end

    subgraph "Process Node"
        ProcessNode[Process Node Component]
        PluginConfig[Plugin Configuration]
        InputHandler[Input Handler]
        OutputHandler[Output Handler]
        ErrorHandler[Error Handler]

        ProcessNode --> PluginConfig
        ProcessNode --> InputHandler
        ProcessNode --> OutputHandler
        ProcessNode --> ErrorHandler
    end

    Registry --> ProcessNode
    ProcessNode --> Registry
```

## Error Handling Flow

```mermaid
graph TD
    Start[Input Received] --> Validate[Validate Input]
    Validate -->|Valid| Process[Process with Plugin]
    Validate -->|Invalid| InputError[Add Input Error]

    Process --> Success{Processing Success?}
    Success -->|Yes| UpdateOutput[Update Output Data]
    Success -->|No| ProcessError[Add Processing Error]

    UpdateOutput --> OutputValidate[Validate Output]
    OutputValidate -->|Valid| Complete[Complete Successfully]
    OutputValidate -->|Invalid| OutputError[Add Output Error]

    InputError --> ErrorState[Error State]
    ProcessError --> ErrorState
    OutputError --> ErrorState

    ErrorState --> Retry{Retry Available?}
    Retry -->|Yes| Process
    Retry -->|No| Failed[Failed State]

    Complete --> Ready[Ready for Next Input]
    Failed --> Ready
```

## Migration Path

```mermaid
graph LR
    subgraph "Current State"
        OldSchema[Old Node Structure]
        OldProcess[Current Process Node]
        OldData[Mixed Data in formData]
        OldPolling[100ms Polling]
    end

    subgraph "Phase 1: Schema"
        NewSchema[New Node Schema]
        Migration[Migration Utilities]
        Coexistence[Schema Coexistence]
    end

    subgraph "Phase 2: Plugins"
        PluginSystem[Plugin System]
        BuiltinPlugins[Built-in Plugins]
        PluginUI[Plugin Configuration UI]
    end

    subgraph "Phase 3: Enhancement"
        RealTime[Real-time Updates]
        AdvancedError[Advanced Error Handling]
        Performance[Performance Optimization]
    end

    OldSchema --> Migration
    Migration --> NewSchema
    NewSchema --> Coexistence

    Coexistence --> PluginSystem
    PluginSystem --> BuiltinPlugins
    BuiltinPlugins --> PluginUI

    PluginUI --> RealTime
    RealTime --> AdvancedError
    AdvancedError --> Performance
```

## Key Benefits Visualization

```mermaid
mindmap
  root((New Schema Benefits))
    Consistency
      Standardized Structure
      Predictable Data Flow
      Easier Debugging
    Separation of Concerns
      Clear Input/Output
      Dedicated Error Handling
      Plugin Isolation
    Extensibility
      Plugin Architecture
      Custom Processors
      Third-party Integration
    Performance
      Efficient Data Flow
      No Constant Polling
      Optimized Updates
    Maintainability
      Type Safety
      Clear Interfaces
      Modular Design
    Multiple Inputs
      Native Support
      Flexible Aggregation
      Complex Workflows
```

This architecture provides a comprehensive foundation for building robust, scalable workflow nodes with clear separation of concerns, extensible plugin system, and efficient data flow management.
