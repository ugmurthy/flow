/**
 * Schema Backward Compatibility Tests
 * Ensures enhanced schema works with existing code and can migrate old formats
 */

import {
  NodeData,
  SchemaMigration,
  SchemaValidator,
  InputNodeData,
  ProcessNodeData,
  OutputNodeData
} from '../types/nodeSchema.js';

describe('Schema Backward Compatibility', () => {
  
  describe('SchemaMigration', () => {
    test('should migrate old input node format', () => {
      const oldFormat = {
        label: 'Old Form Node',
        function: 'Form Collection',
        emoji: '📝',
        formData: { username: 'test' },
        formFields: [
          { name: 'username', type: 'text', required: true }
        ],
        type: 'formNode'
      };

      const migrated = SchemaMigration.migrateFromOldFormat(oldFormat);

      expect(migrated.meta.label).toBe('Old Form Node');
      expect(migrated.meta.category).toBe('input');
      expect(migrated.meta.capabilities).toContain('user-input');
      expect(migrated.input.config.formFields).toHaveLength(1);
      expect(migrated.output.data).toEqual({ username: 'test' });
      expect(migrated.meta.version).toBe('1.0.0');
    });

    test('should migrate old process node format', () => {
      const oldFormat = {
        label: 'Old Process Node',
        function: 'Data Processing',
        emoji: '⚙️',
        type: 'processNode'
      };

      const migrated = SchemaMigration.migrateFromOldFormat(oldFormat);

      expect(migrated.meta.category).toBe('process');
      expect(migrated.meta.capabilities).toContain('data-processing');
    });

    test('should migrate old output node format', () => {
      const oldFormat = {
        label: 'Old Markdown Node',
        function: 'Text Display',
        emoji: '📄',
        type: 'markdownNode'
      };

      const migrated = SchemaMigration.migrateFromOldFormat(oldFormat);

      expect(migrated.meta.category).toBe('output');
      expect(migrated.meta.capabilities).toContain('markdown-rendering');
    });

    test('should handle null/undefined old data', () => {
      const migratedNull = SchemaMigration.migrateFromOldFormat(null);
      const migratedUndefined = SchemaMigration.migrateFromOldFormat(undefined);

      expect(migratedNull.meta.label).toBe('Untitled Node');
      expect(migratedUndefined.meta.label).toBe('Untitled Node');
    });
  });

  describe('Enhanced Nodes with Old-Style Configs', () => {
    test('should accept old-style input node configuration', () => {
      // Old style configuration that might exist in saved workflows
      const oldStyleConfig = {
        label: 'Legacy Form',
        formFields: [{ name: 'email', type: 'email' }],
        validation: { required: true },
        meta: {
          emoji: '📧'
        }
      };

      const nodeData = InputNodeData.create(oldStyleConfig);

      expect(nodeData.meta.label).toBe('Legacy Form');
      expect(nodeData.meta.emoji).toBe('📧');
      expect(nodeData.input.validation.required).toBe(true);
    });

    test('should accept old-style process node configuration', () => {
      const oldStyleConfig = {
        label: 'Legacy Processor',
        aggregationStrategy: 'array',
        requiredInputs: ['input1', 'input2']
      };

      const nodeData = ProcessNodeData.create(oldStyleConfig);

      expect(nodeData.meta.label).toBe('Legacy Processor');
      expect(nodeData.input.config.aggregationStrategy).toBe('array');
      expect(nodeData.input.config.requiredInputs).toEqual(['input1', 'input2']);
    });

    test('should accept old-style output node configuration', () => {
      const oldStyleConfig = {
        label: 'Legacy Display',
        displayFormat: 'table',
        exportOptions: { format: 'csv' }
      };

      const nodeData = OutputNodeData.create(oldStyleConfig);

      expect(nodeData.meta.label).toBe('Legacy Display');
      expect(nodeData.input.config.displayFormat).toBe('table');
      expect(nodeData.input.config.exportOptions.format).toBe('csv');
    });
  });

  describe('SchemaValidator Integration', () => {
    test('should validate enhanced NodeData structure', () => {
      const enhancedNode = NodeData.create({
        meta: { label: 'Test Node' },
        input: { config: { test: true } },
        output: { data: { result: 'success' } }
      });

      const validation = SchemaValidator.validateNodeData(enhancedNode);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate migrated old format', () => {
      const oldFormat = {
        label: 'Migrated Node',
        function: 'Test Function',
        emoji: '🧪',
        formData: { test: 'data' }
      };

      const migrated = SchemaMigration.migrateFromOldFormat(oldFormat);
      const validation = SchemaValidator.validateNodeData(migrated);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should handle mixed old/new configurations gracefully', () => {
      // Simulate a partially updated node data structure
      const mixedConfig = {
        meta: {
          label: 'Mixed Node',
          version: '1.5.0', // Intermediate version
          category: 'process'
        },
        input: {
          connections: {}, // New format
          config: { oldSetting: true }, // Old format
          // Missing processed collection - should be auto-created
        },
        output: {
          data: { result: 'test' },
          meta: { status: 'idle' }
          // Missing directives - should be auto-created
        }
        // Missing styling section - should be auto-created
      };

      const nodeData = NodeData.create(mixedConfig);

      expect(nodeData.meta.version).toBe('1.5.0'); // Preserves provided version
      expect(nodeData.input.processed).toBeDefined();
      expect(nodeData.input.processed.strategy).toBe('merge');
      expect(nodeData.output.directives).toEqual({});
      expect(nodeData.styling.states.default).toBeDefined();
      expect(nodeData.error.warnings).toEqual([]);
    });
  });

  describe('Feature Flag Compatibility', () => {
    test('should work when new features are not used', () => {
      // Create nodes without using any new features
      const basicNodeData = NodeData.create({
        meta: { label: 'Basic Node' },
        input: { config: {} },
        output: { data: {} }
      });

      // Should still have all new structure but with defaults
      expect(basicNodeData.input.processed).toBeDefined();
      expect(basicNodeData.output.directives).toEqual({});
      expect(basicNodeData.styling).toBeDefined();
    });

    test('should handle incremental adoption of new features', () => {
      let nodeData = NodeData.create({ meta: { label: 'Evolving Node' } });

      // Add ProcessedDataCollection
      nodeData = NodeData.update(nodeData, {
        input: {
          processed: {
            strategy: 'priority',
            aggregated: { test: 'data' }
          }
        }
      });

      expect(nodeData.input.processed.strategy).toBe('priority');

      // Add directives
      nodeData = NodeData.addDirective(nodeData, 'target', {
        type: 'update-config',
        target: { section: 'input', path: 'config.test' },
        payload: 'value'
      });

      expect(nodeData.output.directives.target).toHaveLength(1);

      // Update styling
      nodeData = NodeData.updateVisualState(nodeData, 'custom', {
        container: { backgroundColor: '#custom' }
      });

      expect(nodeData.styling.states.custom).toBeDefined();
    });
  });

  describe('Performance Compatibility', () => {
    test('should not significantly impact creation time', () => {
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        NodeData.create({
          meta: { label: `Node ${i}` },
          input: { config: { index: i } },
          output: { data: { value: i } }
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(1); // Should be under 1ms per node on average
    });

    test('should not significantly impact update time', () => {
      const nodeData = NodeData.create({ meta: { label: 'Performance Test' } });
      const iterations = 1000;

      const start = performance.now();
      let current = nodeData;
      for (let i = 0; i < iterations; i++) {
        current = NodeData.update(current, {
          meta: { description: `Update ${i}` },
          output: { data: { counter: i } }
        });
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.5); // Should be under 0.5ms per update on average
    });
  });

  describe('Memory Compatibility', () => {
    test('should not create excessive object references', () => {
      const nodeData = NodeData.create();
      
      // Check that styling states are not deeply nested references
      expect(nodeData.styling.states.default).not.toBe(nodeData.styling.states.selected);
      
      // Check that ProcessedDataCollection is properly isolated
      expect(nodeData.input.processed.byConnection).not.toBe(nodeData.input.connections);
      
      // Check that meta timestamps are properly set
      expect(nodeData.meta.createdAt).toBeTruthy();
      expect(nodeData.meta.updatedAt).toBeTruthy();
    });

    test('should handle deep updates without memory leaks', () => {
      let nodeData = NodeData.create();
      
      // Perform many nested updates
      for (let i = 0; i < 100; i++) {
        nodeData = NodeData.update(nodeData, {
          input: {
            processed: {
              aggregated: { [`key${i}`]: `value${i}` }
            }
          },
          styling: {
            custom: { [`prop${i}`]: `val${i}` }
          }
        });
      }

      // Should maintain reasonable object size
      const jsonString = JSON.stringify(nodeData);
      expect(jsonString.length).toBeLessThan(50000); // Reasonable size limit
    });
  });

  describe('Integration with Existing Systems', () => {
    test('should work with current nodeDataManager patterns', () => {
      // Simulate nodeDataManager usage patterns
      const nodeData = InputNodeData.create({
        meta: { label: 'Manager Test' },
        formFields: [{ name: 'test', type: 'text' }]
      });

      // Simulate connection addition (current pattern)
      const updatedWithConnection = NodeData.update(nodeData, {
        input: {
          connections: {
            'test-connection': {
              sourceNodeId: 'source-1',
              data: { test: 'data' },
              processed: { test: 'PROCESSED' }
            }
          }
        }
      });

      expect(updatedWithConnection.input.connections['test-connection']).toBeDefined();
      expect(updatedWithConnection.input.processed).toBeDefined();
    });

    test('should work with React Flow integration', () => {
      // Test React Flow node creation pattern
      const nodeData = ProcessNodeData.create({
        meta: { label: 'React Flow Node' }
      });

      const reactFlowNode = {
        id: 'rf-node-1',
        position: { x: 100, y: 100 },
        data: nodeData,
        type: 'processNode'
      };

      expect(reactFlowNode.data.meta.label).toBe('React Flow Node');
      expect(reactFlowNode.data.styling).toBeDefined();
      expect(reactFlowNode.data.styling.handles.input).toBeDefined();
      expect(reactFlowNode.data.styling.handles.output).toBeDefined();
    });
  });
});