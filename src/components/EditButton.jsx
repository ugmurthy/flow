import React from 'react'
import Edit from '../icons/Edit';

function EditButton({onEdit}) {
  return (
    
          
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 "
            title="Edit form data"
          >
            <Edit/>
          </button>
  )
}

export default EditButton
