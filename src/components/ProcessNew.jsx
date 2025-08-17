/**
 * Process Node Component - Updated for New Schema
 * Uses the new NodeData schema and event-driven updates instead of 100ms polling
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { ProcessNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import pluginRegistry from '../services/pluginRegistry.js';
import ViewButton from '../components/ViewButton';
import ConnectionBadge from './ConnectionBadge';
import ButtonPanel from './ButtonPanel';

function ProcessNew({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  const [nodeData, setNodeData] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [errorState, setErrorState] = useState(null);

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
        newNodeData = ProcessNodeData.create({
          meta: {
            label: data.label || 'Process Node',
            function: data.function || 'Data Processing',
            emoji: data.emoji || '⚙️',
            description: 'Processes input data using configured plugins'
          },
          input: {
            config: {
              aggregationStrategy: 'merge',
              requiredInputs: [],
              expectedDataTypes: ['object', 'string', 'array']
            }
          },
          output: {
            data: data.formData || {}
          },
          plugin: data.plugin || {
            name: 'data-transformer',
            config: {
              strategy: 'merge',
              preserveMetadata: true
            }
          }
        });
      }

      setNodeData(newNodeData);

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

  // Listen to node data events
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setNodeData(event.detail.nodeData);
        setProcessingStatus(event.detail.nodeData.output.meta.status);
        setErrorState(event.detail.nodeData.error.hasError ? event.detail.nodeData.error : null);
      }
    };

    const handleNodeProcessing = (event) => {
      console.log("hanfleNodeProcessing Event ",event)
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus('processing');
      }
    };

    const handleNodeProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setProcessingStatus(event.detail.success ? 'success' : 'error');
      }
    };

    const handleNodeError = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setErrorState(event.detail.nodeData.error);
        setProcessingStatus('error');
      }
    };

    // Add event listeners
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSING, handleNodeProcessing);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_PROCESSED, handleNodeProcessed);
    nodeDataManager.addEventListener(NodeDataEvents.NODE_ERROR, handleNodeError);

    return () => {
      // Remove event listeners
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_PROCESSING, handleNodeProcessing);
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_PROCESSED, handleNodeProcessed);
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_ERROR, handleNodeError);
    };
  }, [currentNodeId]);

  // Handle plugin configuration
  const handlePluginConfig = useCallback(async (pluginName, config) => {
    if (!nodeData) return;

    try {
      // Validate plugin configuration
      const validation = pluginRegistry.validatePluginConfig(pluginName, config);
      if (!validation.isValid) {
        console.error('Plugin configuration validation failed:', validation.errors);
        return;
      }

      // Update node data with new plugin configuration
      await nodeDataManager.updateNodeData(currentNodeId, {
        plugin: {
          name: pluginName,
          config,
          version: '1.0.0'
        }
      }, true); // Trigger processing

    } catch (error) {
      console.error('Error configuring plugin:', error);
    }
  }, [currentNodeId, nodeData]);

  // Handle manual processing trigger
  const handleManualProcess = useCallback(async () => {
    if (!nodeData) return;

    try {
      await nodeDataManager.processNode(currentNodeId);
    } catch (error) {
      console.error('Error processing node:', error);
    }
  }, [currentNodeId, nodeData]);

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

  // Get status indicator
  const getStatusIndicator = () => {
    switch (processingStatus) {
      case 'processing':
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
          </div>
        );
      case 'success':
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full">
            <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-red-400 rounded-full">
            <div className="absolute inset-0.5 bg-white rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-red-400 rounded-full"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!nodeData) {
    return (
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-gray-300 bg-gray-100 min-w-[200px]">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Hover Buttons - Positioned above the node */}
      <ButtonPanel>
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(nodeData, null, 2)}\`\`\``}
          title="Node Data (New Schema)"
          className="hover:bg-gray-50"
        />
        <button
          onClick={handleManualProcess}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
          title="Process Node"
          disabled={processingStatus === 'processing'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V7a3 3 0 11-6 0V4a3 3 0 11-6 0v3a3 3 0 11-6 0v3" />
          </svg>
        </button>
      </ButtonPanel>

      {/* Connection Badge */}
      <ConnectionBadge />

      {/* Main Node Container */}
      <div className={`px-4 py-3 shadow-md rounded-lg border-2 min-w-[200px] relative transition-all duration-200 ${getStatusColor()}`}>
        
        {/* Status Indicator */}
        {getStatusIndicator()}
        
        {/* Node Content - Horizontal Layout */}
        <div className="flex items-center gap-3">
          {/* Icon Section */}
          <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
            <span className="text-xl">{nodeData.meta.emoji}</span>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{nodeData.meta.label}</div>
            <div className="text-sm text-gray-500 truncate">{nodeData.meta.function}</div>
            
            {/* Plugin Info */}
            {nodeData.plugin && (
              <div className="text-xs text-blue-600 truncate mt-1">
                Plugin: {nodeData.plugin.name}
              </div>
            )}
            
            {/* Processing Status */}
            <div className="text-xs text-gray-400 mt-1">
              Status: {processingStatus}
              {nodeData.output.meta.processingTime && (
                <span className="ml-2">({nodeData.output.meta.processingTime}ms)</span>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errorState && errorState.hasError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800">Errors:</div>
            {errorState.errors.map((error, index) => (
              <div key={index} className="text-red-600 mt-1">
                {error.code}: {error.message}
              </div>
            ))}
          </div>
        )}

        {/* Input Summary */}
        {Object.keys(nodeData.input.processed).length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-800">Inputs:</div>
            <div className="text-blue-600 mt-1">
              {Object.keys(nodeData.input.processed).length} connected source(s)
            </div>
          </div>
        )}

        {/* Output Summary */}
        {Object.keys(nodeData.output.data).length > 0 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <div className="font-medium text-green-800">Output:</div>
            <div className="text-green-600 mt-1">
              {Object.keys(nodeData.output.data).length} field(s) available
              {nodeData.output.meta.dataSize && (
                <span className="ml-2">({nodeData.output.meta.dataSize} bytes)</span>
              )}
            </div>
          </div>
        )}

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

export default memo(ProcessNew);