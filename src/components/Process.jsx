import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow ,useEdges, useNodeConnections} from '@xyflow/react';
import { formatFormDataForDisplay, combineObjectValues, formatArrayOfObjects } from '../utils/helpers';

function Connections() {
  const connections = useNodeConnections({
    handleType:'target',
  })
  console.log("Connections ",connections)
  return (
    <div className='text-xs font-thin text-blue-800'>
      {connections.length?connections.length:""}
    </div>
  )
}

function Process({ data }) {
  const { updateNodeData, getNodes } = useReactFlow();
  const currentNodeId = useNodeId();
  const edges = useEdges(); // use useEdges to react to edge Changes

  const [, forceUpdate] = useState({});
  const intervalRef = useRef(null);
  const previousConnectedDataRef = useRef('');
  
  // get Connected nodes' formData
  const connectedFormData = useCallback(() => {
    const nodes = getNodes(); // Get nodes without subscribing to changes
    const connectedNodeIds = edges
      .filter((edge) => edge.target === currentNodeId)
      .map((edge) => edge.source);

    const formData = connectedNodeIds
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        const new_label = node ? node.data.label + "_" + nodeId : null;
        return new_label ? { [new_label]: node.data.formData } : null;
      })
      .filter(Boolean);
        
    return formData;
  }, [edges, currentNodeId, getNodes]);

  // Check for changes periodically
  const checkForUpdates = useCallback(() => {
    const currentConnectedData = connectedFormData();
    const currentDataString = JSON.stringify(currentConnectedData);
    
    // Only update if the connected data has actually changed
    if (currentDataString !== previousConnectedDataRef.current) {
      previousConnectedDataRef.current = currentDataString;
      const combinedData = combineObjectValues(currentConnectedData);
      //updateNodeData(currentNodeId, { formData: combinedData });
            updateNodeData(currentNodeId, { formData: {...data.formData, ...combinedData} });

      forceUpdate({}); // Force re-render to show updated data
    }
  }, [connectedFormData, updateNodeData, currentNodeId]);
 
  // Set up polling for changes
  useEffect(() => {
    // Initial check
    checkForUpdates();
    
    // Set up interval to check for changes
    intervalRef.current = setInterval(checkForUpdates, 100); // Check every 100ms
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForUpdates]);

  // Also update when edges change
  useEffect(() => {
    checkForUpdates();
  }, [edges, checkForUpdates]);
  

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      
      <details>
        <summary>
            <div className="flex">
            <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
              {data.emoji}
            </div>
            <div className="ml-2">
              <div className="text-lg font-bold">{data.label}</div>
              <div className="text-gray-500">{data.function}</div>
              <Connections/>
            </div>
          </div>
        </summary>
      <div>
      <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border">
                  {formatArrayOfObjects(connectedFormData())}
      </pre>
      <pre className="text-blue-700 text-xs font-thin bg-gray-50 p-2 rounded border">
                  {formatFormDataForDisplay(data.formData)}
      </pre>
      </div>
    </details>


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
