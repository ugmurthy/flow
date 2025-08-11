import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow, useEdges, useNodeConnections } from '@xyflow/react';
import { formatFormDataForDisplay, combineObjectValues, formatArrayOfObjects } from '../utils/helpers';
import Reset from '../icons/Reset';

function Connections() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
 
  return (
    <div className='text-xs font-thin text-blue-800'>
      {connections.length ? connections.length : ""}
    </div>
  );
}

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

  return (
    <div className={`w-3/5 px-4 py-2 shadow-md rounded-md border-2 overflow-clip ${getStatusColor()}`}>
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
          {data.emoji}
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
          <div className="text-gray-500">{data.function}</div>
          <Connections />
        </div>
      </div>

      {/* Status indicator with reset button for error state */}
      {fetchStatus !== 'idle' && (
        <div className="mt-2 flex items-center justify-between">
          <div className={`text-xs px-2 py-1 rounded ${
            fetchStatus === 'loading' ? 'bg-yellow-100 text-yellow-800' :
            fetchStatus === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {fetchStatus === 'loading' ? 'Auto-fetching...' :
             fetchStatus === 'success' ? 'Success' :
             'Error'}
          </div>
          {fetchStatus === 'error' && (
            <button
              onClick={resetToInitialState}
              className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
              title="Reset to initial state"
            >
              <Reset />
            </button>
          )}
        </div>
      )}

      {/* Connected data display */}
      <pre className="text-green-700 text-xs font-thin bg-gray-50 p-2 rounded border mt-2">
        {formatArrayOfObjects(connectedFormData())}
      </pre>

      {/* Response/Error display */}
      <pre className="text-red-700 text-xs font-thin bg-gray-50 p-2 rounded border mt-1">
        {data.formData?.error ? 
          `Error: ${data.formData.error}` : ""
          
        } 
      </pre>
        <div className="text-blue-700 text-xs font-thin bg-gray-50 p-2 rounded border mt-1">
        {formatFormDataForDisplay(data.formData)}
      </div>

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

export default memo(FetchNode);