# 🔄 Connection-Triggered Execution Implementation Plan

## Overview

This document provides the detailed implementation plan to add connection-triggered execution to the jobrunner-flow system. This will complement the existing cascading execution behavior.

## Current Analysis

### ✅ What's Already Working:

1. **Global executeWorkflow flag** - [`GlobalContext.jsx:17`](src/contexts/GlobalContext.jsx:17)
2. **Play/Pause UI button** - WorkflowFAB component
3. **Cascading execution** - [`NodeDataManager._triggerDownstreamProcessing()`](src/services/nodeDataManager.js:819-827)
4. **Manual Process buttons** - Available in ProcessNew components

### 🆕 What's Missing:

- **Connection-triggered execution** - When nodes are visually connected, target node should auto-execute if executeWorkflow=true

## Implementation Details

### File to Modify: `src/services/nodeDataManager.js`

**Location**: [`NodeDataManager.addConnection()` method around line 223](src/services/nodeDataManager.js:223)

### Current Method Structure:

```javascript
async addConnection(sourceNodeId, targetNodeId, sourceHandle = 'default', targetHandle = 'default', edgeId) {
  // ... existing connection setup logic ...
  // ... update target node with connection data ...

  // Emit connection event (line ~307)
  this.dispatchEvent(new CustomEvent(NodeDataEvents.CONNECTION_ADDED, {
    detail: { connectionId, sourceNodeId, targetNodeId, sourceHandle, targetHandle, replaced: !allowMultipleConnections }
  }));

  // Line 312: Currently commented out: await this.processNode(targetNodeId);

  console.log(`Connection added: ${sourceNodeId} -> ${targetNodeId}`);
}
```

### Required Change:

Replace the commented line 312 with executeWorkflow-controlled processing:

```javascript
// After emitting CONNECTION_ADDED event (around line 310)

// ✨ NEW: Connection-triggered execution with executeWorkflow control
const executeWorkflow = this.globalContext?.executeWorkflow ?? true;
if (executeWorkflow) {
  // Check if source node has data to process
  const sourceData = this.nodes.get(sourceNodeId);
  if (
    sourceData &&
    sourceData.output?.data &&
    Object.keys(sourceData.output.data).length > 0
  ) {
    console.log(
      `<core> nodeDataManager: ▶️ Connection-triggered execution: processing ${targetNodeId}`
    );
    // Trigger target processing immediately
    await this.processNode(targetNodeId);
  } else {
    console.log(
      `<core> nodeDataManager: ⏸️ Connection created but source ${sourceNodeId} has no data to process`
    );
  }
} else {
  console.log(
    `<core> nodeDataManager: ⏸️ Connection created but executeWorkflow is disabled - no immediate processing`
  );
}
```

## Implementation Steps

### Step 1: Code Modification

- **File**: `src/services/nodeDataManager.js`
- **Method**: `addConnection()` around line 223
- **Change**: Replace commented `processNode()` call with executeWorkflow-controlled version

### Step 2: Enhanced Logging

Add comprehensive logging to track:

- When connections trigger execution
- When executeWorkflow prevents execution
- When source nodes have no data

### Step 3: Maintain Backward Compatibility

- Use `?? true` fallback for executeWorkflow to ensure existing workflows continue working
- Don't change any existing cascading behavior

### Step 4: Event Integration

The change integrates perfectly with existing events:

- `CONNECTION_ADDED` event still fires
- `NODE_PROCESSING` and `NODE_PROCESSED` events fire when processing occurs
- `WORKFLOW_EXECUTION_PAUSED` events fire when executeWorkflow=false

## Expected Behavior After Implementation

### Scenario 1: executeWorkflow = true (Play button active)

1. **User drags connection** FormNode → ProcessNode
2. **Connection is added** to NodeDataManager
3. **System checks**: Does FormNode have output data?
4. **If yes**: ProcessNode executes immediately
5. **If no**: Connection added but no execution (normal behavior)

### Scenario 2: executeWorkflow = false (Pause button active)

1. **User drags connection** FormNode → ProcessNode
2. **Connection is added** to NodeDataManager
3. **System checks**: executeWorkflow flag
4. **Since false**: No execution, just connection setup
5. **User must**: Use manual Process button or toggle executeWorkflow

### Scenario 3: Cascading still works

1. **User submits form** in connected FormNode
2. **FormNode processes** its own data
3. **Cascading execution** triggers ProcessNode (existing behavior)
4. **ProcessNode completes** → triggers OutputNode (existing behavior)

## Testing Strategy

### Test Cases to Verify:

1. **Connection with data + executeWorkflow=true** → Should execute immediately
2. **Connection with data + executeWorkflow=false** → Should NOT execute
3. **Connection without data + executeWorkflow=true** → Should NOT execute (no data to process)
4. **Existing cascading behavior** → Should remain unchanged
5. **Manual Process buttons** → Should continue working
6. **Play/Pause toggle** → Should affect both connection and cascading behavior

### Files to Test:

- Form nodes with data connected to Process nodes
- Process nodes connected to Output nodes
- Multiple connection scenarios
- Toggle executeWorkflow during operations

## Benefits of This Implementation

### 1. **Minimal Impact**

- Single method modification
- No breaking changes
- Leverages existing architecture

### 2. **Consistent Behavior**

- Uses same executeWorkflow flag for both connection and cascading
- Maintains all existing event patterns
- Same logging and error handling

### 3. **Enhanced UX**

- Immediate feedback when connecting nodes
- Interactive workflow building
- Live preview of results

### 4. **Developer-Friendly**

- Easy to understand and maintain
- Follows existing code patterns
- Comprehensive logging for debugging

## Implementation Priority: HIGH

This is a single, well-defined change that significantly improves user experience with minimal risk of breaking existing functionality.

## Ready for Code Mode Implementation

All analysis complete. Ready to switch to Code mode and implement the change in `src/services/nodeDataManager.js`.
