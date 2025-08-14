import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, Controls, Panel, BackgroundVariant, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
//import './tailwind-config.js';
import './index.css'

import Process from './components/Process.jsx'
import Leaf from './components/Leaf.jsx';
import FormNode from './components/FormNode.jsx';
import FetchNode from './components/FetchNode.jsx';
import MarkdownNode from './components/MarkdownNode.jsx';
import TemplateFormNode from './components/templateFormNode.jsx';
import { ModalProvider } from './contexts/ModalContext.jsx';

const initialNodes = [

  {
    id: 'f1',
    position: { x: 200, y: 50 },
    data: {
      label: "Form Node",
      function: "Dynamic Form",
      emoji: '📝',
      formFields: [
        { name: 'username', type: 'text', label: 'Username', required: true },
        { name: 'email', type: 'email', label: 'Email Address', required: true },
        { name: 'website', type: 'url', label: 'Website URL' },
        { name: 'age', type: 'number', label: 'Age' },
        { name: 'priority', type: 'range', label: 'Priority Level', min: 1, max: 10, step: 1 },
        { name: 'appointment', type: 'datetime-local', label: 'Appointment Date & Time' },
        { name: 'meeting_time', type: 'time', label: 'Meeting Time' },
        { name: 'bio', type: 'textarea', label: 'Biography' },
        { name: 'role', type: 'select', label: 'Role', options: [
          { value: 'admin', label: 'Administrator' },
          { value: 'user', label: 'User' },
          { value: 'guest', label: 'Guest' }
        ]},
        { name: 'user_id', type: 'hidden', label: 'User ID' }
      ],
      formData: {
        priority: 5,
        user_id: ''
      }
    },
    type: 'templateFormNode'
  },
  {
    id: 'f2',
    position: { x: 400, y: 50 },
    data: {
      label: "Advanced Form",
      function: "File & Checkbox Demo",
      emoji: '📋',
      formFields: [
        { name: 'project_name', type: 'text', label: 'Project Name', required: true },
        { name: 'documents', type: 'file', label: 'Upload Documents', multiple: true, accept: '.pdf,.doc,.docx,.txt', required: true },
        { name: 'profile_image', type: 'file', label: 'Profile Image', accept: 'image/*' },
        { name: 'terms_accepted', type: 'checkbox', label: 'I agree to the terms and conditions', required: true },
        { name: 'newsletter_subscribe', type: 'checkbox', label: 'Subscribe to newsletter' },
        { name: 'privacy_consent', type: 'checkbox', label: 'I consent to data processing', required: true },
        { name: 'description', type: 'textarea', label: 'Project Description' }
      ],
      formData: {
        newsletter_subscribe: false,
        terms_accepted: false,
        privacy_consent: false
      }
    },
    type: 'templateFormNode'
  },
  {
    id: 'f3',
    position: { x: 200, y: 200 },
    data: {
      label: "Prompt",
      function: "Input",
      emoji: '🖋️',
      formFields: [
        {name:'max_tokens',type:'hidden'},
        { name: 'prompt', type: 'textarea', label: 'Prompt' },
        { name: 'model', type: 'select', label: 'Model', options: [
          { value: 'llama3.2', label: 'llama3.2' },
          { value: 'gemma3:27b', label: 'gemma3:27b' },
          { value: 'gpt-oss', label: 'gpt-oss' }
        ]}
      ],
      formData: {
        prompt: "",
        model: "gpt-oss",
        max_tokens:4096
      }
    },
    type: 'templateFormNode'
  },
  { id: 'llm-1', position: { x: 100, y: 125 },
  data: {
    label:"Ollama",function:"Inference",  emoji: '⚙️' ,formData:{method:"POST",stream:false,url:"http://localhost:11434/api/chat",options:{},} },
    type:'processNode',} ,
  {
    id: 'fetch-1',
    position: { x: 400, y: 200 },
    data: {
      label: "API Fetch",
      function: "HTTP Request",
      emoji: '🌐',
      formData: {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
        result: null,
        error: null,
        status: 'idle'
      }
    },
    type: 'fetchNode'
  },
  {
    id: 'md-1',
    position: { x: 600, y: 50 },
    data: {
      label: "Markdown Display",
      function: "Renderer",
      emoji: '📝',
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
      styleConfig: {
        width: 'auto',
        textColor: '#374151',
        fontSize: '14px'
      }
    },
    type: 'markdownNode'
  },
  {
    id: 'template-1',
    position: { x: 800, y: 50 },
    data: {
      label: "Template Form",
      function: "Enhanced Form Node",
      emoji: '🎯',
      formFields: [
        { name: 'task_name', type: 'text', label: 'Task Name', required: true },
        { name: 'priority', type: 'select', label: 'Priority', options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]},
        { name: 'due_date', type: 'datetime-local', label: 'Due Date' },
        { name: 'completion', type: 'range', label: 'Completion %', min: 0, max: 100, step: 5 },
        { name: 'notes', type: 'textarea', label: 'Notes' },
        { name: 'active', type: 'checkbox', label: 'Active Task' }
      ],
      formData: {
        priority: 'medium',
        completion: 0,
        active: true
      }
    },
    type: 'templateFormNode'
  },
];
const initialEdges = [
  { id: 'n2-n3', source: 'n3', target: 'n1',label:"generates tweets", animated: true },
  { id: 'n2-n4', source: 'n4', target: 'n1',label:"summarise"  }
  
];
 
export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  

  const onNodesChange = useCallback(
    (changes) => {
      console.log("Node Changes ",changes)
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot))
    },[],);
  const onEdgesChange = useCallback(
    (changes) => {
      console.log("Edge Changes ",changes)
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot))
    },
    [],
  );
  const onConnect = useCallback(
    (params) => {
      console.log("onConnect ",params)
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot))

    },
    [],
  );
 
const nodeTypes = {

  processNode:Process,
  leafNode:Leaf,
  formNode: FormNode,
  fetchNode: FetchNode,
  markdownNode: MarkdownNode,
  templateFormNode: TemplateFormNode,
};

  return (
    <ModalProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
        >
          <Panel position="top-center" className='text-2xl text-blue-500'>JobRunner Workflow</Panel>
          <Panel position="bottom-right">V0.0.1</Panel>
          <Panel position="top-right" className="border-2  border-gray-600 p-2 rounded-lg bg-white w-64">
            <div className='flex flex-col space-y-2 text-xs text-blue-900 font-thin'>
              <div>Input Nodes</div>
              <div>Process Nodes</div>
              <div>Output Nodes</div>
            </div>

          </Panel>
          <Background variant={BackgroundVariant.Lines} gap={10} color="#f1f1f1" id="1"/>
          <Background variant={BackgroundVariant.Lines} gap={100} color="#ccc" id="2"/>
          <Controls />

        </ReactFlow>
        
      </div>
    </ModalProvider>
  );
}