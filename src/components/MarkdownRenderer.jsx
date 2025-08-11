import React, { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const defaultConfig = {
  width: 'auto',
  textColor: '#374151', // gray-700
  fontSize: '14px',
  maxWidth: '100%',
  padding: '16px',
  backgroundColor: 'transparent',
  borderRadius: '8px'
};

function MarkdownRenderer({
  content = '',
  width = defaultConfig.width,
  textColor = defaultConfig.textColor,
  fontSize = defaultConfig.fontSize,
  className = '',
  onError = null,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validate and sanitize props
  const sanitizedWidth = validateWidth(width);
  const sanitizedColor = validateColor(textColor);
  const sanitizedFontSize = validateFontSize(fontSize);

  const containerStyle = {
    width: sanitizedWidth === 'auto' ? 'auto' : sanitizedWidth,
    color: sanitizedColor,
    fontSize: sanitizedFontSize,
    maxWidth: defaultConfig.maxWidth,
    padding: defaultConfig.padding,
    backgroundColor: defaultConfig.backgroundColor,
    borderRadius: defaultConfig.borderRadius,
  };

  // Reset error state when content changes
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
  }, [content]);

  // Error boundary-like behavior for markdown parsing
  const handleMarkdownError = (error) => {
    console.error('Markdown rendering error:', error);
    setHasError(true);
    setErrorMessage(error.message || 'Failed to render markdown content');
    if (onError) {
      onError(error);
    }
  };

  const components = {
    // Custom code block renderer with syntax highlighting
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-md text-sm"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code 
          className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" 
          {...props}
        >
          {children}
        </code>
      );
    },
    
    // Custom heading renderers
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mb-4 mt-6 text-gray-900 border-b border-gray-200 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mb-3 mt-5 text-gray-800 border-b border-gray-100 pb-1">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-800">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-medium mb-2 mt-3 text-gray-700">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base font-medium mb-1 mt-2 text-gray-700">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium mb-1 mt-2 text-gray-600">
        {children}
      </h6>
    ),
    
    // Custom paragraph renderer
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed">
        {children}
      </p>
    ),
    
    // Custom list renderers
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="ml-2">
        {children}
      </li>
    ),
    
    // Custom link renderer
    a: ({ href, children }) => (
      <a 
        href={href} 
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // Custom blockquote renderer
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">
        {children}
      </blockquote>
    ),
    
    // Custom table renderers
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-50">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-sm text-gray-600">
        {children}
      </td>
    ),
    
    // Custom horizontal rule
    hr: () => (
      <hr className="my-6 border-gray-200" />
    ),
    
    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">
        {children}
      </em>
    ),
  };

  // Handle error state
  if (hasError) {
    return (
      <div
        style={containerStyle}
        className={`text-red-600 bg-red-50 border border-red-200 rounded p-3 ${className}`}
      >
        <div className="font-medium text-sm">Markdown Rendering Error</div>
        <div className="text-xs mt-1 text-red-500">{errorMessage}</div>
        <div className="text-xs mt-2 text-gray-600">
          Please check your markdown syntax and try again.
        </div>
      </div>
    );
  }

  // Handle empty content
  if (!content || content.trim() === '') {
    return (
      <div
        style={containerStyle}
        className={`text-gray-400 italic ${className}`}
      >
        No markdown content provided
      </div>
    );
  }

  try {
    return (
      <div
        style={containerStyle}
        className={`markdown-renderer prose prose-sm max-w-none ${className}`}
        {...props}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    handleMarkdownError(error);
    return null;
  }
}

// Validation functions
function validateWidth(width) {
  if (!width) return defaultConfig.width;
  
  // Allow common CSS width values
  const validWidthPattern = /^(auto|inherit|initial|\d+(%|px|em|rem|vw|vh)|calc\(.+\))$/;
  
  if (typeof width === 'string' && validWidthPattern.test(width)) {
    return width;
  }
  
  console.warn(`Invalid width value: ${width}. Using default.`);
  return defaultConfig.width;
}

function validateColor(color) {
  if (!color) return defaultConfig.textColor;
  
  // Allow hex colors, rgb/rgba, hsl/hsla, and named colors
  const validColorPattern = /^(#[0-9a-fA-F]{3,8}|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\)|[a-zA-Z]+)$/;
  
  if (typeof color === 'string' && validColorPattern.test(color)) {
    return color;
  }
  
  console.warn(`Invalid color value: ${color}. Using default.`);
  return defaultConfig.textColor;
}

function validateFontSize(fontSize) {
  if (!fontSize) return defaultConfig.fontSize;
  
  // Allow common font size units
  const validFontSizePattern = /^\d+(\.\d+)?(px|em|rem|%|pt)$/;
  
  if (typeof fontSize === 'string' && validFontSizePattern.test(fontSize)) {
    return fontSize;
  }
  
  console.warn(`Invalid font size value: ${fontSize}. Using default.`);
  return defaultConfig.fontSize;
}

export default memo(MarkdownRenderer);