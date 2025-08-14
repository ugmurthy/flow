import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import workflowDB from '../services/workflowDB';
import { 
  prepareWorkflowForSaving, 
  checkWorkflowValidity,
  calculateWorkflowStats 
} from '../utils/workflowUtils';
import { useReactFlow } from '@xyflow/react';

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

  // Save workflow
  const saveWorkflow = useCallback(async ({ name, description, id = null }) => {
    setIsLoading(true);
    setError(null);

    try {
      const nodes = getNodes();
      const edges = getEdges();
      const viewport = getViewport();

      // Prepare workflow for saving
      const result = prepareWorkflowForSaving({
        name,
        description,
        nodes,
        edges,
        viewport,
        id
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save to IndexedDB
      const savedId = await workflowDB.saveWorkflow(result.workflow);
      
      // Update local state
      await loadWorkflows();
      setCurrentWorkflowId(savedId);
      setHasUnsavedChanges(false);

      return { success: true, workflowId: savedId };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getNodes, getEdges, getViewport, loadWorkflows]);

  // Load workflow
  const loadWorkflow = useCallback(async (workflow, mode = 'replace') => {
    setIsLoading(true);
    setError(null);

    try {
      const { nodes: workflowNodes, edges: workflowEdges, viewport } = workflow.workflow;

      if (mode === 'replace') {
        // Replace current workflow
        setNodes(workflowNodes);
        setEdges(workflowEdges);
        
        if (viewport) {
          setViewport(viewport);
        }
      } else if (mode === 'merge') {
        // Merge with current workflow
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
      }

      setCurrentWorkflowId(workflow.id);
      setHasUnsavedChanges(false);

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getNodes, getEdges, setNodes, setEdges, setViewport]);

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