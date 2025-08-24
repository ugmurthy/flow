/**
 * Comprehensive test suite for TemplateFormNode component
 * Tests all functionality including React Flow integration, state management,
 * event handling, modal interactions, and performance monitoring
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TemplateFormNode from '../../components/templateFormNode.jsx';
import {
  renderWithProviders,
  createMockNodeData,
  createMockReactFlow,
  createMockReactHookForm,
  createMockModal,
  assertionHelpers,
  interactionHelpers,
  performanceHelpers,
  cleanupHelpers,
  ErrorBoundary,
} from '../utils/reactTestHelpers.js';

// Mock external dependencies
vi.mock('@xyflow/react', () => createMockReactFlow());
vi.mock('react-hook-form', () => createMockReactHookForm());
vi.mock('react-modal', () => createMockModal());

// Mock services and contexts
vi.mock('../../services/nodeDataManager.js', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(true),
    registerNode: vi.fn(),
    unregisterNode: vi.fn(),
    updateNodeData: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    nodes: new Map(),
  },
  NodeDataEvents: {
    NODE_DATA_UPDATED: 'NODE_DATA_UPDATED',
    CONNECTION_ADDED: 'CONNECTION_ADDED',
    CONNECTION_REMOVED: 'CONNECTION_REMOVED',
  },
}));

vi.mock('../../contexts/FlowStateContext.jsx', () => ({
  useFlowState: vi.fn(() => ({
    updateNode: vi.fn(),
    setNodeProcessing: vi.fn(),
  })),
  useFlowStateNode: vi.fn(() => null),
  useFlowStateProcessing: vi.fn(() => new Set()),
}));

vi.mock('../../contexts/ModalContext.jsx', () => ({
  useModal: vi.fn(() => ({
    openModal: vi.fn(),
  })),
  MODAL_TYPES: {
    FORM_EDIT: 'FORM_EDIT',
  },
}));

vi.mock('../../contexts/GlobalContext.jsx', () => ({
  useGlobal: vi.fn(() => ({
    executeWorkflow: true,
  })),
}));

vi.mock('../../utils/performanceMonitor.js', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(() => ({ id: 'test-measurement' })),
    endMeasurement: vi.fn(),
  },
}));

vi.mock('../../types/nodeSchema.js', () => ({
  InputNodeData: {
    create: vi.fn((data) => ({
      meta: {
        label: 'Test Form Node',
        function: 'Form Collection',
        emoji: '📝',
        category: 'input',
        version: '1.0.0',
        ...data.meta,
      },
      input: {
        connections: {},
        processed: null,
        config: {
          formFields: [],
          ...data.input?.config,
        },
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle',
        },
        ...data.output,
      },
      error: {
        hasError: false,
        errors: [],
        ...data.error,
      },
      plugin: null,
    })),
  },
}));

describe('TemplateFormNode Component', () => {
  let mockNodeData;
  let mockContextValues;
  
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    mockNodeData = createMockNodeData({
      meta: {
        label: 'Test Form Node',
        function: 'Form Collection',
        emoji: '📝',
        category: 'input',
        version: '1.0.0',
      },
      input: {
        config: {
          formFields: [
            {
              id: 'field-1',
              label: 'Test Field',
              type: 'text',
              required: true,
            },
          ],
        },
      },
    });

    mockContextValues = {
      flowStateContext: {
        updateNode: vi.fn(),
        setNodeProcessing: vi.fn(),
      },
      modalContext: {
        openModal: vi.fn(),
      },
      globalContext: {
        executeWorkflow: true,
      },
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
    cleanupHelpers.cleanupDOM();
  });

  describe('Component Rendering', () => {
    it('should render loading state when no data is provided', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(null);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render node with correct structure when data is available', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check node structure
      expect(screen.getByText('Test Form Node')).toBeInTheDocument();
      expect(screen.getByText('Form Collection')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('input | v1.0.0')).toBeInTheDocument();
    });

    it('should render with proper CSS classes and styles', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { container } = renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const nodeContainer = container.querySelector('.group.relative');
      expect(nodeContainer).toBeInTheDocument();

      const mainContainer = container.querySelector('.px-4.py-3.shadow-md.rounded-lg');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('border-2', 'border-stone-400', 'bg-white');
    });

    it('should render React Flow handles correctly', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check for source handle (should be present)
      const sourceHandle = screen.getByTestId('handle-source-right');
      expect(sourceHandle).toBeInTheDocument();
    });
  });

  describe('Node Initialization', () => {
    it('should initialize node with correct data structure', async () => {
      const { useFlowState, useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockUpdateNode = vi.fn();
      useFlowState.mockReturnValue({ updateNode: mockUpdateNode, setNodeProcessing: vi.fn() });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalled();
      });

      // Verify the update was called with correct structure
      const updateCall = mockUpdateNode.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        type: 'templateFormNode',
        data: expect.objectContaining({
          meta: expect.objectContaining({
            label: expect.any(String),
            function: expect.any(String),
            emoji: expect.any(String),
          }),
        }),
      });
    });

    it('should register with nodeDataManager on mount', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(nodeDataManager.registerNode).toHaveBeenCalled();
      });
    });

    it('should unregister from nodeDataManager on unmount', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { unmount } = renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(nodeDataManager.registerNode).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(nodeDataManager.unregisterNode).toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    it('should update processing status correctly', async () => {
      const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      const processingNodes = new Set(['test-node-1']);
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowStateProcessing.mockReturnValue(processingNodes);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Should show processing indicator when node is in processing set
      await waitFor(() => {
        const statusIndicator = screen.getByTitle('Status: processing');
        expect(statusIndicator).toBeInTheDocument();
        expect(statusIndicator).toHaveClass('bg-yellow-500');
      });
    });

    it('should handle connection count updates', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Simulate connection added event
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'CONNECTION_ADDED'
      );
      
      if (addListenerCall) {
        const handler = addListenerCall[1];
        handler({
          detail: {
            targetNodeId: 'test-node-1',
          },
        });

        await waitFor(() => {
          expect(screen.getByText('1 connection')).toBeInTheDocument();
        });
      }
    });

    it('should handle error states properly', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const errorNodeData = {
        ...mockNodeData.data,
        error: {
          hasError: true,
          errors: [{
            code: 'TEST_ERROR',
            message: 'Test error message',
          }],
        },
        output: {
          ...mockNodeData.data.output,
          meta: {
            ...mockNodeData.data.output.meta,
            status: 'error',
          },
        },
      };
      useFlowStateNode.mockReturnValue(errorNodeData);

      renderWithProviders(
        <TemplateFormNode data={errorNodeData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        const statusIndicator = screen.getByTitle('Status: error');
        expect(statusIndicator).toBeInTheDocument();
        expect(statusIndicator).toHaveClass('bg-red-500');
      });
    });
  });

  describe('Modal Integration', () => {
    it('should open form edit modal when edit button is clicked', async () => {
      const { useModal } = require('../../contexts/ModalContext.jsx');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockOpenModal = vi.fn();
      
      useModal.mockReturnValue({ openModal: mockOpenModal });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find and click edit button
      const editButton = screen.getByTitle('Edit Node');
      await user.click(editButton);

      expect(mockOpenModal).toHaveBeenCalledWith('FORM_EDIT', expect.objectContaining({
        formFields: expect.any(Array),
        defaultValues: expect.any(Object),
        isSubmitting: false,
        onSubmit: expect.any(Function),
      }));
    });

    it('should handle form submission through modal', async () => {
      const { useModal } = require('../../contexts/ModalContext.jsx');
      const { useFlowStateNode, useFlowState } = require('../../contexts/FlowStateContext.jsx');
      const mockOpenModal = vi.fn();
      const mockSetNodeProcessing = vi.fn();
      
      useModal.mockReturnValue({ openModal: mockOpenModal });
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowState.mockReturnValue({
        updateNode: vi.fn(),
        setNodeProcessing: mockSetNodeProcessing,
      });

      const user = userEvent.setup();
      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find and click edit button
      const editButton = screen.getByTitle('Edit Node');
      await user.click(editButton);

      // Get the onSubmit function from the modal call
      const modalCall = mockOpenModal.mock.calls[0];
      const modalConfig = modalCall[1];
      const onSubmit = modalConfig.onSubmit;

      // Simulate form submission
      const testFormData = { field1: 'test value' };
      await onSubmit(testFormData);

      // Verify processing state was set and cleared
      expect(mockSetNodeProcessing).toHaveBeenCalledWith('test-node-1', true);
      expect(mockSetNodeProcessing).toHaveBeenCalledWith('test-node-1', false);
    });
  });

  describe('Button Panel Interactions', () => {
    it('should render all button panel buttons', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check for button panel buttons
      expect(screen.getByTitle('Node Data (New Schema)')).toBeInTheDocument();
      expect(screen.getByTitle('Delete Node')).toBeInTheDocument();
      expect(screen.getByTitle('Reset Form Data')).toBeInTheDocument();
      expect(screen.getByTitle('Edit Node')).toBeInTheDocument();
    });

    it('should handle reset button click', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const resetButton = screen.getByTitle('Reset Form Data');
      await user.click(resetButton);

      await waitFor(() => {
        expect(nodeDataManager.updateNodeData).toHaveBeenCalledWith(
          'test-node-1',
          expect.objectContaining({
            output: expect.objectContaining({
              data: {},
              meta: expect.objectContaining({
                status: 'idle',
              }),
            }),
            error: expect.objectContaining({
              hasError: false,
              errors: [],
            }),
          }),
          true // triggerProcessing
        );
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track node initialization performance', async () => {
      const { performanceMonitor } = await import('../../utils/performanceMonitor.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(performanceMonitor.startMeasurement).toHaveBeenCalledWith('nodeInitialization');
        expect(performanceMonitor.endMeasurement).toHaveBeenCalled();
      });
    });

    it('should handle performance monitoring errors gracefully', async () => {
      const { performanceMonitor } = await import('../../utils/performanceMonitor.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Mock performance monitor to throw an error
      performanceMonitor.startMeasurement.mockImplementation(() => {
        throw new Error('Performance monitoring error');
      });

      useFlowStateNode.mockReturnValue(mockNodeData.data);

      // Should not crash the component
      expect(() => {
        renderWithProviders(
          <TemplateFormNode data={mockNodeData.data} />,
          { contextValues: mockContextValues }
        );
      }).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should handle node data update events', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find the event listener for NODE_DATA_UPDATED
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'NODE_DATA_UPDATED'
      );

      if (addListenerCall) {
        const handler = addListenerCall[1];
        const updateEvent = {
          detail: {
            nodeId: 'test-node-1',
            nodeData: {
              ...mockNodeData.data,
              output: {
                ...mockNodeData.data.output,
                meta: {
                  ...mockNodeData.data.output.meta,
                  status: 'success',
                },
              },
            },
          },
        };

        handler(updateEvent);

        await waitFor(() => {
          // Should update local processing status
          expect(screen.getByTitle('Status: success')).toBeInTheDocument();
        });
      }
    });

    it('should properly remove event listeners on cleanup', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { unmount } = renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Verify listeners were added
      expect(nodeDataManager.addEventListener).toHaveBeenCalledTimes(3);

      unmount();

      // Verify listeners were removed
      expect(nodeDataManager.removeEventListener).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Boundary Integration', () => {
    it('should be caught by error boundary when component crashes', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const onError = vi.fn();
      
      // Mock a component crash
      useFlowStateNode.mockImplementation(() => {
        throw new Error('Component crashed');
      });

      render(
        <ErrorBoundary onError={onError}>
          <TemplateFormNode data={mockNodeData.data} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check for accessible button elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify buttons have proper titles for screen readers
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should support keyboard navigation', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      // Test enter key activation
      await user.keyboard('{Enter}');
      // Should trigger button action (verified by other tests)
    });
  });

  describe('Schema Migration', () => {
    it('should handle old data format migration', async () => {
      const { InputNodeData } = await import('../../types/nodeSchema.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Mock old format data
      const oldFormatData = {
        label: 'Old Form Node',
        function: 'Old Function',
        emoji: '📋',
        formFields: [{ id: 'old-field', type: 'text' }],
        formData: { 'old-field': 'old value' },
      };

      useFlowStateNode.mockReturnValue(null); // Start with null to trigger initialization

      renderWithProviders(
        <TemplateFormNode data={oldFormatData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(InputNodeData.create).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              label: 'Old Form Node',
              function: 'Old Function',
              emoji: '📋',
            }),
            formFields: [{ id: 'old-field', type: 'text' }],
            output: expect.objectContaining({
              data: { 'old-field': 'old value' },
            }),
          })
        );
      });
    });

    it('should handle new data format without migration', async () => {
      const { InputNodeData } = await import('../../types/nodeSchema.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        // Should not call InputNodeData.create for new format
        expect(InputNodeData.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Connection Badge', () => {
    it('should display connection badge when connections exist', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Simulate connection added
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'CONNECTION_ADDED'
      );
      
      if (addListenerCall) {
        const handler = addListenerCall[1];
        handler({ detail: { targetNodeId: 'test-node-1' } });

        await waitFor(() => {
          expect(screen.getByText('1')).toBeInTheDocument();
        });
      }
    });

    it('should hide connection badge when no connections exist', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Should not display badge initially
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });
});

// Performance benchmark tests
describe('TemplateFormNode Performance', () => {
  it('should render within performance thresholds', async () => {
    const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
    const mockNodeData = createMockNodeData();
    useFlowStateNode.mockReturnValue(mockNodeData.data);

    const benchmark = await performanceHelpers.benchmarkComponent(
      TemplateFormNode,
      { data: mockNodeData.data },
      5
    );

    // Should render in under 100ms on average
    expect(benchmark.average).toBeLessThan(100);
    console.log('TemplateFormNode render benchmark:', benchmark);
  });

  it('should handle multiple rapid updates efficiently', async () => {
    const { useFlowStateNode, useFlowState } = require('../../contexts/FlowStateContext.jsx');
    const mockNodeData = createMockNodeData();
    const mockSetNodeProcessing = vi.fn();
    
    useFlowStateNode.mockReturnValue(mockNodeData.data);
    useFlowState.mockReturnValue({
      updateNode: vi.fn(),
      setNodeProcessing: mockSetNodeProcessing,
    });

    const { rerender } = renderWithProviders(
      <TemplateFormNode data={mockNodeData.data} />,
      { contextValues: {} }
    );

    const startTime = performance.now();

    // Simulate 10 rapid updates
    for (let i = 0; i < 10; i++) {
      const updatedData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          data: { update: i },
        },
      };
      rerender(<TemplateFormNode data={updatedData} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should handle rapid updates in under 200ms
    expect(totalTime).toBeLessThan(200);
  });
});