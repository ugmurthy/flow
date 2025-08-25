/**
 * Enhanced Plugin System Tests
 * Tests for Phase 9 plugin enhancements including multi-connection support,
 * resource management, and aggregation strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EnhancedPlugin, 
  PluginResourceManager, 
  MultiConnectionPluginAdapter,
  pluginResourceManager 
} from '../types/enhancedPluginSystem.js';
import { ProcessingInput, ProcessingOutput, ValidationResult, BasePlugin } from '../types/pluginSystem.js';

describe('Enhanced Plugin System', () => {
  let testPlugin;
  let resourceManager;

  beforeEach(() => {
    // Create test plugin
    testPlugin = new EnhancedPlugin('test-plugin', '1.0.0', 'Test plugin for enhanced features');
    resourceManager = new PluginResourceManager();
  });

  afterEach(() => {
    if (testPlugin && testPlugin.initialized) {
      testPlugin.cleanup();
    }
    resourceManager.cleanup();
  });

  describe('EnhancedPlugin Base Class', () => {
    it('should extend BasePlugin with enhanced features', () => {
      expect(testPlugin).toBeInstanceOf(BasePlugin);
      expect(testPlugin.multiConnectionSupport).toBe(true);
      expect(testPlugin.supportedAggregationStrategies).toContain('merge');
      expect(testPlugin.supportedAggregationStrategies).toContain('array');
      expect(testPlugin.supportedAggregationStrategies).toContain('priority');
      expect(testPlugin.resourceRequirements).toBeDefined();
    });

    it('should support multiple inputs', () => {
      expect(testPlugin.supportsMultipleInputs()).toBe(true);
    });

    it('should return aggregation strategies', () => {
      const strategies = testPlugin.getInputAggregationStrategies();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain('merge');
      expect(strategies).toContain('array');
      expect(strategies).toContain('priority');
    });

    it('should return resource requirements', () => {
      const requirements = testPlugin.getResourceRequirements();
      expect(requirements).toHaveProperty('maxMemory');
      expect(requirements).toHaveProperty('maxCPU');
      expect(requirements).toHaveProperty('maxDiskSpace');
      expect(requirements).toHaveProperty('maxNetworkRequests');
    });

    it('should validate environment', () => {
      const validation = testPlugin.validateEnvironment();
      expect(validation).toHaveProperty('isValid');
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should have enhanced capabilities', () => {
      const capabilities = testPlugin.getCapabilities();
      expect(capabilities).toContain('multi-connection-processing');
      expect(capabilities).toContain('input-aggregation');
      expect(capabilities).toContain('resource-monitoring');
      expect(capabilities).toContain('environment-validation');
    });

    it('should have enhanced status with connection metrics', () => {
      const status = testPlugin.getStatus();
      expect(status).toHaveProperty('connectionMetrics');
      expect(status).toHaveProperty('resourceUsage');
      expect(status).toHaveProperty('supportedStrategies');
      expect(Array.isArray(status.supportedStrategies)).toBe(true);
    });
  });

  describe('Multi-Connection Processing', () => {
    beforeEach(async () => {
      // Initialize plugin for testing
      testPlugin._doProcess = vi.fn().mockResolvedValue(
        ProcessingOutput.success({ processed: true })
      );
      await testPlugin.initialize();
    });

    it('should process multiple connections', async () => {
      const connections = new Map();
      
      // Add multiple connections
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test1' }
        })
      ]);
      
      connections.set('conn2', [
        ProcessingInput.create({
          sourceId: 'node2',
          data: { value: 'test2' }
        })
      ]);

      const result = await testPlugin.processConnections(connections, {
        aggregationStrategy: 'merge'
      });

      expect(result.success).toBe(true);
      expect(result.meta.connectionCount).toBe(2);
      expect(result.meta.totalInputs).toBe(2);
      expect(result.meta.aggregationStrategy).toBe('merge');
    });

    it('should fail if plugin is not initialized', async () => {
      const uninitializedPlugin = new EnhancedPlugin('uninitialized', '1.0.0');
      const connections = new Map();

      await expect(uninitializedPlugin.processConnections(connections))
        .rejects.toThrow('Enhanced plugin uninitialized is not initialized');
    });
  });

  describe('Input Aggregation Strategies', () => {
    beforeEach(async () => {
      await testPlugin.initialize();
    });

    const createTestInputs = () => [
      ProcessingInput.create({
        sourceId: 'node1',
        data: { a: 1, b: 'hello' },
        meta: { priority: 8 }
      }),
      ProcessingInput.create({
        sourceId: 'node2',
        data: { b: 'world', c: 3 },
        meta: { priority: 5 }
      }),
      ProcessingInput.create({
        sourceId: 'node3',
        data: { d: true },
        meta: { priority: 10 }
      })
    ];

    it('should aggregate using merge strategy', async () => {
      const inputs = createTestInputs();
      const aggregated = await testPlugin._aggregateInputs(inputs, 'merge', {});

      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].data).toHaveProperty('a', 1);
      expect(aggregated[0].data).toHaveProperty('b', 'world'); // Last value wins
      expect(aggregated[0].data).toHaveProperty('c', 3);
      expect(aggregated[0].data).toHaveProperty('d', true);
    });

    it('should aggregate using array strategy', async () => {
      const inputs = createTestInputs();
      const aggregated = await testPlugin._aggregateInputs(inputs, 'array', {});

      expect(aggregated).toHaveLength(1);
      expect(Array.isArray(aggregated[0].data)).toBe(true);
      expect(aggregated[0].data).toHaveLength(3);
      expect(aggregated[0].meta.aggregationStrategy).toBe('array');
      expect(aggregated[0].meta.itemCount).toBe(3);
    });

    it('should aggregate using priority strategy', async () => {
      const inputs = createTestInputs();
      const aggregated = await testPlugin._aggregateInputs(inputs, 'priority', {});

      expect(aggregated).toHaveLength(1);
      // Should prioritize node3 (priority 10) as primary
      expect(aggregated[0].sourceId).toBe('node3');
      expect(aggregated[0].data).toHaveProperty('d', true);
      expect(aggregated[0].meta.aggregationStrategy).toBe('priority');
    });

    it('should aggregate using latest strategy', async () => {
      // Create inputs with explicit timestamps to ensure proper ordering
      const baseTime = Date.now();
      const inputs = [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { a: 1, b: 'hello' },
          meta: {
            priority: 8,
            timestamp: new Date(baseTime - 2000).toISOString() // Oldest
          }
        }),
        ProcessingInput.create({
          sourceId: 'node2',
          data: { b: 'world', c: 3 },
          meta: {
            priority: 5,
            timestamp: new Date(baseTime - 1000).toISOString() // Middle
          }
        }),
        ProcessingInput.create({
          sourceId: 'node3',
          data: { d: true },
          meta: {
            priority: 10,
            timestamp: new Date(baseTime).toISOString() // Latest
          }
        })
      ];

      const aggregated = await testPlugin._aggregateInputs(inputs, 'latest', {});

      expect(aggregated).toHaveLength(1);
      // Should return the input with the latest timestamp (node3)
      expect(aggregated[0].sourceId).toBe('node3');
      expect(aggregated[0].data.d).toBe(true);
    });

    it('should fallback to merge for unsupported strategy', async () => {
      const inputs = createTestInputs();
      const aggregated = await testPlugin._aggregateInputs(inputs, 'unsupported', {});

      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].data).toHaveProperty('a', 1);
    });

    it('should handle empty inputs array', async () => {
      const aggregated = await testPlugin._aggregateInputs([], 'merge', {});
      expect(aggregated).toHaveLength(0);
    });

    it('should handle single input', async () => {
      const inputs = [createTestInputs()[0]];
      const aggregated = await testPlugin._aggregateInputs(inputs, 'merge', {});
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0]).toBe(inputs[0]);
    });
  });

  describe('Resource Management', () => {
    it('should track resource usage metrics', () => {
      const usage = testPlugin._getCurrentResourceUsage();
      expect(usage).toHaveProperty('timestamp');
      expect(usage).toHaveProperty('memory');
      expect(usage).toHaveProperty('cpu');
      expect(usage).toHaveProperty('network');
    });

    it('should parse memory strings correctly', () => {
      expect(testPlugin._parseMemoryString('1GB')).toBe(1024 * 1024 * 1024);
      expect(testPlugin._parseMemoryString('500MB')).toBe(500 * 1024 * 1024);
      expect(testPlugin._parseMemoryString('1024KB')).toBe(1024 * 1024);
      expect(testPlugin._parseMemoryString('2048B')).toBe(2048);
      expect(testPlugin._parseMemoryString('invalid')).toBe(0);
    });

    it('should update connection metrics', () => {
      testPlugin._updateConnectionMetrics(100, 2, 5, true);
      const status = testPlugin.getStatus();
      
      expect(status.connectionMetrics.totalConnectionsProcessed).toBe(1);
      expect(status.connectionMetrics.totalConnections).toBe(2);
      expect(status.connectionMetrics.averageConnectionSize).toBe(5);
      expect(status.connectionMetrics.connectionErrors).toBe(0);
    });

    it('should track connection errors', () => {
      testPlugin._updateConnectionMetrics(100, 1, 3, false);
      const status = testPlugin.getStatus();
      
      expect(status.connectionMetrics.connectionErrors).toBe(1);
    });
  });

  describe('PluginResourceManager', () => {
    it('should set and get resource limits', () => {
      const limits = {
        maxMemory: '2GB',
        maxCPU: '75%',
        maxNetworkRequests: 500
      };

      resourceManager.setResourceLimits('test-plugin', limits);
      const storedLimits = resourceManager.resourceLimits.get('test-plugin');
      
      expect(storedLimits.maxMemory).toBe('2GB');
      expect(storedLimits.maxCPU).toBe('75%');
      expect(storedLimits.maxNetworkRequests).toBe(500);
    });

    it('should get resource requirements from plugin', () => {
      const mockPlugin = {
        getResourceRequirements: () => ({
          maxMemory: '1GB',
          maxCPU: '50%'
        })
      };

      const requirements = resourceManager.getResourceRequirements(mockPlugin);
      expect(requirements.maxMemory).toBe('1GB');
      expect(requirements.maxCPU).toBe('50%');
    });

    it('should return default requirements for plugins without method', () => {
      const mockPlugin = {};
      const requirements = resourceManager.getResourceRequirements(mockPlugin);
      
      expect(requirements.maxMemory).toBe('1GB');
      expect(requirements.maxCPU).toBe('50%');
      expect(requirements.maxDiskSpace).toBe('100MB');
    });

    it('should validate environment for plugins', () => {
      const mockPlugin = {
        validateEnvironment: () => ValidationResult.success()
      };

      const validation = resourceManager.validateEnvironment(mockPlugin);
      expect(validation.isValid).toBe(true);
    });

    it('should start and stop monitoring', () => {
      expect(resourceManager.monitoring).toBe(false);
      
      resourceManager.startMonitoring(1000);
      expect(resourceManager.monitoring).toBe(true);
      expect(resourceManager.monitoringInterval).toBeTruthy();
      
      resourceManager.stopMonitoring();
      expect(resourceManager.monitoring).toBe(false);
      expect(resourceManager.monitoringInterval).toBeNull();
    });

    it('should collect resource usage data', () => {
      resourceManager._collectResourceUsage();
      
      const usage = resourceManager.getResourceUsage('global');
      if (usage) {
        expect(usage).toHaveProperty('timestamp');
        expect(usage).toHaveProperty('memory');
      }
    });

    it('should check resource limits', () => {
      resourceManager.setResourceLimits('test', {
        maxMemory: '100MB'
      });

      // Mock usage data
      resourceManager.resourceUsage.set('test', {
        memory: { used: 200 * 1024 * 1024 } // 200MB
      });

      const check = resourceManager.checkResourceLimits('test');
      expect(check.exceeded).toBe(true);
      expect(check.violations).toHaveLength(1);
      expect(check.violations[0].resource).toBe('memory');
    });

    it('should return no violations for within-limits usage', () => {
      resourceManager.setResourceLimits('test', {
        maxMemory: '500MB'
      });

      resourceManager.resourceUsage.set('test', {
        memory: { used: 100 * 1024 * 1024 } // 100MB
      });

      const check = resourceManager.checkResourceLimits('test');
      expect(check.exceeded).toBe(false);
      expect(check.violations).toHaveLength(0);
    });

    it('should cleanup properly', () => {
      resourceManager.startMonitoring();
      resourceManager.setResourceLimits('test', { maxMemory: '1GB' });
      resourceManager.resourceUsage.set('test', { memory: { used: 100 } });

      resourceManager.cleanup();

      expect(resourceManager.monitoring).toBe(false);
      expect(resourceManager.resourceLimits.size).toBe(0);
      expect(resourceManager.resourceUsage.size).toBe(0);
    });
  });

  describe('MultiConnectionPluginAdapter', () => {
    let basePlugin;
    let adapter;

    beforeEach(() => {
      basePlugin = {
        name: 'base-plugin',
        version: '1.0.0',
        description: 'Base plugin',
        author: 'Test',
        initialize: vi.fn(),
        process: vi.fn().mockResolvedValue(ProcessingOutput.success({ result: 'processed' })),
        cleanup: vi.fn(),
        getCapabilities: vi.fn().mockReturnValue(['data-processing']),
        getConfigSchema: vi.fn().mockReturnValue({ type: 'object', properties: {} }),
        validateConfig: vi.fn().mockReturnValue(ValidationResult.success())
      };

      adapter = new MultiConnectionPluginAdapter(basePlugin);
    });

    afterEach(() => {
      if (adapter && adapter.initialized) {
        adapter.cleanup();
      }
    });

    it('should wrap base plugin with enhanced features', () => {
      expect(adapter.name).toBe('enhanced-base-plugin');
      expect(adapter.basePlugin).toBe(basePlugin);
      expect(adapter.multiConnectionSupport).toBe(true);
    });

    it('should initialize base plugin', async () => {
      const config = { test: true };
      await adapter._doInitialize(config);
      
      expect(basePlugin.initialize).toHaveBeenCalledWith(config);
    });

    it('should process connections using base plugin', async () => {
      adapter._doInitialize = vi.fn();
      await adapter.initialize();

      const inputs = [ProcessingInput.create({ sourceId: 'test', data: { value: 1 } })];
      const context = { config: { strategy: 'merge' } };
      const connectionMetadata = {};

      const result = await adapter._doProcessConnections(inputs, context, connectionMetadata);
      
      expect(basePlugin.process).toHaveBeenCalledWith(inputs, context.config, context);
      expect(result.data.result).toBe('processed');
    });

    it('should get enhanced capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities).toContain('data-processing');
      expect(capabilities).toContain('multi-connection-processing');
      expect(capabilities).toContain('input-aggregation');
    });

    it('should get enhanced configuration schema', () => {
      const schema = adapter.getConfigSchema();
      
      expect(schema.properties).toHaveProperty('aggregationStrategy');
      expect(schema.properties.aggregationStrategy.enum).toContain('merge');
      expect(schema.properties.aggregationStrategy.enum).toContain('array');
    });

    it('should validate configuration using base plugin', () => {
      const config = { test: true };
      const validation = adapter.validateConfig(config);
      
      expect(basePlugin.validateConfig).toHaveBeenCalledWith(config);
      expect(validation.isValid).toBe(true);
    });

    it('should cleanup base plugin', async () => {
      await adapter._doCleanup();
      expect(basePlugin.cleanup).toHaveBeenCalled();
    });

    it('should handle base plugin without process method', async () => {
      delete basePlugin.process;
      adapter._doInitialize = vi.fn();
      await adapter.initialize();

      const inputs = [];
      const context = {};
      const connectionMetadata = {};

      await expect(adapter._doProcessConnections(inputs, context, connectionMetadata))
        .rejects.toThrow('Base plugin does not implement process method');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      testPlugin._doProcess = vi.fn().mockRejectedValue(new Error('Processing failed'));
      await testPlugin.initialize();
    });

    it('should handle processing errors gracefully', async () => {
      const connections = new Map();
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test' }
        })
      ]);

      const result = await testPlugin.processConnections(connections);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Processing failed');
      expect(result.metrics.connectionCount).toBe(1);
    });

    it('should update error metrics on failure', async () => {
      const connections = new Map();
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test' }
        })
      ]);

      await testPlugin.processConnections(connections);
      
      const status = testPlugin.getStatus();
      expect(status.connectionMetrics.connectionErrors).toBe(1);
      expect(status.lastError).toBe('Processing failed');
    });
  });
});