import React from 'react'

function ButtonPanel({children}) {
  return (
    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out">
        <div className="flex items-center justify-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 min-w-[200px]">
          {children}  
        </div>
      </div>
  )
}

export default ButtonPanel
