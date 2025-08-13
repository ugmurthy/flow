import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow, useNodeId, useViewport, useEdges, useNodeConnections } from '@xyflow/react';
import { formatFormDataForDisplay } from '../utils/helpers';
import Edit from '../icons/Edit';
import Reset from '../icons/Reset';
import ViewButton from '../components/ViewButton';
import { useModal, MODAL_TYPES } from '../contexts/ModalContext';

// Component to show connection count as a badge
function ConnectionBadge() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
 
  if (!connections.length) return null;

  return (
    <div className='absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10'>
      {connections.length}
    </div>
  );
}

function TemplateFormNode({ data }) {
  const { openModal } = useModal();
  const { updateNodeData, getZoom } = useReactFlow();
  const nodeId = useNodeId();
  const edges = useEdges();
  const intervalRef = useRef(null);
  const previousConnectionCountRef = useRef(0);
  
  const handleOpenModal = useCallback(() => {
    openModal(MODAL_TYPES.FORM_EDIT, {
      formFields: data.formFields || [],
      defaultValues: data.formData || {},
      onSubmit: (formData) => {
        console.log("Form submitted:", nodeId, formData);
        if (nodeId) {
          updateNodeData(nodeId, {
            ...data,
            formData: formData
          });
        }
      }
    });
  }, [openModal, data, nodeId, updateNodeData]);

  // Reset function to clear form data
  const resetFormData = useCallback(() => {
    if (nodeId) {
      updateNodeData(nodeId, {
        ...data,
        formData: {}
      });
    }
  }, [updateNodeData, nodeId, data]);

  // Check for connection changes and reset if no connections
  const checkConnections = useCallback(() => {
    const connectedNodeIds = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);
    
    const currentConnectionCount = connectedNodeIds.length;
    
    // If connections dropped to 0 and we had connections before, reset form data
    if (currentConnectionCount === 0 && previousConnectionCountRef.current > 0) {
      resetFormData();
    }
    
    previousConnectionCountRef.current = currentConnectionCount;
  }, [edges, nodeId, resetFormData]);

  // Set up polling for connection changes
  useEffect(() => {
    checkConnections();
    intervalRef.current = setInterval(checkConnections, 100);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkConnections]);

  // Also check when edges change
  useEffect(() => {
    checkConnections();
  }, [edges, checkConnections]);

  return (
    <div className="group relative">
      {/* Hover Buttons - Positioned above the node */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <ViewButton 
            data={"```json\n"+JSON.stringify(data,null,2)+"```"} 
            title="Node Data"
            className="!p-1.5 hover:bg-gray-50"
          />
          <button
            onClick={resetFormData}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-gray-50"
            title="Reset form data"
          >
            <Reset/>
          </button>
          <button
            onClick={handleOpenModal}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-50"
            title="Edit form data"
          >
            <Edit/>
          </button>
        </div>
      </div>

      {/* Connection Badge */}
      <ConnectionBadge />

      {/* Main Node Container */}
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-stone-400 bg-white min-w-[200px] relative">
        {/* Node Content - Horizontal Layout */}
        <div className="flex items-center gap-3">
          {/* Icon Section */}
          <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
            <span className="text-xl">{data.emoji}</span>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{data.label}</div>
            <div className="text-sm text-gray-500 truncate">{data.function}</div>
          </div>
        </div>

        {/* React Flow Handles */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full !border-2 !border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default memo(TemplateFormNode);