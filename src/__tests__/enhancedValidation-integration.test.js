/**
 * Enhanced Validation System Integration Tests
 * Tests integration with existing components and services
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  enhancedValidation,
  MultiConnectionValidator,
  DirectiveValidator,
  CrossNodeValidator
} from '../types/enhancedValidation.js';
import { NodeDataManager } from '../services/nodeDataManager.js';
import { InputNodeData, ProcessNodeData, OutputNodeData } from '../types/nodeSchema.js';
import { validateNodeData } from '../types/nodeDataValidation.js';

describe('Enhanced Validation System Integration', () => {
  let nodeDataManager;

  beforeEach(() => {
    nodeDataManager = new NodeDataManager();
  });

  // ===========================
  // NODEDATAMANAGER INTEGRATION
  // ===========================

  describe('NodeDataManager Integration', () => {
    test('should integrate enhanced validation with node registration', async () => {
      const nodeId = 'test-node-1';
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Enhanced Form Input',
          function: 'Advanced Form Collection',
          emoji: '📝',
          category: 'input',
          capabilities: ['form-collection', 'user-input', 'validation'],
          version: '2.0.0'
        },
        input: {
          config: {
            allowMultipleConnections: true,
            formFields: [
              { label: 'Username', type: 'text', required: true },
              { label: 'Email', type: 'email', required: true }
            ]
          }
        }
      });

      // Register node with enhanced validation
      await nodeDataManager.registerNode(nodeId, nodeData);
      
      // Verify node is registered and validated
      const registeredData = nodeDataManager.getNodeData(nodeId);
      expect(registeredData).toBeDefined();
      
      // Run enhanced validation on registered node
      const validationResult = enhancedValidation.validateNodeData(registeredData);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.results.basic.success).toBe(true);
      expect(validationResult.results.schema.isValid).toBe(true);
    });

    test('should validate multi-connection scenarios in nodeDataManager', async () => {
      const sourceNodeId = 'source-node';
      const targetNodeId = 'target-node';

      // Create source node
      const sourceNode = OutputNodeData.create({
        meta: {
          label: 'Data Source',
          function: 'Data Provider',
          emoji: '📊',
          category: 'output',
          capabilities: ['data-display']
        }
      });

      // Create target node that accepts multiple connections
      const targetNode = ProcessNodeData.create({
        meta: {
          label: 'Multi-Input Processor',
          function: 'Data Aggregation',
          emoji: '🔄',
          category: 'process',
          capabilities: ['data-processing', 'multi-input']
        },
        input: {
          config: {
            allowMultipleConnections: true,
            aggregationStrategy: 'merge'
          },
          processed: {
            strategy: 'merge'
          }
        },
        plugin: {
          name: 'dataProcessor',
          version: '1.0.0',
          config: {}
        }
      });

      // Register both nodes
      await nodeDataManager.registerNode(sourceNodeId, sourceNode);
      await nodeDataManager.registerNode(targetNodeId, targetNode);

      // Add connection
      await nodeDataManager.addConnection(sourceNodeId, targetNodeId, {
        data: { test: 'data1' },
        sourceHandle: 'default',
        targetHandle: 'default'
      });

      // Get updated target node data
      const updatedTargetData = nodeDataManager.getNodeData(targetNodeId);
      
      // Validate multi-connection setup
      const connectionValidation = MultiConnectionValidator.validateMultiConnectionSetup(updatedTargetData);
      expect(connectionValidation.isValid).toBe(true);
      expect(connectionValidation.metrics.connectionCount).toBe(1);
    });

    test('should handle directive processing with enhanced validation', async () => {
      const sourceNodeId = 'directive-source';
      const targetNodeId = 'directive-target';

      // Create source node with directives
      const sourceNode = InputNodeData.create({
        meta: {
          label: 'Directive Generator',
          function: 'Configuration Controller',
          emoji: '🎛️',
          category: 'input',
          capabilities: ['form-collection', 'directive-generation']
        },
        output: {
          data: { formData: { setting: 'value' } },
          meta: { timestamp: new Date().toISOString(), status: 'success' },
          directives: {
            [targetNodeId]: [
              {
                type: 'update-config',
                target: {
                  section: 'input',
                  path: 'config.label',
                  operation: 'set'
                },
                payload: 'Dynamic Label Update',
                processing: {
                  immediate: true,
                  priority: 8
                },
                meta: {
                  source: sourceNodeId,
                  timestamp: new Date().toISOString(),
                  version: '2.0.0'
                }
              }
            ]
          }
        }
      });

      // Create target node
      const targetNode = ProcessNodeData.create({
        meta: {
          label: 'Configurable Processor',
          function: 'Dynamic Processing',
          emoji: '⚙️',
          category: 'process',
          capabilities: ['data-processing']
        },
        input: {
          config: {
            label: 'Original Label'
          }
        },
        plugin: {
          name: 'configurableProcessor',
          version: '1.0.0',
          config: {}
        }
      });

      // Register nodes
      await nodeDataManager.registerNode(sourceNodeId, sourceNode);
      await nodeDataManager.registerNode(targetNodeId, targetNode);

      // Validate directives
      const sourceData = nodeDataManager.getNodeData(sourceNodeId);
      const directiveValidation = enhancedValidation.validateNodeData(sourceData);
      
      expect(directiveValidation.isValid).toBe(true);
      expect(directiveValidation.results.directives.isValid).toBe(true);
      expect(directiveValidation.summary.hasDirectives).toBe(true);

      // Validate individual directives
      const directives = sourceData.output.directives[targetNodeId];
      for (const directive of directives) {
        const directiveResult = DirectiveValidator.validateDirectiveStructure(directive);
        expect(directiveResult.isValid).toBe(true);
      }
    });
  });

  // ===========================
  // WORKFLOW VALIDATION INTEGRATION
  // ===========================

  describe('Workflow Validation Integration', () => {
    test('should validate complete workflow with enhanced validation', () => {
      // Create a complete workflow
      const nodes = [
        {
          id: 'form-input',
          type: 'templateFormNode',
          position: { x: 100, y: 100 },
          data: InputNodeData.create({
            meta: {
              label: 'User Registration Form',
              function: 'Collect User Data',
              emoji: '📝',
              category: 'input',
              capabilities: ['form-collection', 'user-input', 'validation']
            },
            input: {
              config: {
                formFields: [
                  { label: 'Name', type: 'text', required: true },
                  { label: 'Email', type: 'email', required: true },
                  { label: 'Age', type: 'number', required: false }
                ]
              }
            }
          })
        },
        {
          id: 'data-processor',
          type: 'ProcessNew',
          position: { x: 400, y: 100 },
          data: ProcessNodeData.create({
            meta: {
              label: 'Data Validator & Transformer',
              function: 'Process User Data',
              emoji: '🔄',
              category: 'process',
              capabilities: ['data-processing', 'transformation', 'validation']
            },
            input: {
              config: {
                aggregationStrategy: 'merge'
              },
              processed: {
                strategy: 'merge'
              }
            },
            plugin: {
              name: 'dataProcessor',
              version: '2.0.0',
              config: {
                validationRules: ['email-format', 'age-range'],
                transformations: ['normalize-email', 'capitalize-name']
              }
            }
          })
        },
        {
          id: 'output-display',
          type: 'MarkdownNew',
          position: { x: 700, y: 100 },
          data: OutputNodeData.create({
            meta: {
              label: 'Registration Confirmation',
              function: 'Display Results',
              emoji: '✅',
              category: 'output',
              capabilities: ['data-display', 'markdown-rendering']
            }
          })
        }
      ];

      const edges = [
        {
          id: 'edge-1',
          source: 'form-input',
          target: 'data-processor',
          sourceHandle: 'default',
          targetHandle: 'default'
        },
        {
          id: 'edge-2',
          source: 'data-processor', 
          target: 'output-display',
          sourceHandle: 'default',
          targetHandle: 'default'
        }
      ];

      // Validate complete workflow
      const workflowValidation = enhancedValidation.validateWorkflow(nodes, edges);
      
      expect(workflowValidation.isValid).toBe(true);
      expect(workflowValidation.summary.totalNodes).toBe(3);
      expect(workflowValidation.summary.validNodes).toBe(3);
      expect(workflowValidation.summary.totalEdges).toBe(2);
      
      // Verify each node category is represented
      expect(workflowValidation.workflowValidation.structureValidation.metrics.inputNodes).toBe(1);
      expect(workflowValidation.workflowValidation.structureValidation.metrics.processNodes).toBe(1);
      expect(workflowValidation.workflowValidation.structureValidation.metrics.outputNodes).toBe(1);
    });

    test('should detect and report workflow issues', () => {
      // Create problematic workflow
      const nodes = [
        {
          id: 'isolated-input',
          data: InputNodeData.create({
            meta: {
              label: 'Isolated Input',
              function: 'Orphaned Input',
              emoji: '🏝️',
              category: 'input',
              capabilities: ['form-collection']
            }
          })
        },
        {
          id: 'process-missing-plugin',
          data: ProcessNodeData.create({
            meta: {
              label: 'Broken Processor',
              function: 'Invalid Processing',
              emoji: '💥',
              category: 'process',
              capabilities: ['data-processing']
            },
            // Missing required plugin
            plugin: null
          })
        }
      ];

      const edges = []; // No edges - creates orphaned nodes

      const workflowValidation = enhancedValidation.validateWorkflow(nodes, edges);
      
      expect(workflowValidation.isValid).toBe(false);
      expect(workflowValidation.errors.length).toBeGreaterThan(0);
      expect(workflowValidation.warnings.length).toBeGreaterThan(0);
      
      // Should detect orphaned nodes
      expect(workflowValidation.warnings.some(w => w.code === 'ORPHANED_NODES')).toBe(true);
      
      // Should detect missing plugin
      expect(workflowValidation.errors.some(e => e.code === 'PROCESS_NODE_REQUIRES_PLUGIN')).toBe(true);
    });
  });

  // ===========================
  // BACKWARD COMPATIBILITY
  // ===========================

  describe('Backward Compatibility', () => {
    test('should work alongside existing validation system', () => {
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Compatibility Test',
          function: 'Legacy Support',
          emoji: '🔄',
          category: 'input',
          capabilities: ['form-collection']
        }
      });

      // Test original validation still works
      const originalValidation = validateNodeData(nodeData);
      expect(originalValidation.success).toBe(true);

      // Test enhanced validation also works
      const enhancedValidationResult = enhancedValidation.validateNodeData(nodeData);
      expect(enhancedValidationResult.isValid).toBe(true);

      // Both should be compatible
      expect(originalValidation.success).toBe(enhancedValidationResult.isValid);
    });

    test('should provide more detailed validation results than original', () => {
      const nodeData = InputNodeData.create({
        meta: {
          label: 'Detailed Test',
          function: 'Enhanced Validation',
          emoji: '🔍',
          category: 'input',
          capabilities: ['form-collection', 'user-input']
        },
        input: {
          connections: {
            'conn1': { sourceNodeId: 'source1', data: 'data1' },
            'conn2': { sourceNodeId: 'source2', data: 'data2' }
          },
          processed: { strategy: 'merge' }
        }
      });

      const originalValidation = validateNodeData(nodeData);
      const enhancedValidationResult = enhancedValidation.validateNodeData(nodeData);

      // Enhanced validation should provide more information
      expect(enhancedValidationResult.results).toBeDefined();
      expect(enhancedValidationResult.summary).toBeDefined();
      expect(enhancedValidationResult.results.multiConnection).toBeDefined();
      
      // Should have additional validation layers
      expect(enhancedValidationResult.summary.validationLayers).toBeGreaterThan(1);
      expect(enhancedValidationResult.summary.hasMultipleConnections).toBe(true);
    });
  });

  // ===========================
  // PERFORMANCE INTEGRATION
  // ===========================

  describe('Performance Integration', () => {
    test('should handle large workflows efficiently', () => {
      // Create a large workflow for performance testing
      const nodes = [];
      const edges = [];
      const nodeCount = 50;

      // Create nodes
      for (let i = 0; i < nodeCount; i++) {
        const nodeType = i % 3 === 0 ? 'input' : i % 3 === 1 ? 'process' : 'output';
        
        let nodeData;
        if (nodeType === 'input') {
          nodeData = InputNodeData.create({
            meta: {
              label: `Input Node ${i}`,
              function: 'Data Collection',
              emoji: '📝',
              category: 'input',
              capabilities: ['form-collection']
            }
          });
        } else if (nodeType === 'process') {
          nodeData = ProcessNodeData.create({
            meta: {
              label: `Process Node ${i}`,
              function: 'Data Processing',
              emoji: '⚙️',
              category: 'process',
              capabilities: ['data-processing']
            },
            plugin: {
              name: 'processor',
              version: '1.0.0',
              config: {}
            }
          });
        } else {
          nodeData = OutputNodeData.create({
            meta: {
              label: `Output Node ${i}`,
              function: 'Data Display',
              emoji: '📄',
              category: 'output',
              capabilities: ['data-display']
            }
          });
        }

        nodes.push({
          id: `node-${i}`,
          data: nodeData
        });

        // Create edges between consecutive nodes
        if (i > 0) {
          edges.push({
            id: `edge-${i}`,
            source: `node-${i - 1}`,
            target: `node-${i}`
          });
        }
      }

      const startTime = Date.now();
      const workflowValidation = enhancedValidation.validateWorkflow(nodes, edges);
      const endTime = Date.now();
      const validationTime = endTime - startTime;

      // Validation should complete in reasonable time (less than 1 second)
      expect(validationTime).toBeLessThan(1000);
      
      expect(workflowValidation.isValid).toBe(true);
      expect(workflowValidation.summary.totalNodes).toBe(nodeCount);
      expect(workflowValidation.summary.totalEdges).toBe(nodeCount - 1);
    });
  });

  // ===========================
  // ERROR RECOVERY INTEGRATION
  // ===========================

  describe('Error Recovery Integration', () => {
    test('should provide actionable error messages for node fixes', () => {
      const invalidNodeData = {
        meta: {
          // Missing required fields
          label: '',
          function: '',
          emoji: '',
          category: 'invalid-category',
          capabilities: []
        },
        input: {
          // Invalid structure
          connections: 'not-an-object',
          config: null
        },
        output: {
          data: {},
          meta: {
            timestamp: 'invalid-date',
            status: 'invalid-status'
          }
        },
        error: {
          hasError: 'not-boolean',
          errors: 'not-array'
        }
      };

      const validation = enhancedValidation.validateNodeData(invalidNodeData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // Errors should have helpful information
      validation.errors.forEach(error => {
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.path || error.source).toBeDefined();
      });
    });

    test('should provide suggestions for workflow improvements', () => {
      // Create suboptimal workflow
      const nodes = [
        {
          id: 'single-node',
          data: ProcessNodeData.create({
            meta: {
              label: 'Lonely Processor',
              function: 'Isolated Processing',
              emoji: '🏝️',
              category: 'process',
              capabilities: ['data-processing']
            },
            plugin: {
              name: 'processor',
              version: '1.0.0',
              config: {}
            }
          })
        }
      ];

      const validation = enhancedValidation.validateWorkflow(nodes, []);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => 
        w.code === 'NO_INPUT_NODES' || w.code === 'NO_OUTPUT_NODES'
      )).toBe(true);
    });
  });
});