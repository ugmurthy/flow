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

describe('OutputSchema Data Validation Functions', () => {
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


  describe('validateOutput()', () => {
    describe('Positive Test Cases', () => {
      it.each([
        ['idle status', validOutputData.idle],
        ['processing status', validOutputData.processing],
        ['success status', validOutputData.success],
        ['error status', validOutputData.error]
      ])('should validate output data with %s', (testName, validData) => {
        const result = validateOutput(validData);
        assertValidationSuccess(result, 'output');
        expect(result.data.meta.status).toBe(validData.meta.status);
      });

      it('should handle optional fields correctly', () => {
        const outputWithOptionals = deepClone(validOutputData.success);
        const result = validateOutput(outputWithOptionals);
        assertValidationSuccess(result, 'output');
        expect(result.data.meta.processingTime).toBe(1500);
        expect(result.data.meta.dataSize).toBe(1024);
        expect(result.data.meta.skipAutoProcessing).toBe(false);
      });

      it('should handle null optional fields', () => {
        const outputWithNulls = deepClone(validOutputData.processing);
        const result = validateOutput(outputWithNulls);
        assertValidationSuccess(result, 'output');
        expect(result.data.meta.processingTime).toBeNull();
        expect(result.data.meta.dataSize).toBeNull();
      });
    });

    describe('Negative Test Cases', () => {
      it.each([
        ['missing meta', invalidOutputData.missingMeta],
        ['invalid meta type', invalidOutputData.invalidMeta],
        ['missing timestamp', invalidOutputData.missingTimestamp],
        ['invalid timestamp type', invalidOutputData.invalidTimestamp],
        ['missing status', invalidOutputData.missingStatus],
        ['invalid status value', invalidOutputData.invalidStatus],
        ['invalid processing time type', invalidOutputData.invalidProcessingTime],
        ['invalid data size type', invalidOutputData.invalidDataSize],
        ['wrong field types', invalidOutputData.wrongTypes]
      ])('should fail validation for %s', (testName, invalidData) => {
        const result = validateOutput(invalidData);
        assertValidationFailure(result, 'output');
      });

      it('should validate status enum strictly', () => {
        const invalidStatus = {
          data: {},
          meta: {
            timestamp: '2024-01-01T00:00:00.000Z',
            status: 'invalid-status'
          }
        };
        const result = validateOutput(invalidStatus);
        assertValidationFailure(result, 'output');
        
        const statusError = result.errors.find(e => e.path.includes('status'));
        expect(statusError).toBeDefined();
        expect(statusError.message).toContain('idle');
        expect(statusError.message).toContain('processing');
        expect(statusError.message).toContain('success');
        expect(statusError.message).toContain('error');
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle extreme processing times', () => {
        const extremeProcessingTime = {
          data: {},
          meta: {
            timestamp: '2024-01-01T00:00:00.000Z',
            status: 'success',
            processingTime: Number.MAX_SAFE_INTEGER,
            dataSize: 0
          }
        };
        const result = validateOutput(extremeProcessingTime);
        assertValidationSuccess(result, 'output');
        expect(result.data.meta.processingTime).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle negative processing times', () => {
        const negativeProcessingTime = {
          data: {},
          meta: {
            timestamp: '2024-01-01T00:00:00.000Z',
            status: 'success',
            processingTime: -100
          }
        };
        const result = validateOutput(negativeProcessingTime);
        assertValidationSuccess(result, 'output');
        expect(result.data.meta.processingTime).toBe(-100);
      });
    });
  });


})

