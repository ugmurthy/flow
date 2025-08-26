/**
 * Enhanced Schema Architecture Tests
 * Comprehensive test suite for Phase 2 implementation
 * Tests all new features: ProcessedDataCollection, DataDirective, NodeVisualState, etc.
 */

import {
  ProcessedDataCollection,
  DataDirective,
  NodeVisualState,
  HandleConfiguration,
  ConnectionData,
  NodeData,
  InputNodeData,
  ProcessNodeData,
  OutputNodeData
} from '../types/nodeSchema.js';

describe('Enhanced Schema Architecture', () => {
  
  describe('ProcessedDataCollection', () => {
    test('should create ProcessedDataCollection with default values', () => {
      const collection = ProcessedDataCollection.create();
      
      expect(collection.aggregated).toEqual({});
      expect(collection.byConnection).toEqual({});
      expect(collection.strategy).toBe('merge');
      expect(collection.meta.connectionCount).toBe(0);
      expect(collection.meta.aggregationMethod).toBe('merge');
      expect(collection.meta.lastAggregated).toBeTruthy();
    });

    test('should create ProcessedDataCollection with custom config', () => {
      const config = {
        aggregated: { test: 'data' },
        byConnection: { conn1: { data: 'test' } },
        strategy: 'priority',
        meta: { customField: 'value' }
      };

      const collection = ProcessedDataCollection.create(config);
      
      expect(collection.aggregated).toEqual({ test: 'data' });
      expect(collection.byConnection).toEqual({ conn1: { data: 'test' } });
      expect(collection.strategy).toBe('priority');
      expect(collection.meta.connectionCount).toBe(1);
      expect(collection.meta.customField).toBe('value');
    });

    test('should update ProcessedDataCollection immutably', () => {
      const original = ProcessedDataCollection.create();
      const updates = { aggregated: { new: 'data' } };
      
      const updated = ProcessedDataCollection.update(original, updates);
      
      expect(updated).not.toBe(original);
      expect(updated.aggregated).toEqual({ new: 'data' });
      expect(original.aggregated).toEqual({});
    });

    test('should add connection data correctly', () => {
      const collection = ProcessedDataCollection.create();
      const connectionId = 'test-connection';
      const data = { message: 'Hello World' };
      const metadata = { priority: 5 };

      const updated = ProcessedDataCollection.addConnectionData(
        collection, 
        connectionId, 
        data, 
        metadata
      );

      expect(updated.byConnection[connectionId]).toBeDefined();
      expect(updated.byConnection[connectionId].data).toEqual(data);
      expect(updated.byConnection[connectionId].metadata.priority).toBe(5);
      expect(updated.meta.connectionCount).toBe(1);
    });
  });

  describe('DataDirective', () => {
    test('should create DataDirective with required fields', () => {
      const config = {
        type: 'update-config',
        target: {
          section: 'input',
          path: 'config.displayFormat',
          operation: 'set'
        },
        payload: 'markdown'
      };

      const directive = DataDirective.create(config);

      expect(directive.type).toBe('update-config');
      expect(directive.target.section).toBe('input');
      expect(directive.target.path).toBe('config.displayFormat');
      expect(directive.target.operation).toBe('set');
      expect(directive.payload).toBe('markdown');
      expect(directive.processing.immediate).toBe(true);
      expect(directive.processing.priority).toBe(5);
      expect(directive.meta.version).toBe('2.0.0');
    });

    test('should validate directive structure correctly', () => {
      const validDirective = {
        type: 'update-config',
        target: { section: 'input', path: 'test.path' },
        payload: 'test'
      };

      const validation = DataDirective.validate(validDirective);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid directive structure', () => {
      const invalidDirective = {
        type: 'invalid-type',
        target: { section: 'invalid-section' },
        // missing payload
      };

      const validation = DataDirective.validate(invalidDirective);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Target path is required');
      expect(validation.errors).toContain('Payload is required');
    });
  });

  describe('NodeVisualState', () => {
    test('should create default visual state', () => {
      const state = NodeVisualState.create();

      expect(state.container.backgroundColor).toBe('#ffffff');
      expect(state.container.borderColor).toBe('#d1d5db');
      expect(state.container.borderWidth).toBe(2);
      expect(state.typography.titleColor).toBe('#1f2937');
      expect(state.layout.padding).toBe(16);
      expect(state.animation.duration).toBe(200);
    });

    test('should create visual state with overrides', () => {
      const overrides = {
        container: { backgroundColor: '#ff0000' },
        typography: { titleSize: '20px' }
      };

      const state = NodeVisualState.create(overrides);

      expect(state.container.backgroundColor).toBe('#ff0000');
      expect(state.container.borderColor).toBe('#d1d5db'); // unchanged
      expect(state.typography.titleSize).toBe('20px');
      expect(state.typography.titleColor).toBe('#1f2937'); // unchanged
    });

    test('should create predefined visual states', () => {
      const defaultState = NodeVisualState.createDefault();
      const selectedState = NodeVisualState.createSelected();
      const processingState = NodeVisualState.createProcessing();
      const successState = NodeVisualState.createSuccess();
      const errorState = NodeVisualState.createError();
      const disabledState = NodeVisualState.createDisabled();

      expect(defaultState.container.borderColor).toBe('#d1d5db');
      expect(selectedState.container.borderColor).toBe('#3b82f6');
      expect(processingState.container.backgroundColor).toBe('#fef3c7');
      expect(processingState.effects.pulse).toBe(true);
      expect(successState.container.backgroundColor).toBe('#ecfdf5');
      expect(errorState.container.backgroundColor).toBe('#fef2f2');
      expect(disabledState.container.opacity).toBe(0.6);
    });
  });

  describe('HandleConfiguration', () => {
    test('should create handle configuration with required fields', () => {
      const config = {
        id: 'test-handle',
        type: 'source',
        position: 'right'
      };

      const handle = HandleConfiguration.create(config);

      expect(handle.id).toBe('test-handle');
      expect(handle.type).toBe('source');
      expect(handle.position).toBe('right');
      expect(handle.style.backgroundColor).toBe('#3b82f6');
      expect(handle.behavior.allowMultipleConnections).toBe(false);
    });

    test('should create input handle with defaults', () => {
      const handle = HandleConfiguration.createInput({ id: 'input-1' });

      expect(handle.type).toBe('target');
      expect(handle.position).toBe('left');
      expect(handle.style.backgroundColor).toBe('#6b7280');
    });

    test('should create output handle with defaults', () => {
      const handle = HandleConfiguration.createOutput({ id: 'output-1' });

      expect(handle.type).toBe('source');
      expect(handle.position).toBe('right');
      expect(handle.style.backgroundColor).toBe('#3b82f6');
    });
  });

  describe('Enhanced ConnectionData', () => {
    test('should create enhanced connection data', () => {
      const sourceNodeId = 'node-1';
      const data = { message: 'test' };
      const processed = { processedMessage: 'TEST' };
      
      const connection = ConnectionData.create(
        sourceNodeId, 
        'default', 
        'default', 
        data, 
        processed
      );

      expect(connection.sourceNodeId).toBe('node-1');
      expect(connection.data).toEqual(data);
      expect(connection.processed).toEqual(processed);
      expect(connection.meta.priority).toBe(5);
      expect(connection.meta.bandwidth).toBeGreaterThan(0);
      expect(connection.qos.reliability).toBe('at-least-once');
      expect(connection.qos.durability).toBe(false);
      expect(connection.qos.ordering).toBe(true);
    });

    test('should update connection data immutably', () => {
      const original = ConnectionData.create('node-1');
      const newData = { updated: 'data' };
      
      const updated = ConnectionData.setData(original, newData);

      expect(updated).not.toBe(original);
      expect(updated.data).toEqual(newData);
      expect(updated.processed).toEqual(newData);
      expect(updated.meta.lastProcessed).toBeTruthy();
    });
  });

  describe('Enhanced NodeData', () => {
    test('should create comprehensive NodeData with all sections', () => {
      const config = {
        meta: { label: 'Test Node' },
        input: { config: { testSetting: true } },
        output: { data: { result: 'test' } },
        plugin: { name: 'test-plugin' },
        styling: { theme: 'custom' }
      };

      const nodeData = NodeData.create(config);

      // Enhanced metadata
      expect(nodeData.meta.label).toBe('Test Node');
      expect(nodeData.meta.version).toBe('2.0.0');
      expect(nodeData.meta.tags).toEqual([]);
      expect(nodeData.meta.author).toBe('System');
      expect(nodeData.meta.createdAt).toBeTruthy();

      // Enhanced input section
      expect(nodeData.input.processed).toBeDefined();
      expect(nodeData.input.processed.strategy).toBe('merge');
      expect(nodeData.input.config.allowMultipleConnections).toBe(false);
      expect(nodeData.input.config.processingMode).toBe('reactive');

      // Enhanced output section
      expect(nodeData.output.meta.status).toBe('idle');
      expect(nodeData.output.meta.inputsProcessed).toBe(0);
      expect(nodeData.output.directives).toEqual({});

      // Enhanced error handling
      expect(nodeData.error.warnings).toEqual([]);
      expect(nodeData.error.recoveryActions).toEqual([]);

      // Enhanced plugin system
      expect(nodeData.plugin.version).toBe('2.0.0');
      expect(nodeData.plugin.lifecycle.initialized).toBe(false);
      expect(nodeData.plugin.dependencies).toEqual([]);

      // Unified styling system
      expect(nodeData.styling.states.default).toBeDefined();
      expect(nodeData.styling.states.processing).toBeDefined();
      expect(nodeData.styling.handles.input).toEqual([]);
      expect(nodeData.styling.theme).toBe('custom');
    });

    test('should update NodeData with enhanced features', () => {
      const nodeData = NodeData.create();
      const updates = {
        meta: { description: 'Updated description' },
        input: {
          processed: { aggregated: { new: 'data' } },
          formFields: [{ name: 'test', type: 'text' }]
        },
        output: {
          directives: { 'target-node': [{ type: 'update-config' }] },
          cache: { enabled: true }
        },
        error: {
          warnings: [{ message: 'Test warning' }]
        },
        styling: {
          states: { custom: NodeVisualState.create() },
          custom: { customProp: 'value' }
        }
      };

      const updated = NodeData.update(nodeData, updates);

      expect(updated.meta.description).toBe('Updated description');
      expect(updated.meta.updatedAt).toBeTruthy();
      expect(updated.input.processed.aggregated.new).toBe('data');

      expect(updated.output.directives['target-node']).toHaveLength(1);
      expect(updated.output.cache.enabled).toBe(true);
      expect(updated.error.warnings).toHaveLength(1);
      expect(updated.styling.states.custom).toBeDefined();
      expect(updated.styling.custom.customProp).toBe('value');
    });

    test('should add directive to NodeData', () => {
      const nodeData = NodeData.create();
      const directive = {
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'value'
      };

      const updated = NodeData.addDirective(nodeData, 'target-node', directive);

      expect(updated.output.directives['target-node']).toHaveLength(1);
      expect(updated.output.directives['target-node'][0].type).toBe('update-config');
    });

    test('should update visual state', () => {
      const nodeData = NodeData.create();
      const stateOverrides = {
        container: { backgroundColor: '#custom' }
      };

      const updated = NodeData.updateVisualState(nodeData, 'custom', stateOverrides);

      expect(updated.styling.states.custom.container.backgroundColor).toBe('#custom');
    });

    test('should add connection data to processed collection', () => {
      const nodeData = NodeData.create();
      const connectionId = 'test-conn';
      const data = { test: 'data' };

      const updated = NodeData.addConnectionData(nodeData, connectionId, data);

      expect(updated.input.processed.byConnection[connectionId]).toBeDefined();
      expect(updated.input.processed.byConnection[connectionId].data).toEqual(data);
      expect(updated.input.processed.meta.connectionCount).toBe(1);
    });
  });

  describe('Enhanced InputNodeData', () => {
    test('should create comprehensive input node', () => {
      const config = {
        meta: { label: 'Enhanced Form' },
        formFields: [{ name: 'username', type: 'text' }]
      };

      const nodeData = InputNodeData.create(config);

      expect(nodeData.meta.category).toBe('input');
      expect(nodeData.meta.capabilities).toContain('directive-generation');
      expect(nodeData.input.config.submitBehavior).toBe('manual');
      expect(nodeData.input.processed.strategy).toBe('latest');
      expect(nodeData.output.data.formData).toEqual({});
      expect(nodeData.output.data.metadata.submitCount).toBe(0);
      expect(nodeData.styling.states.filled).toBeDefined();
      expect(nodeData.styling.handles.output).toHaveLength(1);
    });
  });

  describe('Enhanced ProcessNodeData', () => {
    test('should create comprehensive process node', () => {
      const config = {
        meta: { label: 'Enhanced Processor' },
        input: { config: { allowMultipleConnections: true } }
      };

      const nodeData = ProcessNodeData.create(config);

      expect(nodeData.meta.category).toBe('process');
      expect(nodeData.meta.capabilities).toContain('multi-input');
      expect(nodeData.input.config.allowMultipleConnections).toBe(true);
      expect(nodeData.input.config.connectionPolicy.maxConnections).toBe(10);
      expect(nodeData.input.processed.strategy).toBe('priority-merge');
      expect(nodeData.plugin.name).toBe('default-processor');
      expect(nodeData.styling.states.configured).toBeDefined();
      expect(nodeData.styling.handles.input).toHaveLength(1);
      expect(nodeData.styling.handles.output).toHaveLength(1);
    });
  });

  describe('Enhanced OutputNodeData', () => {
    test('should create comprehensive output node', () => {
      const config = {
        meta: { label: 'Enhanced Display' },
        input: { config: { displayFormat: 'json' } }
      };

      const nodeData = OutputNodeData.create(config);

      expect(nodeData.meta.category).toBe('output');
      expect(nodeData.meta.capabilities).toContain('content-rendering');
      expect(nodeData.input.config.allowMultipleConnections).toBe(true);
      expect(nodeData.input.config.displayFormat).toBe('json');
      expect(nodeData.input.processed.strategy).toBe('merge');
      expect(nodeData.output.data.displayMetadata.renderCount).toBe(0);
      expect(nodeData.output.directives).toEqual({}); // No directives for output nodes
      expect(nodeData.styling.states.populated).toBeDefined();
      expect(nodeData.styling.handles.input).toHaveLength(1);
      expect(nodeData.styling.handles.output).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    test('should work together in realistic workflow scenario', () => {
      // Create an input node that generates directives
      const inputNode = InputNodeData.create({
        meta: { label: 'User Form' },
        formFields: [{ name: 'prompt', type: 'textarea' }]
      });

      // Simulate form submission
      let updatedInput = NodeData.update(inputNode, {
        output: {
          data: {
            formData: { prompt: 'Hello World' },
            isValid: true,
            validationErrors: []
          }
        }
      });

      // Add directive for connected process node
      updatedInput = NodeData.addDirective(updatedInput, 'llm-processor', {
        type: 'update-config',
        target: { section: 'plugin', path: 'config.systemPrompt' },
        payload: 'Hello World'
      });

      // Create process node that receives the directive
      const processNode = ProcessNodeData.create({
        meta: { label: 'LLM Processor' },
        plugin: { name: 'llm-processor' }
      });

      // Add connection data to process node
      const connectionId = 'form-to-processor';
      const updatedProcess = NodeData.addConnectionData(
        processNode,
        connectionId,
        updatedInput.output.data
      );

      // Create output node
      const outputNode = OutputNodeData.create({
        meta: { label: 'Result Display' }
      });

      // Verify the workflow
      expect(updatedInput.output.directives['llm-processor']).toHaveLength(1);
      expect(updatedProcess.input.processed.byConnection[connectionId]).toBeDefined();
      expect(outputNode.input.config.allowMultipleConnections).toBe(true);
    });
  });
});