import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from '@xyflow/react';
import Modal from './Modal';
import DynamicForm from './DynamicForm';
import { formatFormDataForDisplay } from '../utils/helpers';

function FormNode({ data }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { updateNodeData } = useReactFlow();
  const nodeId = useNodeId();

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
            </div>
          </div>
          
          {/* Edit button */}
          <button
            onClick={handleOpenModal}
            className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
            title="Edit form data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
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
          type="source"
          position={Position.Top}
        />
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