/**
 * Markdown Node Component - Updated for New Schema
 * Uses the new NodeData schema and event-driven updates
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { OutputNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import MarkdownRenderer from './MarkdownRenderer';
import ViewButton from '../components/ViewButton';
import ButtonPanel from './ButtonPanel';

function MarkdownNew({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  const [nodeData, setNodeData] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [renderedContent, setRenderedContent] = useState('');

  // Initialize node with new schema
  useEffect(() => {
    const initializeNode = async () => {
      // Ensure node data manager is initialized
      await nodeDataManager.initialize();

      // Convert old data format to new schema if needed
      let newNodeData;
      if (data.meta && data.input && data.output && data.error) {
        // Already in new format
        newNodeData = data;
      } else {
        // Convert from old format
        newNodeData = OutputNodeData.create({
          meta: {
            label: data.label || 'Markdown Display',
            function: data.function || 'Renderer',
            emoji: data.emoji || '📝',
            description: 'Renders markdown content with syntax highlighting'
          },
          input: {
            config: {
              displayFormat: 'markdown',
              autoUpdate: true,
              styleConfig: data.styleConfig || {
                width: 'auto',
                textColor: '#374151',
                fontSize: '14px'
              }
            }
          },
          output: {
            data: {
              content: data.content || '',
              renderedHtml: '',
              wordCount: 0,
              lastUpdated: new Date().toISOString()
            }
          }
        });
      }

      setNodeData(newNodeData);
      setRenderedContent(newNodeData.output.data.content || '');

      // Register with node data manager - use a wrapper to prevent infinite loops
      const safeUpdateNodeData = (nodeId, updates) => {
        // Only update React Flow if the update is not coming from our own component
        if (nodeId === currentNodeId && updates.data) {
          updateNodeData(nodeId, updates);
        }
      };
      
      nodeDataManager.registerNode(currentNodeId, newNodeData, safeUpdateNodeData);
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(currentNodeId);
    };
  }, [currentNodeId, updateNodeData]);

  // Update rendered content based on input data
  const updateRenderedContent = useCallback(async (updatedNodeData, skipNodeDataUpdate = false) => {
    let content = updatedNodeData.output.data.content || '';
    
    // If we have processed input data, combine it with existing content
    const processedInputs = updatedNodeData.input.processed || {};
    if (Object.keys(processedInputs).length > 0) {
      // Combine input data into markdown content
      const inputContent = Object.entries(processedInputs)
        .map(([source, data]) => {
          if (typeof data === 'string') {
            return data;
          } else if (typeof data === 'object') {
            // Look for text-like fields
            const textFields = ['content', 'text', 'message', 'response', 'result'];
            for (const field of textFields) {
              if (data[field] && typeof data[field] === 'string') {
                return data[field];
              }
            }
            // Fallback to JSON representation
            return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
          }
          return String(data);
        })
        .join('\n\n');
      
      content = inputContent || content;
    }

    setRenderedContent(content);

    // Only update node data if not already in an update cycle
    // This prevents infinite loops by avoiding recursive updates
    if (!skipNodeDataUpdate) {
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      // Update local node data without triggering React Flow update
      const updatedData = {
        ...updatedNodeData,
        output: {
          ...updatedNodeData.output,
          data: {
            ...updatedNodeData.output.data,
            content,
            wordCount,
            lastUpdated: new Date().toISOString(),
            characterCount: content.length
          },
          meta: {
            ...updatedNodeData.output.meta,
            status: 'success',
            timestamp: new Date().toISOString(),
            dataSize: content.length
          }
        }
      };
      
      // Update the node data in the manager without triggering React Flow callback
      nodeDataManager.nodes.set(currentNodeId, updatedData);
      setNodeData(updatedData);
    }
  }, [currentNodeId]);

  // Listen to node data events
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;
        setNodeData(updatedNodeData);
        setProcessingStatus(updatedNodeData.output.meta.status);
        
        // Update rendered content when input data changes, but skip node data update to prevent recursion
        updateRenderedContent(updatedNodeData, true);
      }
    };

    const handleNodeProcessing = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus('processing');
      }
    };

    const handleNodeProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus(event.detail.success ? 'success' : 'error');
      }
    };

    // Add event listeners
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSING, handleNodeProcessing);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSED, handleNodeProcessed);

    return () => {
      // Remove event listeners
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_PROCESSING, handleNodeProcessing);
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_PROCESSED, handleNodeProcessed);
    };
  }, [currentNodeId, updateRenderedContent]);

  // Get status color based on processing status
  const getStatusColor = () => {
    switch (processingStatus) {
      case 'processing':
        return 'border-yellow-400 bg-yellow-50';
      case 'success':
        return 'border-green-400 bg-green-50';
      case 'error':
        return 'border-red-400 bg-red-50';
      case 'idle':
      default:
        return 'border-stone-400 bg-white';
    }
  };

  if (!nodeData) {
    return (
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-gray-300 bg-gray-100 min-w-[300px]">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  const styleConfig = nodeData.input.config.styleConfig || {};

  return (
    <div className="group relative">
      {/* Hover Buttons */}
      <ButtonPanel>
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(nodeData, null, 2)}\`\`\``}
          title="Node Data (New Schema)"
          className="hover:bg-gray-50"
        />
      </ButtonPanel>

      {/* Main Node Container */}
      <div 
        className={`shadow-md rounded-lg border-2 min-w-[300px] max-w-[600px] relative transition-all duration-200 ${getStatusColor()}`}
        style={{ 
          width: styleConfig.width || 'auto',
          minWidth: '300px'
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-full w-8 h-8 flex justify-center items-center bg-white">
              <span className="text-lg">{nodeData.meta.emoji}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-gray-900">{nodeData.meta.label}</div>
              <div className="text-xs text-gray-500">{nodeData.meta.function}</div>
            </div>
            <div className="text-xs text-gray-400">
              Status: {processingStatus}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          {renderedContent ? (
            <div 
              style={{
                color: styleConfig.textColor || '#374151',
                fontSize: styleConfig.fontSize || '14px'
              }}
            >
              <MarkdownRenderer content={renderedContent} />
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              No content to display
            </div>
          )}
        </div>

        {/* Footer with metrics */}
        {nodeData.output.data.wordCount > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Words: {nodeData.output.data.wordCount}</span>
              <span>Characters: {nodeData.output.data.characterCount || 0}</span>
              <span>Updated: {new Date(nodeData.output.data.lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Input Summary */}
        {Object.keys(nodeData.input.processed || {}).length > 0 && (
          <div className="mx-4 mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-800">Connected Inputs:</div>
            <div className="text-blue-600 mt-1">
              {Object.keys(nodeData.input.processed).length} source(s) providing content
            </div>
          </div>
        )}

        {/* React Flow Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

export default memo(MarkdownNew);