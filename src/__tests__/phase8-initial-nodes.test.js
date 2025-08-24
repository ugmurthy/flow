/**
 * Phase 8 Initial Nodes Test Suite
 * Comprehensive testing for enhanced initial nodes with Phase 8 schema compliance
 * Version 2.0.0
 */

import { describe, test, expect, vi } from 'vitest';
import {
  createEnhancedFormNode,
  createEnhancedAdvancedFormNode,
  createEnhancedPromptInputNode,
  createEnhancedLLMProcessNode,
  createEnhancedAPIFetchNode,
  createEnhancedMarkdownDisplayNode,
  createEnhancedTemplateFormNode,
  initialNodes,
  initialEdges,
  nodeFactories,
  ENHANCED_NODE_CATEGORIES,
  ENHANCED_WORKFLOW_TEMPLATES
} from '../config/initialNodes.js';
import {
  ProcessedDataCollection,
  DataDirective,
  NodeVisualState,
  HandleConfiguration,
  SchemaValidator
} from '../types/nodeSchema.js';

describe('Phase 8 Enhanced Initial Nodes', () => {
  describe('Enhanced Form Node', () => {
    test('should create enhanced form node with full schema compliance', () => {
      const node = createEnhancedFormNode();
      
      expect(node.id).toBe('enhanced-form-node');
      expect(node.data.meta.version).toBe('2.0.0');
      expect(node.data.meta.capabilities).toContain('directive-generation');
      expect(node.data.input.processed).toBeDefined();
      expect(node.data.output.directives).toBeDefined();
      expect(node.data.styling.states).toBeDefined();
      expect(node.data.styling.handles).toBeDefined();
      
      // Validate node data structure
      const validation = SchemaValidator.validateNodeData(node.data);
      expect(validation.isValid).toBe(true);
    });

    test('should have enhanced styling states', () => {
      const node = createEnhancedFormNode();
      const states = node.data.styling.states;
      
      expect(states.default).toBeDefined();
      expect(states.filled).toBeDefined();
      expect(states.invalid).toBeDefined();
      expect(states.submitting).toBeDefined();
      expect(states.success).toBeDefined();
      
      // Check visual state structure
      expect(states.filled.container.backgroundColor).toBe('#f0f9ff');
      expect(states.invalid.effects.shake).toBe(true);
    });

    test('should have multi-connection handle configuration', () => {
      const node = createEnhancedFormNode();
      const handles = node.data.styling.handles;
      
      expect(handles.output).toBeDefined();
      expect(Array.isArray(handles.output)).toBe(true);
      expect(handles.output.length).toBeGreaterThan(1);
      
      const formDataHandle = handles.output.find(h => h.id === 'form-data-out');
      expect(formDataHandle.behavior.allowMultipleConnections).toBe(true);
    });

    test('should generate data directives', () => {
      const node = createEnhancedFormNode();
      const directives = node.data.output.directives;
      
      expect(directives).toBeDefined();
      expect(directives['validation-target']).toBeDefined();
      expect(Array.isArray(directives['validation-target'])).toBe(true);
      
      const directive = directives['validation-target'][0];
      expect(directive.type).toBe('update-config');
      expect(directive.target.section).toBe('styling');
      expect(directive.processing.immediate).toBe(true);
    });
  });

  describe('Enhanced Advanced Form Node', () => {
    test('should create advanced form with file handling capabilities', () => {
      const node = createEnhancedAdvancedFormNode();
      
      expect(node.id).toBe('enhanced-advanced-form');
      expect(node.data.meta.capabilities).toContain('file-upload');
      expect(node.data.meta.capabilities).toContain('multi-media');
      expect(node.data.input.config.fileProcessing).toBeDefined();
      expect(node.data.output.data.fileMetadata).toBeDefined();
      expect(node.data.output.data.complianceStatus).toBeDefined();
    });

    test('should have file validation configuration', () => {
      const node = createEnhancedAdvancedFormNode();
      const validation = node.data.input.validation;
      
      expect(validation.mode).toBe('real-time');
      expect(validation.rules).toContain('file-validation');
      expect(validation.rules).toContain('compliance-check');
      expect(validation.fileValidation.enabled).toBe(true);
    });

    test('should have specialized file output handles', () => {
      const node = createEnhancedAdvancedFormNode();
      const handles = node.data.styling.handles.output;
      
      const filesHandle = handles.find(h => h.id === 'files-out');
      expect(filesHandle).toBeDefined();
      expect(filesHandle.label).toBe('Files Only');
      expect(filesHandle.behavior.validationRules).toContain('file-data');
    });
  });

  describe('Node Factory Functions', () => {
    test('should provide all enhanced factory functions', () => {
      expect(typeof nodeFactories.enhancedFormNode).toBe('function');
      expect(typeof nodeFactories.enhancedAdvancedFormNode).toBe('function');
      expect(typeof nodeFactories.enhancedPromptInputNode).toBe('function');
      expect(typeof nodeFactories.enhancedLLMProcessNode).toBe('function');
      expect(typeof nodeFactories.enhancedAPIFetchNode).toBe('function');
      expect(typeof nodeFactories.enhancedMarkdownDisplayNode).toBe('function');
      expect(typeof nodeFactories.enhancedTemplateFormNode).toBe('function');
    });

    test('should provide backward compatibility', () => {
      expect(nodeFactories.formNode).toBe(nodeFactories.enhancedFormNode);
      expect(nodeFactories.advancedFormNode).toBe(nodeFactories.enhancedAdvancedFormNode);
      expect(nodeFactories.promptInputNode).toBe(nodeFactories.enhancedPromptInputNode);
    });
  });

  describe('Initial Nodes Array', () => {
    test('should contain all enhanced nodes', () => {
      expect(Array.isArray(initialNodes)).toBe(true);
      expect(initialNodes.length).toBe(7);
      
      // Verify each node has enhanced schema compliance
      initialNodes.forEach(node => {
        expect(node.data.meta.version).toBe('2.0.0');
        expect(node.data.styling).toBeDefined();
        expect(node.data.input.processed).toBeDefined();
        
        const validation = SchemaValidator.validateNodeData(node.data);
        expect(validation.isValid).toBe(true);
      });
    });

    test('should have unique node IDs', () => {
      const ids = initialNodes.map(node => node.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('Enhanced Edges Configuration', () => {
    test('should provide multi-connection examples', () => {
      expect(Array.isArray(initialEdges)).toBe(true);
      expect(initialEdges.length).toBeGreaterThan(0);
      
      initialEdges.forEach(edge => {
        expect(edge.data).toBeDefined();
        expect(edge.data.connectionType).toBeDefined();
        expect(edge.data.priority).toBeDefined();
        expect(edge.data.validation).toBeDefined();
      });
    });

    test('should demonstrate directive-based connections', () => {
      const directiveEdge = initialEdges.find(edge => 
        edge.data.connectionType === 'context-injection'
      );
      expect(directiveEdge).toBeDefined();
      expect(directiveEdge.data.priority).toBe(8);
    });
  });

  describe('Enhanced Node Categories', () => {
    test('should organize nodes by enhanced categories', () => {
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_INPUT).toBeDefined();
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_PROCESS).toBeDefined();
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_OUTPUT).toBeDefined();
      
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_INPUT.nodes.length).toBe(4);
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_PROCESS.nodes.length).toBe(2);
      expect(ENHANCED_NODE_CATEGORIES.ENHANCED_OUTPUT.nodes.length).toBe(1);
    });

    test('should have descriptive category information', () => {
      const inputCategory = ENHANCED_NODE_CATEGORIES.ENHANCED_INPUT;
      expect(inputCategory.label).toBe('Enhanced Input Nodes');
      expect(inputCategory.description).toContain('multi-connection support');
      expect(inputCategory.description).toContain('directive generation');
    });
  });

  describe('Workflow Templates', () => {
    test('should provide pre-configured workflow templates', () => {
      expect(ENHANCED_WORKFLOW_TEMPLATES.AI_PROCESSING_PIPELINE).toBeDefined();
      expect(ENHANCED_WORKFLOW_TEMPLATES.MULTI_SOURCE_AGGREGATION).toBeDefined();
    });

    test('should have complete workflow configuration', () => {
      const aiWorkflow = ENHANCED_WORKFLOW_TEMPLATES.AI_PROCESSING_PIPELINE;
      expect(aiWorkflow.name).toBeDefined();
      expect(aiWorkflow.description).toBeDefined();
      expect(Array.isArray(aiWorkflow.nodes)).toBe(true);
      expect(Array.isArray(aiWorkflow.connections)).toBe(true);
      
      expect(aiWorkflow.nodes.length).toBe(4);
      expect(aiWorkflow.connections.length).toBe(3);
    });
  });

  describe('Schema Compliance Validation', () => {
    test('should validate all nodes against Phase 8 schema requirements', () => {
      initialNodes.forEach((node, index) => {
        const validation = SchemaValidator.validateNodeData(node.data);
        expect(validation.isValid).toBe(true);
        
        if (!validation.isValid) {
          console.error(`Node ${index} validation errors:`, validation.errors);
        }
      });
    });

    test('should have ProcessedDataCollection in all input configurations', () => {
      initialNodes.forEach(node => {
        expect(node.data.input.processed).toBeDefined();
        expect(node.data.input.processed.strategy).toBeDefined();
        expect(node.data.input.processed.meta).toBeDefined();
      });
    });

    test('should have visual states for all nodes', () => {
      initialNodes.forEach(node => {
        expect(node.data.styling.states).toBeDefined();
        expect(node.data.styling.states.default).toBeDefined();
        
        // Verify at least 3 visual states per node
        const stateCount = Object.keys(node.data.styling.states).length;
        expect(stateCount).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Performance and Integration', () => {
    test('should create nodes efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        createEnhancedFormNode();
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should create 100 nodes in less than 100ms
      expect(executionTime).toBeLessThan(100);
    });

    test('should handle directive generation without errors', () => {
      expect(() => {
        initialNodes.forEach(node => {
          if (node.data.output.directives) {
            Object.values(node.data.output.directives).forEach(directiveList => {
              directiveList.forEach(directive => {
                const validation = DataDirective.validate(directive);
                expect(validation.isValid).toBe(true);
              });
            });
          }
        });
      }).not.toThrow();
    });
  });

  describe('Multi-connection Support', () => {
    test('should configure multi-connection capabilities properly', () => {
      const processNodes = initialNodes.filter(node => 
        node.data.meta.category === 'process'
      );
      
      processNodes.forEach(node => {
        expect(node.data.input.config.allowMultipleConnections).toBe(true);
        expect(node.data.input.config.connectionPolicy.maxConnections).toBeGreaterThan(1);
        expect(node.data.input.processed.strategy).toMatch(/merge|priority/);
      });
    });

    test('should have proper handle configurations for multi-connections', () => {
      initialNodes.forEach(node => {
        if (node.data.styling.handles) {
          const { input, output } = node.data.styling.handles;
          
          if (input) {
            input.forEach(handle => {
              expect(handle.behavior).toBeDefined();
              expect(handle.behavior.acceptedDataTypes).toBeDefined();
              expect(Array.isArray(handle.behavior.acceptedDataTypes)).toBe(true);
            });
          }
          
          if (output) {
            output.forEach(handle => {
              expect(handle.behavior).toBeDefined();
              expect(handle.behavior.acceptedDataTypes).toBeDefined();
              expect(Array.isArray(handle.behavior.acceptedDataTypes)).toBe(true);
            });
          }
        }
      });
    });
  });
});