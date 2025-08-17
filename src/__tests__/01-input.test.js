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

describe('InputSchema Data Validation Functions', () => {
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


  
  describe('validateInput()', () => {
    describe('Positive Test Cases', () => {
      it('should validate valid form node input data', () => {
        const result = validateInput(validInputData.formNode);
        assertValidationSuccess(result, 'input');
        expect(result.data).toEqual(expect.objectContaining({
          connections: {},
          processed: {},
          config: expect.objectContaining({
            formFields: expect.any(Array)
          })
        }));
      });

      it('should validate valid process node input data with connections', () => {
        const result = validateInput(validInputData.processNode);
        assertValidationSuccess(result, 'input');
        expect(result.data.connections).toHaveProperty('input-1');
        expect(result.data.config.aggregationStrategy).toBe('merge');
      });

      it('should apply default values for missing fields', () => {
        const minimalInput = {};
        const result = validateInput(minimalInput);
        assertValidationSuccess(result, 'input');
        expect(result.data).toEqual({
          connections: {},
          processed: {},
          config: {}
        });
      });

      it('should validate complex connection data', () => {
        const inputWithConnections = deepClone(validInputData.processNode);
        const result = validateInput(inputWithConnections);
        assertValidationSuccess(result, 'input');
        
        const connection = result.data.connections['input-1'];
        expect(connection).toEqual(expect.objectContaining({
          sourceNodeId: expect.any(String),
          sourceHandle: expect.any(String),
          targetHandle: expect.any(String),
          data: expect.anything(),
          meta: expect.objectContaining({
            timestamp: expect.any(String),
            dataType: expect.any(String),
            isActive: expect.any(Boolean)
          })
        }));
      });
    });

    describe('Negative Test Cases', () => {
      it.each([
        ['invalid connections type', invalidInputData.invalidConnections],
        ['invalid connection data', invalidInputData.invalidConnectionData],
        ['missing connection meta', invalidInputData.missingConnectionMeta],
        ['invalid connection meta', invalidInputData.invalidConnectionMeta],
        ['wrong field types', invalidInputData.wrongTypes]
      ])('should fail validation for %s', (testName, invalidData) => {
        const result = validateInput(invalidData);
        assertValidationFailure(result, 'input');
      });

      it('should provide detailed error information for invalid connections', () => {
        const result = validateInput(invalidInputData.invalidConnectionData);
        assertValidationFailure(result, 'input');
        
        // Check that errors contain path information
        const errorPaths = result.errors.map(e => e.path);
        expect(errorPaths.some(path => path.includes('connections'))).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle deeply nested config objects', () => {
        const result = validateInput(edgeCaseData.deeplyNestedObjects.input);
        assertValidationSuccess(result, 'input');
        expect(result.data.config.level1.level2.level3.level4.level5.deepValue).toBe('nested');
      });

      it('should handle null data in connections', () => {
        const inputWithNullData = {
          connections: {
            'conn-1': {
              sourceNodeId: 'node-1',
              sourceHandle: 'default',
              targetHandle: 'default',
              data: null,
              meta: {
                timestamp: '2024-01-01T00:00:00.000Z',
                dataType: 'null',
                isActive: true
              }
            }
          },
          processed: {},
          config: {}
        };
        const result = validateInput(inputWithNullData);
        assertValidationSuccess(result, 'input');
        expect(result.data.connections['conn-1'].data).toBeNull();
      });
    });
  });


})

