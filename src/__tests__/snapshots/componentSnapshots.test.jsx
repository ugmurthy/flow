/**
 * Comprehensive snapshot testing for UI components
 * Ensures visual consistency and catches unintended UI changes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

import TemplateFormNode from '../../components/templateFormNode.jsx';
import ProcessNew from '../../components/ProcessNew.jsx';
import MarkdownNew from '../../components/MarkdownNew.jsx';
import ButtonPanel from '../../components/ButtonPanel.jsx';
import ConnectionBadge from '../../components/ConnectionBadge.jsx';
import ViewButton from '../../components/ViewButton.jsx';
import DeleteButton from '../../components/DeleteButton.jsx';
import ResetButton from '../../components/ResetButton.jsx';
import EditButton from '../../components/EditButton.jsx';

import {
  renderWithProviders,
  createMockNodeData,
  createMockReactFlow,
  createMockReactHookForm,
  createMockModal,
  snapshotHelpers,
  cleanupHelpers,
} from '../utils/reactTestHelpers.js';

// Mock external dependencies
vi.mock('@xyflow/react', () => createMockReactFlow());
vi.mock('react-hook-form', () => createMockReactHookForm());
vi.mock('react-modal', () => createMockModal());

// Mock all the services and contexts
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
    NODE_PROCESSING: 'NODE_PROCESSING',
    NODE_PROCESSED: 'NODE_PROCESSED',
    NODE_ERROR: 'NODE_ERROR',
  },
}));

vi.mock('../../services/pluginRegistry.js', () => ({
  default: {
    validatePluginConfig: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
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
        label: 'Test Node',
        function: 'Test Function',
        emoji: '🧪',
        category: 'input',
        version: '1.0.0',
        ...data.meta,
      },
      input: { connections: {}, processed: null, config: {}, ...data.input },
      output: { data: {}, meta: { timestamp: '2024-01-01T00:00:00Z', status: 'idle' }, ...data.output },
      error: { hasError: false, errors: [], ...data.error },
      plugin: null,
    })),
  },
  ProcessNodeData: {
    create: vi.fn((data) => ({
      meta: {
        label: 'Process Node',
        function: 'Data Processing',
        emoji: '⚙️',
        category: 'process',
        version: '1.0.0',
        ...data.meta,
      },
      input: { connections: {}, processed: null, config: {}, ...data.input },
      output: { data: {}, meta: { timestamp: '2024-01-01T00:00:00Z', status: 'idle' }, ...data.output },
      error: { hasError: false, errors: [], ...data.error },
      plugin: { name: 'test-plugin', config: {}, ...data.plugin },
    })),
  },
  OutputNodeData: {
    create: vi.fn((data) => ({
      meta: {
        label: 'Output Node',
        function: 'Markdown Renderer',
        emoji: '📝',
        category: 'output',
        version: '1.0.0',
        ...data.meta,
      },
      input: { connections: {}, processed: null, config: {}, ...data.input },
      output: { data: {}, meta: { timestamp: '2024-01-01T00:00:00Z', status: 'idle' }, ...data.output },
      error: { hasError: false, errors: [], ...data.error },
      plugin: null,
    })),
  },
}));

vi.mock('../../components/MarkdownRenderer.jsx', () => ({
  default: vi.fn(({ content }) => (
    <div data-testid="markdown-renderer" className="markdown-content">
      {content}
    </div>
  )),
}));

describe('Component Snapshots', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
    cleanupHelpers.cleanupDOM();
  });

  describe('TemplateFormNode Snapshots', () => {
    const setupFormNodeMocks = (nodeData) => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(nodeData);
    };

    it('should match snapshot for default state', () => {
      const nodeData = createMockNodeData({
        meta: {
          label: 'Form Input Node',
          function: 'Collect User Data',
          emoji: '📝',
          category: 'input',
        },
      });
      
      setupFormNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        TemplateFormNode,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('templateFormNode-default');
    });

    it('should match snapshot for processing state', () => {
      const { useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateProcessing.mockReturnValue(new Set(['test-node-1']));

      const nodeData = createMockNodeData({
        meta: { label: 'Processing Form', emoji: '⏳' },
        output: {
          meta: { timestamp: '2024-01-01T00:00:00Z', status: 'processing' },
        },
      });
      
      setupFormNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        TemplateFormNode,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('templateFormNode-processing');
    });

    it('should match snapshot for success state with data', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Completed Form', emoji: '✅' },
        output: {
          data: { name: 'John Doe', email: 'john@example.com' },
          meta: { timestamp: '2024-01-01T00:00:00Z', status: 'success' },
        },
      });
      
      setupFormNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        TemplateFormNode,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('templateFormNode-success');
    });

    it('should match snapshot for error state', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Failed Form', emoji: '❌' },
        output: {
          meta: { timestamp: '2024-01-01T00:00:00Z', status: 'error' },
        },
        error: {
          hasError: true,
          errors: [
            {
              code: 'VALIDATION_ERROR',
              message: 'Required field missing',
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
        },
      });
      
      setupFormNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        TemplateFormNode,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('templateFormNode-error');
    });

    it('should match snapshot with connections', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Connected Form', emoji: '🔗' },
        input: {
          connections: {
            'conn-1': {
              sourceNodeId: 'source-1',
              processed: { prefix: 'Hello' },
              meta: { lastProcessed: '2024-01-01T00:00:00Z' },
            },
          },
        },
      });
      
      setupFormNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        TemplateFormNode,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('templateFormNode-connected');
    });
  });

  describe('ProcessNew Snapshots', () => {
    const setupProcessNodeMocks = (nodeData) => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(nodeData);
    };

    it('should match snapshot for default process node', () => {
      const nodeData = createMockNodeData({
        meta: {
          label: 'Data Processor',
          function: 'Transform Data',
          emoji: '⚙️',
          category: 'process',
        },
        plugin: {
          name: 'data-transformer',
          config: { strategy: 'merge' },
          version: '1.0.0',
        },
      });
      
      setupProcessNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        ProcessNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('processNew-default');
    });

    it('should match snapshot for processing state', () => {
      const { useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateProcessing.mockReturnValue(new Set(['test-node-1']));

      const nodeData = createMockNodeData({
        meta: { label: 'Processing...', emoji: '🔄' },
        output: {
          meta: { timestamp: '2024-01-01T00:00:00Z', status: 'processing' },
        },
        plugin: { name: 'active-processor', config: {} },
      });
      
      setupProcessNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        ProcessNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('processNew-processing');
    });

    it('should match snapshot for success state with output', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Completed Process', emoji: '✅' },
        input: {
          connections: {
            'input-1': {
              sourceNodeId: 'source-node',
              processed: { data: 'input data' },
              meta: { lastProcessed: '2024-01-01T00:00:00Z' },
            },
          },
        },
        output: {
          data: { result: 'processed data', count: 42 },
          meta: {
            timestamp: '2024-01-01T00:00:00Z',
            status: 'success',
            processingTime: 150,
            dataSize: 1024,
          },
        },
        plugin: {
          name: 'successful-processor',
          config: { strategy: 'transform' },
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      });
      
      setupProcessNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        ProcessNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('processNew-success');
    });

    it('should match snapshot for error state', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Failed Process', emoji: '❌' },
        output: {
          meta: { timestamp: '2024-01-01T00:00:00Z', status: 'error' },
        },
        error: {
          hasError: true,
          errors: [
            {
              code: 'PLUGIN_ERROR',
              message: 'Plugin processing failed',
              timestamp: '2024-01-01T00:00:00Z',
              context: { plugin: 'faulty-processor' },
            },
          ],
        },
        plugin: { name: 'faulty-processor', config: {} },
      });
      
      setupProcessNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        ProcessNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('processNew-error');
    });
  });

  describe('MarkdownNew Snapshots', () => {
    const setupMarkdownNodeMocks = (nodeData) => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      useFlowStateNode.mockReturnValue(nodeData);
    };

    it('should match snapshot for default markdown node', () => {
      const nodeData = createMockNodeData({
        meta: {
          label: 'Markdown Display',
          function: 'Render Content',
          emoji: '📝',
          category: 'output',
        },
        input: {
          config: {
            displayFormat: 'markdown',
            styleConfig: {
              width: '400px',
              textColor: '#374151',
              fontSize: '14px',
            },
          },
        },
        output: {
          data: {
            content: '# Hello World\n\nThis is markdown content.',
            wordCount: 5,
            characterCount: 45,
            lastUpdated: '2024-01-01T00:00:00Z',
          },
        },
      });
      
      setupMarkdownNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        MarkdownNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('markdownNew-default');
    });

    it('should match snapshot with no content', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Empty Markdown', emoji: '📄' },
        output: {
          data: {
            content: '',
            wordCount: 0,
            characterCount: 0,
            lastUpdated: '2024-01-01T00:00:00Z',
          },
        },
      });
      
      setupMarkdownNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        MarkdownNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('markdownNew-empty');
    });

    it('should match snapshot with connected inputs', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Connected Markdown', emoji: '🔗' },
        input: {
          connections: {
            'input-1': {
              sourceNodeId: 'form-node',
              processed: '## From Form\n\nUser submitted data',
              meta: { lastProcessed: '2024-01-01T00:00:00Z' },
            },
            'input-2': {
              sourceNodeId: 'process-node',
              processed: '## From Processor\n\nProcessed results',
              meta: { lastProcessed: '2024-01-01T00:00:00Z' },
            },
          },
        },
        output: {
          data: {
            content: '## From Form\n\nUser submitted data\n\n---\n\n## From Processor\n\nProcessed results',
            wordCount: 12,
            characterCount: 89,
            lastUpdated: '2024-01-01T00:00:00Z',
          },
        },
      });
      
      setupMarkdownNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        MarkdownNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('markdownNew-connected');
    });

    it('should match snapshot with custom styling', () => {
      const nodeData = createMockNodeData({
        meta: { label: 'Styled Markdown', emoji: '🎨' },
        input: {
          config: {
            styleConfig: {
              width: '600px',
              textColor: '#1f2937',
              fontSize: '16px',
            },
          },
        },
        output: {
          data: {
            content: '# Styled Content\n\nThis has custom styling.',
            wordCount: 6,
            characterCount: 52,
            lastUpdated: '2024-01-01T00:00:00Z',
          },
        },
      });
      
      setupMarkdownNodeMocks(nodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        MarkdownNew,
        { data: nodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('markdownNew-styled');
    });
  });

  describe('Button Components Snapshots', () => {
    it('should match snapshot for ButtonPanel', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        ButtonPanel,
        {
          children: (
            <>
              <button>Action 1</button>
              <button>Action 2</button>
              <button>Action 3</button>
            </>
          ),
        },
        {}
      );

      expect(snapshot).toMatchSnapshot('buttonPanel-default');
    });

    it('should match snapshot for ConnectionBadge', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        ConnectionBadge,
        { connectionCount: 3 },
        {}
      );

      expect(snapshot).toMatchSnapshot('connectionBadge-with-count');
    });

    it('should match snapshot for ConnectionBadge with zero count', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        ConnectionBadge,
        { connectionCount: 0 },
        {}
      );

      expect(snapshot).toMatchSnapshot('connectionBadge-zero-count');
    });

    it('should match snapshot for ViewButton', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        ViewButton,
        {
          data: '{"test": "data"}',
          title: 'View Test Data',
          className: 'test-class',
        },
        {}
      );

      expect(snapshot).toMatchSnapshot('viewButton-default');
    });

    it('should match snapshot for DeleteButton', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        DeleteButton,
        {
          className: 'delete-class',
          title: 'Delete Item',
        },
        {}
      );

      expect(snapshot).toMatchSnapshot('deleteButton-default');
    });

    it('should match snapshot for ResetButton', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        ResetButton,
        {
          onReset: vi.fn(),
          className: 'reset-class',
        },
        {}
      );

      expect(snapshot).toMatchSnapshot('resetButton-default');
    });

    it('should match snapshot for EditButton', () => {
      const snapshot = snapshotHelpers.createComponentSnapshot(
        EditButton,
        {
          onEdit: vi.fn(),
          className: 'edit-class',
        },
        {}
      );

      expect(snapshot).toMatchSnapshot('editButton-default');
    });
  });

  describe('State-based Component Variations', () => {
    it('should match snapshots for different visual states', () => {
      const states = [
        { status: 'idle', label: 'Idle Node', className: 'border-gray-400' },
        { status: 'processing', label: 'Processing Node', className: 'border-yellow-400' },
        { status: 'success', label: 'Success Node', className: 'border-green-400' },
        { status: 'error', label: 'Error Node', className: 'border-red-400' },
      ];

      states.forEach(({ status, label, className }) => {
        const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
        
        if (status === 'processing') {
          useFlowStateProcessing.mockReturnValue(new Set(['test-node-1']));
        } else {
          useFlowStateProcessing.mockReturnValue(new Set());
        }

        const nodeData = createMockNodeData({
          meta: { label, emoji: '🔄' },
          output: {
            meta: { timestamp: '2024-01-01T00:00:00Z', status },
          },
        });
        
        useFlowStateNode.mockReturnValue(nodeData.data);

        const snapshot = snapshotHelpers.createComponentSnapshot(
          TemplateFormNode,
          { data: nodeData.data },
          {}
        );

        expect(snapshot).toMatchSnapshot(`templateFormNode-state-${status}`);
      });
    });
  });

  describe('Responsive Layout Snapshots', () => {
    it('should match snapshots for different container widths', () => {
      const widths = ['300px', '400px', '500px', '600px'];

      widths.forEach((width) => {
        const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
        const nodeData = createMockNodeData({
          meta: { label: `Node ${width}`, emoji: '📏' },
          input: {
            config: {
              styleConfig: { width },
            },
          },
        });
        
        useFlowStateNode.mockReturnValue(nodeData.data);

        const snapshot = snapshotHelpers.createComponentSnapshot(
          MarkdownNew,
          { data: nodeData.data },
          {}
        );

        expect(snapshot).toMatchSnapshot(`markdownNew-width-${width.replace('px', '')}`);
      });
    });
  });

  describe('Complex Data Scenarios', () => {
    it('should match snapshot for node with complex nested data', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const complexNodeData = createMockNodeData({
        meta: {
          label: 'Complex Data Node',
          function: 'Advanced Processing',
          emoji: '🧬',
          category: 'process',
          capabilities: ['transform', 'validate', 'aggregate'],
          tags: ['advanced', 'data-science'],
          version: '2.1.0',
        },
        input: {
          connections: {
            'primary-input': {
              sourceNodeId: 'data-source-1',
              processed: {
                records: [
                  { id: 1, name: 'John', score: 95 },
                  { id: 2, name: 'Jane', score: 87 },
                ],
                metadata: { total: 2, avgScore: 91 },
              },
              meta: {
                lastProcessed: '2024-01-01T12:00:00Z',
                dataType: 'object',
                bandwidth: 2048,
              },
            },
            'secondary-input': {
              sourceNodeId: 'config-source',
              processed: { threshold: 80, mode: 'strict' },
              meta: {
                lastProcessed: '2024-01-01T12:00:00Z',
                dataType: 'object',
                bandwidth: 512,
              },
            },
          },
          config: {
            aggregationStrategy: 'priority',
            validation: { strict: true, required: ['id', 'name'] },
          },
        },
        output: {
          data: {
            filtered: [{ id: 1, name: 'John', score: 95 }],
            summary: { passed: 1, failed: 1, total: 2 },
          },
          meta: {
            timestamp: '2024-01-01T12:00:30Z',
            status: 'success',
            processingTime: 250,
            dataSize: 4096,
          },
        },
        plugin: {
          name: 'advanced-filter',
          config: { algorithm: 'ml-based', confidence: 0.95 },
          version: '3.2.1',
          lastUpdated: '2024-01-01T12:00:00Z',
        },
      });
      
      useFlowStateNode.mockReturnValue(complexNodeData.data);

      const snapshot = snapshotHelpers.createComponentSnapshot(
        ProcessNew,
        { data: complexNodeData.data },
        {}
      );

      expect(snapshot).toMatchSnapshot('processNew-complex-data');
    });
  });
});

// State serialization snapshots
describe('State Snapshots', () => {
  it('should match snapshot for serialized node state', () => {
    const complexState = {
      nodeData: createMockNodeData({
        meta: { label: 'State Node', version: '1.0.0' },
        input: { connections: { 'conn-1': { sourceNodeId: 'source-1' } } },
        output: { data: { result: 'processed' } },
      }),
      uiState: {
        selected: true,
        processing: false,
        connectionCount: 1,
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    const serializedState = snapshotHelpers.createStateSnapshot(complexState);
    expect(serializedState).toMatchSnapshot('complex-node-state');
  });

  it('should match snapshot for workflow state', () => {
    const workflowState = {
      nodes: [
        { id: 'node-1', type: 'input', position: { x: 0, y: 0 } },
        { id: 'node-2', type: 'process', position: { x: 200, y: 0 } },
        { id: 'node-3', type: 'output', position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
      meta: {
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-01T12:00:00Z',
        version: '1.0.0',
      },
    };

    const serializedWorkflow = snapshotHelpers.createStateSnapshot(workflowState);
    expect(serializedWorkflow).toMatchSnapshot('workflow-state');
  });
});