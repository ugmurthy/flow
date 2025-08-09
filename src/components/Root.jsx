import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function Root({ data }) {
  console.log("Root ", data)
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
          {data.emoji}
        </div>
        <div className="ml-2">
          <div className="text-lg font-thin">{data.label}</div>
          <div className="text-gray-500">{data.function}</div>
        </div>
      </div>

      
      <Handle
        type="target"
        position={Position.Bottom}
        
      ></Handle>
    </div>
  );
}

export default memo(Root);
