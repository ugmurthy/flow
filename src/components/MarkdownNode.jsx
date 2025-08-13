import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useNodeId, useReactFlow, useEdges } from '@xyflow/react';
import MarkdownRenderer from './MarkdownRenderer';
import DownloadFile from './DownloadFile';
import { combineObjectValues } from '../utils/helpers';
import ViewButton from '../components/ViewButton'

function MarkdownNode({ data }) {
  const { updateNodeData, getNodes } = useReactFlow();
  const currentNodeId = useNodeId();
  const edges = useEdges();
  
  const [, forceUpdate] = useState({});
  const intervalRef = useRef(null);
  const previousConnectedDataRef = useRef('');

  const defaultContent = `  
# Markdown content missing!
`;

  // Get connected nodes' data
  const getConnectedFormData = useCallback(() => {
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

  // Check for changes and update content
  const checkForUpdates = useCallback(() => {
    const currentConnectedData = getConnectedFormData();
    const currentDataString = JSON.stringify(currentConnectedData);
    
    if (currentDataString !== previousConnectedDataRef.current) {
      previousConnectedDataRef.current = currentDataString;
      const combinedData = combineObjectValues(currentConnectedData);
      
      // Extract content from connected data (look for common content fields)
      let newContent = data.content || defaultContent;
      
      // If connected data has result, prompt, or content fields, use them
      if (combinedData.result) {
        newContent = combinedData.result;
      } else if (combinedData.prompt) {
        newContent = combinedData.prompt;
      } else if (combinedData.content) {
        newContent = combinedData.content;
      }
      
      updateNodeData(currentNodeId, { 
        ...data,
        content: newContent,
        connectedData: combinedData
      });
      forceUpdate({});
    }
  }, [getConnectedFormData, updateNodeData, currentNodeId, data, defaultContent]);

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


  const currentContent = data.content || defaultContent;

  return (
    <>
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400 bg-white min-w-[100px] max-w-[600px]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex">
            <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
              {data.emoji || '📝'}
            </div>
            <div className="ml-2">
              <div className="text-lg font-bold">{data.label || 'Markdown Renderer'}</div>
              <div className="text-gray-500">{data.function || 'Display'}</div>
             
            </div>
          </div>
          
          <div className="flex gap-1">
             <ViewButton data={currentContent} title="Output" className='w-96' />
            {/* Download button */}
            <DownloadFile
              content={currentContent}
              filename={`markdown-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}.md`}
              fileExtension="md"
              mimeType="text/markdown"
              title="Download markdown content"
              
            />
          </div>
        </div>

        
        <Handle
          type="target"
          position={Position.Bottom}
          className='!w-3 !h-3 !bg-black !rounded-full'
        >
          
       
        
        </Handle>
      </div>
    </>
  );
}

export default memo(MarkdownNode);