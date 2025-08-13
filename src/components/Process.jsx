import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow ,useEdges, useNodeConnections} from '@xyflow/react';
import { formatFormDataForDisplay, combineObjectValues, formatArrayOfObjects } from '../utils/helpers';
import ViewButton from '../components/ViewButton';

// Component to show connection count as a badge
function ConnectionBadge() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
 
  if (!connections.length) return null;

  return (
    <div className='absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10'>
      {connections.length}
    </div>
  );
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
    <div className="group relative">
      {/* Hover Buttons - Positioned above the node */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <ViewButton
            data={"```json\n"+JSON.stringify(data,null,2)+"```"}
            title="Node Data"
            className="!p-1.5 hover:bg-gray-50"
          />
        </div>
      </div>

      {/* Connection Badge */}
      <ConnectionBadge />

      {/* Main Node Container */}
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-stone-400 bg-white min-w-[200px] relative">
      
            {/* Node Content - Horizontal Layout */}
            <div className="flex items-center gap-3">
              {/* Icon Section */}
              <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
                <span className="text-xl">{data.emoji}</span>
              </div>
              
              {/* Content Section */}
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-gray-900 truncate">{data.label}</div>
                <div className="text-sm text-gray-500 truncate">{data.function}</div>
              </div>
            </div>
   

        {/* React Flow Handles */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !rounded-full !border-2 !border-white"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default Process;
