# Performance Dashboard Integration Guide

The [`PerformanceDashboard.jsx`](src/components/PerformanceDashboard.jsx) component is a comprehensive real-time performance monitoring dashboard for your optimization system. Here's how to use it:

## Basic Usage

```jsx
import React, { useState } from "react";
import PerformanceDashboard from "./src/components/PerformanceDashboard.jsx";

function App() {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  return (
    <div>
      {/* Your main application content */}
      <button onClick={() => setIsDashboardOpen(true)}>
        Open Performance Dashboard
      </button>

      {/* Performance Dashboard Modal */}
      <PerformanceDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
      />
    </div>
  );
}
```

## Required Dependencies

The component requires these context providers and services to be available:

### 1. Context Providers

```jsx
import { FlowStateProvider } from "./src/contexts/FlowStateContext.jsx";

// Wrap your app with the required context
<FlowStateProvider>
  <App />
</FlowStateProvider>;
```

### 2. Service Dependencies

The component imports and uses these services:

- [`flowStateIntegration`](src/services/flowStateIntegration.js) - Integration statistics
- [`performanceMonitor`](src/utils/performanceMonitor.js) - Performance metrics
- [`validationCache`](src/utils/validationCache.js) - Cache statistics
- [`debouncedValidator`](src/utils/debouncedValidation.js) - Debouncer metrics

## Features

### Real-time Monitoring

- **Auto-refresh**: Configurable intervals (0.5s, 1s, 2s, 5s)
- **Manual refresh**: On-demand updates via [`refreshStats()`](src/components/PerformanceDashboard.jsx:20)
- **Live metrics**: Updates while dashboard is open

### Performance Metrics Displayed

1. **Flow State** (lines 132-154)

   - Node count
   - Edge count
   - Processing status
   - Validation state

2. **Performance** (lines 157-185)

   - Average validation time
   - Average sync time
   - Memory usage

3. **Validation Cache** (lines 188-210)

   - Hit rate percentage
   - Cache size/max size
   - Hit/miss counts

4. **Debouncer** (lines 213-229)

   - Pending validations
   - Active timers
   - Cache size

5. **Integration** (lines 232-256)

   - Initialization status
   - Sync operations count
   - Validation calls
   - Cache hit rate

6. **System Health** (lines 259-277)
   - Overall health status
   - Sync conflicts
   - Last sync timestamp

### Action Buttons (lines 282-318)

- **Clear Caches**: Clears [`validationCache`](src/components/PerformanceDashboard.jsx:285), [`debouncedValidator`](src/components/PerformanceDashboard.jsx:286), and [`performanceMonitor`](src/components/PerformanceDashboard.jsx:287)
- **Toggle Monitoring**: Enables/disables performance monitoring
- **Export Stats**: Downloads performance data as JSON file

## Props

- [`isOpen`](src/components/PerformanceDashboard.jsx:13): Boolean to control dashboard visibility
- [`onClose`](src/components/PerformanceDashboard.jsx:13): Function called when dashboard is closed

## Integration Example

```jsx
import React, { useState } from "react";
import { FlowStateProvider } from "./src/contexts/FlowStateContext.jsx";
import PerformanceDashboard from "./src/components/PerformanceDashboard.jsx";

function MyApp() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <FlowStateProvider>
      <div className="app">
        <header>
          <button
            onClick={() => setShowDashboard(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            📊 Performance
          </button>
        </header>

        <main>{/* Your application content */}</main>

        <PerformanceDashboard
          isOpen={showDashboard}
          onClose={() => setShowDashboard(false)}
        />
      </div>
    </FlowStateProvider>
  );
}
```

## Styling Requirements

The component uses Tailwind CSS classes. Ensure your project has Tailwind CSS configured for proper styling of the modal overlay, grid layouts, and color utilities.

## Use Cases

1. **Development**: Monitor performance during development
2. **Debugging**: Identify bottlenecks and cache issues
3. **Production Monitoring**: Track system health in real-time
4. **Performance Tuning**: Analyze metrics to optimize performance
5. **Data Export**: Export performance data for analysis

The dashboard provides a comprehensive view of your system's performance and is particularly useful for monitoring the optimization features implemented in your flow-based application.

## Health Color Coding

The dashboard uses color-coded indicators for performance metrics:

- **Green**: Good performance (above threshold)
- **Yellow**: Warning level (needs attention)
- **Red**: Critical level (requires immediate attention)

## Data Export Format

When exporting stats, the JSON file includes:

- Integration statistics
- Performance metrics
- Cache statistics
- Debouncer metrics
- Flow state information
- Timestamp for the export

This comprehensive monitoring solution helps maintain optimal performance of your flow-based optimization system.
