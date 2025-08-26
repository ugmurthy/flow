/**
 * Main Application Component
 * Refactored for better organization and maintainability
 */

import { useEffect } from 'react';
import { ReactFlow, Background, Controls, Panel, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './index.css';

// Configuration imports
import { initialNodes, initialEdges } from './config/initialNodes.js';
import { nodeTypes, reactFlowStyle } from './config/reactFlowConfig.jsx';
import { APP_METADATA, PANEL_CONFIG, BACKGROUND_CONFIG } from './config/appConstants.js';

// Service imports
import { initializeSchemaSystem } from './services/schemaInitializationService.js';
import nodeDataManager from './services/nodeDataManager.js';

// Component imports
import WorkflowFAB from './components/WorkflowFAB.jsx';
import SaveWorkflowModal from './components/SaveWorkflowModal.jsx';
import LoadWorkflowModal from './components/LoadWorkflowModal.jsx';
import ConfirmationDialog from './components/ConfirmationDialog.jsx';

// Context imports
import { ModalProvider } from './contexts/ModalContext.jsx';
import { WorkflowProvider } from './contexts/WorkflowContext.jsx';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext.jsx';
import { FlowStateProvider } from './contexts/FlowStateContext.jsx';

// Hook imports
import { useWorkflowOperations, useWorkflowLoading } from './hooks/useWorkflowOperations.js';
import { useModalManagement } from './hooks/useModalManagement.js';

// Utility imports
import { createNodeChangeHandler, createEdgeChangeHandler, createConnectionHandler } from './utils/reactFlowEventUtils.js';
import { IntegrationUtils, createEnhancedNodeChangeHandler, createEnhancedEdgeChangeHandler, createEnhancedConnectionHandler } from './services/flowStateIntegration.js';

// Initialize schema system on app load
initializeSchemaSystem();

/**
 * Workflow Management Component (inside ReactFlow)
 * Handles all workflow operations and modal management
 */
function AppContent() {
  // Use custom hooks for workflow operations and modal management
  const {
    currentWorkflowValidity,
    workflows,
    isLoading: workflowLoading,
    error: workflowError,
    handleSaveWorkflow,
    handleDeleteWorkflow,
    handleExportWorkflow,
    handleImportWorkflow,
    handleResetWorkflow,
    getWorkflowStats,
    checkWorkflowNameExists
  } = useWorkflowOperations();

  const {
    confirmDialogData,
    showConfirmDialog,
    handleLoadWorkflow,
    handleLoadConfirmation,
    closeConfirmDialog
  } = useWorkflowLoading();

  const {
    showSaveModal,
    showLoadModal,
    openSaveModal,
    closeSaveModal,
    openLoadModal,
    closeLoadModal
  } = useModalManagement();

  return (
    <div data-workflow-content>
      {/* Workflow FAB */}
      <WorkflowFAB
        onSave={openSaveModal}
        onLoad={openLoadModal}
        onExport={handleExportWorkflow}
        onImport={handleImportWorkflow}
        onReset={handleResetWorkflow}
        hasWorkflow={currentWorkflowValidity.hasWorkflow}
        disabled={workflowLoading}
      />

      {/* Save Workflow Modal */}
      <SaveWorkflowModal
        isOpen={showSaveModal}
        onClose={closeSaveModal}
        onSave={handleSaveWorkflow}
        workflowStats={getWorkflowStats()}
        checkNameExists={checkWorkflowNameExists}
      />

      {/* Load Workflow Modal */}
      <LoadWorkflowModal
        isOpen={showLoadModal}
        onClose={closeLoadModal}
        onLoad={handleLoadWorkflow}
        onDelete={handleDeleteWorkflow}
        workflows={workflows}
        isLoading={workflowLoading}
        error={workflowError}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={handleLoadConfirmation}
        workflow={confirmDialogData?.workflow}
        currentWorkflowStats={confirmDialogData?.currentWorkflowStats}
        type={confirmDialogData?.type || 'load'}
      />
    </div>
  );
}

/**
 * ReactFlow Event Handlers Component
 * Handles NodeDataManager and FlowState integration initialization
 */
function ReactFlowEventHandlers() {
  const { executeWorkflow } = useGlobal();

  // Initialize NodeDataManager and FlowState integration
  useEffect(() => {
    const initializeIntegration = async () => {
      try {
        await nodeDataManager.initialize();
        console.log('NodeDataManager initialized in ReactFlow component');
        
        // Note: FlowStateContext integration will be initialized when the context is available
        console.log('Integration system ready for FlowStateContext connection');
      } catch (error) {
        console.error('Failed to initialize integration systems:', error);
      }
    };
    
    initializeIntegration();
  }, []);

  // Wire up GlobalContext with NodeDataManager whenever executeWorkflow changes
  useEffect(() => {
    nodeDataManager.setGlobalContext({ executeWorkflow });
    console.log(`🔗 GlobalContext wired to NodeDataManager - ExecuteWorkflow: ${executeWorkflow}`);
  }, [executeWorkflow]);

  return null; // This component only handles side effects
}

/**
 * Main App Component with Providers
 * Simplified and organized structure using extracted utilities
 */
export default function App() {
  const defaultViewport = { x: 0, y: 0, zoom: .5 };
  return (
    <GlobalProvider>
      <FlowStateProvider>
        <ModalProvider>
          <div style={reactFlowStyle}>
          <ReactFlow
            defaultNodes={initialNodes}
            defaultEdges={initialEdges}
            onNodesChange={createEnhancedNodeChangeHandler(
              () => {}, // markUnsavedChanges - will be handled by workflow operations hook
              () => {}  // updateWorkflowValidity - will be handled by workflow operations hook
            )}
            onEdgesChange={createEnhancedEdgeChangeHandler(
              () => {}, // markUnsavedChanges - will be handled by workflow operations hook
              () => {}  // updateWorkflowValidity - will be handled by workflow operations hook
            )}
            onConnect={createEnhancedConnectionHandler(
              () => {}, // markUnsavedChanges - will be handled by workflow operations hook
              () => {}  // updateWorkflowValidity - will be handled by workflow operations hook
            )}
            fitView
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
          >
            {/* Application Panels */}
            <Panel 
              position={PANEL_CONFIG.title.position} 
              className={PANEL_CONFIG.title.className}
            >
              {APP_METADATA.title}
            </Panel>
            
            <Panel position={PANEL_CONFIG.version.position}>
              {APP_METADATA.version}
            </Panel>
            
            <Panel 
              position={PANEL_CONFIG.nodeTypes.position} 
              className={PANEL_CONFIG.nodeTypes.className}
            >
              <div className='flex flex-col space-y-2 text-xs text-blue-700 font-medium'>
                <div>Input Nodes</div>
                <div>Process Nodes</div>
                <div>Output Nodes</div>
              </div>
            </Panel>

            {/* Background Layers */}
            <Background 
              variant={BackgroundVariant[BACKGROUND_CONFIG.primary.variant]}
              gap={BACKGROUND_CONFIG.primary.gap}
              color={BACKGROUND_CONFIG.primary.color}
              id={BACKGROUND_CONFIG.primary.id}
            />
            <Background 
              variant={BackgroundVariant[BACKGROUND_CONFIG.secondary.variant]}
              gap={BACKGROUND_CONFIG.secondary.gap}
              color={BACKGROUND_CONFIG.secondary.color}
              id={BACKGROUND_CONFIG.secondary.id}
            />
            
            <Controls />
            
            {/* Initialize NodeDataManager */}
            <ReactFlowEventHandlers />
            
            {/* Workflow Management */}
            <WorkflowProvider>
              <AppContent />
            </WorkflowProvider>
          </ReactFlow>
        </div>
      </ModalProvider>
      </FlowStateProvider>
    </GlobalProvider>
  );
}