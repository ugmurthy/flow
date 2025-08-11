import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useNodeId, useReactFlow, useEdges } from '@xyflow/react';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownStyleModal from './MarkdownStyleModal';
import { combineObjectValues } from '../utils/helpers';
import Edit from '../icons/Edit';
import Download from '../icons/Download';

function Connections({ connections }) {
  return (
    <div className='text-xs font-thin text-blue-800'>
      {connections ? connections : ""}
    </div>
  );
}

function MarkdownNode({ data }) {
  const { updateNodeData, getNodes } = useReactFlow();
  const currentNodeId = useNodeId();
  const edges = useEdges();
  
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [, forceUpdate] = useState({});
  const intervalRef = useRef(null);
  const previousConnectedDataRef = useRef('');

  // Default configuration
  const defaultConfig = {
    width: 'auto',
    textColor: '#374151',
    fontSize: '14px'
  };

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

  const handleOpenStyleModal = useCallback(() => {
    setIsStyleModalOpen(true);
  }, []);

  const handleCloseStyleModal = useCallback(() => {
    setIsStyleModalOpen(false);
  }, []);

  const handleStyleSave = useCallback((styleConfig) => {
    updateNodeData(currentNodeId, {
      ...data,
      styleConfig: styleConfig
    });
    setIsStyleModalOpen(false);
  }, [updateNodeData, currentNodeId, data]);

  const handleDownloadMarkdown = useCallback(() => {
    const content = data.content || defaultContent;
    const now = new Date();
    
    // Format: markdown-DDMMYY-HHMMSS.md
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const filename = `markdown-${day}${month}${year}-${hours}${minutes}${seconds}.md`;
    
    // Create blob and download
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data.content, defaultContent]);

  // Handle wheel events to prevent React Flow interference
  const handleWheelEvent = useCallback((e) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Check if we can scroll in the direction of the wheel
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop < scrollHeight - clientHeight;
    
    // Only stop propagation if we can handle the scroll internally
    if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
      e.stopPropagation();
    }
  }, []);

  // Handle scroll events
  const handleScrollEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const connectedNodeCount = edges.filter(edge => edge.target === currentNodeId).length;
  const currentContent = data.content || defaultContent;
  const currentStyleConfig = { ...defaultConfig, ...data.styleConfig };

  return (
    <>
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-stone-400 bg-white min-w-[300px] max-w-[600px]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex">
            <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
              {data.emoji || '📝'}
            </div>
            <div className="ml-2">
              <div className="text-lg font-bold">{data.label || 'Markdown Renderer'}</div>
              <div className="text-gray-500">{data.function || 'Display'}</div>
              <Connections connections={connectedNodeCount || ""} />
            </div>
          </div>
          
          <div className="flex gap-1">
            {/* Download button */}
            <button
              onClick={handleDownloadMarkdown}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-gray-100"
              title="Download markdown content"
            >
              <Download />
            </button>
            
            {/* Edit button */}
            <button
              onClick={handleOpenStyleModal}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
              title="Edit markdown style"
            >
              <Edit />
            </button>
          </div>
        </div>

        {/* Markdown content display */}
        <div
          className="border border-gray-200 rounded-lg bg-gray-50 h-96 overflow-y-auto"
          onWheel={handleWheelEvent}
          onScroll={handleScrollEvent}
        >
          <div className="h-full">
            <MarkdownRenderer
              content={currentContent}
              width={currentStyleConfig.width}
              textColor={currentStyleConfig.textColor}
              fontSize={currentStyleConfig.fontSize}
              className="!p-3 h-full"
              nodrag
            />
          </div>
        </div>

        {/* Connected data info */}
        {connectedNodeCount > 0 && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Connected to {connectedNodeCount} node{connectedNodeCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Style config info */}
        <div className="mt-2 text-xs text-gray-500">
          Style: {currentStyleConfig.width} | {currentStyleConfig.textColor} | {currentStyleConfig.fontSize}
        </div>

        <Handle
          type="target"
          position={Position.Bottom}
          className="w-4 h-4 !bg-teal-200 text-xs font-thin text-center"
        >
          ^
        </Handle>
        <Handle
          type="source"
          position={Position.Top}
          className="w-4 h-4 !bg-blue-200 text-xs font-thin text-center"
        >
          v
        </Handle>
      </div>

      {/* Style configuration modal */}
      <MarkdownStyleModal
        isOpen={isStyleModalOpen}
        onClose={handleCloseStyleModal}
        onSave={handleStyleSave}
        initialConfig={currentStyleConfig}
        previewContent={currentContent}
      />
    </>
  );
}

export default memo(MarkdownNode);