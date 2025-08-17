# Initial Workflow Data Structure

## Complete Initial Nodes and Edges for App.jsx

This file provides the separated initial data structure that should be created as `src/data/initialWorkflowData.ts` and imported into App.jsx.

```typescript
// src/data/initialWorkflowData.ts
import { Node, Edge } from "@xyflow/react";
import { NodeData } from "../types/nodeSchema";

export const initialNodes: Node<NodeData>[] = [
  {
    id: "f1",
    position: { x: 200, y: 50 },
    type: "templateFormNode",
    data: {
      meta: {
        label: "Form Node",
        function: "Dynamic Form",
        emoji: "📝",
        version: "1.0.0",
        category: "input",
        capabilities: ["user-input", "form-validation"],
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            {
              name: "username",
              type: "text",
              label: "Username",
              required: true,
            },
            {
              name: "email",
              type: "email",
              label: "Email Address",
              required: true,
            },
            { name: "website", type: "url", label: "Website URL" },
            { name: "age", type: "number", label: "Age" },
            {
              name: "priority",
              type: "range",
              label: "Priority Level",
              min: 1,
              max: 10,
              step: 1,
            },
            {
              name: "appointment",
              type: "datetime-local",
              label: "Appointment Date & Time",
            },
            { name: "meeting_time", type: "time", label: "Meeting Time" },
            { name: "bio", type: "textarea", label: "Biography" },
            {
              name: "role",
              type: "select",
              label: "Role",
              options: [
                { value: "admin", label: "Administrator" },
                { value: "user", label: "User" },
                { value: "guest", label: "Guest" },
              ],
            },
            { name: "user_id", type: "hidden", label: "User ID" },
          ],
          defaultValues: {
            priority: 5,
            user_id: "",
          },
        },
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },

  {
    id: "f2",
    position: { x: 400, y: 50 },
    type: "templateFormNode",
    data: {
      meta: {
        label: "Advanced Form",
        function: "File & Checkbox Demo",
        emoji: "📋",
        version: "1.0.0",
        category: "input",
        capabilities: ["user-input", "file-upload", "form-validation"],
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            {
              name: "project_name",
              type: "text",
              label: "Project Name",
              required: true,
            },
            {
              name: "documents",
              type: "file",
              label: "Upload Documents",
              multiple: true,
              accept: ".pdf,.doc,.docx,.txt",
              required: true,
            },
            {
              name: "profile_image",
              type: "file",
              label: "Profile Image",
              accept: "image/*",
            },
            {
              name: "terms_accepted",
              type: "checkbox",
              label: "I agree to the terms and conditions",
              required: true,
            },
            {
              name: "newsletter_subscribe",
              type: "checkbox",
              label: "Subscribe to newsletter",
            },
            {
              name: "privacy_consent",
              type: "checkbox",
              label: "I consent to data processing",
              required: true,
            },
            {
              name: "description",
              type: "textarea",
              label: "Project Description",
            },
          ],
          defaultValues: {
            newsletter_subscribe: false,
            terms_accepted: false,
            privacy_consent: false,
          },
        },
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },

  {
    id: "f3",
    position: { x: 200, y: 200 },
    type: "templateFormNode",
    data: {
      meta: {
        label: "Prompt",
        function: "Input",
        emoji: "🖋️",
        version: "1.0.0",
        category: "input",
        capabilities: ["text-input", "llm-prompt"],
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            { name: "max_tokens", type: "hidden" },
            { name: "prompt", type: "textarea", label: "Prompt" },
            {
              name: "model",
              type: "select",
              label: "Model",
              options: [
                { value: "llama3.2", label: "llama3.2" },
                { value: "gemma3:27b", label: "gemma3:27b" },
                { value: "gpt-oss", label: "gpt-oss" },
              ],
            },
          ],
          defaultValues: {
            prompt: "",
            model: "gpt-oss",
            max_tokens: 4096,
          },
        },
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },

  {
    id: "llm-1",
    position: { x: 100, y: 125 },
    type: "processNode",
    data: {
      meta: {
        label: "Ollama",
        function: "Inference",
        emoji: "⚙️",
        version: "1.0.0",
        category: "process",
        capabilities: ["llm-processing", "text-generation"],
      },
      input: {
        connections: {},
        processed: {},
        config: {},
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
      plugin: {
        name: "llm-processor",
        version: "1.0.0",
        config: {
          method: "POST",
          stream: false,
          url: "http://localhost:11434/api/chat",
          options: {},
        },
        state: {},
      },
    },
  },

  {
    id: "fetch-1",
    position: { x: 400, y: 200 },
    type: "fetchNode",
    data: {
      meta: {
        label: "API Fetch",
        function: "HTTP Request",
        emoji: "🌐",
        version: "1.0.0",
        category: "process",
        capabilities: ["http-request", "api-call"],
      },
      input: {
        connections: {},
        processed: {},
        config: {},
      },
      output: {
        data: {
          url: "https://jsonplaceholder.typicode.com/posts/1",
          method: "GET",
          result: null,
          error: null,
        },
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },

  {
    id: "md-1",
    position: { x: 600, y: 50 },
    type: "markdownNode",
    data: {
      meta: {
        label: "Markdown Display",
        function: "Renderer",
        emoji: "📝",
        version: "1.0.0",
        category: "output",
        capabilities: ["markdown-render", "text-display"],
      },
      input: {
        connections: {},
        processed: {
          content: `# Markdown Renderer

## Code Example
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Features
- **Bold** and *italic* text
- Lists and links
- Code blocks with syntax highlighting
- Tables and more!

## Table Example
| Feature | Status |
|---------|--------|
| Headers | ✅ |
| Lists | ✅ |
| Code | ✅ |
| Tables | ✅ |

> This content can be dynamically updated by connecting other nodes!`,
        },
        config: {
          styleConfig: {
            width: "auto",
            textColor: "#374151",
            fontSize: "14px",
          },
        },
      },
      output: {
        data: {
          rendered: true,
        },
        meta: {
          timestamp: new Date().toISOString(),
          status: "success",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },

  {
    id: "template-1",
    position: { x: 800, y: 50 },
    type: "templateFormNode",
    data: {
      meta: {
        label: "Template Form",
        function: "Enhanced Form Node",
        emoji: "🎯",
        version: "1.0.0",
        category: "input",
        capabilities: ["user-input", "form-validation", "task-management"],
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: [
            {
              name: "task_name",
              type: "text",
              label: "Task Name",
              required: true,
            },
            {
              name: "priority",
              type: "select",
              label: "Priority",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ],
            },
            { name: "due_date", type: "datetime-local", label: "Due Date" },
            {
              name: "completion",
              type: "range",
              label: "Completion %",
              min: 0,
              max: 100,
              step: 5,
            },
            { name: "notes", type: "textarea", label: "Notes" },
            { name: "active", type: "checkbox", label: "Active Task" },
          ],
          defaultValues: {
            priority: "medium",
            completion: 0,
            active: true,
          },
        },
      },
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
    },
  },
];

export const initialEdges: Edge[] = [
  // No initial edges - users will create connections
];

// Migration utility to convert old data to new schema
export function migrateOldNodeData(oldNode: any): Node<NodeData> {
  return {
    id: oldNode.id,
    position: oldNode.position,
    type: oldNode.type,
    data: {
      meta: {
        label: oldNode.data.label || "Untitled Node",
        function: oldNode.data.function || "Processing",
        emoji: oldNode.data.emoji || "⚙️",
        version: "1.0.0",
        category: inferCategory(oldNode.type),
        capabilities: inferCapabilities(oldNode.type, oldNode.data),
      },
      input: {
        connections: {},
        processed: {},
        config: {
          formFields: oldNode.data.formFields || [],
          ...oldNode.data.formData,
        },
      },
      output: {
        data: oldNode.data.formData || {},
        meta: {
          timestamp: new Date().toISOString(),
          status: "idle",
        },
      },
      error: {
        hasError: false,
        errors: [],
      },
      plugin: oldNode.data.plugin || undefined,
    },
  };
}

function inferCategory(nodeType: string): "input" | "process" | "output" {
  if (nodeType?.includes("form") || nodeType?.includes("input")) return "input";
  if (nodeType?.includes("markdown") || nodeType?.includes("display"))
    return "output";
  return "process";
}

function inferCapabilities(nodeType: string, data: any): string[] {
  const capabilities: string[] = [];

  if (nodeType?.includes("form")) {
    capabilities.push("user-input", "form-validation");
  }
  if (nodeType?.includes("process")) {
    capabilities.push("data-transformation");
  }
  if (nodeType?.includes("fetch")) {
    capabilities.push("http-request", "api-call");
  }
  if (nodeType?.includes("markdown")) {
    capabilities.push("markdown-render", "text-display");
  }
  if (data?.formFields?.some((f: any) => f.type === "file")) {
    capabilities.push("file-upload");
  }

  return capabilities;
}
```

## How to Use in App.jsx

Replace the current `initialNodes` and `initialEdges` in App.jsx with:

```typescript
// At the top of App.jsx
import { initialNodes, initialEdges, migrateOldNodeData } from './data/initialWorkflowData';

// In the ReactFlow component
<ReactFlow
  defaultNodes={initialNodes}
  defaultEdges={initialEdges}
  // ... rest of props
>
```

## Migration Strategy

For existing workflows, use the migration utility:

```typescript
// Convert old workflow data
const migratedNodes = oldWorkflowNodes.map(migrateOldNodeData);

// Use in ReactFlow
<ReactFlow
  defaultNodes={migratedNodes}
  defaultEdges={initialEdges}
  // ... rest of props
>
```

This separation provides:

- ✅ Clean separation of data from component logic
- ✅ Easy maintenance and updates to initial data
- ✅ Migration utilities for backward compatibility
- ✅ Type safety with the new schema
- ✅ Reusable data structure for testing and development
