/**
 * Workflow Operations Service
 * Handles all workflow-related operations like save, load, delete, export, etc.
 */

import { exportWorkflowWithValidation } from '../utils/workflowExportUtils.js';

/**
 * Workflow Operations Service Class
 * Encapsulates all workflow operations with proper error handling
 */
export class WorkflowOperationsService {
  constructor(workflowContext, reactFlowHooks) {
    this.workflowContext = workflowContext;
    this.reactFlowHooks = reactFlowHooks;
  }

  /**
   * Saves a workflow with the given name and description
   * @param {Object} params - Save parameters
   * @param {string} params.name - Workflow name
   * @param {string} params.description - Workflow description
   * @returns {Promise<Object>} Save result
   */
  async saveWorkflow({ name, description }) {
    try {
      const result = await this.workflowContext.saveWorkflow({ name, description });
      console.log('Workflow saved successfully:', result.workflowId);
      return { success: true, workflowId: result.workflowId };
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  }

  /**
   * Loads a workflow with confirmation handling
   * @param {Object} workflow - Workflow to load
   * @param {Function} setConfirmDialogData - Function to set confirmation dialog data
   * @param {Function} setShowConfirmDialog - Function to show confirmation dialog
   * @returns {Promise<void>}
   */
  async loadWorkflow(workflow, setConfirmDialogData, setShowConfirmDialog) {
    const currentStats = this.workflowContext.getCurrentCanvasStats();
    
    if (currentStats.nodeCount > 0) {
      // Show confirmation dialog
      setConfirmDialogData({
        type: 'load',
        workflow,
        currentWorkflowStats: currentStats
      });
      setShowConfirmDialog(true);
    } else {
      // No current workflow, load directly
      await this.workflowContext.loadWorkflow(workflow, 'replace');
    }
  }

  /**
   * Handles load confirmation with the specified action
   * @param {string} action - Load action ('replace', 'merge', etc.)
   * @param {Object} confirmDialogData - Confirmation dialog data
   * @returns {Promise<void>}
   */
  async handleLoadConfirmation(action, confirmDialogData) {
    if (confirmDialogData?.workflow) {
      try {
        await this.workflowContext.loadWorkflow(confirmDialogData.workflow, action);
        console.log(`Workflow loaded with action: ${action}`);
      } catch (error) {
        console.error('Failed to load workflow:', error);
        throw error;
      }
    }
  }

  /**
   * Deletes a workflow by ID
   * @param {string} workflowId - ID of workflow to delete
   * @returns {Promise<void>}
   */
  async deleteWorkflow(workflowId) {
    try {
      await this.workflowContext.deleteWorkflow(workflowId);
      console.log('Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      throw error;
    }
  }

  /**
   * Exports the current workflow
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportWorkflow(options = {}) {
    try {
      const result = await exportWorkflowWithValidation(
        this.reactFlowHooks.getNodes,
        this.reactFlowHooks.getEdges,
        this.reactFlowHooks.getViewport,
        this.workflowContext.getCurrentWorkflowValidity,
        options
      );

      if (result.success) {
        console.log('Workflow exported successfully');
      } else {
        console.warn('Workflow export failed:', result.errors);
      }

      return result;
    } catch (error) {
      console.error('Failed to export workflow:', error);
      return {
        success: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Imports a workflow from file (placeholder for future implementation)
   * @returns {Promise<void>}
   */
  async importWorkflow() {
    // This would typically import a workflow from file
    console.log('Import workflow functionality to be implemented');
    // TODO: Implement file picker and workflow import logic
  }

  /**
   * Resets the current workflow (placeholder for future implementation)
   * @returns {Promise<void>}
   */
  async resetWorkflow() {
    // This would typically reset the current workflow
    console.log('Reset workflow functionality to be implemented');
    // TODO: Implement workflow reset logic
  }

  /**
   * Gets workflow statistics for display
   * @returns {Object|null} Workflow statistics or null if no valid workflow
   */
  getWorkflowStats() {
    const validity = this.workflowContext.getCurrentWorkflowValidity();
    
    if (!validity.hasWorkflow) {
      return null;
    }

    const nodes = this.reactFlowHooks.getNodes();
    const edges = this.reactFlowHooks.getEdges();
    
    const connectedNodes = nodes.filter(n =>
      edges.some(e => e.source === n.id || e.target === n.id)
    );

    return {
      nodeCount: validity.nodeCount,
      edgeCount: validity.edgeCount,
      nodeTypes: [...new Set(connectedNodes.map(n => n.type))]
    };
  }

  /**
   * Checks if a workflow name already exists
   * @param {string} name - Workflow name to check
   * @param {string} excludeId - Optional ID to exclude from check
   * @returns {Promise<boolean>} True if name exists
   */
  async checkWorkflowNameExists(name, excludeId = null) {
    return this.workflowContext.checkWorkflowNameExists(name, excludeId);
  }

  /**
   * Gets all available workflows
   * @returns {Array} Array of workflow objects
   */
  getWorkflows() {
    return this.workflowContext.workflows;
  }

  /**
   * Gets workflow loading state
   * @returns {boolean} True if workflows are loading
   */
  isLoading() {
    return this.workflowContext.isLoading;
  }

  /**
   * Gets workflow error state
   * @returns {string|null} Error message or null
   */
  getError() {
    return this.workflowContext.error;
  }
}

/**
 * Creates a workflow operations service instance
 * @param {Object} workflowContext - Workflow context object
 * @param {Object} reactFlowHooks - ReactFlow hooks object
 * @returns {WorkflowOperationsService} Service instance
 */
export const createWorkflowOperationsService = (workflowContext, reactFlowHooks) => {
  return new WorkflowOperationsService(workflowContext, reactFlowHooks);
};

/**
 * Workflow operations factory for creating operation handlers
 */
export const WorkflowOperationsFactory = {
  /**
   * Creates a save handler
   * @param {WorkflowOperationsService} service - Service instance
   * @returns {Function} Save handler function
   */
  createSaveHandler: (service) => async ({ name, description }) => {
    return service.saveWorkflow({ name, description });
  },

  /**
   * Creates a load handler
   * @param {WorkflowOperationsService} service - Service instance
   * @param {Function} setConfirmDialogData - Confirmation dialog setter
   * @param {Function} setShowConfirmDialog - Show dialog setter
   * @returns {Function} Load handler function
   */
  createLoadHandler: (service, setConfirmDialogData, setShowConfirmDialog) => (workflow) => {
    return service.loadWorkflow(workflow, setConfirmDialogData, setShowConfirmDialog);
  },

  /**
   * Creates a delete handler
   * @param {WorkflowOperationsService} service - Service instance
   * @returns {Function} Delete handler function
   */
  createDeleteHandler: (service) => async (workflowId) => {
    return service.deleteWorkflow(workflowId);
  },

  /**
   * Creates an export handler
   * @param {WorkflowOperationsService} service - Service instance
   * @returns {Function} Export handler function
   */
  createExportHandler: (service) => (options = {}) => {
    return service.exportWorkflow(options);
  },

  /**
   * Creates an import handler
   * @param {WorkflowOperationsService} service - Service instance
   * @returns {Function} Import handler function
   */
  createImportHandler: (service) => () => {
    return service.importWorkflow();
  },

  /**
   * Creates a reset handler
   * @param {WorkflowOperationsService} service - Service instance
   * @returns {Function} Reset handler function
   */
  createResetHandler: (service) => () => {
    return service.resetWorkflow();
  }
};