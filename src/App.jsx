import { useState, useCallback, useEffect } from 'react';
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
import WorkflowFAB from './components/WorkflowFAB.jsx';
import SaveWorkflowModal from './components/SaveWorkflowModal.jsx';
import LoadWorkflowModal from './components/LoadWorkflowModal.jsx';
import ConfirmationDialog from './components/ConfirmationDialog.jsx';
import { ModalProvider } from './contexts/ModalContext.jsx';
import { WorkflowProvider, useWorkflow } from './contexts/WorkflowContext.jsx';
import { GlobalProvider } from './contexts/GlobalContext.jsx';

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
  
];
 
// Workflow Management Component (inside ReactFlow)
function AppContent() {
  const { getNodes, getEdges, getViewport } = useReactFlow();
  
  // Workflow context
  const {
    workflows,
    isLoading: workflowLoading,
    error: workflowError,
    saveWorkflow,
    loadWorkflow,
    deleteWorkflow,
    checkWorkflowNameExists,
    getCurrentWorkflowValidity,
    getCurrentCanvasStats,
    getWorkflowStats,
    markUnsavedChanges
  } = useWorkflow();

  // Modal states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState(null);
  
  // Real-time workflow validity state
  const [currentWorkflowValidity, setCurrentWorkflowValidity] = useState({ hasWorkflow: false });

  // Update workflow validity when React Flow state changes
  const updateWorkflowValidity = useCallback(() => {
    const validity = getCurrentWorkflowValidity();
    setCurrentWorkflowValidity(validity);
    
    // Minimal debug logging
    console.log('FAB Update - Workflow Valid:', validity.hasWorkflow,
      `(${validity.nodeCount || 0} connected nodes, ${validity.edgeCount || 0} edges)`);
  }, [getCurrentWorkflowValidity]);

  // Listen to React Flow state changes
  useEffect(() => {
    updateWorkflowValidity();
  }, [updateWorkflowValidity]);

  // Track changes for unsaved changes detection and workflow validity updates
  const onNodesChange = useCallback((changes) => {
    markUnsavedChanges();
    // Trigger workflow validity update after state change
    setTimeout(updateWorkflowValidity, 0);
  }, [markUnsavedChanges, updateWorkflowValidity]);

  const onEdgesChange = useCallback((changes) => {
    markUnsavedChanges();
    // Trigger workflow validity update after state change
    setTimeout(updateWorkflowValidity, 0);
  }, [markUnsavedChanges, updateWorkflowValidity]);

  const onConnect = useCallback((connection) => {
    markUnsavedChanges();
    // Trigger workflow validity update after connection
    setTimeout(updateWorkflowValidity, 0);
  }, [markUnsavedChanges, updateWorkflowValidity]);

  // Handle Save Workflow
  const handleSaveWorkflow = useCallback(async ({ name, description }) => {
    try {
      const result = await saveWorkflow({ name, description });
      console.log('Workflow saved successfully:', result.workflowId);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  }, [saveWorkflow]);

  // Handle Load Workflow
  const handleLoadWorkflow = useCallback((workflow) => {
    const currentStats = getCurrentCanvasStats();
    
    if (currentStats.nodeCount > 0) {
      // Show confirmation dialog
      setConfirmDialogData({
        type: 'load',
        workflow,
        currentWorkflowStats: currentStats
      });
      setShowConfirmDialog(true);
    } else {
      // No current workflow, load directly
      loadWorkflow(workflow, 'replace');
    }
  }, [getCurrentCanvasStats, loadWorkflow]);

  // Handle Load Confirmation
  const handleLoadConfirmation = useCallback(async (action) => {
    if (confirmDialogData?.workflow) {
      try {
        await loadWorkflow(confirmDialogData.workflow, action);
        console.log(`Workflow loaded with action: ${action}`);
      } catch (error) {
        console.error('Failed to load workflow:', error);
      }
    }
    setConfirmDialogData(null);
  }, [confirmDialogData, loadWorkflow]);

  // Handle Delete Workflow
  const handleDeleteWorkflow = useCallback(async (workflowId) => {
    try {
      await deleteWorkflow(workflowId);
      console.log('Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      throw error;
    }
  }, [deleteWorkflow]);

  // Handle Export Workflow
  const handleExportWorkflow = useCallback(() => {
    try {
      const nodes = getNodes();
      const edges = getEdges();
      const viewport = getViewport();
      
      // Check if there's a valid workflow to export
      const validity = getCurrentWorkflowValidity();
      if (!validity.hasWorkflow) {
        console.warn('No valid workflow to export');
        return;
      }

      // Create a workflow object for export
      const exportData = {
        id: `export_${Date.now()}`,
        name: `Exported Workflow ${new Date().toLocaleDateString()}`,
        description: 'Exported from JobRunner Workflow',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        metadata: {
          nodeCount: validity.nodeCount,
          edgeCount: validity.edgeCount,
          nodeTypes: [...new Set(nodes.filter(n =>
            edges.some(e => e.source === n.id || e.target === n.id)
          ).map(n => n.type))]
        },
        workflow: {
          nodes: nodes.filter(n =>
            edges.some(e => e.source === n.id || e.target === n.id)
          ),
          edges,
          viewport
        }
      };

      // Create and download the file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Workflow exported successfully');
    } catch (error) {
      console.error('Failed to export workflow:', error);
    }
  }, [getNodes, getEdges, getViewport, getCurrentWorkflowValidity]);

  // Handle Import Workflow
  const handleImportWorkflow = useCallback(() => {
    // This would typically import a workflow from file
    console.log('Import workflow functionality to be implemented');
  }, []);

  // Handle Reset Workflow
  const handleResetWorkflow = useCallback(() => {
    // This would typically reset the current workflow
    console.log('Reset workflow functionality to be implemented');
  }, []);

  // Use real-time workflow validity state for FAB

  // Listen to React Flow events from main component
  useEffect(() => {
    const handleNodesChanged = () => updateWorkflowValidity();
    const handleEdgesChanged = () => updateWorkflowValidity();
    const handleConnected = () => updateWorkflowValidity();

    const element = document.querySelector('[data-workflow-content]');
    if (element) {
      element.addEventListener('nodesChanged', handleNodesChanged);
      element.addEventListener('edgesChanged', handleEdgesChanged);
      element.addEventListener('connected', handleConnected);

      return () => {
        element.removeEventListener('nodesChanged', handleNodesChanged);
        element.removeEventListener('edgesChanged', handleEdgesChanged);
        element.removeEventListener('connected', handleConnected);
      };
    }
  }, [updateWorkflowValidity]);

  return (
    <div data-workflow-content>
      {/* Workflow FAB */}
      <WorkflowFAB
        onSave={() => setShowSaveModal(true)}
        onLoad={() => setShowLoadModal(true)}
        onExport={handleExportWorkflow}
        onImport={handleImportWorkflow}
        onReset={handleResetWorkflow}
        hasWorkflow={currentWorkflowValidity.hasWorkflow}
        disabled={workflowLoading}
      />

      {/* Save Workflow Modal */}
      <SaveWorkflowModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveWorkflow}
        workflowStats={currentWorkflowValidity.hasWorkflow ? {
          nodeCount: currentWorkflowValidity.nodeCount,
          edgeCount: currentWorkflowValidity.edgeCount,
          nodeTypes: [...new Set(getNodes().filter(n =>
            getEdges().some(e => e.source === n.id || e.target === n.id)
          ).map(n => n.type))]
        } : null}
        checkNameExists={checkWorkflowNameExists}
      />

      {/* Load Workflow Modal */}
      <LoadWorkflowModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadWorkflow}
        onDelete={handleDeleteWorkflow}
        workflows={workflows}
        isLoading={workflowLoading}
        error={workflowError}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setConfirmDialogData(null);
        }}
        onConfirm={handleLoadConfirmation}
        workflow={confirmDialogData?.workflow}
        currentWorkflowStats={confirmDialogData?.currentWorkflowStats}
        type={confirmDialogData?.type || 'load'}
      />
    </div>
  );
}

// Main App with Providers
export default function App() {
  return (
    <GlobalProvider>
      <ModalProvider>
        <div style={{ width: '100vw', height: '100vh' }}>
          <ReactFlow
          defaultNodes={initialNodes}
          defaultEdges={initialEdges}
          onNodesChange={(changes) => {
            // Let React Flow handle the changes first, then trigger our handlers
            setTimeout(() => {
              const appContent = document.querySelector('[data-workflow-content]');
              if (appContent) {
                appContent.dispatchEvent(new CustomEvent('nodesChanged', { detail: changes }));
              }
            }, 0);
          }}
          onEdgesChange={(changes) => {
            // Let React Flow handle the changes first, then trigger our handlers
            setTimeout(() => {
              const appContent = document.querySelector('[data-workflow-content]');
              if (appContent) {
                appContent.dispatchEvent(new CustomEvent('edgesChanged', { detail: changes }));
              }
            }, 0);
          }}
          onConnect={(connection) => {
            // Let React Flow handle the connection first, then trigger our handlers
            setTimeout(() => {
              const appContent = document.querySelector('[data-workflow-content]');
              if (appContent) {
                appContent.dispatchEvent(new CustomEvent('connected', { detail: connection }));
              }
            }, 0);
          }}
          fitView
          nodeTypes={{
            processNode: Process,
            leafNode: Leaf,
            formNode: FormNode,
            fetchNode: FetchNode,
            markdownNode: MarkdownNode,
            templateFormNode: TemplateFormNode,
          }}
        >
          <Panel position="top-center" className='text-2xl text-blue-500'>JobRunner Workflow</Panel>
          <Panel position="bottom-right">V0.1.0</Panel>
          <Panel position="top-right" className="border-2 border-gray-600 p-2 rounded-lg bg-white w-64">
            <div className='flex flex-col space-y-2 text-xs text-blue-900 font-thin'>
              <div>Input Nodes</div>
              <div>Process Nodes</div>
              <div>Output Nodes</div>
            </div>
          </Panel>
          <Background variant={BackgroundVariant.Lines} gap={10} color="#f1f1f1" id="1"/>
          <Background variant={BackgroundVariant.Lines} gap={100} color="#ccc" id="2"/>
          <Controls />
          
          <WorkflowProvider>
            <AppContent />
          </WorkflowProvider>
        </ReactFlow>
      </div>
    </ModalProvider>
  </GlobalProvider>
  );
}