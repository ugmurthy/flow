/**
 * Enhanced Validation System Test Suite
 * Comprehensive tests for Phase 3 validation implementation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  SchemaValidationRules,
  NodeTypeValidationRules,
  MultiConnectionValidator,
  DirectiveValidator,
  CrossNodeValidator,
  ComprehensiveValidationSystem,
  enhancedValidation
} from '../types/enhancedValidation.js';
import { InputNodeData, ProcessNodeData, OutputNodeData } from '../types/nodeSchema.js';

describe('Enhanced Validation System - Phase 3', () => {
  let validationSystem;

  beforeEach(() => {
    validationSystem = new ComprehensiveValidationSystem();
  });

  // ===========================
  // SCHEMA VALIDATION RULES TESTS
  // ===========================

  describe('Schema Validation Rules', () => {
    test('should have complete schema validation rules structure', () => {
      expect(SchemaValidationRules).toBeDefined();
      expect(SchemaValidationRules.meta).toBeDefined();
      expect(SchemaValidationRules.input).toBeDefined();
      expect(SchemaValidationRules.output).toBeDefined();
      expect(SchemaValidationRules.error).toBeDefined();
      expect(SchemaValidationRules.styling).toBeDefined();
    });

    test('should validate meta section requirements', () => {
      const metaRules = SchemaValidationRules.meta;
      
      expect(metaRules.required).toContain('label');
      expect(metaRules.required).toContain('function');
      expect(metaRules.required).toContain('emoji');
      expect(metaRules.required).toContain('version');
      expect(metaRules.required).toContain('category');
      expect(metaRules.required).toContain('capabilities');
      
      expect(metaRules.constraints.label.minLength).toBe(1);
      expect(metaRules.constraints.label.maxLength).toBe(100);
      expect(metaRules.constraints.capabilities.minItems).toBe(1);
    });

    test('should have node type specific validation rules', () => {
      expect(NodeTypeValidationRules.input).toBeDefined();
      expect(NodeTypeValidationRules.process).toBeDefined();
      expect(NodeTypeValidationRules.output).toBeDefined();
      
      // Input node rules
      const inputRules = NodeTypeValidationRules.input;
      expect(inputRules.meta.constraints.capabilities.mustInclude).toContain('form-collection');
      expect(inputRules.meta.constraints.capabilities.mustInclude).toContain('user-input');
      
      // Process node rules
      const processRules = NodeTypeValidationRules.process;
      expect(processRules.plugin.required).toBe(true);
      expect(processRules.meta.constraints.capabilities.mustInclude).toContain('data-processing');
      
      // Output node rules
      const outputRules = NodeTypeValidationRules.output;
      expect(outputRules.meta.constraints.capabilities.mustInclude).toContain('data-display');
      expect(outputRules.output.constraints.directives.mustBeEmpty).toBe(true);
    });
  });

  // ===========================
  // MULTI-CONNECTION VALIDATOR TESTS
  // ===========================

  describe('Multi-Connection Validator', () => {
    let sampleNodeData;
    let sampleConnection;

    beforeEach(() => {
      sampleNodeData = InputNodeData.create({
        meta: {
          label: 'Test Input',
          function: 'Form Collection',
          emoji: '📝',
          category: 'input',
          capabilities: ['form-collection', 'user-input']
        },
        input: {
          connections: {
            'conn1': {
              sourceNodeId: 'node1',
              data: { test: 'data1' },
              meta: { priority: 5 }
            }
          },
          config: {
            allowMultipleConnections: true
          }
        }
      });

      sampleConnection = {
        id: 'new-conn',
        sourceNodeId: 'node2',
        targetHandle: 'default',
        data: { test: 'data2' },
        meta: { priority: 3 }
      };
    });

    test('should validate connection limits correctly', () => {
      const result = MultiConnectionValidator.validateConnectionLimits(sampleNodeData, sampleConnection);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.currentConnections).toBe(1);
      expect(result.metrics.allowsMultiple).toBe(true);
    });

    test('should reject connections when multiple connections not allowed', () => {
      sampleNodeData.input.config.allowMultipleConnections = false;
      
      const result = MultiConnectionValidator.validateConnectionLimits(sampleNodeData, sampleConnection);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CONNECTION_LIMIT_EXCEEDED');
    });

    test('should validate aggregation strategies', () => {
      const validStrategies = ['merge', 'array', 'latest', 'priority', 'custom'];
      
      for (const strategy of validStrategies) {
        const result = MultiConnectionValidator.validateAggregationStrategy(strategy, sampleNodeData);
        expect(result.isValid).toBe(true);
        expect(result.validatedStrategy).toBe(strategy);
      }
      
      // Invalid strategy
      const invalidResult = MultiConnectionValidator.validateAggregationStrategy('invalid', sampleNodeData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_AGGREGATION_STRATEGY');
    });

    test('should validate data type compatibility', () => {
      // Compatible types
      let result = MultiConnectionValidator.validateDataTypeCompatibility('string', 'string');
      expect(result.isValid).toBe(true);
      
      // Any type compatibility
      result = MultiConnectionValidator.validateDataTypeCompatibility('string', 'any');
      expect(result.isValid).toBe(true);
      
      // Implicit conversion
      result = MultiConnectionValidator.validateDataTypeCompatibility('string', 'number');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('IMPLICIT_TYPE_CONVERSION');
      
      // Incompatible types
      result = MultiConnectionValidator.validateDataTypeCompatibility('object', 'boolean', { allowImplicitConversion: false });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INCOMPATIBLE_DATA_TYPES');
    });

    test('should validate complete multi-connection setup', () => {
      // Add more connections
      sampleNodeData.input.connections.conn2 = {
        sourceNodeId: 'node3',
        data: { test: 'data3' },
        meta: { priority: 7 }
      };
      sampleNodeData.input.processed = { strategy: 'priority' };
      
      const result = MultiConnectionValidator.validateMultiConnectionSetup(sampleNodeData);
      
      expect(result.isValid).toBe(true);
      expect(result.metrics.connectionCount).toBe(2);
      expect(result.metrics.hasMultipleConnections).toBe(true);
      expect(result.connectionAnalysis).toHaveLength(2);
    });
  });

  // ===========================
  // DIRECTIVE VALIDATOR TESTS
  // ===========================

  describe('Directive Validator', () => {
    let sampleDirective;

    beforeEach(() => {
      sampleDirective = {
        type: 'update-config',
        target: {
          section: 'input',
          path: 'config.formFields[0].label',
          operation: 'set'
        },
        payload: 'Updated Label',
        processing: {
          immediate: true,
          priority: 5
        },
        meta: {
          source: 'test',
          timestamp: new Date().toISOString(),
          version: '2.0.0'
        }
      };
    });

    test('should validate directive structure correctly', () => {
      const result = DirectiveValidator.validateDirectiveStructure(sampleDirective);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedDirective.type).toBe('update-config');
      expect(result.validatedDirective.hasValidTarget).toBe(true);
      expect(result.validatedDirective.hasValidProcessing).toBe(true);
    });

    test('should reject invalid directive types', () => {
      sampleDirective.type = 'invalid-type';
      
      const result = DirectiveValidator.validateDirectiveStructure(sampleDirective);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DIRECTIVE_TYPE');
    });

    test('should validate directive target specification', () => {
      const target = sampleDirective.target;
      const result = DirectiveValidator.validateDirectiveTarget(target);
      
      expect(result.isValid).toBe(true);
      expect(result.validatedTarget.section).toBe('input');
      expect(result.validatedTarget.path).toBe('config.formFields[0].label');
      expect(result.validatedTarget.operation).toBe('set');
    });

    test('should reject invalid target sections', () => {
      const target = { ...sampleDirective.target, section: 'invalid' };
      const result = DirectiveValidator.validateDirectiveTarget(target);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TARGET_SECTION');
    });

    test('should validate processing instructions', () => {
      const processing = sampleDirective.processing;
      const result = DirectiveValidator.validateProcessingInstructions(processing);
      
      expect(result.isValid).toBe(true);
      expect(result.processingSummary.immediate).toBe(true);
      expect(result.processingSummary.priority).toBe(5);
    });

    test('should validate conditional expressions for safety', () => {
      const processing = {
        ...sampleDirective.processing,
        conditional: 'eval("malicious code")'
      };
      
      const result = DirectiveValidator.validateProcessingInstructions(processing);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('UNSAFE_CONDITIONAL_EXPRESSION');
    });

    test('should validate target path in actual node data', () => {
      const targetNode = InputNodeData.create({
        meta: { label: 'Target Node', function: 'Test', emoji: '🎯', category: 'input', capabilities: ['test'] },
        input: {
          config: {
            formFields: [
              { label: 'Original Label', type: 'text' }
            ]
          }
        }
      });
      
      const result = DirectiveValidator.validateTargetPath(sampleDirective, targetNode);
      
      expect(result.isValid).toBe(true);
      expect(result.pathAnalysis.exists).toBe(true);
    });

    test('should validate payload compatibility with operations', () => {
      // Test merge operation with object payload
      const mergeDirective = {
        ...sampleDirective,
        target: { ...sampleDirective.target, operation: 'merge' },
        payload: { newField: 'value' }
      };
      
      let result = DirectiveValidator.validatePayloadCompatibility(mergeDirective);
      expect(result.isValid).toBe(true);
      
      // Test merge operation with non-object payload (should fail)
      mergeDirective.payload = 'string';
      result = DirectiveValidator.validatePayloadCompatibility(mergeDirective);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MERGE_REQUIRES_OBJECT');
    });
  });

  // ===========================
  // CROSS-NODE VALIDATOR TESTS
  // ===========================

  describe('Cross-Node Validator', () => {
    let sampleNodes;
    let sampleEdges;

    beforeEach(() => {
      sampleNodes = [
        {
          id: 'input-1',
          data: InputNodeData.create({
            meta: {
              label: 'Form Input',
              function: 'User Input',
              emoji: '📝',
              category: 'input',
              capabilities: ['form-collection', 'user-input']
            }
          })
        },
        {
          id: 'process-1', 
          data: ProcessNodeData.create({
            meta: {
              label: 'LLM Processor',
              function: 'Text Processing',
              emoji: '🤖',
              category: 'process',
              capabilities: ['data-processing', 'llm-processing']
            },
            plugin: {
              name: 'llmProcessor',
              version: '1.0.0',
              config: {}
            }
          })
        },
        {
          id: 'output-1',
          data: OutputNodeData.create({
            meta: {
              label: 'Markdown Display',
              function: 'Content Display',
              emoji: '📄',
              category: 'output',
              capabilities: ['data-display', 'markdown-rendering']
            }
          })
        }
      ];

      sampleEdges = [
        {
          id: 'edge-1',
          source: 'input-1',
          target: 'process-1',
          sourceHandle: 'default',
          targetHandle: 'default'
        },
        {
          id: 'edge-2', 
          source: 'process-1',
          target: 'output-1',
          sourceHandle: 'default',
          targetHandle: 'default'
        }
      ];
    });

    test('should validate workflow integrity', () => {
      const result = CrossNodeValidator.validateWorkflowIntegrity(sampleNodes, sampleEdges);
      
      expect(result.isValid).toBe(true);
      expect(result.summary.totalNodes).toBe(3);
      expect(result.summary.validNodes).toBe(3);
      expect(result.summary.totalEdges).toBe(2);
      expect(result.nodeValidations).toHaveLength(3);
    });

    test('should validate individual node integrity', () => {
      const node = sampleNodes[0];
      const result = CrossNodeValidator.validateNodeIntegrity(node, sampleNodes, sampleEdges);
      
      expect(result.isValid).toBe(true);
      expect(result.connectionAnalysis).toBeDefined();
      expect(result.connectionAnalysis.inputEdges).toBe(0); // Input node has no input edges
      expect(result.connectionAnalysis.outputEdges).toBe(1);
    });

    test('should validate node type requirements', () => {
      // Test input node requirements
      const inputNode = sampleNodes[0];
      const result = CrossNodeValidator.validateNodeTypeRequirements(inputNode, sampleNodes);
      
      expect(result.isValid).toBe(true);
      
      // Test process node requirements
      const processNode = sampleNodes[1];
      const processResult = CrossNodeValidator.validateNodeTypeRequirements(processNode, sampleNodes);
      
      expect(processResult.isValid).toBe(true);
    });

    test('should detect circular dependencies', () => {
      // Add circular edge
      const circularEdges = [
        ...sampleEdges,
        {
          id: 'edge-3',
          source: 'output-1',
          target: 'input-1',
          sourceHandle: 'default',
          targetHandle: 'default'
        }
      ];
      
      const cycles = CrossNodeValidator.detectCircularDependencies(sampleNodes, circularEdges);
      expect(cycles.length).toBeGreaterThan(0);
    });

    test('should find orphaned nodes', () => {
      // Add orphaned node
      const nodesWithOrphan = [
        ...sampleNodes,
        {
          id: 'orphan-1',
          data: InputNodeData.create({
            meta: {
              label: 'Orphaned Node',
              function: 'Isolated',
              emoji: '🏝️',
              category: 'input',
              capabilities: ['user-input']
            }
          })
        }
      ];
      
      const orphans = CrossNodeValidator.findOrphanedNodes(nodesWithOrphan, sampleEdges);
      expect(orphans).toContain('orphan-1');
    });

    test('should validate workflow structure', () => {
      const result = CrossNodeValidator.validateWorkflowStructure(sampleNodes, sampleEdges);
      
      expect(result.isValid).toBe(true);
      expect(result.metrics.inputNodes).toBe(1);
      expect(result.metrics.processNodes).toBe(1);
      expect(result.metrics.outputNodes).toBe(1);
      expect(result.metrics.totalConnections).toBe(2);
    });

    test('should validate data flow consistency', () => {
      const result = CrossNodeValidator.validateDataFlowConsistency(sampleNodes, sampleEdges);
      
      expect(result.isValid).toBe(true);
      expect(result.flowAnalysis.totalFlows).toBe(2);
    });
  });

  // ===========================
  // COMPREHENSIVE VALIDATION SYSTEM TESTS
  // ===========================

  describe('Comprehensive Validation System', () => {
    test('should validate node data with all validation layers', () => {
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Test Input Node',
          function: 'Form Collection',
          emoji: '📝',
          category: 'input',
          capabilities: ['form-collection', 'user-input']
        },
        input: {
          connections: {
            'conn1': {
              sourceNodeId: 'source1',
              data: { test: 'data' }
            }
          },
          config: {
            formFields: [
              { label: 'Test Field', type: 'text' }
            ]
          }
        }
      });
      
      const result = validationSystem.validateNodeData(nodeData);
      
      expect(result.isValid).toBe(true);
      expect(result.results.basic).toBeDefined();
      expect(result.results.schema).toBeDefined();
      expect(result.summary.validationLayers).toBeGreaterThan(0);
    });

    test('should validate node data with multiple connections', () => {
      const nodeData = ProcessNodeData.create({
        meta: {
          label: 'Multi-Input Processor',
          function: 'Data Aggregation',
          emoji: '🔄',
          category: 'process',
          capabilities: ['data-processing', 'multi-input']
        },
        input: {
          connections: {
            'conn1': { sourceNodeId: 'source1', data: 'data1' },
            'conn2': { sourceNodeId: 'source2', data: 'data2' }
          },
          processed: { strategy: 'merge' }
        },
        plugin: {
          name: 'dataProcessor',
          version: '1.0.0',
          config: {}
        }
      });
      
      const result = validationSystem.validateNodeData(nodeData);
      
      expect(result.results.multiConnection).toBeDefined();
      expect(result.summary.hasMultipleConnections).toBe(true);
    });

    test('should validate node data with directives', () => {
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Directive Generator',
          function: 'Form with Directives',
          emoji: '📝',
          category: 'input',
          capabilities: ['form-collection', 'directive-generation']
        },
        output: {
          data: { formData: {} },
          meta: { timestamp: new Date().toISOString(), status: 'idle' },
          directives: {
            'target-node-1': [
              {
                type: 'update-config',
                target: {
                  section: 'input',
                  path: 'config.label',
                  operation: 'set'
                },
                payload: 'Updated Label',
                processing: {
                  immediate: true,
                  priority: 5
                },
                meta: {
                  source: 'test',
                  timestamp: new Date().toISOString(),
                  version: '2.0.0'
                }
              }
            ]
          }
        }
      });
      
      const result = validationSystem.validateNodeData(nodeData);
      
      expect(result.results.directives).toBeDefined();
      expect(result.summary.hasDirectives).toBe(true);
    });

    test('should validate complete workflow', () => {
      const nodes = [
        {
          id: 'input-1',
          data: InputNodeData.create({
            meta: {
              label: 'Input',
              function: 'Data Entry',
              emoji: '📝',
              category: 'input',
              capabilities: ['form-collection', 'user-input']
            }
          })
        }
      ];
      
      const edges = [];
      
      const result = validationSystem.validateWorkflow(nodes, edges);
      
      expect(result.isValid).toBe(true);
      expect(result.summary.totalNodes).toBe(1);
      expect(result.summary.validNodes).toBe(1);
      expect(result.nodeValidations).toHaveLength(1);
    });
  });

  // ===========================
  // INTEGRATION TESTS
  // ===========================

  describe('Integration with Existing Validation', () => {
    test('should be compatible with existing nodeDataValidation', () => {
      expect(enhancedValidation).toBeInstanceOf(ComprehensiveValidationSystem);
      expect(typeof enhancedValidation.validateNodeData).toBe('function');
      expect(typeof enhancedValidation.validateWorkflow).toBe('function');
    });

    test('should provide enhanced validation results structure', () => {
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Test Node',
          function: 'Test',
          emoji: '🧪',
          category: 'input',
          capabilities: ['user-input']
        }
      });
      
      const result = enhancedValidation.validateNodeData(nodeData);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
    });
  });

  // ===========================
  // ERROR HANDLING TESTS  
  // ===========================

  describe('Error Handling', () => {
    test('should handle null/undefined inputs gracefully', () => {
      expect(() => MultiConnectionValidator.validateConnectionLimits(null, null)).not.toThrow();
      expect(() => DirectiveValidator.validateDirectiveStructure(null)).not.toThrow();
      expect(() => CrossNodeValidator.validateWorkflowIntegrity([], [])).not.toThrow();
    });

    test('should provide detailed error information', () => {
      const result = MultiConnectionValidator.validateConnectionLimits(null, null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should categorize errors and warnings appropriately', () => {
      const invalidDirective = {
        type: 'invalid-type',
        target: null,
        payload: null
      };
      
      const result = DirectiveValidator.validateDirectiveStructure(invalidDirective);
      
      expect(result.errors.some(e => e.code === 'INVALID_DIRECTIVE_TYPE')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_DIRECTIVE_FIELD')).toBe(true);
    });
  });
});