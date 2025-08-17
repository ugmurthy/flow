
  
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateMeta,
  validateInput,
  validateOutput,
  validateError,
  validatePlugin,
  validateNodeData,
  validateNodeDataUpdates,
  safeValidateNodeData,
  validateNodeDataSections,
  validateInputNodeData,
  validateProcessNodeData,
  createValidationErrorMessage,
  createValidationSummary
} from '../types/nodeDataValidation.js'

// Test fixtures
import {
  validMetaData,
  validInputData,
  validOutputData,
  validErrorData,
  validPluginData,
  validCompleteNodeData,
  validUpdateData
} from './fixtures/validNodeData.js';

import {
  invalidMetaData,
  invalidInputData,
  invalidOutputData,
  invalidErrorData,
  invalidPluginData,
  invalidCompleteNodeData,
  invalidUpdateData,
  edgeCaseData
} from './fixtures/invalidNodeData.js';

// Test helpers
import {
  assertValidationSuccess,
  assertValidationFailure,
  assertCompleteValidationResult,
  assertSectionsValidationResult,
  assertErrorMessageFormat,
  assertValidationSummary,
  createTestCase,
  createBoundaryTestCases,
  deepClone,
  modifyObjectPath,
  createDataWithMissingFields,
  measureExecutionTime
} from './utils/testHelpers.js';

describe('ErrorSchema Data Validation Functions', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Mock console methods to capture validation warnings/errors
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });


  describe('validateError()', () => {
    describe('Positive Test Cases', () => {
      it('should validate error data with no errors', () => {
        const result = validateError(validErrorData.noErrors);
        assertValidationSuccess(result, 'error');
        expect(result.data.hasError).toBe(false);
        expect(result.data.errors).toHaveLength(0);
      });

      it('should validate error data with multiple errors', () => {
        const result = validateError(validErrorData.withErrors);
        assertValidationSuccess(result, 'error');
        expect(result.data.hasError).toBe(true);
        expect(result.data.errors).toHaveLength(2);
        
        // Validate error detail structure
        result.data.errors.forEach(error => {
          expect(error).toEqual(expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
            source: expect.any(String),
            timestamp: expect.any(String)
          }));
        });
      });

      it('should handle optional details field in error objects', () => {
        const result = validateError(validErrorData.withErrors);
        assertValidationSuccess(result, 'error');
        
        const errorWithDetails = result.data.errors.find(e => e.details);
        expect(errorWithDetails).toBeDefined();
        expect(errorWithDetails.details).toEqual(expect.objectContaining({
          field: 'email',
          received: 'invalid-email'
        }));
      });
    
      describe('validateNodeData() - Complete Node Validation', () => {
        describe('Positive Test Cases', () => {
          it('should validate complete input node data', () => {
            const result = validateNodeData(validCompleteNodeData.inputNode);
            assertCompleteValidationResult(result, true);
            expect(result.validSections).toEqual(['meta', 'input', 'output', 'error', 'plugin']);
            expect(result.failedSections).toHaveLength(0);
          });
    
          it('should validate complete process node data', () => {
            const result = validateNodeData(validCompleteNodeData.processNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('process');
            expect(result.data.plugin.name).toBe('llm-processor');
          });
    
          it('should validate complete output node data', () => {
            const result = validateNodeData(validCompleteNodeData.outputNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('output');
            expect(result.data.output.meta.status).toBe('success');
          });
    
          it('should provide detailed section validation results', () => {
            const result = validateNodeData(validCompleteNodeData.inputNode);
            assertCompleteValidationResult(result, true);
            
            expect(result.sectionsValidated).toEqual({
              meta: true,
              input: true,
              output: true,
              error: true,
              plugin: true
            });
          });
        });
    
        describe('Negative Test Cases', () => {
          it('should fail validation for non-object input', () => {
            const result = validateNodeData(invalidCompleteNodeData.notAnObject);
            //assertCompleteValidationResult(result, false);
            expect(result.failedSections).toContain('root');
            expect(result.errors[0].code).toBe('INVALID_NODE_DATA');
          });
    
          it('should fail validation for null input', () => {
            const result = validateNodeData(invalidCompleteNodeData.nullValue);
            //assertCompleteValidationResult(result, false);
            expect(result.errors[0].message).toBe('NodeData must be a valid object');
          });
    
          it('should fail validation for missing required sections', () => {
            const result = validateNodeData(invalidCompleteNodeData.missingMeta);
            assertCompleteValidationResult(result, false);
            expect(result.failedSections).toContain('meta');
            expect(result.errors.some(e => e.code === 'MISSING_META')).toBe(true);
          });
    
          it('should handle multiple section failures', () => {
            const result = validateNodeData(invalidCompleteNodeData.allInvalid);
            assertCompleteValidationResult(result, false);
            expect(result.failedSections.length).toBeGreaterThan(1);
            expect(result.errors.length).toBeGreaterThan(1);
          });
    
          it('should provide section-specific error information', () => {
            const result = validateNodeData(invalidCompleteNodeData.allInvalid);
            assertCompleteValidationResult(result, false);
            
            // Check that errors are properly attributed to sections
            const sections = [...new Set(result.errors.map(e => e.section))];
            expect(sections.length).toBeGreaterThan(1);
            expect(sections).toContain('meta');
            expect(sections).toContain('input');
          });
        });
    
        describe('Partial Validation Scenarios', () => {
          it('should handle mixed valid/invalid sections', () => {
            const mixedData = {
              meta: validMetaData.inputNode,
              input: validInputData.formNode,
              output: invalidOutputData.missingMeta,
              error: validErrorData.noErrors,
              plugin: validPluginData.null
            };
            
            const result = validateNodeData(mixedData);
            assertCompleteValidationResult(result, false);
            expect(result.validSections).toContain('meta');
            expect(result.validSections).toContain('input');
            expect(result.failedSections).toContain('output');
          });
    
          it('should validate plugin as optional section', () => {
            const dataWithoutPlugin = createDataWithMissingFields(
              validCompleteNodeData.inputNode,
              ['plugin']
            );
            
            const result = validateNodeData(dataWithoutPlugin);
            // Plugin validation should still succeed (returns null/undefined)
            expect(result.sectionsValidated.plugin).toBe(true);
          });
        });
      });
    
      describe('validateNodeDataSections() - Selective Validation', () => {
        describe('Positive Test Cases', () => {
          it('should validate only requested sections', () => {
            const sections = ['meta', 'input'];
            const result = validateNodeDataSections(
              validCompleteNodeData.inputNode,
              sections
            );
            
            assertSectionsValidationResult(result, sections, true);
            expect(Object.keys(result.sectionsValidated)).toEqual(sections);
            expect(result.data).toHaveProperty('meta');
            expect(result.data).toHaveProperty('input');
            expect(result.data).not.toHaveProperty('output');
          });
    
          it('should handle single section validation', () => {
            const sections = ['meta'];
            const result = validateNodeDataSections(
              validCompleteNodeData.processNode,
              sections
            );
            
            assertSectionsValidationResult(result, sections, true);
            expect(result.data.meta.category).toBe('process');
          });
    
          it('should validate all sections when no sections specified', () => {
            const result = validateNodeDataSections(validCompleteNodeData.outputNode);
            assertCompleteValidationResult(result, true);
            expect(result.requestedSections).toEqual(['meta', 'input', 'output', 'error', 'plugin']);
          });
        });
    
        describe('Negative Test Cases', () => {
          it('should fail for unknown sections', () => {
            const sections = ['meta', 'unknown-section'];
            const result = validateNodeDataSections(
              validCompleteNodeData.inputNode,
              sections
            );
            
            assertSectionsValidationResult(result, sections, false);
            expect(result.failedSections).toContain('unknown-section');
            expect(result.errors.some(e => e.code === 'UNKNOWN_SECTION')).toBe(true);
          });
    
          it('should handle missing required sections in selective validation', () => {
            const dataWithoutMeta = createDataWithMissingFields(
              validCompleteNodeData.inputNode,
              ['meta']
            );
            
            const result = validateNodeDataSections(dataWithoutMeta, ['meta', 'input']);
            assertSectionsValidationResult(result, ['meta', 'input'], false);
            expect(result.failedSections).toContain('meta');
            expect(result.errors.some(e => e.code === 'MISSING_META')).toBe(true);
          });
        });
      });
    
      describe('validateNodeDataUpdates() - Partial Updates', () => {
        describe('Positive Test Cases', () => {
          it('should validate partial meta updates', () => {
            const result = validateNodeDataUpdates(validUpdateData.metaOnly);
            expect(result.success).toBe(true);
            expect(result.data.meta.label).toBe('Updated Label');
            expect(result.errors).toHaveLength(0);
          });
    
          it('should validate partial output updates', () => {
            const result = validateNodeDataUpdates(validUpdateData.outputOnly);
            expect(result.success).toBe(true);
            expect(result.data.output.data.newResult).toBe('Updated result');
          });
    
          it('should validate multiple field updates', () => {
            const result = validateNodeDataUpdates(validUpdateData.multipleFields);
            expect(result.success).toBe(true);
            expect(result.data.meta.label).toBe('Multi Update');
            expect(result.data.output.data.status).toBe('updated');
          });
    
          it('should handle empty update objects', () => {
            const result = validateNodeDataUpdates({});
            expect(result.success).toBe(true);
            expect(result.data).toEqual({});
          });
        });
    
        describe('Negative Test Cases', () => {
          it.each([
            ['not an object', invalidUpdateData.notAnObject],
            ['invalid meta', invalidUpdateData.invalidMeta],
            ['invalid input', invalidUpdateData.invalidInput],
            ['invalid output', invalidUpdateData.invalidOutput],
            ['invalid error', invalidUpdateData.invalidError],
            ['invalid plugin', invalidUpdateData.invalidPlugin]
          ])('should fail validation for %s', (testName, invalidData) => {
            const result = validateNodeDataUpdates(invalidData);
            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
          });
        });
      });
    
      describe('safeValidateNodeData() - Safe Validation', () => {
        describe('Positive Test Cases', () => {
          it('should safely validate valid node data', () => {
            const result = safeValidateNodeData(validCompleteNodeData.inputNode);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(expect.any(Object));
            expect(result.errors).toHaveLength(0);
          });
    
          it('should not throw errors for invalid data', () => {
            expect(() => {
              const result = safeValidateNodeData(invalidCompleteNodeData.notAnObject);
              expect(result.success).toBe(false);
              expect(result.data).toBe(invalidCompleteNodeData.notAnObject); // Returns original data
              expect(result.errors.length).toBeGreaterThan(0);
            }).not.toThrow();
          });
    
          it('should handle null input safely', () => {
            const result = safeValidateNodeData(null);
            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
          });
        });
      });
    
      describe('validateInputNodeData() - Input Node Specific', () => {
        describe('Positive Test Cases', () => {
          it('should validate input node with formFields', () => {
            const result = validateInputNodeData(validCompleteNodeData.inputNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('input');
            expect(result.data.input.config.formFields).toBeDefined();
          });
    
          it('should validate non-input nodes without additional checks', () => {
            const result = validateInputNodeData(validCompleteNodeData.processNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('process');
          });
        });
    
        describe('Negative Test Cases', () => {
          it('should fail for input nodes missing formFields', () => {
            const inputNodeWithoutFormFields = modifyObjectPath(
              validCompleteNodeData.inputNode,
              'input.config.formFields',
              undefined
            );
            
            const result = validateInputNodeData(inputNodeWithoutFormFields);
            //assertCompleteValidationResult(result, false);
            expect(result.errors.some(e => e.code === 'MISSING_FORM_FIELDS')).toBe(true);
          });
    
          it('should fail base validation first', () => {
            const result = validateInputNodeData(invalidCompleteNodeData.missingMeta);
            assertCompleteValidationResult(result, false);
            // Should fail on base validation, not reach input-specific checks
          });
        });
      });
    
      describe('validateProcessNodeData() - Process Node Specific', () => {
        describe('Positive Test Cases', () => {
          it('should validate process node with aggregationStrategy', () => {
            const result = validateProcessNodeData(validCompleteNodeData.processNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('process');
            expect(result.data.input.config.aggregationStrategy).toBe('merge');
          });
    
          it('should validate non-process nodes without additional checks', () => {
            const result = validateProcessNodeData(validCompleteNodeData.inputNode);
            assertCompleteValidationResult(result, true);
            expect(result.data.meta.category).toBe('input');
          });
        });
    
        describe('Negative Test Cases', () => {
          it('should fail for process nodes missing aggregationStrategy', () => {
            const processNodeWithoutStrategy = modifyObjectPath(
              validCompleteNodeData.processNode,
              'input.config.aggregationStrategy',
              undefined
            );
            
            const result = validateProcessNodeData(processNodeWithoutStrategy);
           
            //  assertCompleteValidationResult(result, false);
            
            expect(result.errors.some(e => e.code === 'MISSING_AGGREGATION_STRATEGY')).toBe(true);
          });
        });
      });
    
      describe('createValidationErrorMessage() - Error Formatting', () => {
        describe('Positive Test Cases', () => {
          it('should return null for successful validation', () => {
            const successResult = validateMeta(validMetaData.inputNode);
            const errorMessage = createValidationErrorMessage(successResult);
            expect(errorMessage).toBeNull();
          });
    
          it('should format error messages with sections', () => {
            const failureResult = validateNodeData(invalidCompleteNodeData.allInvalid);
            const errorMessage = createValidationErrorMessage(failureResult, 'test context');
            
            assertErrorMessageFormat(errorMessage, 'test context');
            expect(errorMessage).toContain('Failed sections:');
            expect(errorMessage).toContain('META SECTION:');
          });
    
          it('should group errors by section', () => {
            const failureResult = validateNodeData(invalidCompleteNodeData.allInvalid);
            const errorMessage = createValidationErrorMessage(failureResult);
            
            // Should contain multiple section headers
            const sectionMatches = errorMessage.match(/\w+ SECTION:/g);
            expect(sectionMatches.length).toBeGreaterThan(1);
          });
    
          it('should include received values in error messages', () => {
            const invalidMeta = { label: 123, function: 'test', emoji: '📝', category: 'input' };
            const failureResult = validateMeta(invalidMeta);
            const errorMessage = createValidationErrorMessage(failureResult);
            
            expect(errorMessage).toContain('received:');
            expect(errorMessage).toContain('number');
            expect(errorMessage).toContain('label')
          });
        });
      });
    
      describe('createValidationSummary() - Summary Generation', () => {
        describe('Positive Test Cases', () => {
          it('should create summary for successful validation', () => {
            const successResult = validateNodeData(validCompleteNodeData.inputNode);
            const summary = createValidationSummary(successResult);
            
            assertValidationSummary(summary, 'success');
            expect(summary.message).toContain('successfully');
            expect(summary.totalSections).toBe(5);
          });
    
          it('should create summary for failed validation', () => {
            const failureResult = validateNodeData(invalidCompleteNodeData.allInvalid);
            const summary = createValidationSummary(failureResult);
            
            assertValidationSummary(summary, 'failed');
            expect(summary.message).toContain('failed validation');
            expect(summary.totalErrors).toBeGreaterThan(0);
            expect(summary.errorsBySection).toEqual(expect.any(Object));
          });
    
          it('should count errors by section correctly', () => {
            const failureResult = validateNodeData(invalidCompleteNodeData.allInvalid);
            const summary = createValidationSummary(failureResult);
            
            const totalErrorsFromSections = Object.values(summary.errorsBySection)
              .reduce((sum, count) => sum + count, 0);
            expect(totalErrorsFromSections).toBe(summary.totalErrors);
          });
        });
      });
    
      describe('Performance and Stress Tests', () => {
        it('should handle large datasets efficiently', async () => {
          const largeNodeData = {
            meta: validMetaData.inputNode,
            input: {
              connections: Object.fromEntries(
                Array.from({ length: 1000 }, (_, i) => [
                  `conn-${i}`,
                  {
                    sourceNodeId: `node-${i}`,
                    sourceHandle: 'default',
                    targetHandle: 'default',
                    data: { index: i },
                    meta: {
                      timestamp: '2024-01-01T00:00:00.000Z',
                      dataType: 'object',
                      isActive: true
                    }
                  }
                ])
              ),
              processed: {},
              config: {}
            },
            output: validOutputData.success,
            error: validErrorData.noErrors,
            plugin: validPluginData.null
          };
    
          const { result, executionTime } = await measureExecutionTime(() =>
            validateNodeData(largeNodeData)
          );
    
          assertCompleteValidationResult(result, true);
          expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
          expect(Object.keys(result.data.input.connections)).toHaveLength(1000);
        });
    
        it('should handle deeply nested structures', () => {
          const deeplyNestedData = {
            meta: validMetaData.inputNode,
            input: edgeCaseData.deeplyNestedObjects.input,
            output: validOutputData.idle,
            error: validErrorData.noErrors,
            plugin: validPluginData.null
          };
    
          const result = validateNodeData(deeplyNestedData);
          assertCompleteValidationResult(result, true);
          expect(result.data.input.config.level1.level2.level3.level4.level5.deepValue).toBe('nested');
        });
      });
    
      describe('Snapshot Tests', () => {
        it('should match validation result structure snapshot', () => {
          const result = validateNodeData(validCompleteNodeData.inputNode);
          
          // Remove dynamic data for consistent snapshots
          const snapshotData = {
            ...result,
            data: result.data ? {
              meta: { ...result.data.meta },
              input: { connections: '<<CONNECTIONS>>', processed: '<<PROCESSED>>', config: '<<CONFIG>>' },
              output: { data: '<<OUTPUT_DATA>>', meta: '<<OUTPUT_META>>' },
              error: result.data.error,
              plugin: result.data.plugin
            } : null
          };
          
          expect(snapshotData).toMatchSnapshot('successful-node-validation');
        });
    
        it('should match error result structure snapshot', () => {
          const result = validateNodeData(invalidCompleteNodeData.allInvalid);
          
          // Normalize error messages for consistent snapshots
          const snapshotData = {
            ...result,
            errors: result.errors.map(error => ({
              ...error,
              message: error.message.replace(/Expected .+?, received .+?/, 'Expected <<TYPE>>, received <<TYPE>>')
            }))
          };
          
          expect(snapshotData).toMatchSnapshot('failed-node-validation');
        });
      });
    });

    describe('Negative Test Cases', () => {
      it.each([
        ['missing hasError', invalidErrorData.missingHasError],
        ['invalid hasError type', invalidErrorData.invalidHasError],
        ['missing errors array', invalidErrorData.missingErrors],
        ['invalid errors type', invalidErrorData.invalidErrors],
        ['invalid error detail', invalidErrorData.invalidErrorDetail],
        ['missing error fields', invalidErrorData.missingErrorFields],
        ['empty error fields', invalidErrorData.emptyErrorFields]
      ])('should fail validation for %s', (testName, invalidData) => {
        const result = validateError(invalidData);
        assertValidationFailure(result, 'error');
      });

      it('should provide specific error messages for invalid error details', () => {
        const result = validateError(invalidErrorData.invalidErrorDetail);
        assertValidationFailure(result, 'error');
        
        // Should have multiple errors for each invalid field
        expect(result.errors.length).toBeGreaterThan(1);
        
        const errorPaths = result.errors.map(e => e.path);
        expect(errorPaths.some(path => path.includes('errors.0.code'))).toBe(true);
        expect(errorPaths.some(path => path.includes('errors.0.message'))).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle large error arrays', () => {
        const manyErrors = {
          hasError: true,
          errors: Array.from({ length: 1000 }, (_, i) => ({
            code: `ERROR_${i}`,
            message: `Error message ${i}`,
            source: `source-${i}`,
            timestamp: '2024-01-01T00:00:00.000Z'
          }))
        };
        const result = validateError(manyErrors);
        assertValidationSuccess(result, 'error');
        expect(result.data.errors).toHaveLength(1000);
      });

      it('should handle complex details objects', () => {
        const complexDetails = {
          hasError: true,
          errors: [{
            code: 'COMPLEX_ERROR',
            message: 'Complex error occurred',
            source: 'test-source',
            timestamp: '2024-01-01T00:00:00.000Z',
            details: {
              nested: {
                deeply: {
                  complex: 'structure',
                  array: [1, 2, 3],
                  boolean: true
                }
              }
            }
          }]
        };
        const result = validateError(complexDetails);
        assertValidationSuccess(result, 'error');
        expect(result.data.errors[0].details.nested.deeply.complex).toBe('structure');
      });
    });
  });


})


  
  
  
  