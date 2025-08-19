# Implementation Specifications for Performance Optimization

## 1. Debounced Validation System

### Core Implementation

```javascript
// src/utils/debouncedValidation.js
class DebouncedValidator {
  constructor() {
    this.timers = new Map();
    this.pendingValidations = new Set();
    this.cache = new Map();
    this.config = {
      validation: 300, // General validation
      nodeUpdate: 150, // Node data updates
      edgeUpdate: 100, // Edge changes
      processing: 500, // Heavy processing operations
      critical: 50, // Error states, immediate feedback
    };
  }

  // Debounce validation with different timeouts based on operation type
  debounceValidation(key, validationFn, type = "validation") {
    // Cancel existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set new timer
    const timeout = this.config[type];
    const timer = setTimeout(async () => {
      this.pendingValidations.add(key);
      try {
        const result = await validationFn();
        this.cache.set(key, {
          result,
          timestamp: Date.now(),
          hash: this.generateHash(result),
        });
        this.pendingValidations.delete(key);
        this.timers.delete(key);
      } catch (error) {
        this.pendingValidations.delete(key);
        this.timers.delete(key);
        throw error;
      }
    }, timeout);

    this.timers.set(key, timer);
  }

  // Generate content hash for caching
  generateHash(content) {
    return btoa(JSON.stringify(content)).slice(0, 16);
  }

  // Check if validation is pending
  isPending(key) {
    return this.pendingValidations.has(key);
  }

  // Get cached result
  getCached(key) {
    return this.cache.get(key);
  }

  // Clear all pending validations
  clearAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.pendingValidations.clear();
  }
}

export const debouncedValidator = new DebouncedValidator();
```

### Integration with Workflow Validation

```javascript
// Enhanced workflow validation with debouncing
export const validateWorkflowDebounced = (nodes, edges, options = {}) => {
  const key = `workflow-${nodes.length}-${edges.length}`;
  const type = options.critical ? "critical" : "validation";

  return new Promise((resolve, reject) => {
    debouncedValidator
      .debounceValidation(key, () => checkWorkflowValidity(nodes, edges), type)
      .then(resolve)
      .catch(reject);
  });
};
```

## 2. Validation Caching Mechanism

### Cache Implementation

```javascript
// src/utils/validationCache.js
class ValidationCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.accessOrder = new Map(); // For LRU eviction
  }

  // Generate cache key from workflow structure
  generateCacheKey(nodes, edges) {
    const nodeHashes = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      dataHash: this.hashObject(n.data),
    }));

    const edgeHashes = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    return this.hashObject({ nodes: nodeHashes, edges: edgeHashes });
  }

  // Hash object for consistent cache keys
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Get cached validation result
  get(nodes, edges) {
    const key = this.generateCacheKey(nodes, edges);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    return entry.result;
  }

  // Set validation result in cache
  set(nodes, edges, result) {
    const key = this.generateCacheKey(nodes, edges);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      dependencies: this.extractDependencies(nodes, edges),
    });

    this.accessOrder.set(key, Date.now());
  }

  // Extract dependencies for selective invalidation
  extractDependencies(nodes, edges) {
    return {
      nodeIds: nodes.map((n) => n.id),
      edgeIds: edges.map((e) => e.id),
      nodeTypes: [...new Set(nodes.map((n) => n.type))],
    };
  }

  // Invalidate cache entries affected by changes
  invalidateByDependencies(changedNodeIds = [], changedEdgeIds = []) {
    const toDelete = [];

    for (const [key, entry] of this.cache) {
      const deps = entry.dependencies;
      const hasChangedNode = changedNodeIds.some((id) =>
        deps.nodeIds.includes(id)
      );
      const hasChangedEdge = changedEdgeIds.some((id) =>
        deps.edgeIds.includes(id)
      );

      if (hasChangedNode || hasChangedEdge) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
  }

  // Evict oldest entry (LRU)
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  // Clear entire cache
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const validationCache = new ValidationCache();
```

## 3. Unified Flow State Context

### Context Structure

```javascript
// src/contexts/FlowStateContext.jsx
const FlowStateContext = createContext();

const initialState = {
  // Node state
  nodes: new Map(),
  nodeProcessing: new Set(),
  nodeErrors: new Map(),

  // Edge state
  edges: new Map(),
  connections: new Map(),

  // Validation state
  validation: {
    cache: new Map(),
    pending: new Set(),
    debounceTimers: new Map(),
    lastValidation: null,
  },

  // Synchronization state
  sync: {
    reactFlowVersion: 0,
    nodeDataVersion: 0,
    lastSyncTimestamp: 0,
    conflicts: new Map(),
  },

  // Performance monitoring
  performance: {
    validationTimes: [],
    syncTimes: [],
    renderTimes: [],
  },
};

// State reducer with Immer for immutable updates
const flowStateReducer = produce((draft, action) => {
  switch (action.type) {
    case "UPDATE_NODE":
      draft.nodes.set(action.nodeId, action.nodeData);
      draft.sync.nodeDataVersion++;
      draft.sync.lastSyncTimestamp = Date.now();
      break;

    case "UPDATE_EDGE":
      draft.edges.set(action.edgeId, action.edgeData);
      draft.sync.reactFlowVersion++;
      break;

    case "SET_VALIDATION_RESULT":
      draft.validation.cache.set(action.key, action.result);
      draft.validation.pending.delete(action.key);
      break;

    case "INVALIDATE_CACHE":
      action.keys.forEach((key) => draft.validation.cache.delete(key));
      break;

    case "SYNC_CONFLICT":
      draft.sync.conflicts.set(action.nodeId, action.conflict);
      break;

    case "RESOLVE_CONFLICT":
      draft.sync.conflicts.delete(action.nodeId);
      break;
  }
});
```

### Context Provider Implementation

```javascript
export const FlowStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(flowStateReducer, initialState);
  const debouncedValidator = useRef(new DebouncedValidator());
  const validationCache = useRef(new ValidationCache());

  // Debounced validation function
  const validateWorkflow = useCallback(
    debounce(async (nodes, edges) => {
      const cacheKey = validationCache.current.generateCacheKey(nodes, edges);

      // Check cache first
      const cached = validationCache.current.get(nodes, edges);
      if (cached) {
        dispatch({
          type: "SET_VALIDATION_RESULT",
          key: cacheKey,
          result: cached,
        });
        return cached;
      }

      // Perform validation
      const result = await checkWorkflowValidity(nodes, edges);

      // Cache result
      validationCache.current.set(nodes, edges, result);
      dispatch({ type: "SET_VALIDATION_RESULT", key: cacheKey, result });

      return result;
    }, 300),
    []
  );

  // Synchronization functions
  const syncWithReactFlow = useCallback(
    (reactFlowNodes, reactFlowEdges) => {
      // Detect changes and update state
      const nodeChanges = detectNodeChanges(state.nodes, reactFlowNodes);
      const edgeChanges = detectEdgeChanges(state.edges, reactFlowEdges);

      // Apply changes
      nodeChanges.forEach((change) => {
        dispatch({
          type: "UPDATE_NODE",
          nodeId: change.id,
          nodeData: change.data,
        });
      });

      edgeChanges.forEach((change) => {
        dispatch({
          type: "UPDATE_EDGE",
          edgeId: change.id,
          edgeData: change.data,
        });
      });

      // Invalidate affected cache entries
      if (nodeChanges.length > 0 || edgeChanges.length > 0) {
        const changedNodeIds = nodeChanges.map((c) => c.id);
        const changedEdgeIds = edgeChanges.map((c) => c.id);
        validationCache.current.invalidateByDependencies(
          changedNodeIds,
          changedEdgeIds
        );
      }
    },
    [state]
  );

  const contextValue = {
    state,
    dispatch,
    validateWorkflow,
    syncWithReactFlow,
    // Selector functions for performance
    selectNode: useCallback((nodeId) => state.nodes.get(nodeId), [state.nodes]),
    selectEdge: useCallback((edgeId) => state.edges.get(edgeId), [state.edges]),
    selectValidation: useCallback(() => state.validation, [state.validation]),
  };

  return (
    <FlowStateContext.Provider value={contextValue}>
      {children}
    </FlowStateContext.Provider>
  );
};
```

## 4. Centralized Synchronization Layer

### Synchronization Manager

```javascript
// src/services/synchronizationManager.js
class SynchronizationManager {
  constructor(flowStateContext, nodeDataManager, reactFlowInstance) {
    this.flowState = flowStateContext;
    this.nodeDataManager = nodeDataManager;
    this.reactFlow = reactFlowInstance;
    this.syncQueue = [];
    this.isProcessing = false;
    this.conflictResolver = new ConflictResolver();
  }

  // Main synchronization method
  async synchronize(source, changes) {
    this.syncQueue.push({ source, changes, timestamp: Date.now() });

    if (!this.isProcessing) {
      await this.processSyncQueue();
    }
  }

  // Process synchronization queue
  async processSyncQueue() {
    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const syncItem = this.syncQueue.shift();
      await this.processSyncItem(syncItem);
    }

    this.isProcessing = false;
  }

  // Process individual sync item
  async processSyncItem({ source, changes, timestamp }) {
    try {
      switch (source) {
        case "reactflow":
          await this.syncFromReactFlow(changes);
          break;
        case "nodedata":
          await this.syncFromNodeData(changes);
          break;
        case "context":
          await this.syncFromContext(changes);
          break;
      }
    } catch (error) {
      console.error("Sync error:", error);
      // Handle sync conflicts
      await this.handleSyncConflict(source, changes, error);
    }
  }

  // Sync from React Flow changes
  async syncFromReactFlow(changes) {
    for (const change of changes) {
      switch (change.type) {
        case "position":
          // Update position in context and NodeDataManager
          this.flowState.dispatch({
            type: "UPDATE_NODE",
            nodeId: change.id,
            nodeData: { position: change.position },
          });
          break;

        case "remove":
          // Remove from all systems
          this.nodeDataManager.unregisterNode(change.id);
          this.flowState.dispatch({
            type: "REMOVE_NODE",
            nodeId: change.id,
          });
          break;
      }
    }
  }

  // Conflict resolution
  async handleSyncConflict(source, changes, error) {
    const resolution = await this.conflictResolver.resolve(
      source,
      changes,
      error
    );

    switch (resolution.strategy) {
      case "retry":
        // Retry after delay
        setTimeout(() => this.synchronize(source, changes), resolution.delay);
        break;

      case "merge":
        // Merge conflicting changes
        await this.mergeConflictingChanges(changes, resolution.mergedData);
        break;

      case "rollback":
        // Rollback to last known good state
        await this.rollbackToLastGoodState();
        break;
    }
  }
}
```

## 5. Performance Monitoring

### Performance Monitor Implementation

```javascript
// src/utils/performanceMonitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      validationTimes: [],
      syncTimes: [],
      renderTimes: [],
      cacheHitRates: [],
      memoryUsage: [],
    };
    this.observers = new Set();
  }

  // Start performance measurement
  startMeasurement(operation) {
    return {
      operation,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
    };
  }

  // End performance measurement
  endMeasurement(measurement) {
    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    const endMemory = this.getMemoryUsage();

    const result = {
      operation: measurement.operation,
      duration,
      memoryDelta: endMemory - measurement.startMemory,
      timestamp: Date.now(),
    };

    this.recordMetric(measurement.operation, result);
    this.notifyObservers(result);

    return result;
  }

  // Record metric
  recordMetric(operation, result) {
    const metricKey = `${operation}Times`;
    if (this.metrics[metricKey]) {
      this.metrics[metricKey].push(result);

      // Keep only last 100 measurements
      if (this.metrics[metricKey].length > 100) {
        this.metrics[metricKey].shift();
      }
    }
  }

  // Get performance statistics
  getStats() {
    const stats = {};

    for (const [key, values] of Object.entries(this.metrics)) {
      if (values.length > 0) {
        const durations = values.map((v) => v.duration || v);
        stats[key] = {
          count: values.length,
          average: durations.reduce((a, b) => a + b, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations),
          recent: durations.slice(-10), // Last 10 measurements
        };
      }
    }

    return stats;
  }

  // Get memory usage
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // Add performance observer
  addObserver(callback) {
    this.observers.add(callback);
  }

  // Remove performance observer
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  // Notify observers of performance events
  notifyObservers(result) {
    this.observers.forEach((callback) => {
      try {
        callback(result);
      } catch (error) {
        console.error("Performance observer error:", error);
      }
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## 6. Migration Strategy

### Phase 1: Foundation Setup

1. **Create new context and utilities** (1-2 days)
   - Implement FlowStateContext
   - Create debounced validation system
   - Set up validation caching
   - Add performance monitoring

### Phase 2: Gradual Integration (2-3 days)

2. **Integrate with existing systems**
   - Wrap NodeDataManager with new context
   - Update React Flow event handlers
   - Create synchronization layer
   - Add conflict resolution

### Phase 3: Component Migration (2-3 days)

3. **Migrate components one by one**
   - Start with FetchNodeNew component
   - Update workflow operations
   - Migrate other node types
   - Update validation flows

### Phase 4: Testing and Optimization (1-2 days)

4. **Comprehensive testing**
   - Unit tests for all new utilities
   - Integration tests for synchronization
   - Performance benchmarking
   - Edge case testing

### Backward Compatibility Strategy

```javascript
// Adapter pattern for gradual migration
class LegacyAdapter {
  constructor(newFlowState, oldNodeDataManager) {
    this.newSystem = newFlowState;
    this.oldSystem = oldNodeDataManager;
    this.migrationFlags = new Map();
  }

  // Enable new system for specific component
  enableNewSystem(componentId) {
    this.migrationFlags.set(componentId, true);
  }

  // Route calls to appropriate system
  updateNodeData(nodeId, data, componentId) {
    if (this.migrationFlags.get(componentId)) {
      return this.newSystem.updateNode(nodeId, data);
    } else {
      return this.oldSystem.updateNodeData(nodeId, data);
    }
  }
}
```

## Expected Performance Improvements

### Quantified Benefits

- **Validation Performance**: 50-70% reduction in validation calls
- **UI Responsiveness**: 30-50% reduction in unnecessary re-renders
- **Memory Usage**: 20-30% reduction through better caching
- **Synchronization**: 100% elimination of race conditions
- **Developer Experience**: Single API for all state management

### Success Metrics

- Validation response time < 100ms for workflows with < 50 nodes
- Zero synchronization conflicts in normal operation
- UI remains responsive during heavy operations
- Memory usage stable over extended sessions
- 100% test coverage for synchronization logic
