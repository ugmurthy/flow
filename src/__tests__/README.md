# NodeData Validation Test Suite

This directory contains comprehensive test functions to validate all functions in [`src/types/nodeDataValidation.js`](../types/nodeDataValidation.js) using the initialNodes dataset from [`src/App.jsx`](../App.jsx) as test data.

## Overview

The test suite provides exhaustive unit tests for each validation function covering:

- ✅ **Positive test cases** with valid inputs
- ❌ **Negative test cases** with invalid data types and malformed structures
- 🔍 **Edge cases** including null/undefined/empty values
- 🔍 **Boundary condition testing** with minimum/maximum values and array limits
- 🧪 **Comprehensive type validation scenarios** for strings/numbers/objects/arrays
- 🔗 **Integration tests** verifying validation functions work correctly with actual node data structures
- 🛡️ **Error handling mechanisms** testing exception throwing and catching
- 📊 **Performance and stress testing** with large datasets
- 📸 **Snapshot testing** for complex object validation

## Test Structure

```
src/__tests__/
├── nodeDataValidation.test.js          # Main test file with all test suites
├── setup.js                            # Vitest setup and global configuration
├── fixtures/
│   ├── validNodeData.js                # Valid test data extracted from initialNodes
│   ├── invalidNodeData.js              # Invalid test data for negative testing
│   └── README.md                       # This documentation file
└── utils/
    └── testHelpers.js                  # Test utility functions and assertions
```

## Functions Tested

### Individual Section Validators

- [`validateMeta()`](../types/nodeDataValidation.js:104) - Validates meta section with label, function, emoji, category
- [`validateInput()`](../types/nodeDataValidation.js:136) - Validates input section with connections, processed data, config
- [`validateOutput()`](../types/nodeDataValidation.js:168) - Validates output section with data and meta (timestamp, status)
- [`validateError()`](../types/nodeDataValidation.js:200) - Validates error section with hasError flag and error details
- [`validatePlugin()`](../types/nodeDataValidation.js:232) - Validates plugin section (nullable)

### Composite Validators

- [`validateNodeData()`](../types/nodeDataValidation.js:264) - Complete node validation with section details
- [`validateNodeDataUpdates()`](../types/nodeDataValidation.js:323) - Partial validation for updates
- [`safeValidateNodeData()`](../types/nodeDataValidation.js:350) - Safe validation without throwing
- [`validateNodeDataSections()`](../types/nodeDataValidation.js:379) - Selective section validation

### Category-Specific Validators

- [`validateInputNodeData()`](../types/nodeDataValidation.js:467) - Input nodes with formFields requirement
- [`validateProcessNodeData()`](../types/nodeDataValidation.js:506) - Process nodes with aggregationStrategy requirement

### Utility Functions

- [`createValidationErrorMessage()`](../types/nodeDataValidation.js:548) - Error message formatting
- [`createValidationSummary()`](../types/nodeDataValidation.js:588) - Validation result summary

## Running Tests

### Prerequisites

Install the required dependencies:

```bash
npm install
# or
pnpm install
```

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test nodeDataValidation

# Run specific test suite
npm test -- --grep "validateMeta"

# Run tests matching a pattern
npm test -- --grep "Positive Test Cases"
```

### Advanced Test Options

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run tests and update snapshots
npm test -- --update-snapshots

# Run tests with specific timeout
npm test -- --timeout=10000

# Run tests in parallel
npm test -- --threads

# Run tests with coverage threshold
npm test -- --coverage --coverage.threshold.global.branches=80
```

## Test Categories

### 1. Positive Test Cases

Tests that verify functions work correctly with valid input data:

```javascript
describe("Positive Test Cases", () => {
  it("should validate valid input node meta data", () => {
    const result = validateMeta(validMetaData.inputNode);
    assertValidationSuccess(result, "meta");
  });
});
```

### 2. Negative Test Cases

Tests that verify functions properly reject invalid input data:

```javascript
describe("Negative Test Cases", () => {
  it.each([
    ["missing label", invalidMetaData.missingLabel],
    ["empty label", invalidMetaData.emptyLabel],
    ["invalid category", invalidMetaData.invalidCategory],
  ])("should fail validation for %s", (testName, invalidData) => {
    const result = validateMeta(invalidData);
    assertValidationFailure(result, "meta");
  });
});
```

### 3. Edge Cases

Tests that handle boundary conditions and unusual inputs:

```javascript
describe("Edge Cases", () => {
  it("should handle extremely long strings", () => {
    const result = validateMeta(edgeCaseData.extremelyLongStrings.meta);
    assertValidationSuccess(result, "meta");
  });
});
```

### 4. Integration Tests

Tests that verify complete node data validation:

```javascript
describe("validateNodeData() - Complete Node Validation", () => {
  it("should validate complete input node data", () => {
    const result = validateNodeData(validCompleteNodeData.inputNode);
    assertCompleteValidationResult(result, true);
  });
});
```

### 5. Performance Tests

Tests that verify performance with large datasets:

```javascript
describe("Performance and Stress Tests", () => {
  it("should handle large datasets efficiently", async () => {
    const { result, executionTime } = await measureExecutionTime(() =>
      validateNodeData(largeNodeData)
    );
    expect(executionTime).toBeLessThan(1000);
  });
});
```

## Test Data

### Valid Test Data

Located in [`fixtures/validNodeData.js`](fixtures/validNodeData.js), extracted from the actual initialNodes dataset:

- **Input Nodes**: Form nodes with various field types (text, email, select, checkbox, file)
- **Process Nodes**: LLM processor and API fetch nodes with different configurations
- **Output Nodes**: Markdown display node with complex content structure

### Invalid Test Data

Located in [`fixtures/invalidNodeData.js`](fixtures/invalidNodeData.js), designed to test error conditions:

- Missing required fields
- Wrong data types
- Invalid enum values
- Malformed structures
- Edge cases and boundary conditions

## Test Helpers

The [`utils/testHelpers.js`](utils/testHelpers.js) file provides utility functions:

### Assertion Helpers

- `assertValidationSuccess()` - Assert successful validation results
- `assertValidationFailure()` - Assert failed validation results
- `assertCompleteValidationResult()` - Assert complete node validation results
- `assertErrorMessageFormat()` - Assert error message formatting

### Data Manipulation Helpers

- `deepClone()` - Create deep copies of test data
- `modifyObjectPath()` - Modify nested object properties
- `createDataWithMissingFields()` - Remove fields from test data
- `generateRandomTestData()` - Generate random test data

### Test Case Helpers

- `createTestCase()` - Create parameterized test cases
- `createBoundaryTestCases()` - Create boundary condition tests
- `measureExecutionTime()` - Measure function execution time

## Coverage Goals

The test suite aims for comprehensive coverage:

- **Line Coverage**: 100% of all validation functions
- **Branch Coverage**: All conditional paths and error conditions
- **Function Coverage**: Every exported function tested
- **Statement Coverage**: All code statements executed

## Continuous Integration

The tests are designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test -- --coverage --reporter=junit

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Debugging Tests

### Common Issues

1. **Import Errors**: Ensure all imports use correct relative paths
2. **Async Issues**: Use proper async/await for asynchronous tests
3. **Mock Issues**: Clear mocks between tests using `vi.clearAllMocks()`

### Debug Commands

```bash
# Run tests with debug output
npm test -- --reporter=verbose --no-coverage

# Run single test with debugging
npm test -- --grep "specific test name" --reporter=tap

# Run tests with Node.js debugging
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## Contributing

When adding new validation functions:

1. Add test data to appropriate fixture files
2. Create comprehensive test cases covering all scenarios
3. Update this README with new function documentation
4. Ensure all tests pass and maintain coverage goals

## Example Test Output

```
✓ NodeData Validation Functions (456)
  ✓ validateMeta() (45)
    ✓ Positive Test Cases (12)
    ✓ Negative Test Cases (18)
    ✓ Edge Cases (8)
    ✓ Boundary Conditions (7)
  ✓ validateInput() (38)
  ✓ validateOutput() (42)
  ✓ validateError() (35)
  ✓ validatePlugin() (28)
  ✓ validateNodeData() - Complete Node Validation (67)
  ✓ validateNodeDataSections() - Selective Validation (23)
  ✓ validateNodeDataUpdates() - Partial Updates (18)
  ✓ safeValidateNodeData() - Safe Validation (8)
  ✓ validateInputNodeData() - Input Node Specific (12)
  ✓ validateProcessNodeData() - Process Node Specific (11)
  ✓ createValidationErrorMessage() - Error Formatting (15)
  ✓ createValidationSummary() - Summary Generation (12)
  ✓ Performance and Stress Tests (4)
  ✓ Snapshot Tests (2)

Test Files  1 passed (1)
Tests       456 passed (456)
Coverage    100% Lines, 100% Functions, 100% Branches
Duration    2.34s
```
