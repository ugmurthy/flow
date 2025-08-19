/**
 * Synchronization Manager
 * Handles conflict-free updates between React Flow, NodeDataManager, and FlowStateContext
 */

import { performanceMonitor } from '../utils/performanceMonitor.js';

/**
 * Conflict Resolution Strategies
 */
export const ConflictResolutionStrategy = {
  RETRY: 'retry',
  MERGE: 'merge',
  ROLLBACK: 'rollback',
  LATEST_WINS: 'latest_wins',
  SOURCE_PRIORITY: 'source_priority',
};

/**
 * Conflict Resolver Class
 */
export class ConflictResolver {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = ConflictResolutionStrategy.LATEST_WINS;
    
    // Register default strategies
    this.registerStrategy(ConflictResolutionStrategy.RETRY, this.retryStrategy);
    this.registerStrategy(ConflictResolutionStrategy.MERGE, this.mergeStrategy);
    this.registerStrategy(ConflictResolutionStrategy.ROLLBACK, this.rollbackStrategy);
    this.registerStrategy(ConflictResolutionStrategy.LATEST_WINS, this.latestWinsStrategy);
    this.registerStrategy(ConflictResolutionStrategy.SOURCE_PRIORITY, this.sourcePriorityStrategy);
  }

  /**
   * Register a conflict resolution strategy
   * @param {string} name - Strategy name
   * @param {Function} handler - Strategy handler function
   */
  registerStrategy(name, handler) {
    this.strategies.set(name, handler.bind(this));
  }

  /**
   * Resolve a conflict
   * @param {string} source - Source of the conflict
   * @param {Array} changes - Conflicting changes
   * @param {Error} error - Error that caused the conflict
   * @returns {Object} Resolution result
   */
  async resolve(source, changes, error) {
    const strategy = this.determineStrategy(source, changes, error);
    const handler = this.strategies.get(strategy);
    
    if (!handler) {
      console.warn(`Unknown conflict resolution strategy: ${strategy}`);
      return this.latestWinsStrategy(source, changes, error);
    }

    return await handler(source, changes, error);
  }

  /**
   * Determine which strategy to use
   * @param {string} source - Source of the conflict
   * @param {Array} changes - Conflicting changes
   * @param {Error} error - Error that caused the conflict
   * @returns {string} Strategy name
   */
  determineStrategy(source, changes, error) {
    // Network errors -> retry
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return ConflictResolutionStrategy.RETRY;
    }

    // Version conflicts -> merge
    if (error.message.includes('version') || error.message.includes('conflict')) {
      return ConflictResolutionStrategy.MERGE;
    }

    // Data corruption -> rollback
    if (error.message.includes('corrupt') || error.message.includes('invalid')) {
      return ConflictResolutionStrategy.ROLLBACK;
    }

    return this.defaultStrategy;
  }

  /**
   * Retry strategy - retry after delay
   */
  async retryStrategy(source, changes, error) {
    const delay = Math.min(1000 * Math.pow(2, (changes.retryCount || 0)), 10000);
    
    return {
      strategy: ConflictResolutionStrategy.RETRY,
      delay,
      retryCount: (changes.retryCount || 0) + 1,
      maxRetries: 3,
    };
  }

  /**
   * Merge strategy - attempt to merge conflicting changes
   */
  async mergeStrategy(source, changes, error) {
    // Simple merge logic - in a real implementation, this would be more sophisticated
    const mergedData = this.mergeChanges(changes);
    
    return {
      strategy: ConflictResolutionStrategy.MERGE,
      mergedData,
      requiresValidation: true,
    };
  }

  /**
   * Rollback strategy - revert to last known good state
   */
  async rollbackStrategy(source, changes, error) {
    return {
      strategy: ConflictResolutionStrategy.ROLLBACK,
      rollbackToTimestamp: Date.now() - 30000, // 30 seconds ago
      requiresReload: true,
    };
  }

  /**
   * Latest wins strategy - use the most recent change
   */
  async latestWinsStrategy(source, changes, error) {
    const latestChange = changes.reduce((latest, current) => {
      return (current.timestamp || 0) > (latest.timestamp || 0) ? current : latest;
    }, changes[0]);

    return {
      strategy: ConflictResolutionStrategy.LATEST_WINS,
      winningChange: latestChange,
      discardedChanges: changes.filter(c => c !== latestChange),
    };
  }

  /**
   * Source priority strategy - prioritize based on source
   */
  async sourcePriorityStrategy(source, changes, error) {
    const priority = {
      'user': 3,
      'reactflow': 2,
      'nodedata': 1,
      'context': 0,
    };

    const sortedChanges = changes.sort((a, b) => {
      return (priority[b.source] || 0) - (priority[a.source] || 0);
    });

    return {
      strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
      winningChange: sortedChanges[0],
      discardedChanges: sortedChanges.slice(1),
    };
  }

  /**
   * Merge changes (simple implementation)
   * @param {Array} changes - Changes to merge
   * @returns {Object} Merged data
   */
  mergeChanges(changes) {
    return changes.reduce((merged, change) => {
      return { ...merged, ...change.data };
    }, {});
  }
}

/**
 * Synchronization Manager Class
 */
export class SynchronizationManager {
  constructor(flowStateContext, nodeDataManager, reactFlowInstance) {
    this.flowState = flowStateContext;
    this.nodeDataManager = nodeDataManager;
    this.reactFlow = reactFlowInstance;
    this.syncQueue = [];
    this.isProcessing = false;
    this.conflictResolver = new ConflictResolver();
    this.syncHistory = [];
    this.maxHistorySize = 100;
    
    // Performance tracking
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      conflicts: 0,
      averageSyncTime: 0,
    };
  }

  /**
   * Main synchronization method
   * @param {string} source - Source of the change ('reactflow', 'nodedata', 'context')
   * @param {Array} changes - Array of changes to synchronize
   * @returns {Promise} Promise that resolves when sync is complete
   */
  async synchronize(source, changes) {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const syncItem = {
      id: syncId,
      source,
      changes: Array.isArray(changes) ? changes : [changes],
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    this.stats.totalSyncs++;

    if (!this.isProcessing) {
      await this.processSyncQueue();
    }

    return syncId;
  }

  /**
   * Process synchronization queue
   */
  async processSyncQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const measurement = performanceMonitor.startMeasurement('sync');

    try {
      while (this.syncQueue.length > 0) {
        const syncItem = this.syncQueue.shift();
        await this.processSyncItem(syncItem);
      }
    } finally {
      this.isProcessing = false;
      performanceMonitor.endMeasurement(measurement);
    }
  }

  /**
   * Process individual sync item
   * @param {Object} syncItem - Sync item to process
   */
  async processSyncItem(syncItem) {
    const startTime = Date.now();
    
    try {
      switch (syncItem.source) {
        case 'reactflow':
          await this.syncFromReactFlow(syncItem);
          break;
        case 'nodedata':
          await this.syncFromNodeData(syncItem);
          break;
        case 'context':
          await this.syncFromContext(syncItem);
          break;
        default:
          console.warn(`Unknown sync source: ${syncItem.source}`);
      }

      // Record successful sync
      this.stats.successfulSyncs++;
      this.recordSyncHistory(syncItem, 'success', Date.now() - startTime);
      
    } catch (error) {
      console.error(`Sync error for ${syncItem.id}:`, error);
      
      // Handle sync conflict
      const resolution = await this.handleSyncConflict(syncItem, error);
      
      if (resolution.strategy === ConflictResolutionStrategy.RETRY && 
          syncItem.retryCount < (resolution.maxRetries || 3)) {
        // Retry after delay
        setTimeout(() => {
          syncItem.retryCount++;
          this.syncQueue.unshift(syncItem);
          if (!this.isProcessing) {
            this.processSyncQueue();
          }
        }, resolution.delay || 1000);
      } else {
        // Record failed sync
        this.stats.conflicts++;
        this.recordSyncHistory(syncItem, 'failed', Date.now() - startTime, error);
      }
    }
  }

  /**
   * Sync from React Flow changes
   * @param {Object} syncItem - Sync item
   */
  async syncFromReactFlow(syncItem) {
    for (const change of syncItem.changes) {
      switch (change.type) {
        case 'position':
          // Update position in context and NodeDataManager
          this.flowState.updateNode(change.id, {
            ...change,
            position: change.position,
          });
          
          // Update NodeDataManager if needed
          const nodeData = this.nodeDataManager.getNodeData(change.id);
          if (nodeData) {
            await this.nodeDataManager.updateNodeData(change.id, {
              meta: {
                ...nodeData.meta,
                lastModified: new Date().toISOString(),
              }
            });
          }
          break;

        case 'remove':
          // Remove from all systems
          this.flowState.removeNode(change.id);
          this.nodeDataManager.unregisterNode(change.id);
          break;

        case 'add':
          // Add to context and register with NodeDataManager
          this.flowState.updateNode(change.node.id, change.node);
          if (change.node.data) {
            this.nodeDataManager.registerNode(
              change.node.id,
              change.node.data,
              (nodeId, updates) => {
                // Update callback for React Flow
                if (this.reactFlow && this.reactFlow.setNodes) {
                  this.reactFlow.setNodes(nodes => 
                    nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n)
                  );
                }
              }
            );
          }
          break;

        case 'select':
          // Handle selection changes (optional)
          break;

        default:
          console.warn(`Unknown React Flow change type: ${change.type}`);
      }
    }
  }

  /**
   * Sync from NodeDataManager changes
   * @param {Object} syncItem - Sync item
   */
  async syncFromNodeData(syncItem) {
    for (const change of syncItem.changes) {
      switch (change.type) {
        case 'nodeDataUpdated':
          // Update context with new node data
          const existingNode = this.flowState.selectNode(change.nodeId);
          if (existingNode) {
            this.flowState.updateNode(change.nodeId, {
              ...existingNode,
              data: change.nodeData,
            });
          }
          break;

        case 'connectionAdded':
          // Update edge in context
          const edgeId = `${change.sourceNodeId}-${change.targetNodeId}`;
          this.flowState.updateEdge(edgeId, {
            id: edgeId,
            source: change.sourceNodeId,
            target: change.targetNodeId,
            sourceHandle: change.sourceHandle,
            targetHandle: change.targetHandle,
          });
          break;

        case 'connectionRemoved':
          // Remove edge from context
          const removeEdgeId = `${change.sourceNodeId}-${change.targetNodeId}`;
          this.flowState.removeEdge(removeEdgeId);
          break;

        default:
          console.warn(`Unknown NodeData change type: ${change.type}`);
      }
    }
  }

  /**
   * Sync from Context changes
   * @param {Object} syncItem - Sync item
   */
  async syncFromContext(syncItem) {
    for (const change of syncItem.changes) {
      switch (change.type) {
        case 'nodeUpdated':
          // Update React Flow
          if (this.reactFlow && this.reactFlow.setNodes) {
            this.reactFlow.setNodes(nodes =>
              nodes.map(n => n.id === change.nodeId ? { ...n, ...change.nodeData } : n)
            );
          }
          break;

        case 'edgeUpdated':
          // Update React Flow
          if (this.reactFlow && this.reactFlow.setEdges) {
            this.reactFlow.setEdges(edges =>
              edges.map(e => e.id === change.edgeId ? { ...e, ...change.edgeData } : e)
            );
          }
          break;

        default:
          console.warn(`Unknown Context change type: ${change.type}`);
      }
    }
  }

  /**
   * Handle sync conflicts
   * @param {Object} syncItem - Sync item that caused conflict
   * @param {Error} error - Error that occurred
   * @returns {Object} Resolution strategy
   */
  async handleSyncConflict(syncItem, error) {
    const resolution = await this.conflictResolver.resolve(
      syncItem.source,
      syncItem.changes,
      error
    );

    // Notify FlowState about the conflict
    if (this.flowState.dispatch) {
      this.flowState.dispatch({
        type: 'SYNC_CONFLICT',
        nodeId: syncItem.changes[0]?.id || 'unknown',
        conflict: {
          source: syncItem.source,
          error: error.message,
          resolution,
          timestamp: Date.now(),
        },
      });
    }

    return resolution;
  }

  /**
   * Record sync history for debugging and monitoring
   * @param {Object} syncItem - Sync item
   * @param {string} status - Status ('success' or 'failed')
   * @param {number} duration - Duration in milliseconds
   * @param {Error} error - Error if failed
   */
  recordSyncHistory(syncItem, status, duration, error = null) {
    const historyEntry = {
      id: syncItem.id,
      source: syncItem.source,
      status,
      duration,
      timestamp: syncItem.timestamp,
      changeCount: syncItem.changes.length,
      error: error ? error.message : null,
    };

    this.syncHistory.push(historyEntry);

    // Keep history size manageable
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory.shift();
    }

    // Update average sync time
    const successfulSyncs = this.syncHistory.filter(h => h.status === 'success');
    if (successfulSyncs.length > 0) {
      this.stats.averageSyncTime = successfulSyncs.reduce((sum, h) => sum + h.duration, 0) / successfulSyncs.length;
    }
  }

  /**
   * Get synchronization statistics
   * @returns {Object} Sync statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessing,
      historySize: this.syncHistory.length,
      recentHistory: this.syncHistory.slice(-10),
    };
  }

  /**
   * Clear sync history and reset stats
   */
  reset() {
    this.syncHistory = [];
    this.syncQueue = [];
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      conflicts: 0,
      averageSyncTime: 0,
    };
  }

  /**
   * Enable or disable conflict resolution
   * @param {boolean} enabled - Whether to enable conflict resolution
   */
  setConflictResolutionEnabled(enabled) {
    this.conflictResolutionEnabled = enabled;
  }

  /**
   * Set default conflict resolution strategy
   * @param {string} strategy - Strategy name
   */
  setDefaultConflictStrategy(strategy) {
    this.conflictResolver.defaultStrategy = strategy;
  }

  /**
   * Get sync queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      size: this.syncQueue.length,
      isProcessing: this.isProcessing,
      nextItem: this.syncQueue[0] || null,
      estimatedProcessingTime: this.syncQueue.length * this.stats.averageSyncTime,
    };
  }

  /**
   * Force process queue (for testing or manual intervention)
   */
  async forceProcessQueue() {
    if (!this.isProcessing) {
      await this.processSyncQueue();
    }
  }

  /**
   * Pause synchronization
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume synchronization
   */
  resume() {
    this.isPaused = false;
    if (this.syncQueue.length > 0 && !this.isProcessing) {
      this.processSyncQueue();
    }
  }

  /**
   * Check if synchronization is paused
   * @returns {boolean} True if paused
   */
  isPaused() {
    return this.isPaused || false;
  }
}

// Create and export singleton instance
export const createSynchronizationManager = (flowStateContext, nodeDataManager, reactFlowInstance) => {
  return new SynchronizationManager(flowStateContext, nodeDataManager, reactFlowInstance);
};

// Export utility functions
export const SyncUtils = {
  /**
   * Create a change object for React Flow updates
   * @param {string} type - Change type
   * @param {string} id - Node/edge ID
   * @param {Object} data - Change data
   * @returns {Object} Change object
   */
  createReactFlowChange: (type, id, data) => ({
    type,
    id,
    ...data,
    timestamp: Date.now(),
    source: 'reactflow',
  }),

  /**
   * Create a change object for NodeData updates
   * @param {string} type - Change type
   * @param {string} nodeId - Node ID
   * @param {Object} nodeData - Node data
   * @returns {Object} Change object
   */
  createNodeDataChange: (type, nodeId, nodeData) => ({
    type,
    nodeId,
    nodeData,
    timestamp: Date.now(),
    source: 'nodedata',
  }),

  /**
   * Create a change object for Context updates
   * @param {string} type - Change type
   * @param {string} id - ID
   * @param {Object} data - Change data
   * @returns {Object} Change object
   */
  createContextChange: (type, id, data) => ({
    type,
    id,
    data,
    timestamp: Date.now(),
    source: 'context',
  }),

  /**
   * Detect changes between two node arrays
   * @param {Array} oldNodes - Old nodes array
   * @param {Array} newNodes - New nodes array
   * @returns {Array} Array of changes
   */
  detectNodeChanges: (oldNodes, newNodes) => {
    const changes = [];
    const oldNodeMap = new Map(oldNodes.map(n => [n.id, n]));
    const newNodeMap = new Map(newNodes.map(n => [n.id, n]));

    // Detect additions and updates
    for (const [id, newNode] of newNodeMap) {
      const oldNode = oldNodeMap.get(id);
      if (!oldNode) {
        changes.push(SyncUtils.createReactFlowChange('add', id, { node: newNode }));
      } else if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
        changes.push(SyncUtils.createReactFlowChange('update', id, newNode));
      }
    }

    // Detect removals
    for (const [id] of oldNodeMap) {
      if (!newNodeMap.has(id)) {
        changes.push(SyncUtils.createReactFlowChange('remove', id, {}));
      }
    }

    return changes;
  },

  /**
   * Detect changes between two edge arrays
   * @param {Array} oldEdges - Old edges array
   * @param {Array} newEdges - New edges array
   * @returns {Array} Array of changes
   */
  detectEdgeChanges: (oldEdges, newEdges) => {
    const changes = [];
    const oldEdgeMap = new Map(oldEdges.map(e => [e.id, e]));
    const newEdgeMap = new Map(newEdges.map(e => [e.id, e]));

    // Detect additions and updates
    for (const [id, newEdge] of newEdgeMap) {
      const oldEdge = oldEdgeMap.get(id);
      if (!oldEdge) {
        changes.push(SyncUtils.createReactFlowChange('add', id, { edge: newEdge }));
      } else if (JSON.stringify(oldEdge) !== JSON.stringify(newEdge)) {
        changes.push(SyncUtils.createReactFlowChange('update', id, newEdge));
      }
    }

    // Detect removals
    for (const [id] of oldEdgeMap) {
      if (!newEdgeMap.has(id)) {
        changes.push(SyncUtils.createReactFlowChange('remove', id, {}));
      }
    }

    return changes;
  },
};