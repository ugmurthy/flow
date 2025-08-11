import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow, useNodeId, useViewport, useEdges, useNodeConnections } from '@xyflow/react';
import Modal from './Modal';
import DynamicForm from './DynamicForm';
import { formatFormDataForDisplay } from '../utils/helpers';
import Edit from '../icons/Edit';
import Reset from '../icons/Reset';
import ViewButton from '../components/ViewButton';


// Component to show connection count
function Connections() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
 
  return (
    <div className='text-xs font-thin text-blue-800'>
      {connections.length ? connections.length : ""}
    </div>
  );
}

function FormNode({ data }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { updateNodeData, getZoom } = useReactFlow();
  const nodeId = useNodeId();
  const edges = useEdges();
  const intervalRef = useRef(null);
  const previousConnectionCountRef = useRef(0);
  //const {x,y,zoom} = useViewport()
  //console.log("FormNode x,y,zoom ",x,y,zoom)
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleFormSubmit = useCallback((formData) => {
    console.log("Form submitted:", nodeId, formData);
    if (nodeId) {
      updateNodeData(nodeId, { 
        ...data,
        formData: formData 
      });
    }
    setIsModalOpen(false);
  }, [updateNodeData, nodeId, data]);

  const handleFormCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
    <>
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex">
            <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
              {data.emoji}
            </div>
            <div className="ml-2">
              <div className="text-lg font-bold">{data.label}</div>
              <div className="text-gray-500">{data.function}</div>
              <Connections />
            </div>
          </div>
          
          {/* Edit and Reset buttons */}
          <div className='flex'>
          <ViewButton data={data} title="Node Data" />
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

        {/* Form data display */}
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Form Data:</div>
          <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border">
            {formatFormDataForDisplay(data.formData)}
          </pre>
        </div>

        {/* Debug info (similar to Leaf component) 
        <pre className='text-xs font-thin text-blue-300 mt-2'>
          {nodeId}: {JSON.stringify(data.formData, null, 2)}
        </pre>*/}

        <Handle
          type="target"
          position={Position.Bottom}
          className="w-4 h-4 !bg-teal-200 text-xs font-thin text-center"
        >^</Handle>
        <Handle
          type="source"
          position={Position.Top}
          className="w-4 h-4 !bg-blue-200 text-xs font-thin text-center"
        >v</Handle>
      </div>

      {/* Modal with form */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <DynamicForm
          formFields={data.formFields || []}
          defaultValues={data.formData || {}}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </Modal>
    </>
  );
}

export default memo(FormNode);


/*
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
*/