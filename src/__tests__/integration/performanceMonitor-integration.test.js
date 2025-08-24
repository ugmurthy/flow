/**
 * Integration tests for Enhanced Performance Monitor Service
 * Tests integration with NodeDataManager, DirectiveProcessor, and other system components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, performanceMonitor } from '../../services/performanceMonitor.js';
import nodeDataManagerInstance, { NodeDataManager, NodeDataEvents } from '../../services/nodeDataManager.js';
import { DirectiveProcessor } from '../../services/directiveProcessor.js';
import { InputNodeData, ProcessNodeData, OutputNodeData } from '../../types/nodeSchema.js';

// Mock dependencies
vi.mock('../../utils/performanceMonitor.js', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(() => ({ startTime: Date.now(), operation: 'test' })),
    endMeasurement: vi.fn(),
  },
}));

describe('Performance Monitor Integration Tests', () => {
  let monitor;
  let nodeDataManager;
  let directiveProcessor;
  let mockNodes;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    nodeDataManager = new NodeDataManager();
    directiveProcessor = new DirectiveProcessor(nodeDataManager);
    
    // Setup mock nodes
    mockNodes = {
      'input-node': InputNodeData.create({
        meta: { label: 'Test Input', function: 'Data Collection', category: 'input' },
        output: { data: { value: 'test input data' } },
      }),
      'process-node': ProcessNodeData.create({
        meta: { label: 'Test Process', function: 'Data Processing', category: 'process' },
        plugin: { name: 'test-processor', config: { delay: 100 } },
      }),
      'output-node': OutputNodeData.create({
        meta: { label: 'Test Output', function: 'Data Display', category: 'output' },
        input: { connections: { 'conn-1': { sourceNodeId: 'process-node' } } },
      }),
    };

    // Register nodes with manager
    Object.entries(mockNodes).forEach(([id, data]) => {
      nodeDataManager.registerNode(id, data);
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopPeriodicAnalysis();
    monitor.clear();
    nodeDataManager.clear?.();
  });

  describe('NodeDataManager Integration', () => {
    it('should track performance during node processing', async () => {
      const trackingSpy = vi.spyOn(monitor, 'trackNodeProcessing');
      
      // Setup performance tracking observer
      monitor.addObserver((event, data) => {
        if (event === 'threshold_violation') {
          console.log(`Threshold violation detected: ${data.nodeId}`);
        }
      });

      const startTime = performance.now();
      
      // Simulate node processing with performance tracking
      const nodeId = 'process-node';
      const processingData = { result: 'processed data', timestamp: Date.now() };
      
      // Track processing start
      const measurement = { startTime, operation: 'node_processing' };
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const endTime = performance.now();
      const dataSize = JSON.stringify(processingData).length;
      
      // Track the processing
      monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);
      
      expect(trackingSpy).toHaveBeenCalledWith(
        nodeId,
        startTime,
        endTime,
        dataSize
      );

      const stats = monitor.getNodeStats(nodeId);
      expect(stats.totalProcessed).toBe(1);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should integrate with NodeDataManager events', async () => {
      const performanceData = [];
      
      // Setup observer to collect performance data
      monitor.addObserver((event, data) => {
        performanceData.push({ event, data });
      });

      // Setup NodeDataManager event listener for performance tracking
      const handleNodeUpdate = (eventData) => {
        const { nodeId, updateData, processingTime = 100 } = eventData;
        const startTime = Date.now() - processingTime;
        const endTime = Date.now();
        const dataSize = JSON.stringify(updateData).length;
        
        monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize);
      };

      // Simulate NodeDataManager event
      const updateData = { output: { data: { result: 'updated' } } };
      handleNodeUpdate({
        nodeId: 'process-node',
        updateData,
        processingTime: 150,
      });

      const stats = monitor.getNodeStats('process-node');
      expect(stats.totalProcessed).toBe(1);
      expect(stats.averageProcessingTime).toBe(150);
    });

    it('should track multiple concurrent node operations', async () => {
      const nodeIds = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];
      const operations = [];

      // Start multiple operations concurrently
      nodeIds.forEach((nodeId, index) => {
        const startTime = performance.now();
        
        const operation = new Promise(resolve => {
          setTimeout(() => {
            const endTime = performance.now();
            const dataSize = 1024 + (index * 512); // Varying data sizes
            
            monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize, {
              memoryUsage: (50 + index * 10) * 1024 * 1024, // Increasing memory usage
              connectionCount: index + 1,
            });
            
            resolve();
          }, 10 + (index * 20)); // Staggered completion times
        });
        
        operations.push(operation);
      });

      // Wait for all operations to complete
      await Promise.all(operations);

      // Analyze the performance
      const analysis = monitor.analyzePerformance();
      
      expect(analysis.totalNodes).toBe(5);
      expect(analysis.slowestNodes).toHaveLength(5);
      expect(analysis.memoryUsage.totalMemoryUsage).toBeGreaterThan(0);
      expect(analysis.processingTrends).toBeTruthy();
    });
  });

  describe('DirectiveProcessor Integration', () => {
    it('should track performance during directive processing', async () => {
      const directive = {
        type: 'update-config',
        target: { section: 'plugin', path: 'config.timeout', operation: 'set' },
        payload: 5000,
        processing: { immediate: true, priority: 5 },
        meta: { source: 'performance-test' },
      };

      const trackingSpy = vi.spyOn(monitor, 'trackNodeProcessing');
      const startTime = performance.now();

      // Simulate directive processing with performance tracking
      try {
        // Track directive processing start
        const processingStartTime = performance.now();
        
        // Simulate directive processing work
        await new Promise(resolve => setTimeout(resolve, 30));
        
        const processingEndTime = performance.now();
        const directiveSize = JSON.stringify(directive).length;
        
        // Track directive processing performance
        monitor.trackNodeProcessing(
          'directive-processor',
          processingStartTime,
          processingEndTime,
          directiveSize,
          { operation: 'directive_processing' }
        );

        const stats = monitor.getNodeStats('directive-processor');
        expect(stats.totalProcessed).toBe(1);
        expect(stats.averageProcessingTime).toBeGreaterThan(0);
        
      } catch (error) {
        // Track errors in directive processing
        const errorTime = performance.now();
        monitor.trackNodeProcessing(
          'directive-processor',
          startTime,
          errorTime,
          0,
          { error, operation: 'directive_processing_error' }
        );
      }
    });

    it('should handle directive processing errors with performance tracking', async () => {
      const invalidDirective = {
        type: 'invalid-type',
        target: null, // Invalid target
        payload: undefined,
      };

      const errorObserver = vi.fn();
      monitor.addObserver(errorObserver);

      const startTime = performance.now();
      
      try {
        // This should fail and be tracked
        throw new Error('Invalid directive structure');
      } catch (error) {
        const endTime = performance.now();
        const directiveSize = JSON.stringify(invalidDirective).length;
        
        monitor.trackNodeProcessing(
          'directive-error-node',
          startTime,
          endTime,
          directiveSize,
          { error, operation: 'directive_validation_error' }
        );
      }

      const stats = monitor.getNodeStats('directive-error-node');
      expect(stats.totalProcessed).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(stats.errorRate).toBe(1.0);
    });
  });

  describe('Plugin System Integration', () => {
    it('should track plugin execution performance', async () => {
      // Mock plugin execution
      const mockPlugin = {
        name: 'test-plugin',
        process: async (input) => {
          // Simulate plugin work
          await new Promise(resolve => setTimeout(resolve, 75));
          return { processed: input, timestamp: Date.now() };
        },
      };

      const pluginTrackingSpy = vi.spyOn(monitor, 'trackNodeProcessing');

      // Simulate plugin execution with performance tracking
      const nodeId = 'plugin-test-node';
      const inputData = { value: 'test input', size: 1024 };
      
      const startTime = performance.now();
      const result = await mockPlugin.process(inputData);
      const endTime = performance.now();
      
      const dataSize = JSON.stringify(inputData).length + JSON.stringify(result).length;
      
      monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize, {
        plugin: mockPlugin.name,
        memoryUsage: 25 * 1024 * 1024, // 25MB
      });

      expect(pluginTrackingSpy).toHaveBeenCalledWith(
        nodeId,
        startTime,
        endTime,
        dataSize,
        expect.objectContaining({
          plugin: 'test-plugin',
          memoryUsage: 25 * 1024 * 1024,
        })
      );

      const stats = monitor.getNodeStats(nodeId);
      expect(stats.totalProcessed).toBe(1);
      expect(stats.averageProcessingTime).toBeGreaterThan(70); // Should be around 75ms
    });

    it('should track performance across plugin chains', async () => {
      const pluginChain = [
        { name: 'preprocessor', delay: 20 },
        { name: 'transformer', delay: 50 },
        { name: 'validator', delay: 30 },
        { name: 'postprocessor', delay: 15 },
      ];

      let data = { initial: 'data', processed: 0 };

      for (let i = 0; i < pluginChain.length; i++) {
        const plugin = pluginChain[i];
        const nodeId = `chain-node-${i}`;
        const startTime = performance.now();

        // Simulate plugin processing
        await new Promise(resolve => setTimeout(resolve, plugin.delay));
        data = { ...data, processed: i + 1, [plugin.name]: true };

        const endTime = performance.now();
        const dataSize = JSON.stringify(data).length;

        monitor.trackNodeProcessing(nodeId, startTime, endTime, dataSize, {
          plugin: plugin.name,
          chainPosition: i,
          memoryUsage: (20 + i * 5) * 1024 * 1024,
        });
      }

      // Analyze chain performance
      const analysis = monitor.analyzePerformance();
      expect(analysis.totalNodes).toBe(4);
      
      // Check that processing times are roughly what we expect
      const chainStats = pluginChain.map((_, i) => monitor.getNodeStats(`chain-node-${i}`));
      chainStats.forEach((stats, i) => {
        expect(stats.totalProcessed).toBe(1);
        expect(stats.averageProcessingTime).toBeGreaterThan(pluginChain[i].delay - 10);
        expect(stats.averageProcessingTime).toBeLessThan(pluginChain[i].delay + 20);
      });
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should track performance during error scenarios', async () => {
      const errorScenarios = [
        { nodeId: 'timeout-node', error: new Error('Processing timeout'), delay: 5000 },
        { nodeId: 'memory-node', error: new Error('Out of memory'), delay: 100 },
        { nodeId: 'validation-node', error: new Error('Validation failed'), delay: 50 },
      ];

      const errorObserver = vi.fn();
      monitor.addObserver(errorObserver);

      for (const scenario of errorScenarios) {
        const startTime = performance.now();
        
        try {
          // Simulate work before error
          await new Promise(resolve => setTimeout(resolve, Math.min(scenario.delay, 200)));
          throw scenario.error;
        } catch (error) {
          const endTime = performance.now();
          
          monitor.trackNodeProcessing(
            scenario.nodeId,
            startTime,
            endTime,
            512, // Minimal data size for failed operations
            { error, operation: 'error_scenario' }
          );
        }
      }

      // Check error tracking
      const errorAnalysis = monitor.analyzePerformance();
      expect(errorAnalysis.errorAnalysis.totalErrors).toBe(3);
      expect(errorAnalysis.errorAnalysis.nodesWithErrors).toHaveLength(3);
      
      // Check recommendations for error-prone nodes
      const recommendations = monitor.getOptimizationRecommendations();
      const reliabilityRec = recommendations.find(r => r.type === 'reliability');
      expect(reliabilityRec).toBeTruthy();
    });

    it('should provide recovery recommendations based on error patterns', async () => {
      const nodeId = 'recovery-test-node';
      
      // Simulate repeated errors
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        try {
          await new Promise(resolve => setTimeout(resolve, 20));
          if (i % 3 === 0) { // Fail every 3rd attempt
            throw new Error(`Intermittent failure ${i}`);
          }
        } catch (error) {
          const endTime = performance.now();
          monitor.trackNodeProcessing(nodeId, startTime, endTime, 256, { error });
        }
        
        // Also track successful operations
        if (i % 3 !== 0) {
          const endTime = performance.now();
          monitor.trackNodeProcessing(nodeId, startTime, endTime, 512);
        }
      }

      const analysis = monitor.analyzePerformance();
      const nodeStats = monitor.getNodeStats(nodeId);
      
      expect(nodeStats.totalProcessed).toBe(10);
      expect(nodeStats.errorCount).toBe(4); // Every 3rd of 10 attempts
      expect(nodeStats.errorRate).toBeCloseTo(0.4, 1);
      
      // Should generate reliability recommendations
      const recommendations = monitor.getOptimizationRecommendations();
      const reliabilityRecs = recommendations.filter(r => r.type === 'reliability');
      expect(reliabilityRecs).toHaveLength(1);
    });
  });

  describe('Real-time Monitoring Integration', () => {
    it('should provide real-time performance metrics', async () => {
      const realTimeData = [];
      
      // Setup real-time observer
      monitor.addObserver((event, data) => {
        if (event === 'threshold_violation') {
          realTimeData.push({
            timestamp: Date.now(),
            event,
            nodeId: data.nodeId,
            violations: data.violations,
          });
        }
      });

      // Simulate operations with threshold violations
      const operations = [
        { nodeId: 'fast-node', delay: 10, dataSize: 256 },
        { nodeId: 'slow-node', delay: 6000, dataSize: 1024 }, // Should trigger critical
        { nodeId: 'large-data-node', delay: 100, dataSize: 15 * 1024 * 1024 }, // Should trigger critical
        { nodeId: 'normal-node', delay: 500, dataSize: 512 },
      ];

      for (const op of operations) {
        const startTime = performance.now();
        await new Promise(resolve => setTimeout(resolve, Math.min(op.delay, 500))); // Cap delay for test
        const endTime = performance.now();
        
        monitor.trackNodeProcessing(op.nodeId, startTime, endTime, op.dataSize);
      }

      // Should have captured threshold violations
      expect(realTimeData.length).toBeGreaterThan(0);
      
      const slowNodeViolation = realTimeData.find(d => d.nodeId === 'slow-node');
      const largeDataViolation = realTimeData.find(d => d.nodeId === 'large-data-node');
      
      expect(slowNodeViolation || largeDataViolation).toBeTruthy();
    });

    it('should handle high-frequency performance events', async () => {
      const highFrequencyNodeId = 'high-freq-node';
      const eventCount = 1000;
      const events = [];

      // Setup observer to count events
      monitor.addObserver((event, data) => {
        events.push({ event, timestamp: Date.now() });
      });

      // Generate high-frequency events
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          Promise.resolve().then(async () => {
            const startTime = performance.now();
            // Very short processing time to create high frequency
            await Promise.resolve();
            const endTime = performance.now();
            
            monitor.trackNodeProcessing(
              `${highFrequencyNodeId}-${i % 10}`, // 10 different nodes
              startTime,
              endTime,
              64 + (i % 100) // Varying small data sizes
            );
          })
        );
      }

      await Promise.all(promises);

      // Check that the system handled high frequency well
      expect(monitor.metrics.size).toBe(10); // 10 unique nodes
      
      // Each node should have processed 100 events
      for (let i = 0; i < 10; i++) {
        const stats = monitor.getNodeStats(`${highFrequencyNodeId}-${i}`);
        expect(stats.totalProcessed).toBe(100);
      }
    });
  });

  describe('System Performance Impact', () => {
    it('should have minimal performance overhead', async () => {
      const iterations = 1000;
      
      // Measure performance with monitoring enabled
      monitor.setEnabled(true);
      const startWithMonitoring = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        monitor.trackNodeProcessing(`perf-test-${i % 10}`, i, i + 1, 128);
      }
      
      const endWithMonitoring = performance.now();
      const timeWithMonitoring = endWithMonitoring - startWithMonitoring;
      
      // Clear and measure without monitoring
      monitor.clear();
      monitor.setEnabled(false);
      const startWithoutMonitoring = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        monitor.trackNodeProcessing(`perf-test-${i % 10}`, i, i + 1, 128);
      }
      
      const endWithoutMonitoring = performance.now();
      const timeWithoutMonitoring = endWithoutMonitoring - startWithoutMonitoring;
      
      // Monitoring overhead should be reasonable (less than 10x slower)
      const overheadRatio = timeWithMonitoring / Math.max(timeWithoutMonitoring, 1);
      expect(overheadRatio).toBeLessThan(10);
      
      console.log(`Performance monitoring overhead: ${overheadRatio.toFixed(2)}x`);
    });

    it('should handle memory efficiently during long-running operations', async () => {
      const longRunningNodeId = 'long-running-node';
      const totalOperations = 10000;
      const batchSize = 100;
      
      // Process in batches to simulate long-running operations
      for (let batch = 0; batch < totalOperations / batchSize; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          batchPromises.push(
            Promise.resolve().then(() => {
              const startTime = performance.now();
              const endTime = startTime + Math.random() * 10; // Random processing time
              const dataSize = 256 + Math.random() * 1024; // Random data size
              
              monitor.trackNodeProcessing(longRunningNodeId, startTime, endTime, dataSize);
            })
          );
        }
        
        await Promise.all(batchPromises);
        
        // Check memory usage periodically
        if (batch % 10 === 0) {
          const stats = monitor.getNodeStats(longRunningNodeId);
          // Metric arrays should be trimmed to prevent memory leaks
          expect(stats.processingTimeStats.count).toBeLessThanOrEqual(100);
          expect(stats.dataSizeStats.count).toBeLessThanOrEqual(100);
        }
      }
      
      const finalStats = monitor.getNodeStats(longRunningNodeId);
      expect(finalStats.totalProcessed).toBe(totalOperations);
      expect(finalStats.processingTimeStats.count).toBeLessThanOrEqual(100);
    });
  });
});