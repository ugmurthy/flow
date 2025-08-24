/**
 * Comprehensive performance benchmarking tests for critical functionality
 * Tests rendering performance, state updates, large data handling, and memory usage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

import TemplateFormNode from '../../components/templateFormNode.jsx';
import ProcessNew from '../../components/ProcessNew.jsx';
import MarkdownNew from '../../components/MarkdownNew.jsx';
import {
  useModalManagement,
  useWorkflowOperations,
} from '../../hooks/useModalManagement.js';
import {
  renderWithProviders,
  createMockNodeData,
  createMockReactFlow,
  performanceHelpers,
  cleanupHelpers,
} from '../utils/reactTestHelpers.js';

// Mock external dependencies
vi.mock('@xyflow/react', () => createMockReactFlow());

// Mock all services for performance testing
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
  useModal: vi.fn(() => ({ openModal: vi.fn() })),
  MODAL_TYPES: { FORM_EDIT: 'FORM_EDIT' },
}));

vi.mock('../../contexts/GlobalContext.jsx', () => ({
  useGlobal: vi.fn(() => ({ executeWorkflow: true })),
}));

vi.mock('../../utils/performanceMonitor.js', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(() => ({ id: 'test-measurement' })),
    endMeasurement: vi.fn(),
  },
}));

vi.mock('../../types/nodeSchema.js', () => ({
  InputNodeData: { create: vi.fn((data) => ({ ...data, meta: { ...data.meta } })) },
  ProcessNodeData: { create: vi.fn((data) => ({ ...data, meta: { ...data.meta } })) },
  OutputNodeData: { create: vi.fn((data) => ({ ...data, meta: { ...data.meta } })) },
}));

vi.mock('../../components/MarkdownRenderer.jsx', () => ({
  default: vi.fn(({ content }) => <div data-testid="markdown-renderer">{content}</div>),
}));

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  COMPONENT_RENDER: 50,
  COMPONENT_UPDATE: 30,
  STATE_UPDATE: 20,
  LARGE_DATA_PROCESSING: 200,
  HOOK_EXECUTION: 10,
  MEMORY_CLEANUP: 100,
  BATCH_OPERATIONS: 150,
};

describe('Component Rendering Performance', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Single Component Rendering', () => {
    it('should render TemplateFormNode within performance threshold', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData();
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const benchmark = await performanceHelpers.benchmarkComponent(
        TemplateFormNode,
        { data: mockNodeData.data },
        10
      );

      expect(benchmark.average).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      expect(benchmark.max).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER * 2);
      
      console.log(`TemplateFormNode render performance:`, {
        average: `${benchmark.average.toFixed(2)}ms`,
        min: `${benchmark.min.toFixed(2)}ms`,
        max: `${benchmark.max.toFixed(2)}ms`,
        threshold: `${PERFORMANCE_THRESHOLDS.COMPONENT_RENDER}ms`,
      });
    });

    it('should render ProcessNew within performance threshold', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData({
        plugin: { name: 'test-plugin', config: {} },
      });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const benchmark = await performanceHelpers.benchmarkComponent(
        ProcessNew,
        { data: mockNodeData.data },
        10
      );

      expect(benchmark.average).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      
      console.log(`ProcessNew render performance:`, {
        average: `${benchmark.average.toFixed(2)}ms`,
        min: `${benchmark.min.toFixed(2)}ms`,
        max: `${benchmark.max.toFixed(2)}ms`,
      });
    });

    it('should render MarkdownNew within performance threshold', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData({
        output: {
          data: {
            content: '# Test Content\n\nThis is test markdown content.',
            wordCount: 6,
            characterCount: 52,
          },
        },
      });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const benchmark = await performanceHelpers.benchmarkComponent(
        MarkdownNew,
        { data: mockNodeData.data },
        10
      );

      expect(benchmark.average).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      
      console.log(`MarkdownNew render performance:`, {
        average: `${benchmark.average.toFixed(2)}ms`,
        min: `${benchmark.min.toFixed(2)}ms`,
        max: `${benchmark.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Component Update Performance', () => {
    it('should handle rapid state updates efficiently', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData();
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { rerender } = renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: {} }
      );

      const startTime = performance.now();

      // Perform 50 rapid updates
      for (let i = 0; i < 50; i++) {
        const updatedData = {
          ...mockNodeData.data,
          output: {
            ...mockNodeData.data.output,
            data: { iteration: i, timestamp: Date.now() },
          },
        };
        rerender(<TemplateFormNode data={updatedData} />);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATIONS);
      
      console.log(`Rapid updates performance: ${totalTime.toFixed(2)}ms for 50 updates`);
    });

    it('should handle processing state changes efficiently', async () => {
      const { useFlowStateNode, useFlowStateProcessing } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData();
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const processingNodes = new Set();
      useFlowStateProcessing.mockReturnValue(processingNodes);

      const { rerender } = renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: {} }
      );

      const startTime = performance.now();

      // Simulate processing state changes
      for (let i = 0; i < 25; i++) {
        if (i % 2 === 0) {
          processingNodes.add('test-node-1');
        } else {
          processingNodes.delete('test-node-1');
        }
        useFlowStateProcessing.mockReturnValue(new Set(processingNodes));
        rerender(<ProcessNew data={mockNodeData.data} />);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATIONS);
      
      console.log(`Processing state changes: ${totalTime.toFixed(2)}ms for 25 changes`);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large markdown content efficiently', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Generate large markdown content (approximately 100KB)
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `## Section ${i + 1}\n\nThis is section ${i + 1} with some detailed content that includes multiple paragraphs, lists, and code blocks.\n\n\`\`\`javascript\nconst example${i} = {\n  id: ${i},\n  name: "Section ${i + 1}",\n  data: ["item1", "item2", "item3"]\n};\n\`\`\`\n\n- Point 1 for section ${i + 1}\n- Point 2 for section ${i + 1}\n- Point 3 for section ${i + 1}\n`
      ).join('\n\n---\n\n');

      const mockNodeData = createMockNodeData({
        output: {
          data: {
            content: largeContent,
            wordCount: largeContent.split(' ').length,
            characterCount: largeContent.length,
          },
        },
      });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const startTime = performance.now();
      renderWithProviders(
        <MarkdownNew data={mockNodeData.data} />,
        { contextValues: {} }
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATA_PROCESSING);
      
      console.log(`Large markdown render: ${renderTime.toFixed(2)}ms for ${(largeContent.length / 1024).toFixed(1)}KB content`);
    });

    it('should handle many connections efficiently', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Create node with 100 connections
      const manyConnections = {};
      for (let i = 0; i < 100; i++) {
        manyConnections[`connection-${i}`] = {
          sourceNodeId: `source-${i}`,
          processed: { data: `Data from source ${i}`, index: i },
          meta: {
            lastProcessed: new Date().toISOString(),
            dataType: 'object',
            bandwidth: 1024 + i,
          },
        };
      }

      const mockNodeData = createMockNodeData({
        input: { connections: manyConnections },
        plugin: { name: 'multi-input-processor', config: { maxInputs: 100 } },
      });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const startTime = performance.now();
      renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: {} }
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATA_PROCESSING);
      
      console.log(`Many connections render: ${renderTime.toFixed(2)}ms for 100 connections`);
    });
  });
});

describe('Hook Performance', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Modal Management Hook Performance', () => {
    it('should handle rapid modal operations efficiently', () => {
      const { result } = renderHook(() => useModalManagement());

      const startTime = performance.now();

      // Perform many modal operations
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.openModal(`modal-${i}`, { data: `test-${i}` });
          result.current.closeModal(`modal-${i}`);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATIONS);
      
      console.log(`Modal operations: ${totalTime.toFixed(2)}ms for 200 operations`);
    });

    it('should handle simultaneous modals efficiently', () => {
      const { result } = renderHook(() => useModalManagement());

      const startTime = performance.now();

      act(() => {
        // Open 50 modals simultaneously
        for (let i = 0; i < 50; i++) {
          result.current.openModal(`simultaneous-modal-${i}`, { index: i });
        }
      });

      const midTime = performance.now();

      act(() => {
        // Close all modals at once
        result.current.closeAllModals();
      });

      const endTime = performance.now();

      const openTime = midTime - startTime;
      const closeTime = endTime - midTime;

      expect(openTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATIONS);
      expect(closeTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STATE_UPDATE);
      
      console.log(`Simultaneous modals: open=${openTime.toFixed(2)}ms, close=${closeTime.toFixed(2)}ms`);
    });
  });
});

describe('Memory Performance', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not leak memory during component lifecycle', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // Create and destroy many components
      for (let i = 0; i < 100; i++) {
        const mockNodeData = createMockNodeData({
          meta: { label: `Memory Test Node ${i}` },
        });
        useFlowStateNode.mockReturnValue(mockNodeData.data);

        const { unmount } = renderWithProviders(
          <TemplateFormNode data={mockNodeData.data} />,
          { contextValues: {} }
        );
        
        unmount();
      }

      // Allow some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 100 components)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      if (process.memoryUsage) {
        console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase for 100 component cycles`);
      }
    });

    it('should handle large data structures without excessive memory usage', () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // Create node with very large data structure
      const largeDataStructure = {
        records: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Record ${i}`,
          data: Array.from({ length: 100 }, (_, j) => ({ 
            field: j, 
            value: `Value ${i}-${j}` 
          })),
        })),
      };

      const mockNodeData = createMockNodeData({
        output: { data: largeDataStructure },
      });
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { unmount } = renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: {} }
      );

      const duringMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      unmount();
      
      // Allow cleanup
      setTimeout(() => {
        const afterMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
        
        if (process.memoryUsage) {
          const duringIncrease = duringMemory - initialMemory;
          const afterIncrease = afterMemory - initialMemory;
          
          console.log(`Large data memory: during=${(duringIncrease / 1024 / 1024).toFixed(2)}MB, after=${(afterIncrease / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 100);
    });
  });
});

describe('Workflow Processing Performance', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Node Data Processing', () => {
    it('should process node data updates efficiently', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      
      const startTime = performance.now();

      // Simulate processing many node updates
      const updatePromises = [];
      for (let i = 0; i < 100; i++) {
        const nodeId = `node-${i}`;
        const updateData = {
          output: {
            data: { result: `processed-${i}`, timestamp: Date.now() },
            meta: { timestamp: new Date().toISOString(), status: 'success' },
          },
        };
        updatePromises.push(nodeDataManager.updateNodeData(nodeId, updateData));
      }

      await Promise.all(updatePromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATIONS);
      
      console.log(`Node data updates: ${totalTime.toFixed(2)}ms for 100 updates`);
    });

    it('should handle plugin processing efficiently', async () => {
      const nodeDataManager = (await import('../../services/nodeDataManager.js')).default;
      
      const startTime = performance.now();

      // Simulate processing nodes with plugins
      const processPromises = [];
      for (let i = 0; i < 50; i++) {
        processPromises.push(nodeDataManager.processNode(`plugin-node-${i}`));
      }

      await Promise.all(processPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATA_PROCESSING);
      
      console.log(`Plugin processing: ${totalTime.toFixed(2)}ms for 50 nodes`);
    });
  });
});

describe('UI Interaction Performance', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('User Interaction Response Times', () => {
    it('should respond to state changes quickly', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData();
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { rerender } = renderWithProviders(
        <TemplateFormNode data={mockNodeData.data} />,
        { contextValues: {} }
      );

      // Measure time for status change
      const startTime = performance.now();

      const updatedData = {
        ...mockNodeData.data,
        output: {
          ...mockNodeData.data.output,
          meta: { ...mockNodeData.data.output.meta, status: 'success' },
        },
      };

      rerender(<TemplateFormNode data={updatedData} />);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_UPDATE);
      
      console.log(`Status change response: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle connection updates efficiently', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      const mockNodeData = createMockNodeData();
      useFlowStateNode.mockReturnValue(mockNodeData.data);

      const { rerender } = renderWithProviders(
        <ProcessNew data={mockNodeData.data} />,
        { contextValues: {} }
      );

      const startTime = performance.now();

      // Add multiple connections
      const updatedData = {
        ...mockNodeData.data,
        input: {
          ...mockNodeData.data.input,
          connections: {
            'conn-1': { sourceNodeId: 'source-1', processed: { data: 'test1' } },
            'conn-2': { sourceNodeId: 'source-2', processed: { data: 'test2' } },
            'conn-3': { sourceNodeId: 'source-3', processed: { data: 'test3' } },
          },
        },
      };

      rerender(<ProcessNew data={updatedData} />);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_UPDATE);
      
      console.log(`Connection update response: ${responseTime.toFixed(2)}ms`);
    });
  });
});

describe('Performance Regression Tests', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Baseline Performance Metrics', () => {
    it('should maintain baseline rendering performance', async () => {
      const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
      
      // Test with standard node configuration
      const standardNodeData = createMockNodeData({
        meta: { label: 'Standard Node', emoji: '📊' },
        input: {
          connections: {
            'standard-input': {
              sourceNodeId: 'standard-source',
              processed: { data: 'standard data' },
            },
          },
        },
        output: {
          data: { result: 'standard result' },
        },
      });
      useFlowStateNode.mockReturnValue(standardNodeData.data);

      // Measure multiple component types
      const components = [
        { name: 'TemplateFormNode', component: TemplateFormNode },
        { name: 'ProcessNew', component: ProcessNew },
        { name: 'MarkdownNew', component: MarkdownNew },
      ];

      const results = {};
      
      for (const { name, component } of components) {
        const benchmark = await performanceHelpers.benchmarkComponent(
          component,
          { data: standardNodeData.data },
          5
        );
        
        results[name] = benchmark;
        
        // Each component should render within the threshold
        expect(benchmark.average).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      }

      console.log('Baseline performance results:', {
        TemplateFormNode: `${results.TemplateFormNode.average.toFixed(2)}ms`,
        ProcessNew: `${results.ProcessNew.average.toFixed(2)}ms`,
        MarkdownNew: `${results.MarkdownNew.average.toFixed(2)}ms`,
      });
    });

    it('should maintain performance under concurrent operations', async () => {
      const { result } = renderHook(() => useModalManagement());

      const startTime = performance.now();

      // Simulate concurrent operations
      await Promise.all([
        // Modal operations
        Promise.resolve(act(() => {
          for (let i = 0; i < 20; i++) {
            result.current.openModal(`concurrent-modal-${i}`);
          }
        })),
        
        // Component operations
        Promise.resolve((() => {
          const { useFlowStateNode } = require('../../contexts/FlowStateContext.jsx');
          const mockNodeData = createMockNodeData();
          useFlowStateNode.mockReturnValue(mockNodeData.data);
          
          for (let i = 0; i < 20; i++) {
            renderWithProviders(
              <TemplateFormNode data={mockNodeData.data} />,
              { contextValues: {} }
            );
          }
        })()),
      ]);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_DATA_PROCESSING);
      
      console.log(`Concurrent operations: ${totalTime.toFixed(2)}ms`);
    });
  });
});