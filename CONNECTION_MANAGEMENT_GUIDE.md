# Connection Management Guide

## Overview

This document describes the enhanced connection management system that fixes the two critical cases where connection handling was not working properly.

## Fixed Issues

### CASE 1: Connection Deletion Cleanup

**Problem:** When a connection/edge was deleted, the target node's `input.connections` object still retained connection data.

**Solution:**

- Enhanced `removeConnectionByEdgeId()` method that properly finds and removes connections by React Flow edge ID
- Fixed `processEdgeChanges()` to use the new removal method
- Ensures complete cleanup of connection data from target nodes

### CASE 2: Connection Replacement

**Problem:** When a new connection was added to a target node that already had a connection, the new connection was updated but the old one wasn't properly removed.

**Solution:**

- Enhanced `addConnection()` method with connection policy checking
- Automatic removal of old connections when `allowMultipleConnections` is false
- Automatic React Flow edge deletion for replaced connections

## Connection Policies

### Single Connection Mode (Default)

- **Behavior:** Only one input connection allowed per target node
- **Configuration:** Default behavior when `input.config.allowMultipleConnections` is not set or is `false`
- **When new connection is made:**
  1. Existing connection is removed from `input.connections`
  2. Old React Flow edge is automatically deleted
  3. New connection is established
  4. Target node is reprocessed with new data

### Multiple Connection Mode

- **Behavior:** Multiple input connections allowed per target node
- **Configuration:** Set `input.config.allowMultipleConnections = true` in node data
- **When new connection is made:**
  1. New connection is added to existing `input.connections`
  2. All connection data is available for processing
  3. Target node is reprocessed with aggregated data

## Implementation Details

### Enhanced NodeDataManager Methods

#### `addConnection(sourceNodeId, targetNodeId, sourceHandle, targetHandle, edgeId)`

- Checks target node's connection policy
- Removes old connections if single connection mode
- Automatically manages React Flow edges
- Updates target node's `input.connections`

#### `removeConnection(sourceNodeId, targetNodeId, sourceHandle, targetHandle)`

- Removes connection from connections map
- Cleans up target node's `input.connections`
- Clears processed data to trigger reprocessing

#### `removeConnectionByEdgeId(edgeId)`

- Finds connection by React Flow edge ID
- Calls `removeConnection()` with proper parameters
- Handles edge ID to connection mapping

#### `setReactFlowCallbacks(callbacks)`

- Registers React Flow integration callbacks
- Enables automatic edge management
- Provides `removeEdge` and `addEdge` functions

### Connection ID Format

- **Standard Format:** `"sourceNodeId-targetNodeId-sourceHandle-targetHandle"`
- **Backward Compatibility:** Handles simple `"source-target"` format
- **Consistent Usage:** Same format used throughout the system

### React Flow Integration

- **Automatic Edge Management:** Old edges are removed when connections are replaced
- **Callback System:** NodeDataManager can communicate back to React Flow
- **Event Processing:** Enhanced edge change processing with proper cleanup

## Usage Examples

### Setting Up Multiple Connections

```javascript
// In node data configuration
const nodeData = {
  meta: {
    /* ... */
  },
  input: {
    config: {
      allowMultipleConnections: true, // Enable multiple connections
    },
    connections: {},
    processed: {},
  },
  // ... rest of node data
};
```

### Connection Event Handling

```javascript
// The system automatically handles connection replacement
// No additional code needed - just connect nodes in React Flow

// For custom handling, listen to connection events
nodeDataManager.addEventListener("connectionAdded", (event) => {
  const { connectionId, replaced } = event.detail;
  if (replaced) {
    console.log("Old connection was replaced");
  }
});
```

## Testing the Fixes

### Test Case 1: Connection Deletion

1. Create two nodes and connect them
2. Verify target node has connection in `input.connections`
3. Delete the edge in React Flow
4. Verify target node's `input.connections` is empty
5. Verify target node's `input.processed` is cleared

### Test Case 2: Connection Replacement

1. Create three nodes (A, B, C)
2. Connect A → C (verify connection exists)
3. Connect B → C (should replace A → C)
4. Verify only B → C connection exists in C's `input.connections`
5. Verify A → C edge is removed from React Flow
6. Verify C is reprocessed with B's data

### Test Case 3: Multiple Connections

1. Create node with `allowMultipleConnections: true`
2. Connect multiple source nodes to it
3. Verify all connections exist in `input.connections`
4. Verify aggregated data is available in `input.processed`
5. Delete one connection and verify others remain

## Migration Notes

### Existing Workflows

- **Backward Compatible:** Existing workflows continue to work
- **Default Behavior:** Single connection mode is default
- **No Breaking Changes:** All existing APIs remain functional

### New Features

- **Multiple Connection Support:** Opt-in via configuration
- **Better Cleanup:** Automatic edge and data cleanup
- **Enhanced Validation:** Connection validation with warnings

## Troubleshooting

### Common Issues

1. **Connections not being removed:** Check if using latest event handlers
2. **Multiple connections not working:** Verify `allowMultipleConnections: true` in node config
3. **Edge ID mismatches:** Ensure consistent edge ID format usage

### Debug Information

- Connection operations are logged to console
- Event details include connection replacement information
- Validation warnings help identify configuration issues

## API Reference

### NodeDataManager Events

- `connectionAdded`: Fired when connection is added
- `connectionRemoved`: Fired when connection is removed
- `nodeDataUpdated`: Fired when node data changes

### Configuration Options

- `input.config.allowMultipleConnections`: Boolean, enables multiple connections
- React Flow callbacks: Automatic edge management integration

This enhanced connection management system provides robust, predictable behavior for both single and multiple connection scenarios while maintaining backward compatibility.
