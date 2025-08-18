/**
 * Custom hook for workflow operations
 * Encapsulates all workflow-related operations and state management
 */

import { useState, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflow } from '../contexts/WorkflowContext.jsx';
import { createWorkflowOperationsService, WorkflowOperationsFactory } from '../services/workflowOperationsService.js';
import { createWorkflowEventListeners } from '../utils/reactFlowEventUtils.js';

/**
 * Custom hook that provides workflow operations and state management
 * @returns {Object} Workflow operations and state
 */
export const useWorkflowOperations = () => {
  const { getNodes, getEdges, getViewport } = useReactFlow();
  const workflowContext = useWorkflow();
  
  // Real-time workflow validity state
  const [currentWorkflowValidity, setCurrentWorkflowValidity] = useState({ hasWorkflow: false });

  // Create workflow operations service
  const workflowService = createWorkflowOperationsService(
    workflowContext,
    { getNodes, getEdges, getViewport }
  );

  // Update workflow validity when React Flow state changes
  const updateWorkflowValidity = useCallback(() => {
    const validity = workflowContext.getCurrentWorkflowValidity();
    setCurrentWorkflowValidity(validity);
    
    // Minimal debug logging
    console.log('FAB Update - Workflow Valid:', validity.hasWorkflow,
      `(${validity.nodeCount || 0} connected nodes, ${validity.edgeCount || 0} edges)`);
  }, [workflowContext]);

  // Listen to React Flow state changes
  useEffect(() => {
    updateWorkflowValidity();
  }, [updateWorkflowValidity]);

  // Set up workflow event listeners
  useEffect(() => {
    const eventListeners = createWorkflowEventListeners(updateWorkflowValidity);
    eventListeners.addListeners();

    return () => {
      eventListeners.removeListeners();
    };
  }, [updateWorkflowValidity]);

  // Create operation handlers
  const handleSaveWorkflow = useCallback(
    WorkflowOperationsFactory.createSaveHandler(workflowService),
    [workflowService]
  );

  const handleDeleteWorkflow = useCallback(
    WorkflowOperationsFactory.createDeleteHandler(workflowService),
    [workflowService]
  );

  const handleExportWorkflow = useCallback(
    WorkflowOperationsFactory.createExportHandler(workflowService),
    [workflowService]
  );

  const handleImportWorkflow = useCallback(
    WorkflowOperationsFactory.createImportHandler(workflowService),
    [workflowService]
  );

  const handleResetWorkflow = useCallback(
    WorkflowOperationsFactory.createResetHandler(workflowService),
    [workflowService]
  );

  return {
    // State
    currentWorkflowValidity,
    workflows: workflowService.getWorkflows(),
    isLoading: workflowService.isLoading(),
    error: workflowService.getError(),
    
    // Operations
    handleSaveWorkflow,
    handleDeleteWorkflow,
    handleExportWorkflow,
    handleImportWorkflow,
    handleResetWorkflow,
    
    // Utilities
    getWorkflowStats: () => workflowService.getWorkflowStats(),
    checkWorkflowNameExists: (name, excludeId) => workflowService.checkWorkflowNameExists(name, excludeId),
    updateWorkflowValidity,
    
    // Service instance for advanced operations
    workflowService
  };
};

/**
 * Custom hook for workflow loading operations with confirmation handling
 * @returns {Object} Load operations and confirmation state
 */
export const useWorkflowLoading = () => {
  const workflowContext = useWorkflow();
  const [confirmDialogData, setConfirmDialogData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Create workflow service for loading operations
  const workflowService = createWorkflowOperationsService(workflowContext, {});

  const handleLoadWorkflow = useCallback((workflow) => {
    return workflowService.loadWorkflow(workflow, setConfirmDialogData, setShowConfirmDialog);
  }, [workflowService]);

  const handleLoadConfirmation = useCallback(async (action) => {
    try {
      await workflowService.handleLoadConfirmation(action, confirmDialogData);
      setConfirmDialogData(null);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to handle load confirmation:', error);
      throw error;
    }
  }, [workflowService, confirmDialogData]);

  const closeConfirmDialog = useCallback(() => {
    setShowConfirmDialog(false);
    setConfirmDialogData(null);
  }, []);

  return {
    // State
    confirmDialogData,
    showConfirmDialog,
    
    // Operations
    handleLoadWorkflow,
    handleLoadConfirmation,
    closeConfirmDialog
  };
};

/**
 * Custom hook for workflow statistics and validation
 * @returns {Object} Workflow statistics and validation utilities
 */
export const useWorkflowStats = () => {
  const { getNodes, getEdges } = useReactFlow();
  const { getCurrentWorkflowValidity } = useWorkflow();

  const getDetailedStats = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const validity = getCurrentWorkflowValidity();

    const connectedNodes = nodes.filter(n =>
      edges.some(e => e.source === n.id || e.target === n.id)
    );

    const disconnectedNodes = nodes.filter(n =>
      !edges.some(e => e.source === n.id || e.target === n.id)
    );

    const nodeTypes = [...new Set(connectedNodes.map(n => n.type))];

    return {
      totalNodes: nodes.length,
      connectedNodes: connectedNodes.length,
      disconnectedNodes: disconnectedNodes.length,
      totalEdges: edges.length,
      nodeTypes,
      hasValidWorkflow: validity.hasWorkflow,
      validity
    };
  }, [getNodes, getEdges, getCurrentWorkflowValidity]);

  const getWorkflowHealth = useCallback(() => {
    const stats = getDetailedStats();
    
    const health = {
      score: 0,
      issues: [],
      recommendations: []
    };

    // Calculate health score
    if (stats.hasValidWorkflow) health.score += 40;
    if (stats.connectedNodes >= 2) health.score += 30;
    if (stats.totalEdges > 0) health.score += 20;
    if (stats.disconnectedNodes === 0) health.score += 10;

    // Identify issues
    if (!stats.hasValidWorkflow) {
      health.issues.push('No valid workflow structure');
    }
    if (stats.disconnectedNodes > 0) {
      health.issues.push(`${stats.disconnectedNodes} disconnected nodes`);
    }
    if (stats.connectedNodes < 2) {
      health.issues.push('Workflow needs at least 2 connected nodes');
    }

    // Generate recommendations
    if (stats.disconnectedNodes > 0) {
      health.recommendations.push('Connect or remove disconnected nodes');
    }
    if (stats.totalEdges === 0) {
      health.recommendations.push('Add connections between nodes');
    }

    return health;
  }, [getDetailedStats]);

  return {
    getDetailedStats,
    getWorkflowHealth
  };
};