import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const testMarkdown = `# Markdown Renderer Test

This is a test of the **MarkdownRenderer** component with various features.

## Text Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough text~~
- \`Inline code\`

## Lists

### Unordered List
- Item 1
- Item 2
  - Nested item A
  - Nested item B
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Code Blocks

### JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### Python
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Headers | ✅ | H1-H6 supported |
| Lists | ✅ | Ordered and unordered |
| Code | ✅ | Syntax highlighting |
| Tables | ✅ | Basic table support |
| Links | ✅ | External links |

## Links and Quotes

Visit [React Documentation](https://reactjs.org) for more information.

> This is a blockquote with some important information.
> It can span multiple lines and provides emphasis.

## Horizontal Rule

---

## Mixed Content

Here's a paragraph with **bold**, *italic*, and \`code\` elements mixed together.

\`\`\`json
{
  "name": "markdown-renderer",
  "version": "1.0.0",
  "features": [
    "syntax-highlighting",
    "tables",
    "lists",
    "links"
  ]
}
\`\`\`
`;

function MarkdownTest() {
  const [config, setConfig] = useState({
    width: 'auto',
    textColor: '#374151',
    fontSize: '14px'
  });

  const [customMarkdown, setCustomMarkdown] = useState(testMarkdown);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Markdown Renderer Test</h1>
      
      {/* Configuration Controls */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Width</label>
            <select
              value={config.width}
              onChange={(e) => setConfig(prev => ({ ...prev, width: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="auto">Auto</option>
              <option value="50%">50%</option>
              <option value="75%">75%</option>
              <option value="100%">100%</option>
              <option value="400px">400px</option>
              <option value="600px">600px</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Text Color</label>
            <input
              type="color"
              value={config.textColor}
              onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-full h-10 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Font Size</label>
            <select
              value={config.fontSize}
              onChange={(e) => setConfig(prev => ({ ...prev, fontSize: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Markdown Input */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Custom Markdown</h2>
        <textarea
          value={customMarkdown}
          onChange={(e) => setCustomMarkdown(e.target.value)}
          className="w-full h-40 px-3 py-2 border rounded-md font-mono text-sm"
          placeholder="Enter your markdown here..."
        />
      </div>

      {/* Rendered Output */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        <h2 className="text-xl font-semibold mb-4">Rendered Output</h2>
        <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
          <MarkdownRenderer
            content={customMarkdown}
            width={config.width}
            textColor={config.textColor}
            fontSize={config.fontSize}
          />
        </div>
      </div>

      {/* Configuration Display */}
      <div className="mt-4 text-sm text-gray-600">
        Current config: Width: {config.width}, Color: {config.textColor}, Size: {config.fontSize}
      </div>
    </div>
  );
}

export default MarkdownTest;