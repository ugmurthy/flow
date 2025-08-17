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

describe('MetaSchema Data Validation Functions', () => {
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


  
  describe('validateMeta()', () => {
    describe('Positive Test Cases', () => {
      it('should validate valid input node meta data', () => {
        const result = validateMeta(validMetaData.inputNode);
        assertValidationSuccess(result, 'meta');
        expect(result.data).toEqual(expect.objectContaining({
          label: 'Form Node',
          function: 'Dynamic Form',
          emoji: '📝',
          category: 'input',
          version: '1.0.0',
          capabilities: []
        }));
      });

      it('should validate valid process node meta data', () => {
        const result = validateMeta(validMetaData.processNode);
        assertValidationSuccess(result, 'meta');
        expect(result.data.category).toBe('process');
        expect(result.data.capabilities).toEqual(['text-processing', 'ai-inference']);
      });

      it('should validate valid output node meta data', () => {
        const result = validateMeta(validMetaData.outputNode);
        assertValidationSuccess(result, 'meta');
        expect(result.data.category).toBe('output');
      });

      it('should apply default values correctly', () => {
        const minimalMeta = {
          label: 'Test Node',
          function: 'Test Function',
          emoji: '🧪',
          category: 'input'
        };
        const result = validateMeta(minimalMeta);
        assertValidationSuccess(result, 'meta');
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.capabilities).toEqual([]);
      });

      it('should preserve optional description field', () => {
        const metaWithDescription = {
          ...validMetaData.inputNode,
          description: 'Custom description'
        };
        const result = validateMeta(metaWithDescription);
        assertValidationSuccess(result, 'meta');
        expect(result.data.description).toBe('Custom description');
      });
    });

    describe('Negative Test Cases', () => {
      it.each([
        ['missing label', invalidMetaData.missingLabel],
        ['empty label', invalidMetaData.emptyLabel],
        ['missing function', invalidMetaData.missingFunction],
        ['empty function', invalidMetaData.emptyFunction],
        ['missing emoji', invalidMetaData.missingEmoji],
        ['empty emoji', invalidMetaData.emptyEmoji],
        ['invalid category', invalidMetaData.invalidCategory],
        ['missing category', invalidMetaData.missingCategory]
      ])('should fail validation for %s', (testName, invalidData) => {
        const result = validateMeta(invalidData);
        assertValidationFailure(result, 'meta');
      });

      it('should fail validation for wrong data types', () => {
        const result = validateMeta(invalidMetaData.wrongTypes);
        assertValidationFailure(result, 'meta');
        expect(result.errors.length).toBeGreaterThan(1);
        
        // Check specific error messages
        const errorMessages = result.errors.map(e => e.message);
        expect(errorMessages.some(msg => msg.includes('string'))).toBe(true);
      });

      it('should handle null and undefined inputs', () => {
        const nullResult = validateMeta(null);
        const undefinedResult = validateMeta(undefined);
        
        assertValidationFailure(nullResult, 'meta');
        assertValidationFailure(undefinedResult, 'meta');
      });
    });

    describe('Edge Cases', () => {
      it('should handle extremely long strings', () => {
        const result = validateMeta(edgeCaseData.extremelyLongStrings.meta);
        // Should still validate successfully as there's no max length constraint
        assertValidationSuccess(result, 'meta');
      });

      it('should handle special characters in strings', () => {
        const result = validateMeta(edgeCaseData.specialCharacters.meta);
        assertValidationSuccess(result, 'meta');
      });

      it('should handle large capabilities array', () => {
        const result = validateMeta(edgeCaseData.largeArrays.meta);
        assertValidationSuccess(result, 'meta');
        expect(result.data.capabilities).toHaveLength(10000);
      });
    });

    describe('Boundary Conditions', () => {
      const boundaryTestCases = createBoundaryTestCases(
        'label',
        [
          { name: 'single character', value: 'A', shouldSucceed: true },
          { name: 'empty string', value: '', shouldSucceed: false },
          { name: 'whitespace only', value: '   ', shouldSucceed: true },
          { name: 'unicode characters', value: '测试🚀', shouldSucceed: true }
        ],
        (value) => ({
          label: value,
          function: 'Test Function',
          emoji: '📝',
          category: 'input'
        })
      );

      it.each(boundaryTestCases)('should handle $name', ({ input, shouldSucceed }) => {
        const result = validateMeta(input);
        if (shouldSucceed) {
          assertValidationSuccess(result, 'meta');
        } else {
          assertValidationFailure(result, 'meta');
        }
      });
    });
  });


})

