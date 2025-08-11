import React, { useState, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const widthOptions = [
  { value: 'auto', label: 'Auto' },
  { value: '25%', label: '25%' },
  { value: '50%', label: '50%' },
  { value: '75%', label: '75%' },
  { value: '100%', label: '100%' },
  { value: 'custom', label: 'Custom' }
];

const presetColors = [
  { value: '#374151', label: 'Gray', color: '#374151' },
  { value: '#1f2937', label: 'Dark Gray', color: '#1f2937' },
  { value: '#dc2626', label: 'Red', color: '#dc2626' },
  { value: '#ea580c', label: 'Orange', color: '#ea580c' },
  { value: '#ca8a04', label: 'Yellow', color: '#ca8a04' },
  { value: '#16a34a', label: 'Green', color: '#16a34a' },
  { value: '#2563eb', label: 'Blue', color: '#2563eb' },
  { value: '#7c3aed', label: 'Purple', color: '#7c3aed' },
  { value: '#be185d', label: 'Pink', color: '#be185d' }
];

const sampleMarkdown = `# Sample Markdown

This is a **bold** text and this is *italic* text.

## Code Example

Here's some inline \`code\` and a code block:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Lists

- Item 1
- Item 2
  - Nested item
- Item 3

1. First item
2. Second item
3. Third item

## Table

| Name | Age | City |
|------|-----|------|
| John | 25 | NYC |
| Jane | 30 | LA |

## Links and Quotes

Visit [React](https://reactjs.org) for more info.

> This is a blockquote with some important information.
`;

function MarkdownStyleModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialConfig = {width: '400px'},
  previewContent = sampleMarkdown 
}) {
  const [config, setConfig] = useState({
    width: 'auto',
    textColor: '#374151',
    fontSize: '14px',
    customWidth: '400px',
    ...initialConfig
  });

  const [showCustomWidth, setShowCustomWidth] = useState(
    initialConfig.width && !widthOptions.some(opt => opt.value === initialConfig.width)
  );

  const handleWidthChange = useCallback((value) => {
    setConfig(prev => ({ ...prev, width: value }));
    setShowCustomWidth(value === 'custom');
  }, []);

  const handleCustomWidthChange = useCallback((value) => {
    setConfig(prev => ({ 
      ...prev, 
      customWidth: value,
      width: value 
    }));
  }, []);

  const handleColorChange = useCallback((color) => {
    setConfig(prev => ({ ...prev, textColor: color }));
  }, []);

  const handleFontSizeChange = useCallback((size) => {
    setConfig(prev => ({ ...prev, fontSize: `${size}px` }));
  }, []);

  const handleSave = useCallback(() => {
    const finalConfig = {
      ...config,
      width: showCustomWidth ? config.customWidth : config.width
    };
    onSave(finalConfig);
  }, [config, showCustomWidth, onSave]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const currentFontSize = parseInt(config.fontSize.replace('px', ''));
  const previewWidth = showCustomWidth ? config.customWidth : config.width;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Markdown Style Configuration
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              {/* Configuration Panel */}
              <div className="p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-6">
                  {/* Width Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width
                    </label>
                    <select
                      value={showCustomWidth ? 'custom' : config.width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {widthOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    {showCustomWidth && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={config.customWidth}
                          onChange={(e) => handleCustomWidthChange(e.target.value)}
                          placeholder="e.g., 400px, 20rem, 50vw"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Text Color Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {presetColors.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handleColorChange(preset.value)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md border transition-colors ${
                            config.textColor === preset.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="text-xs">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.textColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.textColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#374151"
                      />
                    </div>
                  </div>

                  {/* Font Size Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Size: {currentFontSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={currentFontSize}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10px</span>
                      <span>24px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="p-6 overflow-y-auto bg-gray-50">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Preview</h3>
                  <div className="text-sm text-gray-600">
                    Width: {previewWidth} | Color: {config.textColor} | Size: {config.fontSize}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <MarkdownRenderer
                    content={previewContent}
                    width={previewWidth}
                    textColor={config.textColor}
                    fontSize={config.fontSize}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarkdownStyleModal;