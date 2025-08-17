/**
 * Test helper utilities for nodeDataValidation tests
 * Provides common testing functions and assertions
 */

import { expect } from 'vitest';

/**
 * Assert that a validation result has the expected structure for success
 * @param {Object} result - Validation result to check
 * @param {string} expectedSection - Expected section name
 */
export const assertValidationSuccess = (result, expectedSection) => {
  expect(result).toEqual(
    expect.objectContaining({
      success: true,
      data: expect.any(Object),
      errors: expect.arrayContaining([]),
      section: expectedSection
    })
  );
  expect(result.errors).toHaveLength(0);
  expect(result.data).not.toBeNull();
};

/**
 * Assert that a validation result has the expected structure for failure
 * @param {Object} result - Validation result to check
 * @param {string} expectedSection - Expected section name
 * @param {number} expectedErrorCount - Expected number of errors (optional)
 */
export const assertValidationFailure = (result, expectedSection, expectedErrorCount) => {
  expect(result).toEqual(
    expect.objectContaining({
      success: false,
      data: null,
      errors: expect.any(Array),
      section: expectedSection
    })
  );
  expect(result.errors.length).toBeGreaterThan(0);
  
  if (expectedErrorCount !== undefined) {
    expect(result.errors).toHaveLength(expectedErrorCount);
  }
  
  // Check error structure
  result.errors.forEach(error => {
    expect(error).toEqual(
      expect.objectContaining({
        path: expect.any(String),
        message: expect.any(String),
        code: expect.any(String),
        section: expectedSection
      })
    );
  });
};

/**
 * Assert that a complete node validation result has the expected structure
 * @param {Object} result - Complete validation result
 * @param {boolean} shouldSucceed - Whether validation should succeed
 */
export const assertCompleteValidationResult = (result, shouldSucceed = true) => {
  expect(result).toEqual(
    expect.objectContaining({
      success: expect.any(Boolean),
      data: shouldSucceed ? expect.any(Object) : null,
      errors: expect.any(Array),
      sectionsValidated: expect.any(Object),
      failedSections: expect.any(Array),
      validSections: expect.any(Array)
    })
  );
  
  if (shouldSucceed) {
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.failedSections).toHaveLength(0);
    expect(result.validSections.length).toBeGreaterThan(0);
  } else {
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.failedSections.length).toBeGreaterThan(0);
  }
};

/**
 * Assert that a sections validation result has the expected structure
 * @param {Object} result - Sections validation result
 * @param {Array<string>} requestedSections - Sections that were requested
 * @param {boolean} shouldSucceed - Whether validation should succeed
 */
export const assertSectionsValidationResult = (result, requestedSections, shouldSucceed = true) => {
  assertCompleteValidationResult(result, shouldSucceed);
  
  expect(result).toEqual(
    expect.objectContaining({
      requestedSections: expect.arrayContaining(requestedSections)
    })
  );
  
  expect(result.requestedSections).toEqual(requestedSections);
};

/**
 * Assert that an error message has the expected format
 * @param {string} errorMessage - Error message to check
 * @param {string} expectedContext - Expected context in the message
 */
export const assertErrorMessageFormat = (errorMessage, expectedContext = 'validation') => {
  expect(errorMessage).toEqual(expect.any(String));
  expect(errorMessage).toContain(expectedContext);
  expect(errorMessage).toContain('failed:');
  expect(errorMessage).toMatch(/SECTION:/);
};

/**
 * Assert that a validation summary has the expected structure
 * @param {Object} summary - Validation summary to check
 * @param {string} expectedStatus - Expected status ('success' or 'failed')
 */
export const assertValidationSummary = (summary, expectedStatus) => {
  expect(summary).toEqual(
    expect.objectContaining({
      status: expectedStatus,
      message: expect.any(String),
      totalSections: expect.any(Number),
      validSections: expect.any(Array),
      failedSections: expect.any(Array)
    })
  );
  
  if (expectedStatus === 'success') {
    expect(summary.failedSections).toHaveLength(0);
    expect(summary.validSections.length).toBeGreaterThan(0);
  } else {
    expect(summary.failedSections.length).toBeGreaterThan(0);
    expect(summary).toEqual(
      expect.objectContaining({
        totalErrors: expect.any(Number),
        errorsBySection: expect.any(Object)
      })
    );
  }
};

/**
 * Create a test case object for parameterized testing
 * @param {string} name - Test case name
 * @param {*} input - Input data
 * @param {boolean} shouldSucceed - Whether validation should succeed
 * @param {string} expectedError - Expected error message (optional)
 * @returns {Object} Test case object
 */
export const createTestCase = (name, input, shouldSucceed, expectedError = null) => ({
  name,
  input,
  shouldSucceed,
  expectedError
});

/**
 * Create multiple test cases for boundary testing
 * @param {string} baseField - Base field name
 * @param {Array} values - Array of values to test
 * @param {Function} createInput - Function to create input object
 * @returns {Array} Array of test cases
 */
export const createBoundaryTestCases = (baseField, values, createInput) => {
  return values.map(({ name, value, shouldSucceed, expectedError }) => 
    createTestCase(
      `${baseField} - ${name}`,
      createInput(value),
      shouldSucceed,
      expectedError
    )
  );
};

/**
 * Generate random test data for stress testing
 * @param {string} type - Type of data to generate
 * @param {Object} options - Generation options
 * @returns {*} Generated test data
 */
export const generateRandomTestData = (type, options = {}) => {
  const { length = 10, min = 0, max = 100 } = options;
  
  switch (type) {
    case 'string':
      return Math.random().toString(36).substring(2, length + 2);
    case 'number':
      return Math.floor(Math.random() * (max - min + 1)) + min;
    case 'boolean':
      return Math.random() > 0.5;
    case 'array':
      return Array.from({ length }, (_, i) => `item-${i}`);
    case 'object':
      return Object.fromEntries(
        Array.from({ length }, (_, i) => [`key${i}`, `value${i}`])
      );
    case 'timestamp':
      return new Date(Date.now() + Math.random() * 86400000).toISOString();
    default:
      return null;
  }
};

/**
 * Deep clone an object for test data manipulation
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
  return obj;
};

/**
 * Create a modified copy of an object with specific field changes
 * @param {Object} baseObject - Base object to modify
 * @param {string} path - Dot-notation path to the field
 * @param {*} value - New value for the field
 * @returns {Object} Modified object
 */
export const modifyObjectPath = (baseObject, path, value) => {
  const cloned = deepClone(baseObject);
  const keys = path.split('.');
  let current = cloned;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  const lastKey = keys[keys.length - 1];
  if (value === undefined) {
    delete current[lastKey];
  } else {
    current[lastKey] = value;
  }
  
  return cloned;
};

/**
 * Create test data with missing fields
 * @param {Object} baseObject - Base object
 * @param {Array<string>} fieldsToRemove - Fields to remove
 * @returns {Object} Object with missing fields
 */
export const createDataWithMissingFields = (baseObject, fieldsToRemove) => {
  const cloned = deepClone(baseObject);
  fieldsToRemove.forEach(field => {
    delete cloned[field];
  });
  return cloned;
};

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Object} Result and execution time
 */
export const measureExecutionTime = async (fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    executionTime: end - start
  };
};