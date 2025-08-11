# Markdown Renderer Implementation

A comprehensive markdown rendering system for React applications with customizable styling and ReactFlow integration.

## Overview

This implementation provides both a standalone `MarkdownRenderer` component and a `MarkdownNode` component for ReactFlow workflows. It supports standard markdown features including headers, text formatting, lists, links, code blocks with syntax highlighting, and tables.

## Components

### 1. MarkdownRenderer (Standalone Component)

A flexible React component that renders markdown content with customizable styling.

#### Features

- ✅ Headers (H1-H6) with proper styling
- ✅ Text formatting (bold, italic, strikethrough)
- ✅ Lists (ordered and unordered, including nested)
- ✅ Links with external link handling
- ✅ Code blocks with syntax highlighting
- ✅ Inline code formatting
- ✅ Tables with responsive design
- ✅ Blockquotes
- ✅ Horizontal rules
- ✅ Error handling and validation
- ✅ Customizable width, text color, and font size

#### Usage

```jsx
import MarkdownRenderer from "./components/MarkdownRenderer";

function MyComponent() {
  const markdownContent = `
# Hello World

This is **bold** and this is *italic*.

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
  `;

  return (
    <MarkdownRenderer
      content={markdownContent}
      width="600px"
      textColor="#374151"
      fontSize="16px"
    />
  );
}
```

#### Props

| Prop        | Type     | Default     | Description                         |
| ----------- | -------- | ----------- | ----------------------------------- |
| `content`   | string   | `''`        | Markdown content to render          |
| `width`     | string   | `'auto'`    | CSS width value                     |
| `textColor` | string   | `'#374151'` | Text color (hex, rgb, named colors) |
| `fontSize`  | string   | `'14px'`    | Font size with CSS units            |
| `className` | string   | `''`        | Additional CSS classes              |
| `onError`   | function | `null`      | Error callback function             |

### 2. MarkdownNode (ReactFlow Integration)

A ReactFlow node component that displays markdown content with interactive styling controls.

#### Features

- ✅ Integrates with ReactFlow workflow system
- ✅ Interactive styling modal (similar to FormNode)
- ✅ Connects to other nodes for dynamic content
- ✅ Real-time content updates from connected nodes
- ✅ Persistent style configuration
- ✅ Visual connection indicators

#### Usage in ReactFlow

```jsx
// Add to nodeTypes in App.jsx
import MarkdownNode from "./components/MarkdownNode";

const nodeTypes = {
  // ... other node types
  markdownNode: MarkdownNode,
};

// Sample node data
const markdownNodeData = {
  id: "md-1",
  position: { x: 100, y: 100 },
  data: {
    label: "Markdown Display",
    function: "Renderer",
    emoji: "📝",
    content: "# Hello\n\nThis is **markdown** content.",
    styleConfig: {
      width: "auto",
      textColor: "#374151",
      fontSize: "14px",
    },
  },
  type: "markdownNode",
};
```

### 3. MarkdownStyleModal (Configuration Interface)

An interactive modal for configuring markdown styling options.

#### Features

- ✅ Width selection (auto, percentages, custom values)
- ✅ Color picker with preset colors
- ✅ Font size slider (10px - 24px)
- ✅ Live preview of changes
- ✅ Validation of input values

## Installation

The implementation uses the following dependencies:

```bash
pnpm add react-markdown react-syntax-highlighter remark-gfm
```

### Dependencies

- `react-markdown`: Core markdown parsing and rendering
- `react-syntax-highlighter`: Code block syntax highlighting
- `remark-gfm`: GitHub Flavored Markdown support (tables, strikethrough, etc.)

## File Structure

```
src/components/
├── MarkdownRenderer.jsx          # Standalone renderer component
├── MarkdownNode.jsx              # ReactFlow node wrapper
├── MarkdownStyleModal.jsx        # Styling configuration modal
└── MarkdownTest.jsx              # Test/demo component
```

## Supported Markdown Features

### Text Formatting

```markdown
**Bold text**
_Italic text_
~~Strikethrough~~
`Inline code`
```

### Headers

```markdown
# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header
```

### Lists

```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Second item
3. Third item
```

### Code Blocks

````markdown
```javascript
function hello() {
  console.log("Hello, World!");
}
```
````

### Tables

```markdown
| Name | Age | City |
| ---- | --- | ---- |
| John | 25  | NYC  |
| Jane | 30  | LA   |
```

### Links and Quotes

```markdown
[Link text](https://example.com)

> This is a blockquote
> with multiple lines
```

## Styling Options

### Width Options

- `auto`: Automatic width based on content
- `25%`, `50%`, `75%`, `100%`: Percentage widths
- Custom values: `400px`, `20rem`, `50vw`, etc.

### Color Options

- Hex colors: `#374151`, `#dc2626`
- RGB/RGBA: `rgb(55, 65, 81)`, `rgba(55, 65, 81, 0.8)`
- HSL/HSLA: `hsl(220, 13%, 24%)`
- Named colors: `red`, `blue`, `green`

### Font Size Options

- Pixel values: `12px`, `14px`, `16px`, `18px`, `20px`, `24px`
- Other units: `1rem`, `1.2em`, `120%`

## Error Handling

The component includes comprehensive error handling:

- **Validation**: Props are validated and sanitized
- **Fallbacks**: Invalid values fall back to defaults
- **Error Display**: Parsing errors are displayed with helpful messages
- **Console Warnings**: Invalid prop values generate console warnings

## Integration with Existing Workflow

The MarkdownNode integrates seamlessly with your existing ReactFlow workflow:

1. **Connections**: Can receive content from other nodes (FormNode, FetchNode, etc.)
2. **Data Flow**: Automatically updates when connected node data changes
3. **Styling**: Follows the same patterns as FormNode with edit modal
4. **Handles**: Uses the same Handle positioning and styling

## Testing

Use the `MarkdownTest` component to test all features:

```jsx
import MarkdownTest from "./components/MarkdownTest";

// Render in your app for testing
<MarkdownTest />;
```

## Performance Considerations

- Components are wrapped with `React.memo` for performance
- Validation functions prevent unnecessary re-renders
- Syntax highlighting is optimized for common languages
- Large markdown content is handled efficiently with scrollable containers

## Browser Compatibility

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Tailwind CSS classes used for styling

## Future Enhancements

Potential improvements for future versions:

- [ ] Math equation support (KaTeX integration)
- [ ] Mermaid diagram support
- [ ] Custom theme system
- [ ] Export functionality (PDF, HTML)
- [ ] Collaborative editing features
- [ ] Plugin system for custom renderers
- [ ] Performance optimizations for very large documents
- [ ] Mobile-responsive improvements
- [ ] Accessibility enhancements
- [ ] Dark mode support

## Troubleshooting

### Common Issues

1. **Syntax highlighting not working**

   - Ensure `react-syntax-highlighter` is installed
   - Check that language names match supported languages

2. **Styles not applying**

   - Verify Tailwind CSS is properly configured
   - Check for CSS conflicts with existing styles

3. **ReactFlow integration issues**

   - Ensure MarkdownNode is added to nodeTypes
   - Check that node data structure matches expected format

4. **Performance issues with large content**
   - Consider implementing virtualization for very large documents
   - Use content pagination for better UX

### Debug Mode

Enable debug logging by setting:

```javascript
localStorage.setItem("markdown-debug", "true");
```

This will log additional information about rendering and validation.
