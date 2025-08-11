import React, { useState } from 'react';
import View from '../icons/View';
import ViewDataModal from './ViewDataModal';

function ViewButton({ data, title = "Node Data", className = "" }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleViewClick}
        className={`inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        title="View Data"
        aria-label="View node data"
      >
        <View />
      </button>
      
      <ViewDataModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={data}
        title={title}
      />
    </>
  );
}

export default ViewButton;