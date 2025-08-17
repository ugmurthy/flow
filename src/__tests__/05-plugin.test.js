/**
 * Comprehensive test suite for nodeDataValidation.js
 * Tests all validation functions with positive, negative, edge cases, and integration scenarios
 */

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

describe('PlugInSchema Validation Functions', () => {
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

  describe('validatePlugin()', () => {
    describe('Positive Test Cases', () => {
      it('should validate null plugin data', () => {
        const result = validatePlugin(validPluginData.null);
        //assertValidationSuccess(null, 'plugin');
        expect(result.data).toBeNull();
      });

      it('should validate undefined plugin data', () => {
        const result = validatePlugin(validPluginData.undefined);
        //assertValidationSuccess(result, 'plugin');
        expect(result.data).toBeUndefined();
      });

      it('should validate complete plugin data', () => {
        const result = validatePlugin(validPluginData.llmProcessor);
        assertValidationSuccess(result, 'plugin');
        expect(result.data).toEqual(expect.objectContaining({
          name: 'llm-processor',
          version: '1.0.0',
          config: expect.any(Object),
          state: expect.any(Object)
        }));
      });

      it('should apply default values for plugin fields', () => {
        const minimalPlugin = {
          name: 'test-plugin'
        };
        const result = validatePlugin(minimalPlugin);
        assertValidationSuccess(result, 'plugin');
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.config).toEqual({});
        expect(result.data.state).toEqual({});
      });
    });

    describe('Negative Test Cases', () => {
      it.each([
        ['invalid structure', invalidPluginData.invalidStructure],
        ['missing name', invalidPluginData.missingName],
        ['empty name', invalidPluginData.emptyName],
        ['wrong types', invalidPluginData.wrongTypes]
      ])('should fail validation for %s', (testName, invalidData) => {
        const result = validatePlugin(invalidData);
        assertValidationFailure(result, 'plugin');
      });

      it('should handle non-object plugin data when not null/undefined', () => {
        const stringPlugin = 'not-a-plugin-object';
        const result = validatePlugin(stringPlugin);
        assertValidationFailure(result, 'plugin');
      });
    });
  });
});