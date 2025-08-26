# 🧪 Connection-Triggered Execution Testing Plan

## Overview

Comprehensive testing strategy for the connection-triggered execution feature implementation.

## Test Environment Setup

### Prerequisites

- jobrunner-flow application running
- FormNode, ProcessNode, and OutputNode components available
- WorkflowFAB play/pause button visible
- Browser developer console open for logging verification

## Test Scenarios

### Test 1: Connection-Triggered Execution (executeWorkflow=true)

**Setup:**

1. Ensure play button is active (executeWorkflow = true)
2. Create a FormNode and fill in form data
3. Create a ProcessNode (not connected yet)

**Test Steps:**

1. Drag connection from FormNode output to ProcessNode input
2. Observe immediate execution

**Expected Results:**

- ✅ ProcessNode should execute immediately upon connection
- ✅ Console should show: `"▶️ Connection-triggered execution: processing [ProcessNode-ID]"`
- ✅ ProcessNode should show processing status, then success
- ✅ ProcessNode should display processed data from FormNode

**Verification:**

```javascript
// Check in browser console:
// 1. CONNECTION_ADDED event fired
// 2. NODE_PROCESSING event fired for ProcessNode
// 3. NODE_PROCESSED event fired for ProcessNode
```

---

### Test 2: Connection-Triggered Execution Disabled (executeWorkflow=false)

**Setup:**

1. Click pause button (executeWorkflow = false)
2. Create a FormNode with data and ProcessNode

**Test Steps:**

1. Drag connection from FormNode to ProcessNode
2. Observe no automatic execution

**Expected Results:**

- ✅ Connection should be created successfully
- ✅ ProcessNode should remain idle (no automatic execution)
- ✅ Console should show: `"⏸️ Connection created but executeWorkflow is disabled"`
- ✅ Manual "Process Node" button should still work

**Verification:**

- ProcessNode status remains "idle"
- Clicking "Process Node" button should trigger execution manually

---

### Test 3: Connection Without Source Data

**Setup:**

1. Ensure play button is active (executeWorkflow = true)
2. Create empty FormNode (no data) and ProcessNode

**Test Steps:**

1. Drag connection from empty FormNode to ProcessNode

**Expected Results:**

- ✅ Connection should be created
- ✅ ProcessNode should NOT execute (no source data)
- ✅ Console should show: `"⏸️ Connection created but source has no data to process"`

---

### Test 4: Cascading Execution Still Works

**Setup:**

1. Connect FormNode → ProcessNode → OutputNode
2. Ensure executeWorkflow = true

**Test Steps:**

1. Submit NEW data in FormNode (after connections exist)

**Expected Results:**

- ✅ FormNode processes its data
- ✅ ProcessNode executes automatically (cascading)
- ✅ OutputNode executes automatically (cascading)
- ✅ All existing behavior preserved

---

### Test 5: Multiple Connection Scenarios

**Setup:**

1. Create FormNode1, FormNode2, and ProcessNode
2. Fill both FormNodes with different data

**Test Steps:**

1. Connect FormNode1 → ProcessNode (should trigger execution)
2. Connect FormNode2 → ProcessNode (should trigger execution with combined data)

**Expected Results:**

- ✅ First connection triggers ProcessNode with FormNode1 data
- ✅ Second connection triggers ProcessNode with merged data
- ✅ ProcessNode shows data from both sources

---

### Test 6: Play/Pause Toggle During Operations

**Setup:**

1. Create FormNode with data and ProcessNode (not connected)

**Test Steps:**

1. Pause workflow (executeWorkflow = false)
2. Create connection → No execution
3. Play workflow (executeWorkflow = true)
4. Create another connection → Should execute

**Expected Results:**

- ✅ Paused state prevents connection-triggered execution
- ✅ Play state enables connection-triggered execution
- ✅ Toggle affects both new connections and existing cascading

---

## Performance Testing

### Test 7: Rapid Connection Creation

**Test Steps:**

1. Rapidly create and delete connections
2. Monitor performance and memory usage

**Expected Results:**

- ✅ No memory leaks
- ✅ No duplicate processing
- ✅ Clean event handling

---

## Integration Testing

### Test 8: Plugin Processing Integration

**Setup:**

1. ProcessNode with complex plugin (e.g., LLM processor)
2. FormNode with substantial data

**Test Steps:**

1. Connect nodes with executeWorkflow = true

**Expected Results:**

- ✅ Plugin executes correctly on connection
- ✅ Processing time is recorded
- ✅ Results are properly formatted

---

## Error Handling Testing

### Test 9: Plugin Execution Errors

**Setup:**

1. ProcessNode with plugin that throws errors
2. FormNode with data

**Test Steps:**

1. Connect nodes

**Expected Results:**

- ✅ Error is caught and handled gracefully
- ✅ ProcessNode shows error state
- ✅ Error details are logged
- ✅ System remains stable

---

## Console Logging Verification

### Expected Log Messages:

#### Connection Success (executeWorkflow=true, with data):

```
<core> nodeDataManager: Connection added: FormNode-1 -> ProcessNode-1 (multiple: false)
<core> nodeDataManager: ▶️ Connection-triggered execution: processing ProcessNode-1
<core> nodeDataManager: processNode ProcessNode-1
```

#### Connection Success (executeWorkflow=false):

```
<core> nodeDataManager: Connection added: FormNode-1 -> ProcessNode-1 (multiple: false)
<core> nodeDataManager: ⏸️ Connection created but executeWorkflow is disabled - no immediate processing
```

#### Connection Success (no source data):

```
<core> nodeDataManager: Connection added: FormNode-1 -> ProcessNode-1 (multiple: false)
<core> nodeDataManager: ⏸️ Connection created but source FormNode-1 has no data to process
```

---

## Regression Testing Checklist

- [ ] Existing form submissions still work
- [ ] Manual Process buttons still work
- [ ] Play/pause button still works for cascading
- [ ] Node deletion still works
- [ ] Connection deletion still works
- [ ] Plugin system integration unchanged
- [ ] Error handling unchanged
- [ ] Performance characteristics maintained

---

## Success Criteria

✅ **All test scenarios pass**
✅ **No breaking changes to existing functionality**
✅ **Comprehensive logging provides clear debugging information**
✅ **Performance impact is minimal**
✅ **User experience is enhanced with immediate feedback**

---

## Test Execution Notes

### Tools Needed:

- Browser Developer Console
- React Developer Tools (optional)
- Performance tab for monitoring (optional)

### Key Metrics to Monitor:

- Connection creation time
- Processing execution time
- Memory usage
- Event firing sequence
- Console log accuracy

This testing plan ensures the connection-triggered execution feature works correctly while maintaining all existing functionality.
