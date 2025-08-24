/**
 * Enhanced React Testing Utilities for JobRunner Components
 * Provides comprehensive testing helpers for React components, hooks, and contexts
 */

import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock factories for common external dependencies
export const createMockReactFlow = () => ({
  ReactFlow: vi.fn(({ children, ...props }) => (
    <div data-testid="react-flow" {...props}>
      {children}
    </div>
  )),
  Handle: vi.fn(({ type, position, id, ...props }) => (
    <div 
      data-testid={`handle-${type}-${position}`}
      data-handle-id={id}
      {...props}
    />
  )),
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left'
  },
  useReactFlow: vi.fn(() => ({
    getNode: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    addNodes: vi.fn(),
    deleteElements: vi.fn(),
    fitView: vi.fn(),
    project: vi.fn(),
    screenToFlowPosition: vi.fn(),
    flowToScreenPosition: vi.fn(),
  })),
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
});

// Mock factory for React Hook Form
export const createMockReactHookForm = () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(() => ({
      name: 'test-field',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => vi.fn((e) => {
      e?.preventDefault?.();
      return fn({});
    })),
    watch: vi.fn(() => ({})),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
      isDirty: false,
      isValid: true,
    },
  })),
  Controller: vi.fn(({ render }) => render({
    field: { value: '', onChange: vi.fn(), onBlur: vi.fn() },
    fieldState: { error: null },
  })),
});

// Mock factory for Modal components
export const createMockModal = () => ({
  Modal: vi.fn(({ isOpen, children, ...props }) => (
    isOpen ? (
      <div data-testid="modal" {...props}>
        <div data-testid="modal-content">
          {children}
        </div>
      </div>
    ) : null
  )),
  ConfirmationDialog: vi.fn(({ isOpen, onConfirm, onCancel, title, message }) => (
    isOpen ? (
      <div data-testid="confirmation-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
        <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
      </div>
    ) : null
  )),
});

// Context providers factory
export const createTestContextProviders = (contextValues = {}) => {
  const {
    globalContext = {},
    flowStateContext = {},
    modalContext = {},
    workflowContext = {},
  } = contextValues;

  return ({ children }) => {
    // Mock context providers with default values
    const GlobalContextProvider = ({ children }) => (
      <div data-testid="global-context-provider">
        {children}
      </div>
    );

    const FlowStateContextProvider = ({ children }) => (
      <div data-testid="flow-state-context-provider">
        {children}
      </div>
    );

    const ModalContextProvider = ({ children }) => (
      <div data-testid="modal-context-provider">
        {children}
      </div>
    );

    const WorkflowContextProvider = ({ children }) => (
      <div data-testid="workflow-context-provider">
        {children}
      </div>
    );

    return (
      <GlobalContextProvider>
        <FlowStateContextProvider>
          <ModalContextProvider>
            <WorkflowContextProvider>
              {children}
            </WorkflowContextProvider>
          </ModalContextProvider>
        </FlowStateContextProvider>
      </GlobalContextProvider>
    );
  };
};

// Component rendering helpers
export const renderWithProviders = (
  ui,
  {
    contextValues = {},
    renderOptions = {},
  } = {}
) => {
  const TestProviders = createTestContextProviders(contextValues);
  
  return render(ui, {
    wrapper: TestProviders,
    ...renderOptions,
  });
};

// User interaction helpers
export const createUserInteraction = () => userEvent.setup();

export const interactionHelpers = {
  // Form interactions
  fillForm: async (user, formData) => {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
      if (field.type === 'checkbox') {
        if (value) await user.click(field);
      } else if (field.tagName === 'SELECT') {
        await user.selectOptions(field, value);
      } else {
        await user.clear(field);
        await user.type(field, String(value));
      }
    }
  },

  // Modal interactions
  openModal: async (user, triggerSelector) => {
    const trigger = screen.getByRole('button', { name: triggerSelector });
    await user.click(trigger);
    await waitFor(() => screen.getByTestId('modal'));
  },

  closeModal: async (user) => {
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
  },

  // Node interactions
  selectNode: async (user, nodeId) => {
    const node = screen.getByTestId(`node-${nodeId}`);
    await user.click(node);
  },

  dragNode: async (user, nodeId, deltaX, deltaY) => {
    const node = screen.getByTestId(`node-${nodeId}`);
    await user.pointer([
      { target: node },
      { keys: '[MouseLeft>]' },
      { coords: { x: deltaX, y: deltaY } },
      { keys: '[/MouseLeft]' }
    ]);
  },
};

// Assertion helpers for React components
export const assertionHelpers = {
  // Node assertions
  assertNodeExists: (nodeId, shouldExist = true) => {
    const node = screen.queryByTestId(`node-${nodeId}`);
    if (shouldExist) {
      expect(node).toBeInTheDocument();
    } else {
      expect(node).not.toBeInTheDocument();
    }
  },

  assertNodeHasClass: (nodeId, className) => {
    const node = screen.getByTestId(`node-${nodeId}`);
    expect(node).toHaveClass(className);
  },

  assertNodeContent: (nodeId, expectedContent) => {
    const node = screen.getByTestId(`node-${nodeId}`);
    expect(node).toHaveTextContent(expectedContent);
  },

  // Form assertions
  assertFormField: (fieldName, expectedValue) => {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
    expect(field).toHaveValue(expectedValue);
  },

  assertFormError: (fieldName, errorMessage) => {
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  },

  // Modal assertions
  assertModalOpen: () => {
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  },

  assertModalClosed: () => {
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  },

  // Handle assertions
  assertHandleExists: (nodeId, handleType, position) => {
    const handle = screen.getByTestId(`handle-${handleType}-${position}`);
    expect(handle).toBeInTheDocument();
  },
};

// Mock data factories
export const createMockNodeData = (overrides = {}) => ({
  id: 'test-node-1',
  type: 'templateFormNode',
  position: { x: 100, y: 100 },
  data: {
    meta: {
      label: 'Test Node',
      function: 'Test Function',
      emoji: '🧪',
      category: 'input',
      version: '1.0.0',
      description: 'Test node for testing',
      capabilities: ['test'],
      tags: ['test'],
    },
    input: {
      connections: {},
      processed: null,
      config: {},
    },
    output: {
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        status: 'idle',
      },
    },
    error: {
      hasError: false,
      message: '',
      details: {},
    },
    plugin: null,
    ...overrides,
  },
});

export const createMockFormFields = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `field-${i}`,
    label: `Field ${i + 1}`,
    type: 'text',
    required: i === 0,
    placeholder: `Enter field ${i + 1}`,
    value: '',
  }));
};

export const createMockWorkflowData = () => ({
  nodes: [
    createMockNodeData({ id: 'node-1' }),
    createMockNodeData({ id: 'node-2', type: 'ProcessNew' }),
    createMockNodeData({ id: 'node-3', type: 'MarkdownNew' }),
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'output',
      targetHandle: 'input',
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3',
      sourceHandle: 'output',
      targetHandle: 'input',
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
});

// Performance testing helpers
export const performanceHelpers = {
  measureRenderTime: async (renderFn) => {
    const start = performance.now();
    const result = await renderFn();
    const end = performance.now();
    return {
      result,
      renderTime: end - start,
    };
  },

  measureInteractionTime: async (interactionFn) => {
    const start = performance.now();
    await interactionFn();
    const end = performance.now();
    return end - start;
  },

  benchmarkComponent: async (Component, props = {}, iterations = 10) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const { renderTime } = await performanceHelpers.measureRenderTime(
        () => render(<Component {...props} />)
      );
      times.push(renderTime);
    }

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      times,
    };
  },
};

// Snapshot testing helpers
export const snapshotHelpers = {
  createComponentSnapshot: (Component, props = {}, contextValues = {}) => {
    const { container } = renderWithProviders(
      <Component {...props} />,
      { contextValues }
    );
    return container.firstChild;
  },

  createStateSnapshot: (state) => {
    // Remove functions and non-serializable data for clean snapshots
    return JSON.parse(JSON.stringify(state, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return value.toString();
      return value;
    }));
  },
};

// Test cleanup helpers
export const cleanupHelpers = {
  clearAllMocks: () => {
    vi.clearAllMocks();
  },

  resetModuleMocks: () => {
    vi.resetModules();
  },

  restoreAllMocks: () => {
    vi.restoreAllMocks();
  },

  cleanupDOM: () => {
    document.body.innerHTML = '';
  },

  setupTestEnvironment: () => {
    // Setup common test environment
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  },
};

// Error boundary testing helper
export const ErrorBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
};

export const renderWithErrorBoundary = (ui, { onError = vi.fn(), ...options } = {}) => {
  return render(
    <ErrorBoundary onError={onError}>
      {ui}
    </ErrorBoundary>,
    options
  );
};