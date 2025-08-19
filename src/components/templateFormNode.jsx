import React, { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from '@xyflow/react';
import { InputNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { formatFormDataForDisplay } from '../utils/helpers';
import Edit from '../icons/Edit';

import ViewButton from '../components/ViewButton';
import DeleteButton from './DeleteButton';
import ResetButton from './ResetButton'
import { useModal, MODAL_TYPES } from '../contexts/ModalContext';
import { useGlobal } from '../contexts/GlobalContext';
import EditButton from './EditButton';
import ButtonPanel from './ButtonPanel';

// Component to show connection count as a badge
function ConnectionBadge({ connectionCount }) {
  if (!connectionCount) return null;

  return (
    <div className='absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10'>
      {connectionCount}
    </div>
  );
}

function TemplateFormNode({ data }) {
  const { openModal } = useModal();
  const { executeWorkflow } = useGlobal();
  const { updateNodeData } = useReactFlow();
  const nodeId = useNodeId();
  
  // Use FlowState hooks for optimized subscriptions
  const flowState = useFlowState();
  const nodeData = useFlowStateNode(nodeId);
  const processingNodes = useFlowStateProcessing();
  
  // Local state for UI-specific data
  const [connectionCount, setConnectionCount] = useState(0);
  const [localProcessingStatus, setLocalProcessingStatus] = useState('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state
  const isProcessing = processingNodes.has(nodeId);
  const processingStatus = isProcessing ? 'processing' :
    (nodeData?.output?.meta?.status || localProcessingStatus);

  // Initialize node with new schema
  useEffect(() => {
    const initializeNode = async () => {
      const measurement = performanceMonitor.startMeasurement('nodeInitialization');
      
      try {
        // Ensure node data manager is initialized
        await nodeDataManager.initialize();

        // Convert old data format to new schema if needed
        let newNodeData;
        if (data.meta && data.input && data.output && data.error) {
          // Already in new format
          newNodeData = data;
        } else {
          // Convert from old format
          newNodeData = InputNodeData.create({
            meta: {
              label: data.label || 'Template Form Node',
              function: data.function || 'Dynamic Form Template',
              emoji: data.emoji || '📝',
              description: 'Template form node for collecting user input'
            },
            formFields: data.formFields || [],
            input: {
              config: {
                validation: {},
                allowExternalData: true
              }
            },
            output: {
              data: data.formData || {}
            }
          });
        }

        // Update FlowState with new node data
        flowState.updateNode(nodeId, {
          id: nodeId,
          type: 'templateFormNode',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });

        // Initialize local state
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');

        console.log(`[Form Node] Node ${nodeId} initialized with FlowState integration`);

        // Register with node data manager with optimized callback
        const safeUpdateNodeData = (updateNodeId, updates) => {
          // Only update React Flow if the update is not coming from our own component
          if (updateNodeId === nodeId && updates.data) {
            updateNodeData(updateNodeId, updates);
          }
        };
        
        nodeDataManager.registerNode(nodeId, newNodeData, safeUpdateNodeData);
        
        performanceMonitor.endMeasurement(measurement);
      } catch (error) {
        performanceMonitor.endMeasurement(measurement);
        console.error('Error initializing form node:', error);
      }
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(nodeId);
    };
  }, [nodeId, updateNodeData]);

  // Reset function to clear form data (moved up to avoid hoisting issues)
  const resetFormData = useCallback(async () => {
    if (!nodeData) return;

    try {
      await nodeDataManager.updateNodeData(nodeId, {
        output: {
          data: {},
          meta: {
            timestamp: new Date().toISOString(),
            status: 'idle'
          }
        },
        error: {
          hasError: false,
          errors: []
        }
      }, true); // Trigger processing of connected nodes
    } catch (error) {
      console.error("Failed to reset form data:", error);
    }
  }, [nodeId, nodeData]);

  // Listen to node data events (optimized)
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === nodeId) {
        const updatedNodeData = event.detail.nodeData;
        console.log(`[Form Node][${nodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        setLocalProcessingStatus(newStatus);
        
        console.log(`[Form Node][${nodeId}] Local state updated - Status: ${newStatus}`);
      }
    };

    const handleConnectionAdded = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => prev + 1);
        console.log(`[Form Node][${nodeId}] Connection added, count: ${connectionCount + 1}`);
      }
    };

    const handleConnectionRemoved = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => Math.max(0, prev - 1));
        // Reset form data when all connections are removed
        if (connectionCount <= 1) {
          resetFormData();
        }
        console.log(`[Form Node][${nodeId}] Connection removed, count: ${Math.max(0, connectionCount - 1)}`);
      }
    };

    // Add event listeners (reduced to essential events)
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);

    return () => {
      // Remove event listeners
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);
    };
  }, [nodeId, connectionCount, resetFormData]);

  const handleOpenModal = useCallback(() => {
    if (!nodeData) return;

    openModal(MODAL_TYPES.FORM_EDIT, {
      formFields: nodeData.input.config.formFields || [],
      defaultValues: nodeData.output.data || {},
      isSubmitting,
      onSubmit: async (formData) => {
        setIsSubmitting(true);
        try {
          console.log("Form submitted:", nodeId, formData);
          
          // Set processing status through FlowState
          flowState.setNodeProcessing(nodeId, true);
          
          // Set processing status first
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              meta: {
                timestamp: new Date().toISOString(),
                status: 'processing'
              }
            }
          });
          
          // Update with actual data
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              data: formData,
              meta: {
                timestamp: new Date().toISOString(),
                status: 'success',
                dataSize: JSON.stringify(formData).length
              }
            }
          }, true); // Trigger processing of connected nodes
          
        } catch (error) {
          console.error("Form submission failed:", error);
          
          // Set error status
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              meta: {
                timestamp: new Date().toISOString(),
                status: 'error'
              }
            },
            error: {
              hasError: true,
              errors: [{
                code: 'FORM_SUBMISSION_ERROR',
                message: error.message,
                source: 'form-submission',
                timestamp: new Date().toISOString(),
                details: error.stack
              }]
            }
          });
          
          throw error; // Re-throw to handle in modal
        } finally {
          setIsSubmitting(false);
          // Clear processing status
          flowState.setNodeProcessing(nodeId, false);
        }
      }
    });
  }, [openModal, nodeData, nodeId, isSubmitting, flowState, resetFormData]);
  console.log("Form Component ",nodeData)
  if (!nodeData) {
    return (
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-gray-300 bg-gray-100">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Hover Buttons - Positioned above the node */}
      <ButtonPanel>
           <ViewButton
            data={"```json\n"+JSON.stringify(nodeData,null,2)+"```"}
            title="Node Data (New Schema)"
            className=" hover:bg-gray-100"
          />
          <DeleteButton
            className=" hover:bg-red-50"
            title="Delete Node"
          />
          <ResetButton onReset={resetFormData}/>
          <EditButton onEdit={handleOpenModal}/>
         
      </ButtonPanel>
     
         

      {/* Connection Badge */}
      <ConnectionBadge connectionCount={connectionCount} />

      {/* Main Node Container */}
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-stone-400 bg-white min-w-[200px] relative">
        {/* Node Content - Horizontal Layout */}
        <div className="flex items-center gap-3">
          {/* Icon Section */}
          <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
            <span className="text-xl">{nodeData.meta.emoji}</span>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{nodeData.meta.label}</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 truncate">{nodeData.meta.function}</div>
              {/* Processing Status Indicator */}
              <div
                className={`w-3 h-3 rounded-full ${
                  processingStatus === 'success' ? 'bg-green-500' :
                  processingStatus === 'processing' ? 'bg-yellow-500' :
                  processingStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}
                title={`Status: ${processingStatus}`}
              />
              {/* Execution Status Indicator */}
              <div
                className={`w-3 h-3 rounded-full ${executeWorkflow ? 'bg-green-500' : 'bg-red-500'}`}
                title={`Execution: ${executeWorkflow ? 'Enabled' : 'Disabled'}`}
              />
            </div>
            
            {/* Connection Count Display */}
            {connectionCount > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
              </div>
            )}
            
            {/* Form Data Preview */}
            {/*nodeData.output.data && Object.keys(nodeData.output.data).length > 0 && (
              <div className="text-xs text-green-600 mt-1 truncate">
                Data: {formatFormDataForDisplay(nodeData.output.data)}
              </div>
            )*/}
            
            {/* Schema Info */}
            <div className="text-xs text-purple-600 mt-1">
              {nodeData.meta.category} | v{nodeData.meta.version}
            </div>
          </div>
        </div>

        {/* React Flow Handles */}
        {/*<Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-orange-500 !rounded-full !border-2 !border-white"
        />*/}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full !border-2 !border-white"
        />
        
      </div>
    </div>
  );
}

export default memo(TemplateFormNode);

