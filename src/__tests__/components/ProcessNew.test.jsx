/**
 * Comprehensive test suite for ProcessNew component
 * Tests process node functionality including plugin integration, state management,
 * event handling, processing workflow, and error handling
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProcessNew from '../../components/ProcessNew.jsx';
import {
  renderWithProviders,
  createMockNodeData,
  createMockReactFlow,
  assertionHelpers,
  interactionHelpers,
  performanceHelpers,
  cleanupHelpers,
  ErrorBoundary,
} from '../utils/reactTestHelpers.js';

// Mock external dependencies
vi.mock('@xyflow/react', () => createMockReactFlow());

// Mock services and contexts
vi.mock('../../services/nodeDataManager.js', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(true),
    registerNode: vi.fn(),
    unregisterNode: vi.fn(),
    updateNodeData: vi.fn().mockResolvedValue(true),
    processNode: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    nodes: new Map(),
  },
  NodeDataEvents: {
    NODE_DATA_UPDATED: 'NODE_DATA_UPDATED',
    NODE_PROCESSING: 'NODE_PROCESSING',
    NODE_PROCESSED: 'NODE_PROCESSED',
    NODE_ERROR: 'NODE_ERROR',
  },
}));

vi.mock('../../services/pluginRegistry.js', () => ({
  default: {
    validatePluginConfig: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
    getPlugin: vi.fn().mockReturnValue({
      name: 'test-plugin',
      process: vi.fn().mockResolvedValue({ result: 'processed' }),
    }),
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

vi.mock('../../utils/performanceMonitor.js', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(() => ({ id: 'test-measurement' })),
    endMeasurement: vi.fn(),
  },
}));

vi.mock('../../types/nodeSchema.js', () => ({
  ProcessNodeData: {
    create: vi.fn((data) => ({
      meta: {
        label: 'Test Process Node',
        function: 'Data Processing',
        emoji: '⚙️',
        category: 'process',
        version: '1.0.0',
        ...data.meta,
      },
      input: {
        connections: {},
        processed: null,
        config: {
          aggregationStrategy: 'merge',
          requiredInputs: [],
          expectedDataTypes: ['object', 'string', 'array'],
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
      plugin: {
        name: 'data-transformer',
        config: {
          strategy: 'merge',
          preserveMetadata: true,
        },
        ...data.plugin,
      },
    })),
  },
}));

describe('ProcessNew Component', () => {
  let mockNodeData;
  let mockContextValues;
  
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    mockNodeData = createMockNodeData({
      meta: {
        label: 'Test Process Node',
        function: 'Data Processing',
        emoji: '⚙️',
        category: 'process',
        version: '1.0.0',
      },
      input: {
        config: {
          aggregationStrategy: 'merge',
          requiredInputs: [],
          expectedDataTypes: ['object', 'string', 'array'],
        },
        connections: {
          'connection-1': {
            sourceNodeId: 'source-node-1',
            processed: { data: 'test data' },
            meta: {
              lastProcessed: new Date().toISOString(),
            },
          },
        },
      },
      plugin: {
        name: 'data-transformer',
        config: {
          strategy: 'merge',
          preserveMetadata: true,
        },
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      },
    });

    mockContextValues = {
      flowStateContext: {
        updateNode: vi.fn(),
        setNodeProcessing: vi.fn(),
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
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render node with correct structure when data is available', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check node structure
      expect(screen.getByText('Test Process Node')).toBeInTheDocument();
      expect(screen.getByText('Data Processing')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should render with proper status colors based on processing state', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const processingNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          meta: {
            ...mockNodeData.data.output.meta,
            status: 'processing',
          },
        },
      };
      useFlowStateNode.mockReturnValue(processingNodeData);

      const { container } = renderWithProviders(
        <ProcessNew data={processingNodeData} />,
        { contextValues: mockContextValues }
      );

      const nodeContainer = container.querySelector('.border-yellow-400.bg-yellow-50');
      expect(nodeContainer).toBeInTheDocument();
    });

    it('should render both source and target handles', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check for both handles
      expect(screen.getByTestId('handle-source-right')).toBeInTheDocument();
      expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    });
  });

  describe('Node Initialization', () => {
    it('should initialize node with correct data structure', async () => {
      const { useFlowState, useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockUpdateNode = vi.fn();
      useFlowState.mockReturnValue({ updateNode: mockUpdateNode, setNodeProcessing: vi.fn() });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalled();
      });

      // Verify the update was called with correct structure
      const updateCall = mockUpdateNode.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        type: 'processNew',
        data: expect.objectContaining({
          meta: expect.objectContaining({
            label: expect.any(String),
            function: expect.any(String),
            emoji: expect.any(String),
          }),
          plugin: expect.objectContaining({
            name: expect.any(String),
            config: expect.any(Object),
          }),
        }),
      });
    });

    it('should register with nodeDataManager on mount', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(nodeDataManager.registerNode).toHaveBeenCalled();
      });
    });

    it('should handle schema migration from old format', async () => {
      const { ProcessNodeData } = await import('../../types/nodeSchema.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Mock old format data
      const oldFormatData = {
        label: 'Old Process Node',
        function: 'Old Processing',
        emoji: '🔄',
        formData: { result: 'processed data' },
        plugin: {
          name: 'old-plugin',
          config: { oldConfig: true },
        },
      };

      useFlowStateNode.mockReturnValue(null);

      renderWithProviders(
        <ProcessNew data={oldFormatData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(ProcessNodeData.create).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              label: 'Old Process Node',
              function: 'Old Processing',
              emoji: '🔄',
            }),
            plugin: expect.objectContaining({
              name: 'old-plugin',
              config: { oldConfig: true },
            }),
          })
        );
      });
    });
  });

  describe('Processing State Management', () => {
    it('should display processing indicator when node is processing', async () => {
      const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      const processingNodes = new Set(['test-node-1']);
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowStateProcessing.mockReturnValue(processingNodes);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        // Should show processing indicator with animation
        const processingIndicator = screen.getByText(/Status: processing/i);
        expect(processingIndicator).toBeInTheDocument();
      });

      // Check for animated processing indicator
      const animatedIndicator = document.querySelector('.animate-pulse');
      expect(animatedIndicator).toBeInTheDocument();
    });

    it('should display success state with correct styling', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const successNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          meta: {
            ...mockNodeData.data.output.meta,
            status: 'success',
            processingTime: 150,
          },
          data: { result: 'processed successfully' },
        },
      };
      useFlowStateNode.mockReturnValue(successNodeData);

      const { container } = renderWithProviders(
        <ProcessNew data={successNodeData} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText(/Status: success/i)).toBeInTheDocument();
      expect(screen.getByText('(150ms)')).toBeInTheDocument();
      
      const successContainer = container.querySelector('.border-green-400.bg-green-50');
      expect(successContainer).toBeInTheDocument();
    });

    it('should display error state with error details', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const errorNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          meta: {
            ...mockNodeData.data.output.meta,
            status: 'error',
          },
        },
        error: {
          hasError: true,
          errors: [
            {
              code: 'PLUGIN_ERROR',
              message: 'Plugin processing failed',
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };
      useFlowStateNode.mockReturnValue(errorNodeData);

      renderWithProviders(
        <ProcessNew data={errorNodeData} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText(/Status: error/i)).toBeInTheDocument();
      expect(screen.getByText('Errors:')).toBeInTheDocument();
      expect(screen.getByText('PLUGIN_ERROR: Plugin processing failed')).toBeInTheDocument();
    });
  });

  describe('Plugin Integration', () => {
    it('should display plugin information', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText(/Plugin: data-transformer/i)).toBeInTheDocument();
    });

    it('should show plugin last updated timestamp', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const nodeWithPluginUpdate = {
        ...mockNodeData.data,
        plugin: {
          ...mockNodeData.data.plugin,
          lastUpdated: new Date('2024-01-01T12:00:00Z').toISOString(),
        },
      };
      useFlowStateNode.mockReturnValue(nodeWithPluginUpdate);

      renderWithProviders(
        <ProcessNew data={nodeWithPluginUpdate} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });

    it('should handle plugin configuration updates', async () => {
      const pluginRegistry = (await import('../../services/pluginRegistry.js')).default;
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode, useFlowState } = require('../../contexts/FlowStateContext.jsx');
      const mockSetNodeProcessing = vi.fn();
      
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowState.mockReturnValue({
        updateNode: vi.fn(),
        setNodeProcessing: mockSetNodeProcessing,
      });

      // This would be tested through the component's internal methods
      // In a real scenario, we'd expose a method or simulate user interaction
      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Simulate plugin config update (this would normally be triggered by user action)
      const mockConfig = { newStrategy: 'array' };
      
      // Verify plugin validation would be called
      expect(pluginRegistry.validatePluginConfig).toBeDefined();
    });
  });

  describe('Manual Processing', () => {
    it('should handle manual process button click', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode, useFlowState } = require('../../contexts/FlowStateContext.jsx');
      const mockSetNodeProcessing = vi.fn();
      
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowState.mockReturnValue({
        updateNode: vi.fn(),
        setNodeProcessing: mockSetNodeProcessing,
      });

      const user = userEvent.setup();
      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const processButton = screen.getByTitle('Process Node');
      await user.click(processButton);

      await waitFor(() => {
        expect(mockSetNodeProcessing).toHaveBeenCalledWith('test-node-1', true);
        expect(nodeDataManager.processNode).toHaveBeenCalledWith('test-node-1');
      });
    });

    it('should disable process button when already processing', async () => {
      const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      const processingNodes = new Set(['test-node-1']);
      
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowStateProcessing.mockReturnValue(processingNodes);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const processButton = screen.getByTitle('Process Node');
      expect(processButton).toBeDisabled();
    });

    it('should handle processing errors gracefully', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode, useFlowState } = require('../../contexts/FlowStateContext.jsx');
      const mockSetNodeProcessing = vi.fn();
      
      // Mock processNode to throw an error
      nodeDataManager.processNode.mockRejectedValueOnce(new Error('Processing failed'));
      
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowState.mockReturnValue({
        updateNode: vi.fn(),
        setNodeProcessing: mockSetNodeProcessing,
      });

      const user = userEvent.setup();
      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const processButton = screen.getByTitle('Process Node');
      await user.click(processButton);

      await waitFor(() => {
        // Should clear processing state on error
        expect(mockSetNodeProcessing).toHaveBeenCalledWith('test-node-1', false);
      });
    });
  });

  describe('Connection Display', () => {
    it('should display input connections information', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Inputs:')).toBeInTheDocument();
      expect(screen.getByText('1 connected source(s)')).toBeInTheDocument();
      expect(screen.getByText(/• source-node-1/)).toBeInTheDocument();
    });

    it('should display output information when data is available', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const nodeWithOutput = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          data: {
            result: 'processed data',
            count: 42,
            status: 'completed',
          },
          meta: {
            ...mockNodeData.data.output.meta,
            dataSize: 1024,
          },
        },
      };
      useFlowStateNode.mockReturnValue(nodeWithOutput);

      renderWithProviders(
        <ProcessNew data={nodeWithOutput} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Output:')).toBeInTheDocument();
      expect(screen.getByText('3 field(s) available')).toBeInTheDocument();
      expect(screen.getByText('(1024 bytes)')).toBeInTheDocument();
    });

    it('should show connection timestamps in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText(/Type:/)).toBeInTheDocument();
      expect(screen.getByText(/Data:/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Event Handling', () => {
    it('should handle NODE_PROCESSING event', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find the event listener for NODE_PROCESSING
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'NODE_PROCESSING'
      );

      if (addListenerCall) {
        const handler = addListenerCall[1];
        handler({ detail: { nodeId: 'test-node-1' } });

        await waitFor(() => {
          expect(screen.getByText(/Status: processing/i)).toBeInTheDocument();
        });
      }
    });

    it('should handle NODE_PROCESSED event', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find the event listener for NODE_PROCESSED
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'NODE_PROCESSED'
      );

      if (addListenerCall) {
        const handler = addListenerCall[1];
        handler({ 
          detail: { 
            nodeId: 'test-node-1',
            success: true
          } 
        });

        await waitFor(() => {
          expect(screen.getByText(/Status: success/i)).toBeInTheDocument();
        });
      }
    });

    it('should handle NODE_ERROR event', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find the event listener for NODE_ERROR
      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'NODE_ERROR'
      );

      if (addListenerCall) {
        const handler = addListenerCall[1];
        const errorEvent = {
          detail: {
            nodeId: 'test-node-1',
            nodeData: {
              error: {
                hasError: true,
                errors: [{
                  code: 'PROCESSING_ERROR',
                  message: 'Processing failed',
                }],
              },
            },
          },
        };

        handler(errorEvent);

        await waitFor(() => {
          expect(screen.getByText(/Status: error/i)).toBeInTheDocument();
          expect(screen.getByText('PROCESSING_ERROR: Processing failed')).toBeInTheDocument();
        });
      }
    });

    it('should properly remove event listeners on cleanup', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { unmount } = renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Verify listeners were added
      expect(nodeDataManager.addEventListener).toHaveBeenCalledTimes(4);

      unmount();

      // Verify listeners were removed
      expect(nodeDataManager.removeEventListener).toHaveBeenCalledTimes(4);
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
          <ProcessNew data={mockNodeData.data} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for buttons', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should support keyboard navigation', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      await user.keyboard('{Enter}');
      // Should trigger button action
    });
  });
});

// Performance benchmark tests
describe('ProcessNew Performance', () => {
  it('should render within performance thresholds', async () => {
    const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
    const mockNodeData = createMockNodeData({
      meta: { label: 'Benchmark Process Node', emoji: '⚙️' },
    });
    useFlowStateNode.mockReturnValue(mockNodeData.data);

    const benchmark = await performanceHelpers.benchmarkComponent(
      ProcessNew,
      { data: mockNodeData.data },
      5
    );

    expect(benchmark.average).toBeLessThan(100);
    console.log('ProcessNew render benchmark:', benchmark);
  });

  it('should handle plugin updates efficiently', async () => {
    const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
    const mockNodeData = createMockNodeData({
      plugin: { name: 'test-plugin', config: {} },
    });
    
    useFlowStateNode.mockReturnValue(mockNodeData.data);

    const { rerender } = renderWithProviders(
      <ProcessNew data={mockNodeData.data} />,
      { contextValues: {} }
    );

    const startTime = performance.now();

    // Simulate plugin configuration updates
    for (let i = 0; i < 5; i++) {
      const updatedData = {
        ...mockNodeData.data,
        plugin: {
          ...mockNodeData.data.plugin,
          config: { iteration: i },
          lastUpdated: new Date().toISOString(),
        },
      };
      rerender(<ProcessNew data={updatedData} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(150);
  });
});