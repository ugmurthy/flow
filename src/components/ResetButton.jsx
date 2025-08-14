import React from 'react'
import Reset from '../icons/Reset';

function ResetButton({onReset}) {
  return (
   <button
            onClick={onReset}
            className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 hover:bg-red-50 hover:text-red-400 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 "
            title="Reset form data"
          >
            <Reset/>
          </button>
  )
}

export default ResetButton
