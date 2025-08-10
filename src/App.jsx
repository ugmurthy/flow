import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, Controls, Panel, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
//import './tailwind-config.js';
import './index.css'
import  TextUpdateNode  from './components/TextUpdateNode';
import Root from './components/Root'
import Process from './components/Process.jsx'
import Leaf from './components/Leaf.jsx';
import FormNode from './components/FormNode.jsx';
const initialNodes = [
  { id: 't1', position: { x: 0, y: 0 }, data: { label: 'Node 1' },type: 'textUpdater' },
  { id: 'n1', position: { x: -100, y: 50 }, data: { label:"Root",function:"Consolidate",  emoji: '😎'  },type:'rootNode',} ,
  { id: 'n2', position: { x: -100, y: 125 }, data: { label:"Process",function:"Process",  emoji: '⚙️'  },type:'processNode',} ,
  { id: 'n3', position: { x: 100, y: 200 }, data: { label:"Leaf",function:"Input",  emoji: '🍁'  },type:'leafNode',} ,
  { id: 'n4', position: { x: -100, y: 200 }, data: { label:"Leaf",function:"Input",  emoji: '🍁'  },type:'leafNode',} ,
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
    type: 'formNode'
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
    type: 'formNode'
  },
  {
    id: 'f3',
    position: { x: 200, y: 200 },
    data: {
      label: "Prompt",
      function: "Input",
      emoji: '🖋️',
      formFields: [
        { name: 'prompt', type: 'textarea', label: 'Prompt' },
        { name: 'model', type: 'select', label: 'Model', options: [
          { value: 'llama3.2', label: 'llama3.2' },
          { value: 'gemma3:27b', label: 'gemma3:27b' },
          { value: 'gpt-oss', label: 'gpt-oss' }
        ]},
      
      ],
      formData: {
        prompt: "",
        model: "gpt-oss"
      }
    },
    type: 'formNode'
  },
];
const initialEdges = [
  { id: 'n2-n3', source: 'n3', target: 'n2',label:"generates tweets", animated: true },
  { id: 'n2-n4', source: 'n4', target: 'n2',label:"summarise"  }
  
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
  textUpdater: TextUpdateNode,
  rootNode: Root,
  processNode:Process,
  leafNode:Leaf,
  formNode: FormNode,
};

  return (
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
        <Background variant={BackgroundVariant.Lines} gap={10} color="#f1f1f1" id="1"/>
        <Background variant={BackgroundVariant.Lines} gap={100} color="#ccc" id="2"/>
        <Controls />
      </ReactFlow>
      
    </div>
  );
}