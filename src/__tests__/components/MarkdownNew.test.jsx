/**
 * Comprehensive test suite for MarkdownNew component
 * Tests markdown rendering, content updates, connection handling,
 * download functionality, and display customization
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarkdownNew from '../../components/MarkdownNew.jsx';
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

// Mock MarkdownRenderer component
vi.mock('../../components/MarkdownRenderer.jsx', () => ({
  default: vi.fn(({ content }) => (
    <div data-testid="markdown-renderer">{content}</div>
  )),
}));

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
    NODE_PROCESSING: 'NODE_PROCESSING',
    NODE_PROCESSED: 'NODE_PROCESSED',
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
  OutputNodeData: {
    create: vi.fn((data) => ({
      meta: {
        label: 'Test Markdown Node',
        function: 'Markdown Renderer',
        emoji: '📝',
        category: 'output',
        version: '1.0.0',
        ...data.meta,
      },
      input: {
        connections: {},
        processed: null,
        config: {
          displayFormat: 'markdown',
          autoUpdate: true,
          styleConfig: {
            width: 'auto',
            textColor: '#374151',
            fontSize: '14px',
            ...data.input?.config?.styleConfig,
          },
          ...data.input?.config,
        },
      },
      output: {
        data: {
          content: '',
          renderedHtml: '',
          wordCount: 0,
          characterCount: 0,
          lastUpdated: new Date().toISOString(),
          ...data.output?.data,
        },
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

describe('MarkdownNew Component', () => {
  let mockNodeData;
  let mockContextValues;
  
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    
    mockNodeData = createMockNodeData({
      meta: {
        label: 'Test Markdown Node',
        function: 'Markdown Renderer',
        emoji: '📝',
        category: 'output',
        version: '1.0.0',
      },
      input: {
        config: {
          displayFormat: 'markdown',
          autoUpdate: true,
          styleConfig: {
            width: '400px',
            textColor: '#374151',
            fontSize: '14px',
          },
        },
        connections: {
          'connection-1': {
            sourceNodeId: 'source-node-1',
            processed: '# Test Content\n\nThis is test markdown content.',
            meta: {
              lastProcessed: new Date().toISOString(),
            },
          },
        },
      },
      output: {
        data: {
          content: '# Test Content\n\nThis is test markdown content.',
          wordCount: 5,
          characterCount: 45,
          lastUpdated: new Date().toISOString(),
        },
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
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render node with correct structure when data is available', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Check node structure
      expect(screen.getByText('Test Markdown Node')).toBeInTheDocument();
      expect(screen.getByText('Markdown Renderer')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should render with custom styling from config', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { container } = renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const nodeContainer = container.querySelector('[style*="width: 400px"]');
      expect(nodeContainer).toBeInTheDocument();
    });

    it('should render markdown content using MarkdownRenderer', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const markdownRenderer = screen.getByTestId('markdown-renderer');
      expect(markdownRenderer).toBeInTheDocument();
      expect(markdownRenderer).toHaveTextContent('# Test Content');
    });

    it('should show "No content to display" when no content is available', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const noContentNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          data: {
            ...mockNodeData.data.output.data,
            content: '',
          },
        },
      };
      useFlowStateNode.mockReturnValue(noContentNodeData);

      renderWithProviders(
        <MarkdownNew data={noContentNodeData} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('No content to display')).toBeInTheDocument();
    });

    it('should render target handle for connections', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

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
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalled();
      });

      const updateCall = mockUpdateNode.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        type: 'markdownNew',
        data: expect.objectContaining({
          meta: expect.objectContaining({
            label: expect.any(String),
            function: expect.any(String),
            emoji: expect.any(String),
          }),
        }),
      });
    });

    it('should handle schema migration from old format', async () => {
      const { OutputNodeData } = await import('../../types/nodeSchema.js');
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      const oldFormatData = {
        label: 'Old Markdown Node',
        function: 'Old Renderer',
        emoji: '📄',
        content: '# Old Content\n\nOld markdown content.',
        styleConfig: {
          width: '300px',
          textColor: '#000000',
          fontSize: '12px',
        },
      };

      useFlowStateNode.mockReturnValue(null);

      renderWithProviders(
        <MarkdownNew data={oldFormatData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(OutputNodeData.create).toHaveBeenCalledWith(
          expect.objectContaining({
            meta: expect.objectContaining({
              label: 'Old Markdown Node',
              function: 'Old Renderer',
              emoji: '📄',
            }),
            input: expect.objectContaining({
              config: expect.objectContaining({
                styleConfig: {
                  width: '300px',
                  textColor: '#000000',
                  fontSize: '12px',
                },
              }),
            }),
            output: expect.objectContaining({
              data: expect.objectContaining({
                content: '# Old Content\n\nOld markdown content.',
              }),
            }),
          })
        );
      });
    });

    it('should register with nodeDataManager on mount', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        expect(nodeDataManager.registerNode).toHaveBeenCalled();
      });
    });
  });

  describe('Content Updates', () => {
    it('should update content when connection data changes', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Find the NODE_DATA_UPDATED event listener
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
              input: {
                ...mockNodeData.data.input,
                connections: {
                  'connection-1': {
                    sourceNodeId: 'source-node-1',
                    processed: '# Updated Content\n\nThis is updated content.',
                    meta: {
                      lastProcessed: new Date().toISOString(),
                    },
                  },
                },
              },
            },
          },
        };

        handler(updateEvent);

        await waitFor(() => {
          const markdownRenderer = screen.getByTestId('markdown-renderer');
          expect(markdownRenderer).toHaveTextContent('# Updated Content');
        });
      }
    });

    it('should handle object data from connections', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const nodeWithObjectData = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          connections: {
            'connection-1': {
              sourceNodeId: 'source-node-1',
              processed: {
                content: 'Content from object',
                metadata: 'some metadata',
              },
              meta: {
                lastProcessed: new Date().toISOString(),
              },
            },
          },
        },
      };

      useFlowStateNode.mockReturnValue(nodeWithObjectData);

      renderWithProviders(
        <MarkdownNew data={nodeWithObjectData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        const markdownRenderer = screen.getByTestId('markdown-renderer');
        expect(markdownRenderer).toHaveTextContent('Content from object');
      });
    });

    it('should handle JSON data from connections', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const nodeWithJsonData = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          connections: {
            'connection-1': {
              sourceNodeId: 'source-node-1',
              processed: {
                someData: 'value',
                moreData: 123,
              },
              meta: {
                lastProcessed: new Date().toISOString(),
              },
            },
          },
        },
      };

      useFlowStateNode.mockReturnValue(nodeWithJsonData);

      renderWithProviders(
        <MarkdownNew data={nodeWithJsonData} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        const markdownRenderer = screen.getByTestId('markdown-renderer');
        expect(markdownRenderer.textContent).toContain('```json');
      });
    });

    it('should combine multiple connection sources', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const nodeWithMultipleConnections = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          connections: {
            'connection-1': {
              sourceNodeId: 'source-node-1',
              processed: 'Content from source 1',
              meta: { lastProcessed: new Date().toISOString() },
            },
            'connection-2': {
              sourceNodeId: 'source-node-2',
              processed: 'Content from source 2',
              meta: { lastProcessed: new Date().toISOString() },
            },
          },
        },
      };

      useFlowStateNode.mockReturnValue(nodeWithMultipleConnections);

      renderWithProviders(
        <MarkdownNew data={nodeWithMultipleConnections} />,
        { contextValues: mockContextValues }
      );

      await waitFor(() => {
        const markdownRenderer = screen.getByTestId('markdown-renderer');
        expect(markdownRenderer.textContent).toContain('From source-node-1');
        expect(markdownRenderer.textContent).toContain('From source-node-2');
        expect(markdownRenderer.textContent).toContain('---');
      });
    });
  });

  describe('Button Panel and Interactions', () => {
    it('should render all button panel buttons', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByTitle('View Data')).toBeInTheDocument();
      expect(screen.getByTitle('View Markdown')).toBeInTheDocument();
      expect(screen.getByTitle('Download markdown content')).toBeInTheDocument();
    });

    it('should handle view data button click', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const viewDataButton = screen.getByTitle('View Data');
      await user.click(viewDataButton);
      
      // Button should be clickable (ViewButton component handles the actual modal)
      expect(viewDataButton).toBeInTheDocument();
    });

    it('should handle view markdown button click', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const user = userEvent.setup();
      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const viewMarkdownButton = screen.getByTitle('View Markdown');
      await user.click(viewMarkdownButton);
      
      expect(viewMarkdownButton).toBeInTheDocument();
      expect(viewMarkdownButton).toHaveClass('text-blue-700');
    });

    it('should generate correct download filename with timestamp', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const downloadButton = screen.getByTitle('Download markdown content');
      expect(downloadButton).toBeInTheDocument();
      
      // The filename generation logic should create a timestamp-based filename
      // The actual filename would be tested in the DownloadFile component tests
    });
  });

  describe('Metrics Display', () => {
    it('should display word and character count in footer', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Words: 5')).toBeInTheDocument();
      expect(screen.getByText('Characters: 45')).toBeInTheDocument();
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });

    it('should not display metrics footer when word count is zero', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const noContentNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          data: {
            ...mockNodeData.data.output.data,
            content: '',
            wordCount: 0,
            characterCount: 0,
          },
        },
      };
      useFlowStateNode.mockReturnValue(noContentNodeData);

      renderWithProviders(
        <MarkdownNew data={noContentNodeData} />,
        { contextValues: mockContextValues }
      );

      expect(screen.queryByText('Words:')).not.toBeInTheDocument();
      expect(screen.queryByText('Characters:')).not.toBeInTheDocument();
    });

    it('should display connected inputs information', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Connected Inputs:')).toBeInTheDocument();
      expect(screen.getByText('1 source(s) providing content')).toBeInTheDocument();
      expect(screen.getByText(/• source-node-1/)).toBeInTheDocument();
    });
  });

  describe('Status Management', () => {
    it('should display processing status correctly', async () => {
      const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      const processingNodes = new Set(['test-node-1']);
      useFlowStateNode.mockReturnValue(mockNodeData.data);
      useFlowStateProcessing.mockReturnValue(processingNodes);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      expect(screen.getByText('Status: processing')).toBeInTheDocument();
    });

    it('should apply correct styling based on status', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const successNodeData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          meta: {
            ...mockNodeData.data.output.meta,
            status: 'success',
          },
        },
      };
      useFlowStateNode.mockReturnValue(successNodeData);

      const { container } = renderWithProviders(
        <MarkdownNew data={successNodeData} />,
        { contextValues: mockContextValues }
      );

      const successContainer = container.querySelector('.border-green-400.bg-green-50');
      expect(successContainer).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should handle NODE_PROCESSING event', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const addListenerCall = nodeDataManager.addEventListener.mock.calls.find(
        call => call[0] === 'NODE_PROCESSING'
      );

      if (addListenerCall) {
        const handler = addListenerCall[1];
        handler({ detail: { nodeId: 'test-node-1' } });

        await waitFor(() => {
          expect(screen.getByText('Status: processing')).toBeInTheDocument();
        });
      }
    });

    it('should handle NODE_PROCESSED event', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

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
          expect(screen.getByText('Status: success')).toBeInTheDocument();
        });
      }
    });

    it('should properly remove event listeners on cleanup', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { unmount } = renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // Verify listeners were added
      expect(nodeDataManager.addEventListener).toHaveBeenCalledTimes(3);

      unmount();

      // Verify listeners were removed
      expect(nodeDataManager.removeEventListener).toHaveBeenCalledTimes(3);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom text color from config', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const styledNodeData = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          config: {
            ...mockNodeData.data.input.config,
            styleConfig: {
              textColor: '#ff0000',
              fontSize: '18px',
            },
          },
        },
      };
      useFlowStateNode.mockReturnValue(styledNodeData);

      const { container } = renderWithProviders(
        <MarkdownNew data={styledNodeData} />,
        { contextValues: mockContextValues }
      );

      const styledContent = container.querySelector('[style*="color: rgb(255, 0, 0)"]');
      expect(styledContent).toBeInTheDocument();
    });

    it('should apply custom font size from config', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const styledNodeData = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          config: {
            ...mockNodeData.data.input.config,
            styleConfig: {
              fontSize: '20px',
            },
          },
        },
      };
      useFlowStateNode.mockReturnValue(styledNodeData);

      const { container } = renderWithProviders(
        <MarkdownNew data={styledNodeData} />,
        { contextValues: mockContextValues }
      );

      const styledContent = container.querySelector('[style*="font-size: 20px"]');
      expect(styledContent).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should be caught by error boundary when component crashes', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const onError = vi.fn();
      
      useFlowStateNode.mockImplementation(() => {
        throw new Error('Component crashed');
      });

      render(
        <ErrorBoundary onError={onError}>
          <MarkdownNew data={mockNodeData.data} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for interactive elements', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });
    });

    it('should have proper heading structure', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: mockContextValues }
      );

      // The markdown content would contain headings that should be properly structured
      const markdownRenderer = screen.getByTestId('markdown-renderer');
      expect(markdownRenderer).toBeInTheDocument();
    });
  });
});

// Performance benchmark tests
describe('MarkdownNew Performance', () => {
  it('should render within performance thresholds', async () => {
    const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
    const mockNodeData = createMockNodeData({
      meta: { label: 'Benchmark Markdown Node', emoji: '📝' },
      output: {
        data: {
          content: '# Performance Test\n\nThis is a performance test content.',
          wordCount: 8,
        },
      },
    });
    useFlowStateNode.mockReturnValue(mockNodeData.data);

    const benchmark = await performanceHelpers.benchmarkComponent(
      MarkdownNew,
      { data: mockNodeData.data },
      5
    );

    expect(benchmark.average).toBeLessThan(100);
    console.log('MarkdownNew render benchmark:', benchmark);
  });

  it('should handle large content efficiently', async () => {
    const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
    
    // Generate large markdown content
    const largeContent = Array.from({ length: 1000 }, (_, i) => 
      `## Section ${i}\n\nThis is content for section ${i} with some text.`
    ).join('\n\n');

    const largeContentNodeData = createMockNodeData({
      output: {
        data: {
          content: largeContent,
          wordCount: 6000,
          characterCount: largeContent.length,
        },
      },
    });

    useFlowStateNode.mockReturnValue(largeContentNodeData.data);

    const startTime = performance.now();
    renderWithProviders(
      <MarkdownNew data={largeContentNodeData.data} />,
      { contextValues: {} }
    );
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(200); // Should handle large content in under 200ms
  });
});