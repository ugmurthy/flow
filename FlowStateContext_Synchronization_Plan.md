# FlowStateContext Synchronization Implementation Plan

## Problem Analysis

The current issue is that **NodeDataManager** processes connections and updates node data, but **FlowStateContext** doesn't receive these updates, causing components to show stale data.

## Current Architecture Flow

```
NodeDataManager.updateNodeData()
  ↓
Updates internal nodes Map
  ↓
Emits NODE_DATA_UPDATED event
  ↓
Components listen to event and update local state
  ↓
BUT FlowStateContext remains stale
  ↓
useFlowStateNode() returns outdated data
```

## Proposed Solution: Automatic FlowStateContext Synchronization

### 1. Add NodeDataManager Event Listener to FlowStateContext

**Location**: `src/contexts/FlowStateContext.jsx`

**Implementation**:

```javascript
// In FlowStateProvider component
useEffect(() => {
  const handleNodeDataUpdate = (event) => {
    const { nodeId, nodeData } = event.detail;

    // Update FlowStateContext when NodeDataManager updates
    dispatch({
      type: ActionTypes.UPDATE_NODE,
      nodeId,
      nodeData: {
        id: nodeId,
        type: "auto-sync", // Will be overridden by actual type
        position: { x: 0, y: 0 }, // Will be maintained by React Flow
        data: nodeData, // The actual NodeData from NodeDataManager
      },
    });
  };

  // Listen to NodeDataManager events
  nodeDataManager.addEventListener(
    NodeDataEvents.NODE_DATA_UPDATED,
    handleNodeDataUpdate
  );

  return () => {
    nodeDataManager.removeEventListener(
      NodeDataEvents.NODE_DATA_UPDATED,
      handleNodeDataUpdate
    );
  };
}, []);
```

### 2. Preserve React Flow Properties

**Challenge**: FlowStateContext stores complete React Flow nodes `{id, position, type, data}`, but NodeDataManager only has the `data` part.

**Solution**: Merge updates while preserving existing React Flow properties:

```javascript
const handleNodeDataUpdate = (event) => {
  const { nodeId, nodeData } = event.detail;
  const existingNode = state.nodes.get(nodeId);

  if (existingNode) {
    // Preserve React Flow properties, update only the data
    dispatch({
      type: ActionTypes.UPDATE_NODE,
      nodeId,
      nodeData: {
        ...existingNode, // Keep id, position, type, etc.
        data: nodeData, // Update with fresh NodeDataManager data
      },
    });
  }
};
```

### 3. Prevent Infinite Loops

**Risk**: FlowStateContext updates → Component updates → NodeDataManager updates → FlowStateContext updates...

**Solution**: Add update source tracking:

```javascript
// In NodeDataManager
const updateNodeData = (
  nodeId,
  updates,
  triggerProcessing = false,
  source = "component"
) => {
  // ... existing logic ...

  // Emit event with source information
  this.dispatchEvent(
    new CustomEvent(NodeDataEvents.NODE_DATA_UPDATED, {
      detail: {
        nodeId,
        nodeData: updatedData,
        updates,
        action: "updated",
        source,
      },
    })
  );
};

// In FlowStateContext
const handleNodeDataUpdate = (event) => {
  // Only sync if update came from NodeDataManager processing, not from FlowState
  if (event.detail.source !== "flowstate") {
    // ... update logic ...
  }
};
```

### 4. Update Component Manual Sync Calls

**Current**: Components manually call `flowState.updateNode()`
**New**: Remove manual calls since FlowStateContext auto-syncs

**Files to Update**:

- `src/components/MarkdownNew.jsx` - Remove lines 177-183
- `src/components/templateFormNode.jsx` - Remove similar manual sync calls

## Implementation Steps

1. **Step 1**: Add NodeDataManager event listener to FlowStateContext
2. **Step 2**: Implement smart merging to preserve React Flow properties
3. **Step 3**: Add source tracking to prevent infinite loops
4. **Step 4**: Remove manual sync calls from components
5. **Step 5**: Test that `useFlowStateNode()` returns current data

## Expected Outcome

After implementation:

- ✅ `useFlowStateNode(nodeId)` always returns current data
- ✅ Components don't need manual synchronization
- ✅ Single source of truth: NodeDataManager processes, FlowStateContext reflects
- ✅ No infinite loops or performance issues
- ✅ Console.log shows current connection and processed input data

## Rollback Plan

If issues arise:

1. Revert FlowStateContext changes
2. Keep the current dual console.log approach
3. Consider the custom `useNodeData` hook alternative

## Files to Modify

1. `src/contexts/FlowStateContext.jsx` - Add auto-sync logic
2. `src/components/MarkdownNew.jsx` - Remove manual sync
3. `src/components/templateFormNode.jsx` - Remove manual sync
4. `src/services/nodeDataManager.js` - Add source tracking (optional)
