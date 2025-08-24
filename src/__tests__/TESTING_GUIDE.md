# Comprehensive Testing Guide for JobRunner Flow

## Overview

This document provides comprehensive guidance for testing the JobRunner Flow application using the vitest testing framework. It covers all testing patterns, best practices, utilities, and conventions established for the project.

## Table of Contents

- [Testing Architecture](#testing-architecture)
- [Test Organization](#test-organization)
- [Testing Patterns](#testing-patterns)
- [Utilities and Helpers](#utilities-and-helpers)
- [Mocking Strategies](#mocking-strategies)
- [Performance Testing](#performance-testing)
- [Best Practices](#best-practices)
- [Coverage Requirements](#coverage-requirements)
- [Troubleshooting](#troubleshooting)

## Testing Architecture

### Framework Stack

- **Testing Framework**: Vitest v2.1.8
- **React Testing**: @testing-library/react v16.3.0
- **DOM Environment**: jsdom v25.0.1
- **Coverage**: @vitest/coverage-v8 v2.1.8
- **UI Testing**: @vitest/ui v2.1.8

### Configuration

The testing configuration is managed through [`vite.config.js`](../vite.config.js:7-24):

```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.js'],
  coverage: {
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'src/__tests__/',
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // ... other exclusions
    ]
  }
}
```

## Test Organization

### Directory Structure

```
src/__tests__/
├── setup.js                           # Global test configuration
├── utils/
│   ├── testHelpers.js                 # General test utilities
│   └── reactTestHelpers.js           # React-specific test utilities
├── components/
│   ├── templateFormNode.test.jsx     # Component unit tests
│   ├── ProcessNew.test.jsx           # Component unit tests
│   └── MarkdownNew.test.jsx          # Component unit tests
├── hooks/
│   ├── useModalManagement.test.js    # Custom hook tests
│   └── useWorkflowOperations.test.js # Custom hook tests
├── snapshots/
│   └── componentSnapshots.test.jsx   # Snapshot tests
├── performance/
│   └── performanceBenchmarks.test.js # Performance tests
├── fixtures/
│   ├── validNodeData.js              # Test data fixtures
│   └── invalidNodeData.js            # Test data fixtures
└── __snapshots__/                    # Generated snapshot files
```

### Naming Conventions

- **Test Files**: `*.test.{js,jsx}` or `*.spec.{js,jsx}`
- **Component Tests**: Match component name with `.test.jsx`
- **Hook Tests**: Match hook name with `.test.js`
- **Utility Tests**: Descriptive name with `.test.js`
- **Snapshot Tests**: `componentSnapshots.test.jsx`
- **Performance Tests**: `performanceBenchmarks.test.js`

## Testing Patterns

### 1. Component Testing Pattern

```javascript
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MyComponent from "../../components/MyComponent.jsx";
import {
  renderWithProviders,
  createMockNodeData,
  assertionHelpers,
  cleanupHelpers,
} from "../utils/reactTestHelpers.js";

describe("MyComponent", () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
    cleanupHelpers.cleanupDOM();
  });

  describe("Rendering", () => {
    it("should render with correct structure", () => {
      const mockData = createMockNodeData();
      renderWithProviders(<MyComponent data={mockData} />);

      expect(screen.getByRole("button")).toBeInTheDocument();
      assertionHelpers.assertNodeExists("test-node-1");
    });
  });

  describe("Interactions", () => {
    it("should handle user interactions", async () => {
      const user = userEvent.setup();
      const mockCallback = vi.fn();

      renderWithProviders(<MyComponent onClick={mockCallback} />);

      await user.click(screen.getByRole("button"));
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
```

### 2. Hook Testing Pattern

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "../../hooks/useMyHook.js";

describe("useMyHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct state", () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.state).toBeDefined();
    expect(result.current.actions).toBeDefined();
  });

  it("should handle state updates", () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.actions.updateState("new value");
    });

    expect(result.current.state).toBe("new value");
  });
});
```

### 3. Snapshot Testing Pattern

```javascript
import { snapshotHelpers } from "../utils/reactTestHelpers.js";

describe("Component Snapshots", () => {
  it("should match snapshot for default state", () => {
    const snapshot = snapshotHelpers.createComponentSnapshot(
      MyComponent,
      { prop: "value" },
      { contextValues: {} }
    );

    expect(snapshot).toMatchSnapshot("myComponent-default");
  });
});
```

### 4. Performance Testing Pattern

```javascript
import { performanceHelpers } from "../utils/reactTestHelpers.js";

describe("Performance Tests", () => {
  it("should render within performance threshold", async () => {
    const benchmark = await performanceHelpers.benchmarkComponent(
      MyComponent,
      { data: mockData },
      10 // iterations
    );

    expect(benchmark.average).toBeLessThan(50); // 50ms threshold
  });
});
```

## Utilities and Helpers

### React Test Helpers

Located in [`src/__tests__/utils/reactTestHelpers.js`](utils/reactTestHelpers.js:1):

#### Mock Factories

```javascript
// Create mock React Flow functions
const mockReactFlow = createMockReactFlow();

// Create mock React Hook Form
const mockReactHookForm = createMockReactHookForm();

// Create mock Modal components
const mockModal = createMockModal();
```

#### Rendering Utilities

```javascript
// Render with context providers
renderWithProviders(<MyComponent />, {
  contextValues: { globalContext: mockGlobalContext },
});

// Create test context providers
const TestProviders = createTestContextProviders(contextValues);
```

#### Interaction Helpers

```javascript
const user = createUserInteraction();

// Fill form data
await interactionHelpers.fillForm(user, { field1: "value1" });

// Modal interactions
await interactionHelpers.openModal(user, "Open Modal");
await interactionHelpers.closeModal(user);
```

#### Assertion Helpers

```javascript
// Node assertions
assertionHelpers.assertNodeExists("node-id");
assertionHelpers.assertNodeHasClass("node-id", "active");

// Form assertions
assertionHelpers.assertFormField("fieldName", "expectedValue");
assertionHelpers.assertFormError("fieldName", "Error message");
```

#### Mock Data Factories

```javascript
// Create mock node data
const mockNodeData = createMockNodeData({
  meta: { label: "Test Node" },
  input: { connections: {} },
  output: { data: {} },
});

// Create mock workflow data
const mockWorkflowData = createMockWorkflowData();
```

### General Test Helpers

Located in [`src/__tests__/utils/testHelpers.js`](utils/testHelpers.js:1):

#### Validation Helpers

```javascript
// Assert validation success
assertValidationSuccess(result, "meta");

// Assert validation failure
assertValidationFailure(result, "input", 2);

// Create test cases
const testCases = createBoundaryTestCases("label", values, createInput);
```

#### Data Manipulation

```javascript
// Deep clone objects
const cloned = deepClone(originalObject);

// Modify object paths
const modified = modifyObjectPath(obj, "nested.property", "new value");

// Measure execution time
const { result, executionTime } = await measureExecutionTime(async () => {
  return await someAsyncOperation();
});
```

## Mocking Strategies

### External Dependencies

```javascript
// Mock React Flow
vi.mock("@xyflow/react", () => createMockReactFlow());

// Mock React Hook Form
vi.mock("react-hook-form", () => createMockReactHookForm());

// Mock services
vi.mock("../../services/nodeDataManager.js", () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(true),
    registerNode: vi.fn(),
    updateNodeData: vi.fn().mockResolvedValue(true),
    // ... other methods
  },
  NodeDataEvents: {
    NODE_DATA_UPDATED: "NODE_DATA_UPDATED",
    // ... other events
  },
}));
```

### Context Mocking

```javascript
// Mock context hooks
vi.mock("../../contexts/FlowStateContext.jsx", () => ({
  useFlowState: vi.fn(() => ({
    updateNode: vi.fn(),
    setNodeProcessing: vi.fn(),
  })),
  useFlowStateNode: vi.fn(() => null),
  useFlowStateProcessing: vi.fn(() => new Set()),
}));
```

### Dynamic Mocking

```javascript
// Change mock return values during tests
const { useFlowStateNode } = require("../../contexts/FlowStateContext.jsx");
useFlowStateNode.mockReturnValue(specificNodeData);

// Mock different behaviors
const mockFunction = vi
  .fn()
  .mockReturnValueOnce("first call")
  .mockReturnValueOnce("second call")
  .mockImplementation(() => "default");
```

## Performance Testing

### Performance Thresholds

```javascript
const PERFORMANCE_THRESHOLDS = {
  COMPONENT_RENDER: 50, // Component render time (ms)
  COMPONENT_UPDATE: 30, // Component update time (ms)
  STATE_UPDATE: 20, // State update time (ms)
  LARGE_DATA_PROCESSING: 200, // Large data handling (ms)
  HOOK_EXECUTION: 10, // Hook execution time (ms)
  MEMORY_CLEANUP: 100, // Memory cleanup time (ms)
  BATCH_OPERATIONS: 150, // Batch operations (ms)
};
```

### Performance Test Categories

1. **Component Rendering Performance**

   - Single component render time
   - Component update performance
   - Large data handling

2. **Hook Performance**

   - Hook execution time
   - State update performance
   - Memory usage

3. **Memory Performance**

   - Memory leak detection
   - Large data structure handling
   - Component lifecycle cleanup

4. **Workflow Processing Performance**
   - Node data processing
   - Plugin execution
   - Batch operations

### Performance Measurement

```javascript
// Component benchmarking
const benchmark = await performanceHelpers.benchmarkComponent(
  Component,
  props,
  iterations
);

// Manual performance measurement
const startTime = performance.now();
await performOperation();
const endTime = performance.now();
const executionTime = endTime - startTime;

// Memory usage tracking
const initialMemory = process.memoryUsage().heapUsed;
// ... operations
const finalMemory = process.memoryUsage().heapUsed;
const memoryIncrease = finalMemory - initialMemory;
```

## Best Practices

### 1. Test Organization

- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain the expected behavior
- **Follow the AAA pattern**: Arrange, Act, Assert
- **Keep tests focused** on single behaviors

### 2. Mock Management

- **Mock at the module level** for consistency
- **Clear mocks between tests** to avoid test pollution
- **Use realistic mock data** that matches production structures
- **Mock only what you need** to avoid over-mocking

### 3. Async Testing

```javascript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText("Updated")).toBeInTheDocument();
});

// Use act for state updates
await act(async () => {
  await result.current.asyncAction();
});
```

### 4. Error Testing

```javascript
// Test error boundaries
render(
  <ErrorBoundary onError={onError}>
    <ComponentThatMightCrash />
  </ErrorBoundary>
);

// Test error handling
await expect(async () => {
  await failingOperation();
}).rejects.toThrow("Expected error message");
```

### 5. Accessibility Testing

```javascript
// Test ARIA attributes
expect(button).toHaveAttribute("aria-label", "Close dialog");

// Test keyboard navigation
await user.tab();
expect(document.activeElement).toBe(expectedElement);

// Test screen reader compatibility
const buttons = screen.getAllByRole("button");
buttons.forEach((button) => {
  expect(button).toHaveAttribute("title");
});
```

## Coverage Requirements

### Coverage Targets

- **Line Coverage**: ≥ 90%
- **Branch Coverage**: ≥ 85%
- **Function Coverage**: ≥ 95%
- **Statement Coverage**: ≥ 90%

### Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Generate HTML coverage report
npm run test:coverage -- --reporter=html

# Check coverage thresholds
npm run test:coverage -- --coverage.threshold.global.branches=85
```

### Coverage Exclusions

Files excluded from coverage requirements:

- Test files (`**/*.{test,spec}.*`)
- Mock files and fixtures
- Configuration files
- Type definitions
- Development utilities

## Troubleshooting

### Common Issues

#### 1. Mock Not Working

```javascript
// Ensure mock is hoisted
vi.mock("../../module.js", () => ({
  default: vi.fn(),
}));

// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

#### 2. Async Test Failures

```javascript
// Use proper async/await
await waitFor(() => {
  expect(element).toBeInTheDocument();
});

// Don't forget to await async operations
await act(async () => {
  await asyncOperation();
});
```

#### 3. Memory Leaks in Tests

```javascript
// Clean up after tests
afterEach(() => {
  cleanupHelpers.cleanupDOM();
  cleanupHelpers.clearAllMocks();
});

// Unmount components
const { unmount } = render(<Component />);
// ... test logic
unmount();
```

#### 4. Flaky Tests

- Use `waitFor` instead of fixed timeouts
- Avoid testing implementation details
- Mock external dependencies consistently
- Use stable selectors (roles, test-ids)

### Debugging Tests

```javascript
// Debug component state
screen.debug(); // Prints current DOM

// Log test values
console.log("Current state:", result.current.state);

// Use breakpoints
debugger; // Pauses execution in dev tools
```

### Performance Issues

```javascript
// Profile test performance
const startTime = performance.now();
// ... test code
const endTime = performance.now();
console.log(`Test took ${endTime - startTime}ms`);

// Reduce test complexity
// Split large tests into smaller focused tests
// Mock heavy operations
// Use shallow rendering when appropriate
```

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test templateFormNode

# Run tests with UI
npm run test:ui

# Run performance tests only
npm test -- --grep "performance"

# Run tests with coverage
npm run test:coverage
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Conclusion

This comprehensive testing guide provides the foundation for maintaining high-quality, reliable tests for the JobRunner Flow application. Follow these patterns and best practices to ensure consistent, maintainable, and effective testing across the entire codebase.

For specific implementation examples, refer to the existing test files in the respective directories. Each test file demonstrates the patterns and practices outlined in this guide.

Remember: **Good tests are documentation** - they should clearly express the intended behavior of your code and serve as a safety net for future changes.
