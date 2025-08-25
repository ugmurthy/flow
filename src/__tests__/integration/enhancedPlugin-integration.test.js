/**
 * Enhanced Plugin Integration Tests
 * End-to-end tests for Phase 9 enhanced plugin system
 * Tests real-world scenarios with multiple plugins, connections, and resource management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pluginRegistry from '../../services/pluginRegistry.js';
import { DataTransformerPlugin } from '../../plugins/dataTransformer.js';
import { LLMProcessorPlugin } from '../../plugins/llmProcessor.js';
import { EnhancedPlugin, PluginResourceManager } from '../../types/enhancedPluginSystem.js';
import { ProcessingInput, ProcessingOutput } from '../../types/pluginSystem.js';

describe('Enhanced Plugin System Integration', () => {
  let resourceManager;
  let dataTransformer;
  let llmProcessor;

  beforeEach(async () => {
    // Clean up and initialize
    await pluginRegistry.cleanup();
    await pluginRegistry.initialize();
    
    resourceManager = new PluginResourceManager();
    
    // Create plugin instances
    dataTransformer = new DataTransformerPlugin();
    llmProcessor = new LLMProcessorPlugin();

    // Register plugins
    await pluginRegistry.register('data-transformer', dataTransformer, { 
      autoInitialize: true,
      config: {
        strategy: 'merge',
        preserveMetadata: true,
        aggregationStrategy: 'priority'
      }
    });

    await pluginRegistry.register('llm-processor', llmProcessor, { 
      autoInitialize: true,
      config: {
        provider: 'ollama',
        model: 'llama3.2',
        timeout: 10000
      }
    });
  });

  afterEach(async () => {
    await pluginRegistry.cleanup();
    resourceManager.cleanup();
  });

  describe('Multi-Connection Data Processing Pipeline', () => {
    it('should process data through multiple enhanced plugins', async () => {
      // Create multiple connections with different data types
      const dataConnections = new Map();
      
      // Connection 1: User input data
      dataConnections.set('user-input', [
        ProcessingInput.create({
          sourceId: 'form-node-1',
          data: {
            name: 'John Doe',
            age: 30,
            preferences: { theme: 'dark', lang: 'en' }
          },
          meta: { priority: 8, timestamp: new Date().toISOString() }
        })
      ]);

      // Connection 2: System configuration
      dataConnections.set('system-config', [
        ProcessingInput.create({
          sourceId: 'config-node-1',
          data: {
            environment: 'production',
            features: ['feature1', 'feature2'],
            limits: { maxItems: 100, timeout: 5000 }
          },
          meta: { priority: 5 }
        })
      ]);

      // Connection 3: External API data
      dataConnections.set('api-data', [
        ProcessingInput.create({
          sourceId: 'api-node-1',
          data: {
            weather: { temperature: 22, condition: 'sunny' },
            location: { city: 'San Francisco', country: 'US' }
          },
          meta: { priority: 3 }
        }),
        ProcessingInput.create({
          sourceId: 'api-node-2',
          data: {
            news: { headlines: ['Breaking News', 'Tech Update'] },
            timestamp: new Date().toISOString()
          },
          meta: { priority: 3 }
        })
      ]);

      // Process through data transformer first
      const transformedResult = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        dataConnections,
        { aggregationStrategy: 'priority' }
      );

      expect(transformedResult.success).toBe(true);
      expect(transformedResult.meta.connectionCount).toBe(3);
      expect(transformedResult.meta.totalInputs).toBe(4);
      expect(transformedResult.meta.aggregationStrategy).toBe('priority');

      // The result should prioritize user-input (priority 8)
      expect(transformedResult.data.name).toBe('John Doe');
      expect(transformedResult.data.age).toBe(30);
      
      // Lower priority data should be merged in
      expect(transformedResult.data.environment).toBe('production');
      expect(transformedResult.data.weather).toBeDefined();

      // Create connections for LLM processing
      const llmConnections = new Map();
      llmConnections.set('processed-data', [
        ProcessingInput.create({
          sourceId: 'data-transformer',
          data: {
            prompt: `Process this user data: ${JSON.stringify(transformedResult.data)}`,
            context: 'data-analysis'
          }
        })
      ]);

      // Mock LLM response to avoid external API calls
      vi.spyOn(llmProcessor, '_processWithLLM').mockResolvedValue({
        response: 'Analyzed user data successfully',
        model: 'llama3.2',
        usage: { totalTokens: 150 },
        metadata: { processingTime: 2000 }
      });

      const llmResult = await pluginRegistry.processConnectionsWithPlugin(
        'llm-processor',
        llmConnections,
        { aggregationStrategy: 'merge' }
      );

      expect(llmResult.success).toBe(true);
      expect(llmResult.data.response).toBe('Analyzed user data successfully');
      expect(llmResult.meta.model).toBe('llama3.2');
    });

    it('should handle different aggregation strategies across plugins', async () => {
      const connections = new Map();
      
      // Add multiple inputs with different priorities
      connections.set('high-priority', [
        ProcessingInput.create({
          sourceId: 'urgent-node',
          data: { urgent: true, message: 'Critical alert' },
          meta: { priority: 10 }
        })
      ]);

      connections.set('medium-priority', [
        ProcessingInput.create({
          sourceId: 'normal-node-1',
          data: { type: 'info', content: 'Regular update 1' },
          meta: { priority: 5 }
        }),
        ProcessingInput.create({
          sourceId: 'normal-node-2',
          data: { type: 'info', content: 'Regular update 2' },
          meta: { priority: 5 }
        })
      ]);

      connections.set('low-priority', [
        ProcessingInput.create({
          sourceId: 'background-node',
          data: { background: true, task: 'maintenance' },
          meta: { priority: 1 }
        })
      ]);

      // Test priority aggregation
      const priorityResult = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        connections,
        { 
          aggregationStrategy: 'priority',
          strategy: 'merge'
        }
      );

      expect(priorityResult.success).toBe(true);
      expect(priorityResult.data.urgent).toBe(true);
      expect(priorityResult.data.message).toBe('Critical alert');
      expect(priorityResult.data.type).toBe('info'); // Merged from lower priority

      // Test array aggregation
      const arrayResult = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        connections,
        { 
          aggregationStrategy: 'array',
          strategy: 'merge'
        }
      );

      expect(arrayResult.success).toBe(true);
      expect(Array.isArray(arrayResult.data)).toBe(true);
      expect(arrayResult.data).toHaveLength(4);
    });

    it('should handle plugin processing errors gracefully', async () => {
      // Create a plugin that will fail
      const faultyPlugin = new DataTransformerPlugin();
      faultyPlugin._doProcess = vi.fn().mockRejectedValue(new Error('Simulated processing error'));

      await pluginRegistry.register('faulty-transformer', faultyPlugin, { autoInitialize: true });

      const connections = new Map();
      connections.set('test-connection', [
        ProcessingInput.create({
          sourceId: 'test-node',
          data: { test: 'data' }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'faulty-transformer',
        connections
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Simulated processing error');
      expect(result.metrics.processingTime).toBeGreaterThan(0);
      expect(result.metrics.connectionCount).toBe(1);
    });
  });

  describe('Resource Management Integration', () => {
    it('should monitor resource usage during processing', async () => {
      // Start resource monitoring
      resourceManager.startMonitoring(100); // Very frequent monitoring for testing

      // Set resource limits
      resourceManager.setResourceLimits('data-transformer', {
        maxMemory: '100MB',
        maxCPU: '50%',
        timeout: 5000
      });

      // Process some data
      const connections = new Map();
      connections.set('resource-test', [
        ProcessingInput.create({
          sourceId: 'test-node',
          data: { largeData: 'x'.repeat(1000) }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        connections
      );

      expect(result.success).toBe(true);

      // Check resource usage was collected
      const usage = resourceManager.getResourceUsage('global');
      expect(usage).toBeDefined();

      resourceManager.stopMonitoring();
    });

    it('should check resource requirements for all registered plugins', async () => {
      const resourceCheck = pluginRegistry.checkAllResourceRequirements();

      // Should have entries for enhanced plugins
      expect(resourceCheck['data-transformer']).toBeDefined();
      
      const dataTransformerCheck = resourceCheck['data-transformer'];
      expect(dataTransformerCheck.environmentValidation).toBeDefined();
      expect(dataTransformerCheck.requirements).toBeDefined();
      expect(dataTransformerCheck.requirements.maxMemory).toBe('500MB');
      expect(dataTransformerCheck.requirements.maxCPU).toBe('30%');
    });

    it('should handle resource limit violations', async () => {
      // Set very low memory limit
      resourceManager.setResourceLimits('data-transformer', {
        maxMemory: '1MB' // Unrealistically low
      });

      // Mock resource usage to exceed limits
      resourceManager.resourceUsage.set('data-transformer', {
        memory: { used: 10 * 1024 * 1024 } // 10MB
      });

      const limitCheck = resourceManager.checkResourceLimits('data-transformer');
      
      expect(limitCheck.exceeded).toBe(true);
      expect(limitCheck.violations).toHaveLength(1);
      expect(limitCheck.violations[0].resource).toBe('memory');
      expect(limitCheck.violations[0].exceeded).toBe(true);
    });
  });

  describe('Plugin Discovery and Routing', () => {
    it('should discover plugins by capabilities', () => {
      const transformationPlugins = pluginRegistry.getPluginsByCapability('data-transformation');
      const llmPlugins = pluginRegistry.getPluginsByCapability('llm-processing');
      const multiConnectionPlugins = pluginRegistry.getPluginsByCapability('multi-connection-processing');

      expect(transformationPlugins).toContain('data-transformer');
      expect(llmPlugins).toContain('llm-processor');
      expect(multiConnectionPlugins).toContain('data-transformer');
    });

    it('should get multi-connection capable plugins', () => {
      const multiConnectionPlugins = pluginRegistry.getMultiConnectionPlugins();
      
      expect(multiConnectionPlugins).toContain('data-transformer');
      // LLM processor should also support multi-connection through adapter
    });

    it('should get plugins by aggregation strategy', () => {
      const mergePlugins = pluginRegistry.getPluginsByAggregationStrategy('merge');
      const priorityPlugins = pluginRegistry.getPluginsByAggregationStrategy('priority');

      expect(mergePlugins).toContain('data-transformer');
      expect(priorityPlugins).toContain('data-transformer');
    });

    it('should provide comprehensive registry statistics', () => {
      const stats = pluginRegistry.getStats();

      expect(stats.totalPlugins).toBe(2);
      expect(stats.enhancedPlugins).toBeGreaterThanOrEqual(1);
      expect(stats.multiConnectionPlugins).toBeGreaterThanOrEqual(1);
      expect(stats.capabilityDistribution).toHaveProperty('data-transformation');
      expect(stats.capabilityDistribution).toHaveProperty('llm-processing');
      expect(stats.aggregationStrategyDistribution).toHaveProperty('merge');
      expect(stats.resourceMonitoring).toBe(false);
    });
  });

  describe('Enhanced Plugin Adapters', () => {
    it('should create adapters for base plugins', async () => {
      // LLM processor is a base plugin, should get enhanced through adapter
      const adapter = pluginRegistry.getOrCreateEnhancedWrapper('llm-processor');
      
      expect(adapter.name).toBe('enhanced-llm-processor');
      expect(adapter.supportsMultipleInputs()).toBe(true);
      expect(adapter.getInputAggregationStrategies()).toContain('merge');

      const connections = new Map();
      connections.set('llm-input', [
        ProcessingInput.create({
          sourceId: 'text-node',
          data: { prompt: 'Test prompt', context: 'testing' }
        })
      ]);

      // Mock the LLM processing
      vi.spyOn(llmProcessor, '_processWithLLM').mockResolvedValue({
        response: 'Test response',
        model: 'llama3.2',
        usage: { totalTokens: 50 }
      });

      const result = await adapter.processConnections(connections, {
        aggregationStrategy: 'merge'
      });

      expect(result.success).toBe(true);
    });

    it('should reuse existing adapters', () => {
      const adapter1 = pluginRegistry.getOrCreateEnhancedWrapper('llm-processor');
      const adapter2 = pluginRegistry.getOrCreateEnhancedWrapper('llm-processor');
      
      expect(adapter1).toBe(adapter2); // Same instance
    });
  });

  describe('Configuration and Validation', () => {
    it('should validate enhanced plugin configurations', async () => {
      const config = {
        strategy: 'merge',
        aggregationStrategy: 'priority',
        customAggregationFunction: 'return inputs.map(i => i.data);'
      };

      const validation = pluginRegistry.validatePluginConfig('data-transformer', config);
      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid configurations', async () => {
      const invalidConfig = {
        strategy: 'invalid-strategy',
        aggregationStrategy: 'unsupported-strategy'
      };

      const validation = pluginRegistry.validatePluginConfig('data-transformer', invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle custom aggregation functions', async () => {
      const connections = new Map();
      connections.set('custom-test', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { value: 1, type: 'number' }
        }),
        ProcessingInput.create({
          sourceId: 'node2', 
          data: { value: 2, type: 'number' }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        connections,
        {
          aggregationStrategy: 'custom',
          config: {
            strategy: 'custom',
            customAggregationFunction: `
              const sum = inputs.reduce((acc, input) => acc + (input.data.value || 0), 0);
              return { sum, count: inputs.length, type: 'aggregated' };
            `
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.sum).toBe(3);
      expect(result.data.count).toBe(2);
      expect(result.data.type).toBe('aggregated');
    });
  });

  describe('Performance and Metrics', () => {
    it('should track processing metrics across plugins', async () => {
      const connections = new Map();
      connections.set('perf-test', [
        ProcessingInput.create({
          sourceId: 'perf-node',
          data: { performanceTest: true, data: 'x'.repeat(100) }
        })
      ]);

      const result = await pluginRegistry.processConnectionsWithPlugin(
        'data-transformer',
        connections
      );

      expect(result.success).toBe(true);
      expect(result.metrics.processingTime).toBeGreaterThan(0);
      expect(result.meta.connectionCount).toBe(1);
      expect(result.meta.totalInputs).toBe(1);

      // Check plugin status includes metrics
      const plugin = pluginRegistry.get('data-transformer');
      const status = plugin.getStatus();
      
      expect(status.connectionMetrics).toBeDefined();
      expect(status.connectionMetrics.totalConnectionsProcessed).toBeGreaterThan(0);
      expect(status.metrics.processCount).toBeGreaterThan(0);
    });

    it('should handle concurrent processing requests', async () => {
      const connections1 = new Map();
      connections1.set('concurrent-1', [
        ProcessingInput.create({
          sourceId: 'node1',
          data: { test: 'concurrent1' }
        })
      ]);

      const connections2 = new Map();
      connections2.set('concurrent-2', [
        ProcessingInput.create({
          sourceId: 'node2',
          data: { test: 'concurrent2' }
        })
      ]);

      // Process concurrently
      const [result1, result2] = await Promise.all([
        pluginRegistry.processConnectionsWithPlugin('data-transformer', connections1),
        pluginRegistry.processConnectionsWithPlugin('data-transformer', connections2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.test).toBe('concurrent1');
      expect(result2.data.test).toBe('concurrent2');
    });
  });
});