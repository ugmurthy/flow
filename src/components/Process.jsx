import React, { memo } from 'react';
import { Handle, Position, useNodeId, useReactFlow ,useEdges} from '@xyflow/react';
import { formatFormDataForDisplay, combineObjectValues, formatArrayOfObjects } from '../utils/helpers';


function Process({ data }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  const {getNodes, getEdges} = useReactFlow();
  const edges = useEdges(); // use useEdges to react to edge Changes
  // get Connected nodes' formData
  const connectedFormData = () => {
    const nodes = getNodes();
    //const edges = getEdges();
    // find Edges where this node is the target
    const connectedNodeIds = edges
      .filter((edge) => edge.target === currentNodeId)
      .map((edge)=> edge.source);

    // get formdata from connected nodes
    const formData = connectedNodeIds
      .map((nodeId)=> {
        const node = nodes.find((n)=> n.id === nodeId);
        const new_label = node ? node.data.label+"_"+nodeId : null
        return new_label ? {[new_label]:node.data.formData} : null
      })
      .filter(Boolean);
        
    
    return formData;
  }
  

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
          {data.emoji}
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
          <div className="text-gray-500">{data.function}</div>
        </div>
      </div>
     
      <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border">
                  {formatArrayOfObjects(connectedFormData())}
      </pre>
      <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border">
                  {formatFormDataForDisplay(combineObjectValues(connectedFormData()))}
      </pre>
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
  );
}

export default Process;
