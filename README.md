# JobRunner Workflow

A React Flow-based workflow builder with dynamic form nodes for creating interactive job processing pipelines.

## Features

- **Interactive Workflow Canvas**: Drag-and-drop interface using React Flow
- **Dynamic Form Nodes**: Configurable form nodes with various input types
- **Multiple Node Types**: Root, Process, Leaf, and Form nodes
- **Real-time Form Editing**: Modal-based form editing with live preview
- **File Upload Support**: file uploads with validation
- **Form Validation**: Built-in validation using react-hook-form

## Tech Stack

- React 19.1.0
- React Flow (@xyflow/react)
- React Hook Form
- Tailwind CSS
- Vite

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Node Types

- **Root Node** (😎): End Node : Work in Progress.
- **Process Node** (⚙️): Processing steps with connections
- **Leaf Node** (🍁): Input node (may be removed in future in view of form nodes)
- **Form Node** (📝): Dynamic forms with various field types

## Form Field Types

Text, Email, URL, Number, Textarea, Select, Range, DateTime, Time, File Upload, Checkbox, Hidden

## Project Structure

```
src/
├── components/
│   ├── DynamicForm.jsx    # Dynamic form generator
│   ├── FormNode.jsx       # Form node component
│   ├── Process.jsx        # Process node component
│   ├── Root.jsx          # Root node component
│   ├── Leaf.jsx          # Leaf node component
│   └── Modal.jsx         # Modal wrapper
├── utils/
│   └── helpers.js        # Utility functions
└── App.jsx              # Main application
```

## License

MIT
