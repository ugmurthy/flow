import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import workflowDB from '../services/workflowDB';
import {
  prepareWorkflowForSaving,
  checkWorkflowValidity,
  calculateWorkflowStats
} from '../utils/workflowUtils';
import { useReactFlow } from '@xyflow/react';
import { createWorkflowDataManager } from '../services/workflowDataManager';
import nodeDataManager from '../services/nodeDataManager';

const WorkflowContext = createContext();

/**
 * Custom hook to use workflow context
 */
export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};

/**
 * Workflow Context Provider
 * Manages all workflow-related state and operations
 */
export const WorkflowProvider = ({ children }) => {
  const { getNodes, getEdges, setNodes, setEdges, getViewport, setViewport } = useReactFlow();
  
  // State
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Create WorkflowDataManager instance
  const workflowDataManager = useMemo(() =>
    createWorkflowDataManager(nodeDataManager), []);

  // Track changes to nodes and edges
  React.useEffect(() => {
    const handleNodesChange = () => markUnsavedChanges();
    const handleEdgesChange = () => markUnsavedChanges();
    
    // We'll track changes through the context instead of individual handlers
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Load all workflows from IndexedDB
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedWorkflows = await workflowDB.getAllWorkflows();
      setWorkflows(loadedWorkflows);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Check if workflow name exists
  const checkWorkflowNameExists = useCallback(async (name, excludeId = null) => {
    try {
      return await workflowDB.workflowNameExists(name, excludeId);
    } catch (err) {
      console.error('Failed to check workflow name:', err);
      return false;
    }
  }, []);

  // Get current workflow validity
  const getCurrentWorkflowValidity = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const validity = checkWorkflowValidity(nodes, edges);
    
    return validity;
  }, [getNodes, getEdges]);

  // Enhanced save workflow with NodeDataManager data fidelity
  const saveWorkflow = useCallback(async ({ name, description, id = null }) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('<core> WorkflowContext: Starting enhanced save operation');
      
      // Get basic React Flow data
      const reactFlowNodes = getNodes();
      const reactFlowEdges = getEdges();
      const viewport = getViewport();

      console.log(`<core> WorkflowContext: Retrieved ${reactFlowNodes.length} nodes, ${reactFlowEdges.length} edges from React Flow`);

      // 🔥 ENHANCED: Merge with NodeDataManager rich data
      const enhancedWorkflowData = await workflowDataManager.mergeReactFlowWithNodeData(
        reactFlowNodes,
        reactFlowEdges
      );
      console.log(`<core> WorkflowContext: enhancedWorkFlowData.nodes`,enhancedWorkflowData.nodes);

      // Validate data integrity
      const validation = workflowDataManager.validateDataIntegrity(enhancedWorkflowData);
      if (!validation.isValid) {
        console.error('<core> WorkflowContext: Data integrity validation failed:', validation.errors);
        throw new Error(`Data integrity validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('<core> WorkflowContext: Data integrity warnings:', validation.warnings);
      }

      // Prepare enhanced workflow for saving
      const result = prepareWorkflowForSaving({
        name,
        description,
        nodes: enhancedWorkflowData.nodes,     // 🔥 Now contains full NodeData
        edges: enhancedWorkflowData.edges,
        viewport,
        id,
        // 🔥 NEW: Include connection metadata for enhanced format
        connectionMap: enhancedWorkflowData.connectionMap,
        enhancedMetadata: {
          version: '2.0.0', // Enhanced format version
          savedAt: new Date().toISOString(),
          dataFidelity: 'complete',
          stats: enhancedWorkflowData.stats,
          validation: validation.stats
        }
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('<core> WorkflowContext: Enhanced workflow prepared successfully');

      // Save enhanced workflow to IndexedDB
      console.log('<core> WorkflowContext: Enhanced workflow saving..',result.workflow)
      const savedId = await workflowDB.saveWorkflow(result.workflow);
      
      // Update local state
      await loadWorkflows();
      setCurrentWorkflowId(savedId);
      setHasUnsavedChanges(false);

      console.log(`<core> WorkflowContext: Enhanced workflow saved successfully with ID: ${savedId}`);

      return {
        success: true,
        workflowId: savedId,
        enhancedStats: enhancedWorkflowData.stats,
        validation: validation.stats
      };
    } catch (err) {
      console.error('<core> WorkflowContext: Enhanced save failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getNodes, getEdges, getViewport, loadWorkflows, workflowDataManager]);

  // Enhanced load workflow with NodeDataManager state restoration
  const loadWorkflow = useCallback(async (workflow, mode = 'replace') => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`<core> WorkflowContext: Starting enhanced load operation for ${workflow.name}`);
      console.log(`<core> WorkflowContext: workflow `,workflow);
      
      const {
        nodes: workflowNodes,
        edges: workflowEdges,
        viewport,
        connectionMap,
        enhancedMetadata
      } = workflow.workflow;

      // Check if this is an enhanced workflow with full data
      const isEnhancedFormat = enhancedMetadata?.version === '2.0.0';
      console.log(`<core> WorkflowContext: Loading ${isEnhancedFormat ? 'enhanced' : 'legacy'} format workflow`);

      if (mode === 'replace') {
        if (isEnhancedFormat) {
          // 🔥 ENHANCED: Restore workflow with full NodeDataManager state
          
          // 1. Split the enhanced workflow data
          const splitData = workflowDataManager.splitWorkflowData({
            nodes: workflowNodes,
            edges: workflowEdges,
            connectionMap,
            stats: enhancedMetadata.stats
          });
          
          console.log('<core> WorkflowContext: Split enhanced data for restoration');

          // 2. First, restore React Flow nodes and edges (for positioning/type)
          setNodes(splitData.reactFlowNodes);
          setEdges(splitData.reactFlowEdges);
          
          // 3. Restore NodeDataManager state
          const restorationResult = await workflowDataManager.restoreNodeDataManagerState(
            workflowNodes,
            connectionMap
          );
          
          if (!restorationResult.success) {
            throw new Error('Failed to restore NodeDataManager state');
          }
          
          console.log('<core> WorkflowContext: NodeDataManager state restored:', restorationResult.stats);
          
          // 4. Re-register all nodes with NodeDataManager for live updates
          for (const node of workflowNodes) {
            if (node.data && node.enhancedMetadata?.source === 'nodeDataManager') {
              // Create update callback for React Flow sync
              const updateCallback = (nodeId, updatedData) => {
                console.log(`<core> WorkflowContext: Syncing node ${nodeId} data to React Flow`);
                setNodes(nodes => nodes.map(n =>
                  n.id === nodeId ? { ...n, data: updatedData } : n
                ));
              };

              // Register with NodeDataManager
              nodeDataManager.registerNode(node.id, node.data, updateCallback);
              console.log(`<core> WorkflowContext: Re-registered node ${node.id} with NodeDataManager`);
            }
          }
          
        } else {
          // Legacy format - use existing logic
          console.log('<core> WorkflowContext: Loading legacy format workflow');
          setNodes(workflowNodes);
          setEdges(workflowEdges);
        }
        
        if (viewport) {
          setViewport(viewport);
        }

      } else if (mode === 'merge') {
        // Enhanced merge logic (works for both formats)
        const currentNodes = getNodes();
        const currentEdges = getEdges();

        // Calculate offset to avoid overlapping
        const maxX = currentNodes.reduce((max, node) =>
          Math.max(max, node.position.x + 200), 0
        );

        // Offset new nodes
        const offsetNodes = workflowNodes.map(node => ({
          ...node,
          id: `${node.id}_${Date.now()}`, // Ensure unique IDs
          position: {
            x: node.position.x + maxX + 100,
            y: node.position.y
          }
        }));

        // Update edge references for new node IDs
        const nodeIdMap = {};
        workflowNodes.forEach((originalNode, index) => {
          nodeIdMap[originalNode.id] = offsetNodes[index].id;
        });

        const offsetEdges = workflowEdges.map(edge => ({
          ...edge,
          id: `${edge.id}_${Date.now()}`,
          source: nodeIdMap[edge.source] || edge.source,
          target: nodeIdMap[edge.target] || edge.target
        }));

        // Merge with current
        setNodes([...currentNodes, ...offsetNodes]);
        setEdges([...currentEdges, ...offsetEdges]);

        // If enhanced format, also register merged nodes with NodeDataManager
        if (isEnhancedFormat) {
          for (const node of offsetNodes) {
            if (node.data && node.enhancedMetadata?.source === 'nodeDataManager') {
              const updateCallback = (nodeId, updatedData) => {
                setNodes(nodes => nodes.map(n =>
                  n.id === nodeId ? { ...n, data: updatedData } : n
                ));
              };
              nodeDataManager.registerNode(node.id, node.data, updateCallback);
            }
          }
        }
      }

      setCurrentWorkflowId(workflow.id);
      setHasUnsavedChanges(false);

      console.log(`<core> WorkflowContext: Enhanced load completed for workflow ${workflow.name}`);

      return {
        success: true,
        format: isEnhancedFormat ? 'enhanced' : 'legacy',
        restorationStats: isEnhancedFormat ? enhancedMetadata.stats : null
      };
    } catch (err) {
      console.error('<core> WorkflowContext: Enhanced load failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getNodes, getEdges, setNodes, setEdges, setViewport, workflowDataManager]);

  // Delete workflow
  const deleteWorkflow = useCallback(async (workflowId) => {
    setIsLoading(true);
    setError(null);

    try {
      await workflowDB.deleteWorkflow(workflowId);
      
      // Update local state
      await loadWorkflows();
      
      // Clear current workflow if it was deleted
      if (currentWorkflowId === workflowId) {
        setCurrentWorkflowId(null);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkflows, currentWorkflowId]);

  // Search workflows
  const searchWorkflows = useCallback(async (searchTerm) => {
    try {
      return await workflowDB.searchWorkflows(searchTerm);
    } catch (err) {
      console.error('Failed to search workflows:', err);
      return [];
    }
  }, []);

  // Get workflow statistics
  const getWorkflowStats = useCallback((workflow) => {
    return calculateWorkflowStats(workflow);
  }, []);

  // Get current canvas statistics
  const getCurrentCanvasStats = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const validity = checkWorkflowValidity(nodes, edges);
    
    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasWorkflow: validity.hasWorkflow,
      connectedNodeCount: validity.nodeCount || 0,
      connectedEdgeCount: validity.edgeCount || 0
    };
  }, [getNodes, getEdges]);

  // Export workflow (bonus feature)
  const exportWorkflow = useCallback(async (workflowId) => {
    try {
      const workflow = await workflowDB.loadWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const dataStr = JSON.stringify(workflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Import workflow (bonus feature)
  const importWorkflow = useCallback(async (file) => {
    try {
      const text = await file.text();
      const workflow = JSON.parse(text);
      
      // Validate imported workflow structure
      if (!workflow.id || !workflow.name || !workflow.workflow) {
        throw new Error('Invalid workflow file format');
      }

      // Generate new ID to avoid conflicts
      workflow.id = `imported_${Date.now()}_${workflow.id}`;
      workflow.name = `${workflow.name} (Imported)`;
      workflow.updatedAt = new Date().toISOString();

      // Save imported workflow
      await workflowDB.saveWorkflow(workflow);
      await loadWorkflows();

      return { success: true, workflow };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('Invalid JSON file');
      }
      setError(err.message);
      throw err;
    }
  }, [loadWorkflows]);

  // Clear all workflows (use with caution)
  const clearAllWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await workflowDB.clearAllWorkflows();
      setWorkflows([]);
      setCurrentWorkflowId(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get database statistics
  const getDatabaseStats = useCallback(async () => {
    try {
      return await workflowDB.getStats();
    } catch (err) {
      console.error('Failed to get database stats:', err);
      return null;
    }
  }, []);

  // Mark as having unsaved changes
  const markUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Clear unsaved changes flag
  const clearUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const contextValue = {
    // State
    workflows,
    isLoading,
    error,
    currentWorkflowId,
    hasUnsavedChanges,

    // Core operations
    saveWorkflow,
    loadWorkflow,
    deleteWorkflow,
    loadWorkflows,

    // Utility functions
    checkWorkflowNameExists,
    getCurrentWorkflowValidity,
    getCurrentCanvasStats,
    getWorkflowStats,
    searchWorkflows,

    // Import/Export (bonus features)
    exportWorkflow,
    importWorkflow,

    // Admin functions
    clearAllWorkflows,
    getDatabaseStats,

    // State management
    markUnsavedChanges,
    clearUnsavedChanges,
    setError: (error) => setError(error)
  };

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
};

export default WorkflowContext;