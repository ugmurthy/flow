import React from 'react';
import ViewButton from './ViewButton';

function ViewButtonTest() {
  // Sample data to test the ViewButton component
  const sampleNodeData = {
    id: "node-123",
    type: "ProcessNode",
    status: "completed",
    timestamp: "2025-01-11T12:30:00Z",
    input: {
      message: "Hello World",
      count: 42,
      enabled: true
    },
    output: {
      result: "Processing completed successfully",
      processedItems: ["item1", "item2", "item3"],
      metadata: {
        duration: "2.5s",
        memory: "128MB"
      }
    },
    logs: [
      "Started processing at 12:30:00",
      "Processing item 1...",
      "Processing item 2...",
      "Processing item 3...",
      "Completed at 12:30:02"
    ]
  };

  const markdownData = `# Node Processing Report

## Overview
This node has successfully processed the input data and generated the following results.

## Key Metrics
- **Processing Time**: 2.5 seconds
- **Items Processed**: 3
- **Memory Usage**: 128MB
- **Status**: ✅ Completed

## Code Example
\`\`\`javascript
function processNode(input) {
  console.log("Processing:", input.message);
  return { success: true, count: input.count };
}
\`\`\`

## Next Steps
1. Review the output data
2. Validate the results
3. Continue to next node in the flow
`;

  const arrayData = [
    "First item in the array",
    "Second item with more details",
    { nested: "object", value: 123 },
    "Final item"
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">View Button Test</h1>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Object Data:</span>
          <ViewButton 
            data={sampleNodeData} 
            title="Sample Node Data"
            className="border border-gray-300"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Markdown Data:</span>
          <ViewButton 
            data={markdownData} 
            title="Processing Report"
            className="border border-gray-300"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Array Data:</span>
          <ViewButton 
            data={arrayData} 
            title="Array Items"
            className="border border-gray-300"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Simple String:</span>
          <ViewButton 
            data="This is a simple string that will be displayed in the modal."
            title="Simple Text"
            className="border border-gray-300"
          />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Usage Instructions</h2>
        <p className="text-sm text-gray-600 mb-2">
          Click any of the eye icons above to test the ViewButton component with different data types.
        </p>
        <div className="text-xs text-gray-500">
          <p><strong>Import:</strong> <code>import ViewButton from './components/ViewButton';</code></p>
          <p><strong>Usage:</strong> <code>&lt;ViewButton data=&#123;nodeData&#125; title="My Node" /&gt;</code></p>
        </div>
      </div>
    </div>
  );
}

export default ViewButtonTest;