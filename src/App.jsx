import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './tailwind-config.js';

import  TextUpdateNode  from './components/TextUpdateNode';
import Root from './components/Root'
import Process from './components/Process.jsx'
import Leaf from './components/Leaf.jsx';
const initialNodes = [
  { id: 't1', position: { x: 0, y: 0 }, data: { label: 'Node 1' },type: 'textUpdater' },
  { id: 'n1', position: { x: -100, y: 50 }, data: { label:"Root",function:"Consolidate",  emoji: '😎'  },type:'rootNode',} ,
  { id: 'n2', position: { x: -100, y: 125 }, data: { label:"Process",function:"Process",  emoji: '⚙️'  },type:'processNode',} ,
  { id: 'n3', position: { x: 100, y: 200 }, data: { label:"Leaf",function:"Input",  emoji: '🍁'  },type:'leafNode',} ,
  { id: 'n4', position: { x: -100, y: 200 }, data: { label:"Leaf",function:"Input",  emoji: '🍁'  },type:'leafNode',} ,
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
        <Background />
        <Controls />
      </ReactFlow>
      
    </div>
  );
}