/**
 * Phase 7 Component Integration Tests
 * 
 * Tests the integration points between enhanced Node components:
 * - templateFormNode.jsx → ProcessNew.jsx → MarkdownNew.jsx
 * - Directive processing flow
 * - Error boundary coordination
 * - Performance metrics integration
 * - Unified styling system coordination
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { FlowState } from '../../context/FlowContext';

// Import enhanced components
import TemplateFormNode from '../../components/templateFormNode';
import ProcessNew from '../../components/ProcessNew';
import MarkdownNew from '../../components/MarkdownNew';

// Import supporting services
import { NodeStyleManager } from '../../styles/nodeStyleManager';
import { DirectiveProcessor } from '../../services/directiveProcessor';
import { NodeData, NodeVisualState } from '../../types/nodeSchema';

// Mock dependencies
jest.mock('../../services/directiveProcessor');
jest.mock('../../styles/nodeStyleManager');

describe('Phase 7 Component Integration Tests', () => {
  let mockFlowState;
  let mockStyleManager;
  let mockDirectiveProcessor;
  let consoleErrorSpy;
  let performanceNowSpy;

  beforeEach(() => {
    // Mock FlowState context
    mockFlowState = {
      nodes: [
        {
          id: 'form-node-1',
          type: 'templateFormNode',
          position: { x: 0, y: 0 },
          data: {
            meta: { label: 'Form Input', emoji: '📝' },
            formFields: [{ name: 'title', type: 'text', value: 'Test Title' }],
            styling: { theme: 'default' }
          }
        },
        {
          id: 'process-node-1', 
          type: 'ProcessNew',
          position: { x: 200, y: 0 },
          data: {
            meta: { label: 'Data Processor', emoji: '⚙️' },
            plugin: { name: 'test-plugin', config: {} },
            styling: { theme: 'default' }
          }
        },
        {
          id: 'markdown-node-1',
          type: 'MarkdownNew', 
          position: { x: 400, y: 0 },
          data: {
            meta: { label: 'Output Display', emoji: '📄' },
            input: { config: {} },
            styling: { theme: 'default' }
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'form-node-1',
          target: 'process-node-1',
          sourceHandle: 'data-out',
          targetHandle: 'data-in'
        },
        {
          id: 'edge-2', 
          source: 'process-node-1',
          target: 'markdown-node-1',
          sourceHandle: 'data-out',
          targetHandle: 'data-in'
        }
      ],
      updateNodeData: jest.fn(),
      addNode: jest.fn(),
      deleteNode: jest.fn()
    };

    // Mock NodeStyleManager
    mockStyleManager = {
      getNodeStyle: jest.fn().mockReturnValue({
        container: { borderColor: '#3b82f6', backgroundColor: '#ffffff' },
        header: { backgroundColor: '#f3f4f6' },
        content: { padding: '12px' }
      }),
      getHandleStyle: jest.fn().mockReturnValue({
        backgroundColor: '#3b82f6',
        borderColor: '#1e40af'
      }),
      setVisualState: jest.fn(),
      getVisualState: jest.fn().mockReturnValue('default'),
      updateTheme: jest.fn()
    };
    NodeStyleManager.mockImplementation(() => mockStyleManager);

    // Mock DirectiveProcessor
    mockDirectiveProcessor = {
      processDirectives: jest.fn().mockResolvedValue({
        totalDirectives: 1,
        successfulDirectives: 1,
        failedDirectives: 0,
        results: [{ success: true, directiveId: 'test-directive-1' }]
      }),
      registerDirectiveHandler: jest.fn(),
      unregisterDirectiveHandler: jest.fn()
    };
    DirectiveProcessor.mockImplementation(() => mockDirectiveProcessor);

    // Mock performance.now for timing tests
    performanceNowSpy = jest.spyOn(performance, 'now')
      .mockReturnValueOnce(100) // Start time
      .mockReturnValueOnce(120); // End time

    // Spy on console.error for error boundary tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    performanceNowSpy.mockRestore();
  });

  describe('Component Chain Integration', () => {
    test('should render complete workflow chain', async () => {
      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <div data-testid="workflow-container">
              <TemplateFormNode
                id="form-node-1"
                data={mockFlowState.nodes[0].data}
                selected={false}
              />
              <ProcessNew
                id="process-node-1" 
                data={mockFlowState.nodes[1].data}
                selected={false}
              />
              <MarkdownNew
                id="markdown-node-1"
                data={mockFlowState.nodes[2].data} 
                selected={false}
              />
            </div>
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Verify all components rendered
      expect(screen.getByTestId('workflow-container')).toBeInTheDocument();
      expect(screen.getByText('Form Input')).toBeInTheDocument();
      expect(screen.getByText('Data Processor')).toBeInTheDocument();
      expect(screen.getByText('Output Display')).toBeInTheDocument();

      // Verify style manager initialization for all components
      expect(NodeStyleManager).toHaveBeenCalledTimes(3);
      expect(mockStyleManager.getNodeStyle).toHaveBeenCalledTimes(3);
    });
  });

  describe('Directive Processing Integration', () => {
    test('should process directives across component chain', async () => {
      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={mockFlowState.nodes[0].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Find and interact with form submission
      const titleInput = screen.getByDisplayValue('Test Title');
      const submitButton = screen.getByText('Submit');

      // Update form data
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      
      // Submit form to trigger directive generation
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Verify directive processor was called
        expect(mockDirectiveProcessor.processDirectives).toHaveBeenCalledWith(
          'form-node-1',
          expect.objectContaining({
            'form-node-1': expect.arrayContaining([
              expect.objectContaining({
                type: 'update-config',
                payload: expect.objectContaining({
                  title: 'Updated Title'
                })
              })
            ])
          })
        );
      });
    });

    test('should handle directive processing errors gracefully', async () => {
      // Mock directive processor to throw error
      mockDirectiveProcessor.processDirectives.mockRejectedValueOnce(
        new Error('Directive processing failed')
      );

      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={mockFlowState.nodes[0].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should not crash the component
        expect(screen.getByText('Form Input')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle component errors with retry mechanisms', async () => {
      // Create a component that throws an error
      const ErrorThrowingComponent = ({ shouldThrow }) => {
        if (shouldThrow) {
          throw new Error('Simulated component error');
        }
        return <div>Component working</div>;
      };

      const TestErrorBoundary = ({ shouldThrow }) => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={{
                ...mockFlowState.nodes[0].data,
                // Inject error-throwing child
                renderError: shouldThrow
              }}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      const { rerender } = render(<TestErrorBoundary shouldThrow={true} />);

      await waitFor(() => {
        // Should show error boundary UI
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry mechanism
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Simulate error resolution
      rerender(<TestErrorBoundary shouldThrow={false} />);

      await waitFor(() => {
        // Should recover and show normal content
        expect(screen.getByText('Form Input')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics Integration', () => {
    test('should collect performance metrics across components', async () => {
      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={mockFlowState.nodes[0].data}
              selected={false}
            />
            <ProcessNew
              id="process-node-1"
              data={mockFlowState.nodes[1].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Verify performance tracking was initialized
      expect(performanceNowSpy).toHaveBeenCalled();

      // Trigger updates to generate metrics
      const titleInput = screen.getByDisplayValue('Test Title');
      fireEvent.change(titleInput, { target: { value: 'Performance Test' } });

      await waitFor(() => {
        // Performance metrics should be tracked
        expect(performanceNowSpy).toHaveBeenCalledTimes(4); // 2 components × 2 calls each
      });
    });
  });

  describe('Unified Styling Integration', () => {
    test('should apply consistent styling across components', async () => {
      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={mockFlowState.nodes[0].data}
              selected={true}
            />
            <ProcessNew
              id="process-node-1"
              data={mockFlowState.nodes[1].data}
              selected={false}
            />
            <MarkdownNew
              id="markdown-node-1"
              data={mockFlowState.nodes[2].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Verify style manager calls for consistent styling
      expect(mockStyleManager.getNodeStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ label: 'Form Input' })
        }),
        expect.any(String), // visual state
        expect.objectContaining({ selected: true })
      );

      expect(mockStyleManager.getHandleStyle).toHaveBeenCalledWith(
        expect.any(Object),
        'output',
        'data-out'
      );
    });

    test('should handle theme changes across components', async () => {
      const updatedFlowState = {
        ...mockFlowState,
        nodes: mockFlowState.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            styling: { theme: 'dark' }
          }
        }))
      };

      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={updatedFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={updatedFlowState.nodes[0].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Verify style manager called with dark theme
      expect(mockStyleManager.getNodeStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          styling: expect.objectContaining({ theme: 'dark' })
        }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('State Management Integration', () => {
    test('should coordinate state updates across components', async () => {
      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={mockFlowState}>
            <TemplateFormNode
              id="form-node-1"
              data={mockFlowState.nodes[0].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Trigger state change
      const titleInput = screen.getByDisplayValue('Test Title');
      fireEvent.change(titleInput, { target: { value: 'State Update Test' } });

      await waitFor(() => {
        // Should update FlowState
        expect(mockFlowState.updateNodeData).toHaveBeenCalledWith(
          'form-node-1',
          expect.objectContaining({
            formFields: expect.arrayContaining([
              expect.objectContaining({
                name: 'title',
                value: 'State Update Test'
              })
            ])
          })
        );
      });
    });
  });

  describe('Connection Flow Validation', () => {
    test('should validate data flow between connected components', async () => {
      // Mock connected components with data flow
      const connectedFlowState = {
        ...mockFlowState,
        getNodeConnections: jest.fn().mockReturnValue([
          {
            source: 'form-node-1',
            target: 'process-node-1',
            data: { title: 'Connection Test' }
          }
        ])
      };

      const TestWorkflow = () => (
        <ReactFlowProvider>
          <FlowState.Provider value={connectedFlowState}>
            <ProcessNew
              id="process-node-1"
              data={mockFlowState.nodes[1].data}
              selected={false}
            />
          </FlowState.Provider>
        </ReactFlowProvider>
      );

      render(<TestWorkflow />);

      // Verify component handles connected data
      expect(screen.getByText('Data Processor')).toBeInTheDocument();
      
      await waitFor(() => {
        // Should process connected data
        expect(connectedFlowState.getNodeConnections).toHaveBeenCalledWith('process-node-1');
      });
    });
  });
});