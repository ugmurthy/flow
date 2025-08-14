import React from 'react';
import Delete from '../icons/Delete';

function DeleteButton({ className = "", onDelete, ...props }) {
  const handleDeleteClick = () => {
    // Simulate backspace keypress
    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      keyCode: 8,
      which: 8,
      bubbles: true,
      cancelable: true
    });

    // Dispatch the event on the currently focused element or document
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      activeElement.dispatchEvent(event);
    } else {
      document.dispatchEvent(event);
    }

    // Call optional onDelete callback
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <button
      onClick={handleDeleteClick}
      className={`inline-flex items-center justify-center p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
      title="Delete"
      aria-label="Delete or backspace"
      {...props}
    >
      <Delete />
    </button>
  );
}

export default DeleteButton;