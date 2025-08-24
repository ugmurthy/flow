/**
 * Comprehensive test suite for workflow operations hooks
 * Tests useWorkflowOperations, useWorkflowLoading, and useWorkflowStats hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  useWorkflowOperations,
  useWorkflowLoading,
  useWorkflowStats,
} from '../../hooks/useWorkflowOperations.js';
import { createMockReactFlow, cleanupHelpers } from '../utils/reactTestHelpers.js';

// Mock external dependencies
vi.mock('@xyflow/react', () => createMockReactFlow());

vi.mock('../../contexts/WorkflowContext.jsx', () => ({
  useWorkflow: vi.fn(() => ({
    getCurrentWorkflowValidity: vi.fn(() => ({
      hasWorkflow: true,
      nodeCount: 3,
      edgeCount: 2,
      isValid: true,
    })),
    workflows: [],
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    loadWorkflow: vi.fn(),
    exportWorkflow: vi.fn(),
    importWorkflow: vi.fn(),
  })),
}));

vi.mock('../../services/workflowOperationsService.js', () => ({
  createWorkflowOperationsService: vi.fn(() => ({
    getWorkflows: vi.fn(() => []),
    isLoading: vi.fn(() => false),
    getError: vi.fn(() => null),
    getWorkflowStats: vi.fn(() => ({
      totalWorkflows: 5,
      totalNodes: 15,
      totalEdges: 12,
    })),
    checkWorkflowNameExists: vi.fn(() => false),
    loadWorkflow: vi.fn(),
    handleLoadConfirmation: vi.fn(),
  })),
  WorkflowOperationsFactory: {
    createSaveHandler: vi.fn((service) => vi.fn()),
    createDeleteHandler: vi.fn((service) => vi.fn()),
    createExportHandler: vi.fn((service) => vi.fn()),
    createImportHandler: vi.fn((service) => vi.fn()),
    createResetHandler: vi.fn((service) => vi.fn()),
  },
}));

vi.mock('../../utils/reactFlowEventUtils.js', () => ({
  createWorkflowEventListeners: vi.fn(() => ({
    addListeners: vi.fn(),
    removeListeners: vi.fn(),
  })),
}));

describe('useWorkflowOperations Hook', () => {
  let mockReactFlowFunctions;
  let mockWorkflowContext;

  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    mockReactFlowFunctions = {
      getNodes: vi.fn(() => [
        { id: 'node1', type: 'input', data: {} },
        { id: 'node2', type: 'process', data: {} },
        { id: 'node3', type: 'output', data: {} },
      ]),
      getEdges: vi.fn(() => [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node3' },
      ]),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    };

    mockWorkflowContext = {
      getCurrentWorkflowValidity: vi.fn(() => ({
        hasWorkflow: true,
        nodeCount: 3,
        edgeCount: 2,
        isValid: true,
      })),
    };

    // Mock React Flow hooks
    const { useReactFlow } = require('@xyflow/react');
    useReactFlow.mockReturnValue(mockReactFlowFunctions);

    const { useWorkflow } = require('../../contexts/WorkflowContext.jsx');
    useWorkflow.mockReturnValue(mockWorkflowContext);

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWorkflowOperations());

      expect(result.current.workflows).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentWorkflowValidity).toEqual({ hasWorkflow: false });
    });

    it('should create workflow operations service', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      
      renderHook(() => useWorkflowOperations());

      expect(createWorkflowOperationsService).toHaveBeenCalledWith(
        mockWorkflowContext,
        mockReactFlowFunctions
      );
    });
  });

  describe('Workflow Validity Updates', () => {
    it('should update workflow validity on mount', () => {
      const { result } = renderHook(() => useWorkflowOperations());

      expect(mockWorkflowContext.getCurrentWorkflowValidity).toHaveBeenCalled();
      expect(result.current.currentWorkflowValidity).toEqual({
        hasWorkflow: true,
        nodeCount: 3,
        edgeCount: 2,
        isValid: true,
      });
    });

    it('should set up event listeners for workflow changes', () => {
      const { createWorkflowEventListeners } = require('../../utils/reactFlowEventUtils.js');
      const mockEventListeners = {
        addListeners: vi.fn(),
        removeListeners: vi.fn(),
      };
      createWorkflowEventListeners.mockReturnValue(mockEventListeners);

      const { unmount } = renderHook(() => useWorkflowOperations());

      expect(createWorkflowEventListeners).toHaveBeenCalled();
      expect(mockEventListeners.addListeners).toHaveBeenCalled();

      unmount();
      expect(mockEventListeners.removeListeners).toHaveBeenCalled();
    });

    it('should manually update workflow validity', () => {
      const { result } = renderHook(() => useWorkflowOperations());
      
      mockWorkflowContext.getCurrentWorkflowValidity.mockReturnValueOnce({
        hasWorkflow: false,
        nodeCount: 0,
        edgeCount: 0,
        isValid: false,
      });

      act(() => {
        result.current.updateWorkflowValidity();
      });

      expect(result.current.currentWorkflowValidity).toEqual({
        hasWorkflow: false,
        nodeCount: 0,
        edgeCount: 0,
        isValid: false,
      });
    });
  });

  describe('Operation Handlers', () => {
    it('should provide save workflow handler', () => {
      const { WorkflowOperationsFactory } = require('../../services/workflowOperationsService.js');
      const mockSaveHandler = vi.fn();
      WorkflowOperationsFactory.createSaveHandler.mockReturnValue(mockSaveHandler);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(WorkflowOperationsFactory.createSaveHandler).toHaveBeenCalled();
      expect(result.current.handleSaveWorkflow).toBe(mockSaveHandler);
    });

    it('should provide delete workflow handler', () => {
      const { WorkflowOperationsFactory } = require('../../services/workflowOperationsService.js');
      const mockDeleteHandler = vi.fn();
      WorkflowOperationsFactory.createDeleteHandler.mockReturnValue(mockDeleteHandler);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(WorkflowOperationsFactory.createDeleteHandler).toHaveBeenCalled();
      expect(result.current.handleDeleteWorkflow).toBe(mockDeleteHandler);
    });

    it('should provide export workflow handler', () => {
      const { WorkflowOperationsFactory } = require('../../services/workflowOperationsService.js');
      const mockExportHandler = vi.fn();
      WorkflowOperationsFactory.createExportHandler.mockReturnValue(mockExportHandler);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(WorkflowOperationsFactory.createExportHandler).toHaveBeenCalled();
      expect(result.current.handleExportWorkflow).toBe(mockExportHandler);
    });

    it('should provide import workflow handler', () => {
      const { WorkflowOperationsFactory } = require('../../services/workflowOperationsService.js');
      const mockImportHandler = vi.fn();
      WorkflowOperationsFactory.createImportHandler.mockReturnValue(mockImportHandler);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(WorkflowOperationsFactory.createImportHandler).toHaveBeenCalled();
      expect(result.current.handleImportWorkflow).toBe(mockImportHandler);
    });

    it('should provide reset workflow handler', () => {
      const { WorkflowOperationsFactory } = require('../../services/workflowOperationsService.js');
      const mockResetHandler = vi.fn();
      WorkflowOperationsFactory.createResetHandler.mockReturnValue(mockResetHandler);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(WorkflowOperationsFactory.createResetHandler).toHaveBeenCalled();
      expect(result.current.handleResetWorkflow).toBe(mockResetHandler);
    });
  });

  describe('Utility Functions', () => {
    it('should provide workflow stats getter', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        getWorkflowStats: vi.fn(() => ({ totalWorkflows: 5 })),
        getWorkflows: vi.fn(() => []),
        isLoading: vi.fn(() => false),
        getError: vi.fn(() => null),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowOperations());

      const stats = result.current.getWorkflowStats();
      expect(mockService.getWorkflowStats).toHaveBeenCalled();
      expect(stats).toEqual({ totalWorkflows: 5 });
    });

    it('should provide workflow name existence checker', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        checkWorkflowNameExists: vi.fn(() => true),
        getWorkflows: vi.fn(() => []),
        isLoading: vi.fn(() => false),
        getError: vi.fn(() => null),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowOperations());

      const exists = result.current.checkWorkflowNameExists('test-workflow', 'exclude-id');
      expect(mockService.checkWorkflowNameExists).toHaveBeenCalledWith('test-workflow', 'exclude-id');
      expect(exists).toBe(true);
    });

    it('should provide access to workflow service instance', () => {
      const { result } = renderHook(() => useWorkflowOperations());

      expect(result.current.workflowService).toBeDefined();
      expect(typeof result.current.workflowService).toBe('object');
    });
  });

  describe('State Properties', () => {
    it('should expose workflows from service', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockWorkflows = [
        { id: 'wf1', name: 'Workflow 1' },
        { id: 'wf2', name: 'Workflow 2' },
      ];
      const mockService = {
        getWorkflows: vi.fn(() => mockWorkflows),
        isLoading: vi.fn(() => false),
        getError: vi.fn(() => null),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(result.current.workflows).toEqual(mockWorkflows);
    });

    it('should expose loading state from service', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        getWorkflows: vi.fn(() => []),
        isLoading: vi.fn(() => true),
        getError: vi.fn(() => null),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(result.current.isLoading).toBe(true);
    });

    it('should expose error state from service', () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockError = new Error('Service error');
      const mockService = {
        getWorkflows: vi.fn(() => []),
        isLoading: vi.fn(() => false),
        getError: vi.fn(() => mockError),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowOperations());

      expect(result.current.error).toBe(mockError);
    });
  });
});

describe('useWorkflowLoading Hook', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    const { useWorkflow } = require('../../contexts/WorkflowContext.jsx');
    useWorkflow.mockReturnValue({
      getCurrentWorkflowValidity: vi.fn(() => ({ hasWorkflow: true })),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no confirm dialog data', () => {
      const { result } = renderHook(() => useWorkflowLoading());

      expect(result.current.confirmDialogData).toBeNull();
      expect(result.current.showConfirmDialog).toBe(false);
    });
  });

  describe('Load Workflow', () => {
    it('should handle workflow loading', async () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        loadWorkflow: vi.fn().mockResolvedValue(),
        handleLoadConfirmation: vi.fn(),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowLoading());

      const mockWorkflow = { id: 'wf1', name: 'Test Workflow' };
      
      await act(async () => {
        await result.current.handleLoadWorkflow(mockWorkflow);
      });

      expect(mockService.loadWorkflow).toHaveBeenCalledWith(
        mockWorkflow,
        expect.any(Function), // setConfirmDialogData
        expect.any(Function)  // setShowConfirmDialog
      );
    });
  });

  describe('Load Confirmation', () => {
    it('should handle load confirmation', async () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        loadWorkflow: vi.fn(),
        handleLoadConfirmation: vi.fn().mockResolvedValue(),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowLoading());

      const mockConfirmData = { action: 'overwrite', workflow: { id: 'wf1' } };
      
      // Set initial state
      act(() => {
        result.current.handleLoadWorkflow({ id: 'wf1' });
      });

      await act(async () => {
        await result.current.handleLoadConfirmation('overwrite');
      });

      expect(result.current.confirmDialogData).toBeNull();
      expect(result.current.showConfirmDialog).toBe(false);
    });

    it('should handle confirmation errors', async () => {
      const { createWorkflowOperationsService } = require('../../services/workflowOperationsService.js');
      const mockService = {
        loadWorkflow: vi.fn(),
        handleLoadConfirmation: vi.fn().mockRejectedValue(new Error('Confirmation failed')),
      };
      createWorkflowOperationsService.mockReturnValue(mockService);

      const { result } = renderHook(() => useWorkflowLoading());

      await expect(
        act(async () => {
          await result.current.handleLoadConfirmation('overwrite');
        })
      ).rejects.toThrow('Confirmation failed');
    });
  });

  describe('Close Confirm Dialog', () => {
    it('should close confirm dialog and clear data', () => {
      const { result } = renderHook(() => useWorkflowLoading());

      // Simulate dialog being open with data
      act(() => {
        // This would normally be set by the loadWorkflow function
        result.current.handleLoadWorkflow({ id: 'wf1' });
      });

      act(() => {
        result.current.closeConfirmDialog();
      });

      expect(result.current.showConfirmDialog).toBe(false);
      expect(result.current.confirmDialogData).toBeNull();
    });
  });
});

describe('useWorkflowStats Hook', () => {
  let mockReactFlowFunctions;
  let mockWorkflowContext;

  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    mockReactFlowFunctions = {
      getNodes: vi.fn(() => [
        { id: 'node1', type: 'input', data: {} },
        { id: 'node2', type: 'process', data: {} },
        { id: 'node3', type: 'output', data: {} },
        { id: 'node4', type: 'input', data: {} }, // disconnected
      ]),
      getEdges: vi.fn(() => [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node3' },
      ]),
    };

    mockWorkflowContext = {
      getCurrentWorkflowValidity: vi.fn(() => ({
        hasWorkflow: true,
        nodeCount: 3,
        edgeCount: 2,
      })),
    };

    const { useReactFlow } = require('@xyflow/react');
    useReactFlow.mockReturnValue(mockReactFlowFunctions);

    const { useWorkflow } = require('../../contexts/WorkflowContext.jsx');
    useWorkflow.mockReturnValue(mockWorkflowContext);

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Get Detailed Stats', () => {
    it('should calculate detailed workflow statistics', () => {
      const { result } = renderHook(() => useWorkflowStats());

      const stats = result.current.getDetailedStats();

      expect(stats).toEqual({
        totalNodes: 4,
        connectedNodes: 3,
        disconnectedNodes: 1,
        totalEdges: 2,
        nodeTypes: ['input', 'process', 'output'],
        hasValidWorkflow: true,
        validity: {
          hasWorkflow: true,
          nodeCount: 3,
          edgeCount: 2,
        },
      });
    });

    it('should handle empty workflow', () => {
      mockReactFlowFunctions.getNodes.mockReturnValue([]);
      mockReactFlowFunctions.getEdges.mockReturnValue([]);
      mockWorkflowContext.getCurrentWorkflowValidity.mockReturnValue({
        hasWorkflow: false,
        nodeCount: 0,
        edgeCount: 0,
      });

      const { result } = renderHook(() => useWorkflowStats());

      const stats = result.current.getDetailedStats();

      expect(stats).toEqual({
        totalNodes: 0,
        connectedNodes: 0,
        disconnectedNodes: 0,
        totalEdges: 0,
        nodeTypes: [],
        hasValidWorkflow: false,
        validity: {
          hasWorkflow: false,
          nodeCount: 0,
          edgeCount: 0,
        },
      });
    });

    it('should identify connected and disconnected nodes correctly', () => {
      const { result } = renderHook(() => useWorkflowStats());

      const stats = result.current.getDetailedStats();

      expect(stats.connectedNodes).toBe(3); // node1, node2, node3
      expect(stats.disconnectedNodes).toBe(1); // node4
      expect(stats.nodeTypes).toEqual(['input', 'process', 'output']);
    });
  });

  describe('Get Workflow Health', () => {
    it('should calculate health score for valid workflow', () => {
      const { result } = renderHook(() => useWorkflowStats());

      const health = result.current.getWorkflowHealth();

      expect(health.score).toBe(90); // 40 + 30 + 20 + 0 (has disconnected nodes)
      expect(health.issues).toContain('1 disconnected nodes');
      expect(health.recommendations).toContain('Connect or remove disconnected nodes');
    });

    it('should calculate health score for invalid workflow', () => {
      mockWorkflowContext.getCurrentWorkflowValidity.mockReturnValue({
        hasWorkflow: false,
        nodeCount: 0,
        edgeCount: 0,
      });

      mockReactFlowFunctions.getNodes.mockReturnValue([
        { id: 'node1', type: 'input', data: {} },
      ]);
      mockReactFlowFunctions.getEdges.mockReturnValue([]);

      const { result } = renderHook(() => useWorkflowStats());

      const health = result.current.getWorkflowHealth();

      expect(health.score).toBe(10); // Only disconnected nodes bonus (inverted)
      expect(health.issues).toContain('No valid workflow structure');
      expect(health.issues).toContain('Workflow needs at least 2 connected nodes');
      expect(health.recommendations).toContain('Add connections between nodes');
    });

    it('should provide recommendations for improvement', () => {
      mockReactFlowFunctions.getEdges.mockReturnValue([]);

      const { result } = renderHook(() => useWorkflowStats());

      const health = result.current.getWorkflowHealth();

      expect(health.recommendations).toContain('Add connections between nodes');
      expect(health.recommendations).toContain('Connect or remove disconnected nodes');
    });

    it('should calculate perfect health score', () => {
      mockReactFlowFunctions.getNodes.mockReturnValue([
        { id: 'node1', type: 'input', data: {} },
        { id: 'node2', type: 'process', data: {} },
      ]);

      const { result } = renderHook(() => useWorkflowStats());

      const health = result.current.getWorkflowHealth();

      expect(health.score).toBe(100); // All bonuses: 40 + 30 + 20 + 10
      expect(health.issues).toHaveLength(0);
      expect(health.recommendations).toHaveLength(0);
    });
  });
});

// Performance tests
describe('Workflow Operations Hooks Performance', () => {
  beforeEach(() => {
    const { useReactFlow } = require('@xyflow/react');
    const { useWorkflow } = require('../../contexts/WorkflowContext.jsx');
    
    // Mock many nodes and edges for performance testing
    const manyNodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node${i}`,
      type: i % 3 === 0 ? 'input' : i % 3 === 1 ? 'process' : 'output',
      data: {},
    }));
    
    const manyEdges = Array.from({ length: 99 }, (_, i) => ({
      id: `edge${i}`,
      source: `node${i}`,
      target: `node${i + 1}`,
    }));

    useReactFlow.mockReturnValue({
      getNodes: vi.fn(() => manyNodes),
      getEdges: vi.fn(() => manyEdges),
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    });

    useWorkflow.mockReturnValue({
      getCurrentWorkflowValidity: vi.fn(() => ({
        hasWorkflow: true,
        nodeCount: 100,
        edgeCount: 99,
      })),
    });
  });

  it('should handle large workflows efficiently in stats calculation', () => {
    const { result } = renderHook(() => useWorkflowStats());

    const startTime = performance.now();
    const stats = result.current.getDetailedStats();
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    expect(stats.totalNodes).toBe(100);
    expect(stats.totalEdges).toBe(99);
    expect(stats.connectedNodes).toBe(100);
  });

  it('should handle health calculation efficiently for large workflows', () => {
    const { result } = renderHook(() => useWorkflowStats());

    const startTime = performance.now();
    const health = result.current.getWorkflowHealth();
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    expect(health.score).toBe(100); // Perfect workflow
    expect(health.issues).toHaveLength(0);
  });

  it('should handle rapid validity updates efficiently', () => {
    const { result } = renderHook(() => useWorkflowOperations());

    const startTime = performance.now();

    act(() => {
      // Simulate many rapid updates
      for (let i = 0; i < 100; i++) {
        result.current.updateWorkflowValidity();
      }
    });

    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should handle rapid updates
  });
});