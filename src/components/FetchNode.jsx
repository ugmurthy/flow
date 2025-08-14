import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow, useEdges, useNodeConnections } from '@xyflow/react';
import { formatFormDataForDisplay, combineObjectValues, formatArrayOfObjects } from '../utils/helpers';
import Reset from '../icons/Reset';
import ConnectionBadge from './ConnectionBadge';
import ViewButton from './ViewButton';
function FetchNode({ data }) {
  const { updateNodeData, getNodes } = useReactFlow();
  const currentNodeId = useNodeId();
  const edges = useEdges();

  const [, forceUpdate] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const intervalRef = useRef(null);
  const previousConnectedDataRef = useRef('');

  console.log("FetchNode ",data)
  // get Connected nodes' formData
  const connectedFormData = useCallback(() => {
    const nodes = getNodes();
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

  // Check if all required data is available
  const allDataAvailable = useCallback(() => {
    const connectedData = connectedFormData();
    const combinedData = combineObjectValues(connectedData);
    const formData = { ...data.formData, ...combinedData };
    
    return formData.prompt &&
           formData.url &&
           formData.max_tokens &&
           formData.method &&
           formData.model &&
           formData.prompt !== null &&
           formData.url !== null &&
           formData.max_tokens !== null &&
           formData.method !== null &&
           formData.model !== null;
  }, [connectedFormData, data.formData]);

  // Fetch API function
  const performFetch = useCallback(async () => {
    const connectedData = connectedFormData();
    const combinedData = combineObjectValues(connectedData);
    const formData = { ...data.formData, ...combinedData };

    if (!allDataAvailable()) {
      setFetchStatus('error');
      updateNodeData(currentNodeId, {
        formData: {
          ...data.formData,
          error: 'Missing required data: prompt, url, max_tokens, method, model',
          result: null,
          status: 'error'
        }
      });
      return;
    }

    setIsLoading(true);
    setFetchStatus('loading');
    
    try {
      // Construct body for the fetch request
      const requestBody = {
        model: formData.model,
        max_tokens: formData.max_tokens,
        stream: false,
        messages: [
          {
            role: 'user',
            content: formData.prompt
          }
        ]
      };
      console.log("fetchbody ",requestBody)
      const fetchOptions = {
        method: formData.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      };
      console.log("fetchOptions ",fetchOptions)
      const response = await fetch(formData.url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Extract message.content from response
      const extractedResult = result?.message?.content || result;
      
      setFetchStatus('success');
      updateNodeData(currentNodeId, {
        formData: {
          ...data.formData,
          result: extractedResult,
          error: null,
          status: 'success',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Fetch error:', error);
      setFetchStatus('error');
      updateNodeData(currentNodeId, {
        formData: {
          ...data.formData,
          result: null,
          error: error.message,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [connectedFormData, updateNodeData, currentNodeId, data.formData, allDataAvailable]);

  // Check for changes periodically and trigger fetch if data is available
  const checkForUpdates = useCallback(() => {
    const currentConnectedData = connectedFormData();
    const currentDataString = JSON.stringify(currentConnectedData);
    
    // Only update if the connected data has actually changed
    if (currentDataString !== previousConnectedDataRef.current) {
      previousConnectedDataRef.current = currentDataString;
      const combinedData = combineObjectValues(currentConnectedData);
      updateNodeData(currentNodeId, { formData: { ...data.formData, ...combinedData } });
      forceUpdate({});
      
      // Auto-trigger fetch if all data is available
      if (allDataAvailable() && fetchStatus === 'idle') {
        performFetch();
      }
    }
  }, [connectedFormData, updateNodeData, currentNodeId, data.formData, allDataAvailable, performFetch, fetchStatus]);

  // Set up polling for changes
  useEffect(() => {
    checkForUpdates();
    intervalRef.current = setInterval(checkForUpdates, 100);
    
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

  // Reset function to return to initial state
  const resetToInitialState = useCallback(() => {
    setFetchStatus('idle');
    setIsLoading(false);
    updateNodeData(currentNodeId, {
      formData: {
        ...data.formData,
        result: null,
        error: null,
        status: 'idle',
        timestamp: null
      }
    });
  }, [updateNodeData, currentNodeId, data.formData]);

  // Get status color based on fetch status
  const getStatusColor = () => {
    switch (fetchStatus) {
      case 'loading': return 'border-blue-400 bg-yellow-50';
      case 'success': return 'border-green-400 bg-green-50';
      case 'error': return 'border-red-400 bg-red-50';
      default: return 'border-stone-400 bg-white';
    }
  };
//<div className={` w-min-24 px-4 py-2 shadow-md rounded-md border-2 overflow-clip ${getStatusColor()}`}>
  return (

   
   <div className={` group relative `}>
{/* Hover Buttons - Positioned above the node */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out">
        <div className="flex items-center gap-1 bg-gray-200 rounded-lg shadow-lg border border-gray-200 p-1">
          <ViewButton
            data={"```json\n"+JSON.stringify(data,null,2)+"```"}
            title="Node Data"
            className="!p-1.5 hover:bg-gray-50"
          />
          {fetchStatus !== 'idle' && (
            <button
              onClick={resetToInitialState}
              className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
              title="Reset to initial state"
            >
              <Reset />
            </button>
          )}
        </div>
      </div>

      {/* Connection Badge */}
      <ConnectionBadge />

          {/* Main Node Container */}
      <div className={` px-4 py-3 shadow-md rounded-lg border-2  min-w-[200px] relative ${getStatusColor()}`}>
      
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
                <div className="text-sm  truncate">{fetchStatus}</div>
              </div>
            </div>

     


      <Handle
        type="target"
        position={Position.Left}
        className='!w-3 !h-3 !bg-gray-400 !rounded-full'
      ></Handle>
      <Handle
        type="source"
        position={Position.Right}
        className='!w-3 !h-3 !bg-blue-500 !rounded-full'
      ></Handle>
      </div>
    </div>
  );
}

export default memo(FetchNode);