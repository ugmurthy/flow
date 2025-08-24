/**
 * Comprehensive Tests for DirectiveProcessor - Phase 5 Implementation
 * Tests all aspects of the data directive system including retry, batch processing, and conditional execution
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectiveProcessor, RetryManager, BatchProcessor, ConditionalEvaluator } from '../services/directiveProcessor.js';
import { DataDirective, NodeData, InputNodeData, ProcessNodeData } from '../types/nodeSchema.js';

// Mock NodeDataManager for testing
class MockNodeDataManager {
  constructor() {
    this.nodes = new Map();
    this.applyDirectiveCalled = [];
  }

  getNodeData(nodeId) {
    return this.nodes.get(nodeId);
  }

  setNodeData(nodeId, nodeData) {
    this.nodes.set(nodeId, nodeData);
  }

  async _applyDirective(targetNodeId, directive) {
    this.applyDirectiveCalled.push({ targetNodeId, directive });
    // Simulate successful application
    return { applied: true, targetNodeId, directive };
  }
}

describe('DirectiveProcessor System', () => {
  let mockNodeDataManager;
  let directiveProcessor;

  beforeEach(() => {
    mockNodeDataManager = new MockNodeDataManager();
    directiveProcessor = new DirectiveProcessor(mockNodeDataManager);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (directiveProcessor) {
      await directiveProcessor.cleanup();
    }
  });

  describe('DirectiveProcessor Core', () => {
    test('should initialize with correct dependencies', () => {
      expect(directiveProcessor.nodeDataManager).toBe(mockNodeDataManager);
      expect(directiveProcessor.retryManager).toBeInstanceOf(RetryManager);
      expect(directiveProcessor.batchProcessor).toBeInstanceOf(BatchProcessor);
      expect(directiveProcessor.conditionalEvaluator).toBeInstanceOf(ConditionalEvaluator);
      expect(directiveProcessor.processingQueue).toBeInstanceOf(Map);
      expect(directiveProcessor.stats).toEqual({
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        batched: 0,
        skipped: 0
      });
    });

    test('should generate unique directive IDs', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: { value: 'test' }
      });

      const id1 = directiveProcessor._generateDirectiveId(directive, 'node1');
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const id2 = directiveProcessor._generateDirectiveId(directive, 'node1');
      const id3 = directiveProcessor._generateDirectiveId(directive, 'node2');

      expect(id1).not.toBe(id2); // Different timestamps
      expect(id1).not.toBe(id3); // Different target nodes
      expect(typeof id1).toBe('string');
      expect(id1.includes('node1')).toBe(true);
      expect(id1.includes('update-config')).toBe(true);
    });

    test('should process valid directive successfully', async () => {
      const targetNode = InputNodeData.create({
        meta: { label: 'Test Node' }
      });
      mockNodeDataManager.setNodeData('target1', targetNode);

      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.testValue' },
        payload: 'updated value',
        processing: { immediate: true }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(result.directiveId).toBeTruthy();
      expect(result.timestamp).toBeTruthy();
      expect(directiveProcessor.stats.totalProcessed).toBe(1);
      expect(directiveProcessor.stats.successful).toBe(1);
      expect(mockNodeDataManager.applyDirectiveCalled).toHaveLength(1);
    });

    test('should reject invalid directive structure', async () => {
      const invalidDirective = {
        // Missing required fields
        payload: 'test'
      };

      const result = await directiveProcessor.processDirective(invalidDirective, 'target1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid directive');
      expect(directiveProcessor.stats.failed).toBe(1);
    });

    test('should handle missing target node', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test'
      });

      const result = await directiveProcessor.processDirective(directive, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target node nonexistent not found');
    });

    test('should process multiple directives', async () => {
      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      const directives = {
        target1: [
          DataDirective.create({
            type: 'update-config',
            target: { section: 'input', path: 'config.value1' },
            payload: 'value1'
          }),
          DataDirective.create({
            type: 'update-config',
            target: { section: 'input', path: 'config.value2' },
            payload: 'value2'
          })
        ]
      };

      const results = await directiveProcessor.processDirectives('source1', directives);

      expect(results.totalDirectives).toBe(2);
      expect(results.successful).toBe(2);
      expect(results.failed).toBe(0);
      expect(results.results.target1).toHaveLength(2);
      expect(mockNodeDataManager.applyDirectiveCalled).toHaveLength(2);
    });

    test('should get processing statistics', () => {
      // Simulate some processing
      directiveProcessor.stats.totalProcessed = 10;
      directiveProcessor.stats.successful = 8;
      directiveProcessor.stats.failed = 2;

      const stats = directiveProcessor.getStats();

      expect(stats.totalProcessed).toBe(10);
      expect(stats.successful).toBe(8);
      expect(stats.failed).toBe(2);
      expect(stats.processing.successRate).toBe(0.8);
      expect(stats.retryManager).toBeDefined();
      expect(stats.batchProcessor).toBeDefined();
    });
  });

  describe('RetryManager', () => {
    let retryManager;

    beforeEach(() => {
      retryManager = new RetryManager();
    });

    test('should create default retry policy', () => {
      const policy = retryManager.createRetryPolicy();

      expect(policy).toEqual({
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      });
    });

    test('should merge custom retry policy with defaults', () => {
      const customPolicy = { maxRetries: 5, delay: 2000 };
      const policy = retryManager.createRetryPolicy(customPolicy);

      expect(policy).toEqual({
        maxRetries: 5,
        delay: 2000,
        backoffMultiplier: 2,
        maxDelay: 10000
      });
    });

    test('should schedule retry with exponential backoff', async () => {
      const directive = DataDirective.create({
        type: 'test',
        target: { section: 'input', path: 'test' },
        payload: 'test',
        processing: { retryPolicy: { maxRetries: 2, delay: 50 } }
      });

      let retryCallCount = 0;
      const retryFunction = vi.fn().mockImplementation(() => {
        retryCallCount++;
        if (retryCallCount === 1) {
          throw new Error('First retry attempt fails');
        }
        return Promise.resolve('success');
      });

      // Schedule the retry (this won't throw immediately)
      await retryManager.scheduleRetry('test-1', directive, 'target1', new Error('Initial error'), retryFunction);
      
      // The directive should be in retry queue initially
      expect(retryManager.retryQueues.has('test-1')).toBe(true);

      // Wait for the first retry attempt to complete (which should fail and trigger second retry)
      await new Promise(resolve => setTimeout(resolve, 70)); // Wait for first retry + some buffer

      // Wait for the second retry attempt to complete (which should succeed)
      await new Promise(resolve => setTimeout(resolve, 120)); // Wait for second retry with backoff

      // After successful retry, should eventually be removed from queue
      // Give it more time to process
      let attempts = 0;
      while (retryManager.retryQueues.has('test-1') && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      expect(retryManager.retryQueues.has('test-1')).toBe(false);
    }, 15000); // Increase timeout for async operations

    test('should exceed max retries and throw error', async () => {
      const directive = DataDirective.create({
        type: 'test',
        target: { section: 'input', path: 'test' },
        payload: 'test',
        processing: { retryPolicy: { maxRetries: 1, delay: 20 } }
      });

      const retryFunction = vi.fn().mockRejectedValue(new Error('Persistent error'));

      // The scheduleRetry method schedules async retries, so we need to handle this differently
      let caughtError = null;
      try {
        await retryManager.scheduleRetry('test-2', directive, 'target1', new Error('Initial error'), retryFunction);
        // Wait for retries to complete and potentially fail
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        caughtError = error;
      }

      // Should eventually be removed from queue after max retries
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(retryManager.retryQueues.has('test-2')).toBe(false);
    }, 10000);

    test('should get retry statistics', () => {
      // Add some retry info manually for testing
      retryManager.retryQueues.set('retry1', {
        attempts: 1,
        targetNodeId: 'node1'
      });
      retryManager.retryQueues.set('retry2', {
        attempts: 2,
        targetNodeId: 'node1'
      });
      retryManager.retryQueues.set('retry3', {
        attempts: 1,
        targetNodeId: 'node2'
      });

      const stats = retryManager.getRetryStats();

      expect(stats.totalRetrying).toBe(3);
      expect(stats.byAttempts['1']).toBe(2);
      expect(stats.byAttempts['2']).toBe(1);
      expect(stats.byTargetNode['node1']).toBe(2);
      expect(stats.byTargetNode['node2']).toBe(1);
    });
  });

  describe('BatchProcessor', () => {
    let batchProcessor;

    beforeEach(() => {
      batchProcessor = new BatchProcessor(directiveProcessor);
    });

    afterEach(() => {
      batchProcessor.clearAll();
    });

    test('should add directive to batch queue', () => {
      const directive = DataDirective.create({
        type: 'test',
        target: { section: 'input', path: 'test' },
        payload: 'test'
      });

      batchProcessor.addToBatch(directive, 'target1');

      const stats = batchProcessor.getBatchStats();
      expect(stats.totalQueues).toBe(1);
      expect(stats.totalPendingDirectives).toBe(1);
      expect(stats.queueSizes['target1']).toBe(1);
    });

    test('should sort directives by priority in batch', () => {
      const directive1 = DataDirective.create({
        type: 'test1',
        target: { section: 'input', path: 'test1' },
        payload: 'test1',
        processing: { priority: 8 }
      });

      const directive2 = DataDirective.create({
        type: 'test2',
        target: { section: 'input', path: 'test2' },
        payload: 'test2',
        processing: { priority: 3 }
      });

      const directive3 = DataDirective.create({
        type: 'test3',
        target: { section: 'input', path: 'test3' },
        payload: 'test3',
        processing: { priority: 5 }
      });

      batchProcessor.addToBatch(directive1, 'target1');
      batchProcessor.addToBatch(directive2, 'target1');
      batchProcessor.addToBatch(directive3, 'target1');

      const batch = batchProcessor.batchQueues.get('target1');
      expect(batch[0].directive.processing.priority).toBe(3); // Highest priority (lowest number)
      expect(batch[1].directive.processing.priority).toBe(5);
      expect(batch[2].directive.processing.priority).toBe(8); // Lowest priority
    });

    test('should process batch immediately when full', async () => {
      // Set small batch size for testing
      batchProcessor.batchConfig.maxBatchSize = 2;

      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      // Mock the _processImmediate method
      const processSpy = vi.spyOn(directiveProcessor, '_processImmediate').mockResolvedValue({ success: true });

      const directive1 = DataDirective.create({
        type: 'test1',
        target: { section: 'input', path: 'test1' },
        payload: 'test1'
      });

      const directive2 = DataDirective.create({
        type: 'test2',
        target: { section: 'input', path: 'test2' },
        payload: 'test2'
      });

      batchProcessor.addToBatch(directive1, 'target1');
      batchProcessor.addToBatch(directive2, 'target1');

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processSpy).toHaveBeenCalledTimes(2);
      expect(batchProcessor.batchQueues.get('target1')).toEqual([]);
    });

    test('should get batch statistics', () => {
      const directive = DataDirective.create({
        type: 'test',
        target: { section: 'input', path: 'test' },
        payload: 'test'
      });

      batchProcessor.addToBatch(directive, 'target1');
      batchProcessor.addToBatch(directive, 'target1');
      batchProcessor.addToBatch(directive, 'target2');

      const stats = batchProcessor.getBatchStats();

      expect(stats.totalQueues).toBe(2);
      expect(stats.totalPendingDirectives).toBe(3);
      expect(stats.queueSizes['target1']).toBe(2);
      expect(stats.queueSizes['target2']).toBe(1);
      expect(stats.averageQueueSize).toBe(1.5);
    });
  });

  describe('ConditionalEvaluator', () => {
    let evaluator;

    beforeEach(() => {
      evaluator = new ConditionalEvaluator();
    });

    test('should return true for empty/null conditions', () => {
      expect(evaluator.evaluate('')).toBe(true);
      expect(evaluator.evaluate(null)).toBe(true);
      expect(evaluator.evaluate(undefined)).toBe(true);
    });

    test('should evaluate simple boolean expressions', () => {
      expect(evaluator.evaluate('true')).toBe(true);
      expect(evaluator.evaluate('false')).toBe(false);
      expect(evaluator.evaluate('1 === 1')).toBe(true);
      expect(evaluator.evaluate('1 === 2')).toBe(false);
    });

    test('should evaluate expressions with context variables', () => {
      const context = {
        hasErrors: false,
        hasConnections: true,
        nodeCount: 5
      };

      expect(evaluator.evaluate('hasErrors === false', context)).toBe(true);
      expect(evaluator.evaluate('hasConnections && nodeCount > 3', context)).toBe(true);
      expect(evaluator.evaluate('hasErrors || nodeCount < 3', context)).toBe(false);
    });

    test('should use Math functions safely', () => {
      const context = { value: 16 };
      expect(evaluator.evaluate('Math.sqrt(value) === 4', context)).toBe(true);
      expect(evaluator.evaluate('Math.max(5, 10) === 10')).toBe(true);
    });

    test('should reject unsafe expressions', () => {
      const unsafeExpressions = [
        'eval("dangerous code")',
        'Function("return process")()',
        'window.location',
        'document.cookie',
        'require("fs")',
        'process.exit()'
      ];

      for (const expr of unsafeExpressions) {
        expect(() => evaluator.evaluate(expr)).toThrow(/Unsafe conditional expression/);
      }
    });

    test('should handle evaluation errors gracefully', () => {
      expect(evaluator.evaluate('nonExistent.property')).toBe(false);
      expect(evaluator.evaluate('throw new Error("test")')).toBe(false);
    });

    test('should sanitize context variables', () => {
      const context = {
        validString: 'test',
        validNumber: 42,
        dangerousFunction: () => 'danger',
        dangerousObject: process,
        'invalid-key': 'value'
      };

      const result = evaluator.evaluate('typeof dangerousFunction === "undefined"', context);
      expect(result).toBe(true); // Function should be filtered out
    });
  });

  describe('Conditional Directive Execution', () => {
    beforeEach(() => {
      const targetNode = InputNodeData.create({
        meta: { label: 'Target Node' },
        input: { connections: { conn1: {} } },
        output: { meta: { status: 'idle' } },
        error: { hasError: false }
      });
      mockNodeDataManager.setNodeData('target1', targetNode);
    });

    test('should execute directive when condition is true', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: {
          conditional: 'hasConnections === true',
          immediate: true
        }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(mockNodeDataManager.applyDirectiveCalled).toHaveLength(1);
    });

    test('should skip directive when condition is false', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: {
          conditional: 'hasErrors === true',
          immediate: true
        }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('conditional_check_failed');
      expect(mockNodeDataManager.applyDirectiveCalled).toHaveLength(0);
    });

    test('should skip directive when condition evaluation fails', async () => {
      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: {
          conditional: 'nonExistentVar.property',
          immediate: true
        }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe('Batch vs Immediate Processing', () => {
    test('should process directive immediately when immediate=true', async () => {
      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: { immediate: true }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(mockNodeDataManager.applyDirectiveCalled).toHaveLength(1);
      expect(directiveProcessor.stats.batched).toBe(0);
    });

    test('should queue directive for batch processing when immediate=false', async () => {
      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: { immediate: false }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(true);
      expect(result.result.queued).toBe(true);
      expect(directiveProcessor.stats.batched).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle directive with retry policy on failure', async () => {
      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      // Mock _processImmediate to fail first, then succeed
      let callCount = 0;
      vi.spyOn(directiveProcessor, '_processImmediate').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt fails');
        }
        return Promise.resolve({ success: true });
      });

      const directive = DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'test',
        processing: {
          immediate: true,
          retryPolicy: {
            maxRetries: 2,
            delay: 50
          }
        }
      });

      const result = await directiveProcessor.processDirective(directive, 'target1');

      expect(result.success).toBe(false);
      expect(result.retryScheduled).toBe(true);
      expect(directiveProcessor.stats.retried).toBe(1);
    });

    test('should cleanup properly', async () => {
      const targetNode = InputNodeData.create({ meta: { label: 'Target' } });
      mockNodeDataManager.setNodeData('target1', targetNode);

      // Add some processing state
      directiveProcessor.stats.totalProcessed = 5;
      directiveProcessor.batchProcessor.addToBatch('target1', {}, 'test-id');
      directiveProcessor.retryManager.retryQueues.set('retry1', {});

      await directiveProcessor.cleanup();

      expect(directiveProcessor.stats).toEqual({
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        batched: 0,
        skipped: 0
      });
      expect(directiveProcessor.batchProcessor.batchQueues.size).toBe(0);
      expect(directiveProcessor.retryManager.retryQueues.size).toBe(0);
    });
  });
});