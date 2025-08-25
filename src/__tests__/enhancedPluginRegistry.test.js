/**
 * Enhanced Plugin Registry Tests
 * Tests for the enhanced plugin registry features from Phase 9
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pluginRegistry from '../services/pluginRegistry.js';
import { EnhancedPlugin, MultiConnectionPluginAdapter } from '../types/enhancedPluginSystem.js';
import { BasePlugin, ProcessingInput, ProcessingOutput, ValidationResult } from '../types/pluginSystem.js';

describe('Enhanced Plugin Registry', () => {
  // Test plugin implementations
  class TestEnhancedPlugin extends EnhancedPlugin {
    constructor(name = 'test-enhanced-plugin') {
      super(name, '2.0.0', 'Test enhanced plugin', 'Test Team');
      this.resourceRequirements = {
        maxMemory: '256MB',
        maxCPU: '25%',
        maxNetworkRequests: 100
      };
    }

    async _doInitialize(config) {
      // Mock initialization
    }

    async _doProcess(inputs, config, context) {
      return ProcessingOutput.success({
        processed: true,
        inputCount: inputs.length,
        config
      });
    }

    getCapabilities() {
      return [
        ...super.getCapabilities(),
        'test-processing'
      ];
    }
  }

  class TestBasePlugin extends BasePlugin {
    constructor(name = 'test-base-plugin') {
      super(name, '1.0.0', 'Test base plugin', 'Test Team');
    }

    async _doInitialize(config) {
      // Mock initialization
    }

    async _doProcess(inputs, config, context) {
      return ProcessingOutput.success({
        baseProcessed: true,
        inputCount: inputs.length
      });
    }

    getCapabilities() {
      return ['base-processing', 'data-handling'];
    }
  }

  beforeEach(async () => {
    // Clean up registry before each test
    await pluginRegistry.cleanup();
    await pluginRegistry.initialize();
  });

  afterEach(async () => {
    await pluginRegistry.cleanup();
  });

  describe('Enhanced Plugin Registration', () => {
    it('should register enhanced plugins with additional metadata', async () => {
      const plugin = new TestEnhancedPlugin();
      
      await pluginRegistry.register('enhanced-test', plugin, { autoInitialize: true });
      
      const info = pluginRegistry.getInfo('enhanced-test');
      expect(info.isEnhanced).toBe(true);
      expect(info.supportsMultipleInputs).toBe(true);
      expect(info.aggregationStrategies).toContain('merge');
      expect(info.aggregationStrategies).toContain('array');
      expect(info.aggregationStrategies).toContain('priority');
      expect(info.resourceRequirements).toBeDefined();
      expect(info.resourceRequirements.maxMemory).toBe('256MB');
    });

    it('should register base plugins with default enhanced metadata', async () => {
      const plugin = new TestBasePlugin();
      
      await pluginRegistry.register('base-test', plugin);
      
      const info = pluginRegistry.getInfo('base-test');
      expect(info.isEnhanced).toBe(false);
      expect(info.supportsMultipleInputs).toBe(false);
      expect(info.aggregationStrategies).toHaveLength(0);
      expect(info.resourceRequirements).toBeNull();
    });

    it('should set up resource monitoring for enhanced plugins', async () => {
      const plugin = new TestEnhancedPlugin();
      
      await pluginRegistry.register('monitored-plugin', plugin);
      
      const limits = pluginRegistry.resourceManager.resourceLimits.get('monitored-plugin');
      expect(limits).toBeDefined();
      expect(limits.maxMemory).toBe('256MB');
      expect(limits.maxCPU).toBe('25%');
    });
  });

  describe('Multi-Connection Processing', () => {
    let enhancedPlugin;

    beforeEach(async () => {
      enhancedPlugin = new TestEnhancedPlugin('multi-connection-test');
      await pluginRegistry.register('multi-test', enhancedPlugin, { autoInitialize: true });
    });

    it('should process connections with enhanced plugin', async () => {
      const connections = new Map();
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test1' }
        }),
        ProcessingInput.create({
          sourceId: 'node2',
          data: { value: 'test2' }
        })
      ]);
      
      connections.set('conn2', [
        ProcessingInput.create({
          sourceId: 'node3',
          data: { value: 'test3' }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'multi-test',
        connections,
        { aggregationStrategy: 'merge' }
      );

      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(true);
      expect(result.meta.connectionCount).toBe(2);
      expect(result.meta.totalInputs).toBe(3);
      expect(result.meta.aggregationStrategy).toBe('merge');
    });

    it('should create adapter for base plugin', async () => {
      const basePlugin = new TestBasePlugin('adapter-test');
      await pluginRegistry.register('base-for-adapter', basePlugin, { autoInitialize: true });

      const connections = new Map();
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test' }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'base-for-adapter',
        connections,
        { aggregationStrategy: 'array' }
      );

      expect(result.success).toBe(true);
      expect(result.data.baseProcessed).toBe(true);

      // Check that adapter was created
      const adapter = pluginRegistry.getOrCreateEnhancedWrapper('base-for-adapter');
      expect(adapter).toBeInstanceOf(MultiConnectionPluginAdapter);
      expect(adapter.name).toBe('enhanced-test-base-plugin');
    });

    it('should throw error for unregistered plugin', async () => {
      const connections = new Map();
      
      await expect(
        pluginRegistry.processConnectionsWithPlugin('nonexistent', connections)
      ).rejects.toThrow("Plugin 'nonexistent' is not registered");
    });

    it('should throw error for uninitialized plugin', async () => {
      const plugin = new TestEnhancedPlugin('uninitialized-test');
      await pluginRegistry.register('uninitialized', plugin); // No autoInitialize

      const connections = new Map();
      
      await expect(
        pluginRegistry.processConnectionsWithPlugin('uninitialized', connections)
      ).rejects.toThrow("Plugin 'uninitialized' is not initialized");
    });
  });

  describe('Plugin Discovery and Filtering', () => {
    beforeEach(async () => {
      // Register different types of plugins
      await pluginRegistry.register('enhanced-1', new TestEnhancedPlugin('enhanced-1'), { autoInitialize: true });
      await pluginRegistry.register('enhanced-2', new TestEnhancedPlugin('enhanced-2'), { autoInitialize: true });
      await pluginRegistry.register('base-1', new TestBasePlugin('base-1'), { autoInitialize: true });
    });

    it('should get multi-connection capable plugins', () => {
      const multiConnectionPlugins = pluginRegistry.getMultiConnectionPlugins();
      
      expect(multiConnectionPlugins).toContain('enhanced-1');
      expect(multiConnectionPlugins).toContain('enhanced-2');
      expect(multiConnectionPlugins).not.toContain('base-1');
    });

    it('should get plugins by aggregation strategy', () => {
      const mergePlugins = pluginRegistry.getPluginsByAggregationStrategy('merge');
      const priorityPlugins = pluginRegistry.getPluginsByAggregationStrategy('priority');
      const unsupportedPlugins = pluginRegistry.getPluginsByAggregationStrategy('unsupported');

      expect(mergePlugins).toContain('enhanced-1');
      expect(mergePlugins).toContain('enhanced-2');
      expect(priorityPlugins).toContain('enhanced-1');
      expect(priorityPlugins).toContain('enhanced-2');
      expect(unsupportedPlugins).toHaveLength(0);
    });

    it('should get plugins by capability', () => {
      const multiConnectionCapable = pluginRegistry.getPluginsByCapability('multi-connection-processing');
      const testProcessingCapable = pluginRegistry.getPluginsByCapability('test-processing');
      const baseProcessingCapable = pluginRegistry.getPluginsByCapability('base-processing');

      expect(multiConnectionCapable).toContain('enhanced-1');
      expect(multiConnectionCapable).toContain('enhanced-2');
      expect(testProcessingCapable).toContain('enhanced-1');
      expect(testProcessingCapable).toContain('enhanced-2');
      expect(baseProcessingCapable).toContain('base-1');
    });
  });

  describe('Resource Management Integration', () => {
    it('should check resource requirements for all plugins', async () => {
      await pluginRegistry.register('resource-test-1', new TestEnhancedPlugin('resource-1'), { autoInitialize: true });
      await pluginRegistry.register('resource-test-2', new TestEnhancedPlugin('resource-2'), { autoInitialize: true });

      const resourceCheck = pluginRegistry.checkAllResourceRequirements();

      expect(resourceCheck).toHaveProperty('resource-test-1');
      expect(resourceCheck).toHaveProperty('resource-test-2');
      
      expect(resourceCheck['resource-test-1'].environmentValidation).toBeDefined();
      expect(resourceCheck['resource-test-1'].resourceLimits).toBeDefined();
      expect(resourceCheck['resource-test-1'].requirements).toBeDefined();
      expect(resourceCheck['resource-test-1'].requirements.maxMemory).toBe('256MB');
    });

    it('should return empty results for base plugins', async () => {
      await pluginRegistry.register('base-resource-test', new TestBasePlugin());

      const resourceCheck = pluginRegistry.checkAllResourceRequirements();
      expect(Object.keys(resourceCheck)).toHaveLength(0);
    });
  });

  describe('Enhanced Statistics', () => {
    beforeEach(async () => {
      await pluginRegistry.register('enhanced-stats-1', new TestEnhancedPlugin('stats-1'), { autoInitialize: true });
      await pluginRegistry.register('enhanced-stats-2', new TestEnhancedPlugin('stats-2'), { autoInitialize: true });
      await pluginRegistry.register('base-stats-1', new TestBasePlugin('stats-base'), { autoInitialize: true });
    });

    it('should include enhanced plugin statistics', () => {
      const stats = pluginRegistry.getStats();

      expect(stats.totalPlugins).toBe(3);
      expect(stats.initializedPlugins).toBe(3);
      expect(stats.enhancedPlugins).toBe(2);
      expect(stats.multiConnectionPlugins).toBe(2);
      expect(stats.resourceMonitoring).toBe(false);

      // Check capability distribution
      expect(stats.capabilityDistribution['multi-connection-processing']).toBe(2);
      expect(stats.capabilityDistribution['test-processing']).toBe(2);
      expect(stats.capabilityDistribution['base-processing']).toBe(1);

      // Check aggregation strategy distribution
      expect(stats.aggregationStrategyDistribution['merge']).toBe(2);
      expect(stats.aggregationStrategyDistribution['array']).toBe(2);
      expect(stats.aggregationStrategyDistribution['priority']).toBe(2);
    });
  });

  describe('Enhanced Cleanup', () => {
    it('should cleanup enhanced plugin wrappers', async () => {
      // Register base plugin and create wrapper
      const basePlugin = new TestBasePlugin('cleanup-test');
      await pluginRegistry.register('cleanup-base', basePlugin, { autoInitialize: true });
      
      // Create enhanced wrapper
      const wrapper = pluginRegistry.getOrCreateEnhancedWrapper('cleanup-base');
      expect(pluginRegistry.enhancedPlugins.has('cleanup-base')).toBe(true);

      // Mock cleanup method
      wrapper.cleanup = vi.fn().mockResolvedValue();

      await pluginRegistry.cleanup();

      expect(wrapper.cleanup).toHaveBeenCalled();
      expect(pluginRegistry.enhancedPlugins.size).toBe(0);
    });

    it('should cleanup resource manager', async () => {
      const cleanupSpy = vi.spyOn(pluginRegistry.resourceManager, 'cleanup');
      
      await pluginRegistry.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin registration errors gracefully', async () => {
      const invalidPlugin = {
        // Missing required methods
        name: 'invalid-plugin'
      };

      await expect(
        pluginRegistry.register('invalid', invalidPlugin)
      ).rejects.toThrow('Plugin validation failed');
    });

    it('should handle processing errors in multi-connection scenarios', async () => {
      const faultyPlugin = new TestEnhancedPlugin('faulty-plugin');
      faultyPlugin._doProcess = vi.fn().mockRejectedValue(new Error('Processing error'));
      
      await pluginRegistry.register('faulty', faultyPlugin, { autoInitialize: true });

      const connections = new Map();
      connections.set('conn1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 'test' }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin('faulty', connections);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Processing error');
    });

    it('should handle adapter creation errors', () => {
      expect(() => {
        pluginRegistry.getOrCreateEnhancedWrapper('nonexistent-plugin');
      }).toThrow("Plugin 'nonexistent-plugin' is not registered");
    });
  });

  describe('Configuration Validation', () => {
    it('should validate enhanced plugin configurations', async () => {
      const plugin = new TestEnhancedPlugin();
      
      // Mock validateConfig to return specific results
      plugin.validateConfig = vi.fn().mockReturnValue(
        ValidationResult.error(['Invalid configuration'])
      );

      await pluginRegistry.register('config-test', plugin);

      const validation = pluginRegistry.validatePluginConfig('config-test', {
        invalid: 'config'
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid configuration');
    });

    it('should handle plugins without validateConfig method', async () => {
      const plugin = {
        name: 'no-validate-plugin',
        version: '1.0.0',
        getCapabilities: () => ['test'],
        getConfigSchema: () => ({}),
        validateConfig: undefined // No validation method
      };

      await pluginRegistry.register('no-validate', plugin);

      const validation = pluginRegistry.validatePluginConfig('no-validate', {});
      expect(validation.isValid).toBe(true);
    });
  });
});