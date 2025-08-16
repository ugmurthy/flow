/**
 * Form Node Component - Updated for New Schema
 * Uses the new NodeData schema and event-driven updates instead of 100ms polling
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from '@xyflow/react';
import { InputNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import ViewButton from '../components/ViewButton';
import { useModal, MODAL_TYPES } from '../contexts/ModalContext';
import Edit from '../icons/Edit';
import Reset from '../icons/Reset';

// Component to show connection count
function Connections({ connectionCount }) {
  return (
    <div className='text-xs font-thin text-blue-800'>
      {connectionCount ? connectionCount : ""}
    </div>
  );
}

function FormNodeNew({ data, selected }) {
  const { openModal } = useModal();
  const { updateNodeData } = useReactFlow();
  const nodeId = useNodeId();
  const [nodeData, setNodeData] = useState(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('idle');

  // Initialize node with new schema
  useEffect(() => {
    const initializeNode = async () => {
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
            label: data.label || 'Form Node',
            function: data.function || 'Dynamic Form',
            emoji: data.emoji || '📝',
            description: 'Collects user input through dynamic forms'
          },
          input: {
            config: {
              formFields: data.formFields || [],
              validation: {},
              allowExternalData: true
            }
          },
          output: {
            data: data.formData || {}
          }
        });
      }

      setNodeData(newNodeData);

      // Register with node data manager - use a wrapper to prevent infinite loops
      const safeUpdateNodeData = (nodeId, updates) => {
        // Only update React Flow if the update is not coming from our own component
        if (nodeId === nodeId && updates.data) {
          updateNodeData(nodeId, updates);
        }
      };
      
      nodeDataManager.registerNode(nodeId, newNodeData, safeUpdateNodeData);
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(nodeId);
    };
  }, [nodeId, updateNodeData]);

  // Listen to node data events
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === nodeId) {
        setNodeData(event.detail.nodeData);
        setProcessingStatus(event.detail.nodeData.output.meta.status);
      }
    };

    const handleConnectionAdded = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => prev + 1);
      }
    };

    const handleConnectionRemoved = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => Math.max(0, prev - 1));
        // Reset form data when all connections are removed
        if (connectionCount <= 1) {
          resetFormData();
        }
      }
    };

    // Add event listeners
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);

    return () => {
      // Remove event listeners
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);
    };
  }, [nodeId, connectionCount]);

  const handleOpenModal = useCallback(() => {
    if (!nodeData) return;

    openModal(MODAL_TYPES.FORM_EDIT, {
      formFields: nodeData.input.config.formFields || [],
      defaultValues: nodeData.output.data || {},
      onSubmit: async (formData) => {
        console.log("Form submitted:", nodeId, formData);
        
        // Update node data using the new schema
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
      }
    });
  }, [openModal, nodeData, nodeId]);

  // Reset function to clear form data
  const resetFormData = useCallback(async () => {
    if (!nodeData) return;

    await nodeDataManager.updateNodeData(nodeId, {
      output: {
        data: {},
        meta: {
          timestamp: new Date().toISOString(),
          status: 'idle'
        }
      }
    }, true); // Trigger processing of connected nodes
  }, [nodeId, nodeData]);

  // Format form data for display
  const formatFormDataForDisplay = (formData) => {
    if (!formData || Object.keys(formData).length === 0) {
      return "No form data";
    }
    
    return Object.entries(formData)
      .map(([key, value]) => ` ${key}: ${value}`)
      .join('\n');
  };

  if (!nodeData) {
    return (
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-gray-300 bg-gray-100">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400 bg-white">
        <details>
          <summary> 
            <div className="flex items-start justify-between">
              <div className="flex">
                <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
                  {nodeData.meta.emoji}
                </div>
                <div className="ml-2">
                  <div className="text-lg font-bold">{nodeData.meta.label}</div>
                  <div className="text-gray-500">{nodeData.meta.function}</div>
                  <Connections connectionCount={connectionCount} />
                  
                  {/* Processing Status */}
                  <div className="text-xs text-gray-400 mt-1">
                    Status: {processingStatus}
                  </div>
                </div>
              </div>
              
              {/* Edit and Reset buttons */}
              <div className='flex'>
                <ViewButton 
                  data={`\`\`\`json\n${JSON.stringify(nodeData, null, 2)}\`\`\``} 
                  title="Node Data (New Schema)" 
                />
                <button
                  onClick={resetFormData}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-gray-100"
                  title="Reset form data"
                >
                  <Reset/>
                </button>
                <button
                  onClick={handleOpenModal}
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                  title="Edit form data"
                >
                  <Edit/>
                </button>
              </div>
            </div>
          </summary>
          
          {/* Form data display */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-1">Form Data:</div>
            <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border">
              {formatFormDataForDisplay(nodeData.output.data)}
            </pre>
          </div>

          {/* Input Summary */}
          {Object.keys(nodeData.input.processed || {}).length > 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-medium text-blue-800">Connected Inputs:</div>
              <div className="text-blue-600 mt-1">
                {Object.keys(nodeData.input.processed).length} source(s) connected
              </div>
            </div>
          )}

          {/* Schema Info */}
          <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
            <div className="font-medium text-purple-800">Schema Info:</div>
            <div className="text-purple-600 mt-1">
              Category: {nodeData.meta.category} | Version: {nodeData.meta.version}
            </div>
            {nodeData.meta.capabilities && nodeData.meta.capabilities.length > 0 && (
              <div className="text-purple-600 mt-1">
                Capabilities: {nodeData.meta.capabilities.join(', ')}
              </div>
            )}
          </div>
        </details>
       
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full"
        />
      </div>
    </>
  );
}

export default memo(FormNodeNew);