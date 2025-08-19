/**
 * Tests for FlowStateContext
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { FlowStateProvider, useFlowState, useFlowActions, useFlowSubscription } from '../../contexts/FlowStateContext.jsx';

// Mock React Flow
vi.mock('reactflow', () => ({
  useReactFlow: () => ({
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
  }),
}));

describe('FlowStateContext', () => {
  const initialNodes = [
    { id: '1', type: 'fetchNode', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
    { id: '2', type: 'processNode', position: { x: 100, y: 0 }, data: { label: 'Node 2' } },
  ];

  const initialEdges = [
    { id: 'e1', source: '1', target: '2' },
  ];

  const TestWrapper = ({ children, initialState = {} }) => (
    <FlowStateProvider 
      initialNodes={initialState.nodes || initialNodes}
      initialEdges={initialState.edges || initialEdges}
    >
      {children}
    </FlowStateProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FlowStateProvider', () => {
    test('should provide initial state', () => {
      const { result } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });

      expect(result.current.nodes).toEqual(initialNodes);
      expect(result.current.edges).toEqual(initialEdges);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.validationResult).toBeNull();
    });

    test('should provide actions', () => {
      const { result } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      expect(result.current.updateNode).toBeInstanceOf(Function);
      expect(result.current.updateNodes).toBeInstanceOf(Function);
      expect(result.current.updateEdges).toBeInstanceOf(Function);
      expect(result.current.addNode).toBeInstanceOf(Function);
      expect(result.current.removeNode).toBeInstanceOf(Function);
      expect(result.current.addEdge).toBeInstanceOf(Function);
      expect(result.current.removeEdge).toBeInstanceOf(Function);
      expect(result.current.setValidationState).toBeInstanceOf(Function);
    });
  });

  describe('useFlowState', () => {
    test('should return current state', () => {
      const { result } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveProperty('nodes');
      expect(result.current).toHaveProperty('edges');
      expect(result.current).toHaveProperty('isValidating');
      expect(result.current).toHaveProperty('validationResult');
      expect(result.current).toHaveProperty('lastModified');
      expect(result.current).toHaveProperty('version');
    });

    test('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useFlowState());
      }).toThrow('useFlowState must be used within a FlowStateProvider');
    });
  });

  describe('useFlowActions', () => {
    test('should update single node', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated Node 1' } });
      });

      const updatedNode = stateResult.current.nodes.find(n => n.id === '1');
      expect(updatedNode.data.label).toBe('Updated Node 1');
    });

    test('should update multiple nodes', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const updatedNodes = [
        { id: '1', type: 'fetchNode', position: { x: 0, y: 0 }, data: { label: 'New Node 1' } },
        { id: '2', type: 'processNode', position: { x: 100, y: 0 }, data: { label: 'New Node 2' } },
      ];

      act(() => {
        actionsResult.current.updateNodes(updatedNodes);
      });

      expect(stateResult.current.nodes).toEqual(updatedNodes);
    });

    test('should add new node', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const newNode = { id: '3', type: 'newNode', position: { x: 200, y: 0 }, data: { label: 'Node 3' } };

      act(() => {
        actionsResult.current.addNode(newNode);
      });

      expect(stateResult.current.nodes).toHaveLength(3);
      expect(stateResult.current.nodes.find(n => n.id === '3')).toEqual(newNode);
    });

    test('should remove node', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.removeNode('1');
      });

      expect(stateResult.current.nodes).toHaveLength(1);
      expect(stateResult.current.nodes.find(n => n.id === '1')).toBeUndefined();
    });

    test('should add new edge', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const newEdge = { id: 'e2', source: '2', target: '1' };

      act(() => {
        actionsResult.current.addEdge(newEdge);
      });

      expect(stateResult.current.edges).toHaveLength(2);
      expect(stateResult.current.edges.find(e => e.id === 'e2')).toEqual(newEdge);
    });

    test('should remove edge', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.removeEdge('e1');
      });

      expect(stateResult.current.edges).toHaveLength(0);
    });

    test('should update validation state', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.setValidationState(true, { valid: false, errors: ['Test error'] });
      });

      expect(stateResult.current.isValidating).toBe(true);
      expect(stateResult.current.validationResult).toEqual({ valid: false, errors: ['Test error'] });
    });

    test('should increment version on updates', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const initialVersion = stateResult.current.version;

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      expect(stateResult.current.version).toBe(initialVersion + 1);
    });

    test('should update lastModified timestamp', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const initialTimestamp = stateResult.current.lastModified;

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      expect(stateResult.current.lastModified).toBeGreaterThan(initialTimestamp);
    });
  });

  describe('useFlowSubscription', () => {
    test('should call callback on state changes', () => {
      const callback = vi.fn();
      const selector = (state) => state.nodes;

      renderHook(() => useFlowSubscription(selector, callback), {
        wrapper: TestWrapper,
      });

      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      expect(callback).toHaveBeenCalled();
    });

    test('should not call callback when selected state unchanged', () => {
      const callback = vi.fn();
      const selector = (state) => state.edges; // Selecting edges, but updating nodes

      renderHook(() => useFlowSubscription(selector, callback), {
        wrapper: TestWrapper,
      });

      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      // Should not be called since edges didn't change
      expect(callback).not.toHaveBeenCalled();
    });

    test('should cleanup subscription on unmount', () => {
      const callback = vi.fn();
      const selector = (state) => state.nodes;

      const { unmount } = renderHook(() => useFlowSubscription(selector, callback), {
        wrapper: TestWrapper,
      });

      unmount();

      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      // Should not be called after unmount
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('State immutability', () => {
    test('should not mutate original state when updating nodes', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const originalNodes = stateResult.current.nodes;

      act(() => {
        actionsResult.current.updateNode('1', { data: { label: 'Updated' } });
      });

      // Original nodes array should not be mutated
      expect(originalNodes).not.toBe(stateResult.current.nodes);
      expect(originalNodes[0].data.label).toBe('Node 1'); // Original unchanged
    });

    test('should not mutate original state when updating edges', () => {
      const { result: stateResult } = renderHook(() => useFlowState(), {
        wrapper: TestWrapper,
      });
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      const originalEdges = stateResult.current.edges;

      act(() => {
        actionsResult.current.addEdge({ id: 'e2', source: '2', target: '1' });
      });

      // Original edges array should not be mutated
      expect(originalEdges).not.toBe(stateResult.current.edges);
      expect(originalEdges).toHaveLength(1); // Original unchanged
    });
  });

  describe('Error handling', () => {
    test('should handle invalid node updates gracefully', () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      // Should not throw when updating non-existent node
      expect(() => {
        act(() => {
          actionsResult.current.updateNode('non-existent', { data: { label: 'Updated' } });
        });
      }).not.toThrow();
    });

    test('should handle invalid edge removal gracefully', () => {
      const { result: actionsResult } = renderHook(() => useFlowActions(), {
        wrapper: TestWrapper,
      });

      // Should not throw when removing non-existent edge
      expect(() => {
        act(() => {
          actionsResult.current.removeEdge('non-existent');
        });
      }).not.toThrow();
    });
  });
});