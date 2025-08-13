import React from 'react';
import View from '../icons/View';
import { useModal, MODAL_TYPES } from '../contexts/ModalContext';

function ViewButton({ data, title = "Node Data", className = "" }) {
  const { openModal } = useModal();

  const handleViewClick = () => {
    openModal(MODAL_TYPES.DATA_VIEW, {
      data: data,
      title: title
    });
  };

  return (
    <button
      onClick={handleViewClick}
      className={`inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      title="View Data"
      aria-label="View node data"
    >
      <View />
    </button>
  );
}

export default ViewButton;