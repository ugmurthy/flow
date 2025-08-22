/**
 * Process Node Component - Updated for New Schema with FlowStateContext Integration
 * Uses FlowStateContext for optimized state management while preserving plugin functionality
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { ProcessNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import pluginRegistry from '../services/pluginRegistry.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import ViewButton from '../components/ViewButton';
import ConnectionBadge from './ConnectionBadge';
import ButtonPanel from './ButtonPanel';

function ProcessNew({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  
  // Use FlowState hooks for optimized subscriptions
  const { updateNode, setNodeProcessing } = useFlowState();
  const nodeData = useFlowStateNode(currentNodeId);
  const processingNodes = useFlowStateProcessing();
  
  // Local state for UI-specific immediate feedback only
  const [localProcessingStatus, setLocalProcessingStatus] = useState('idle');
  const [localErrorState, setLocalErrorState] = useState(null);

  // Derived state combining FlowState + local state
  const isProcessing = processingNodes.has(currentNodeId);
  const processingStatus = isProcessing ? 'processing' :
    (nodeData?.output?.meta?.status || 'idle');
  const errorState = nodeData?.error?.hasError ? nodeData.error : localErrorState;

  // Initialize node with new schema and FlowState integration
  useEffect(() => {
    const initializeNode = async () => {
      const measurement = performanceMonitor.startMeasurement('nodeInitialization');
      
      try {
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

        // Update FlowState with new node data
        updateNode(currentNodeId, {
          id: currentNodeId,
          type: 'processNew',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });

        // Initialize local state
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');
        setLocalErrorState(newNodeData.error?.hasError ? newNodeData.error : null);

        console.log(`[Process Node] Node ${currentNodeId} initialized with FlowState integration`);

        // Register with node data manager with optimized callback
        const safeUpdateNodeData = (updateNodeId, updates) => {
          // Only update React Flow if the update is not coming from our own component
          if (updateNodeId === currentNodeId && updates) {
            updateNodeData(updateNodeId, { data: updates });
          }
        };
        
        nodeDataManager.registerNode(currentNodeId, newNodeData, safeUpdateNodeData);
        
        performanceMonitor.endMeasurement(measurement);
      } catch (error) {
        performanceMonitor.endMeasurement(measurement);
        console.error('Error initializing process node:', error);
      }
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(currentNodeId);
    };
  }, [currentNodeId, updateNodeData, updateNode]);

  // Enhanced plugin error handling
  const handlePluginError = useCallback((pluginName, error) => {
    const pluginError = {
      hasError: true,
      errors: [{
        code: `PLUGIN_${pluginName.toUpperCase()}_ERROR`,
        message: error.message,
        timestamp: new Date().toISOString(),
        context: { plugin: pluginName, nodeId: currentNodeId }
      }]
    };
    
    // Update error state through local state for immediate feedback
    setLocalErrorState(pluginError);
  }, [currentNodeId]);

  // Listen to node data events (hybrid approach)
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;
        console.log(`[Process Node][${currentNodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        setLocalProcessingStatus(newStatus);
        
        // Handle plugin-specific updates
        if (updatedNodeData.plugin) {
          console.log(`[Process Node][${currentNodeId}] Plugin:`, updatedNodeData.plugin);
        }
        
        // Handle error state
        if (updatedNodeData.error?.hasError) {
          setLocalErrorState(updatedNodeData.error);
        }
        
        console.log(`[Process Node][${currentNodeId}] Local state updated - Status: ${newStatus}`);
      }
    };

    const handleNodeProcessing = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setLocalProcessingStatus('processing');
        console.log(`[Process Node][${currentNodeId}] Processing started`);
      }
    };

    const handleNodeProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const newStatus = event.detail.success ? 'success' : 'error';
        setLocalProcessingStatus(newStatus);
        console.log(`[Process Node][${currentNodeId}] Processing completed - Status: ${newStatus}`);
      }
    };

    const handleNodeError = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setLocalErrorState(event.detail.nodeData.error);
        setLocalProcessingStatus('error');
        console.log(`[Process Node][${currentNodeId}] Error occurred:`, event.detail.nodeData.error);
      }
    };

    // Add event listeners (reduced to essential events)
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

  // Enhanced plugin configuration with FlowState
  const handlePluginConfig = useCallback(async (pluginName, config) => {
    if (!nodeData) return;

    try {
      // Validate plugin configuration
      const validation = pluginRegistry.validatePluginConfig(pluginName, config);
      if (!validation.isValid) {
        throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
      }

      // Set processing state through FlowState
      setNodeProcessing(currentNodeId, true);

      // Update plugin configuration through nodeDataManager with enhanced tracking
      await nodeDataManager.updateNodeData(currentNodeId, {
        plugin: {
          name: pluginName,
          config,
          version: '1.0.0',
          lastUpdated: new Date().toISOString()
        }
      }, true); // Trigger processing

    } catch (error) {
      // Clear processing state on error
      setNodeProcessing(currentNodeId, false);
      
      // Enhanced error handling
      handlePluginError(pluginName, error);
      console.error('Error configuring plugin:', error);
    }
  }, [currentNodeId, nodeData, setNodeProcessing, handlePluginError]);

  // Enhanced manual processing with FlowState integration
  const handleManualProcess = useCallback(async () => {
    if (!nodeData) return;

    try {
      // Set processing state through FlowState
      setNodeProcessing(currentNodeId, true);
      
      // Execute plugin processing
      await nodeDataManager.processNode(currentNodeId);
      
      // Processing completion will be handled by FlowState automatically
    } catch (error) {
      // Clear processing state and handle errors
      setNodeProcessing(currentNodeId, false);
      console.error('Error processing node:', error);
    }
  }, [currentNodeId, nodeData, setNodeProcessing]);

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
                {/* Enhanced: Show plugin configuration status */}
                {nodeData.plugin.lastUpdated && (
                  <span className="ml-2 text-gray-500">
                    (Updated: {new Date(nodeData.plugin.lastUpdated).toLocaleTimeString()})
                  </span>
                )}
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

        {/* Input Summary - Using connection-level processed data */}
        {(() => {
          const connections = nodeData.input.connections || {};
          const processedConnections = Object.entries(connections).filter(([_, conn]) => conn.processed);
          return processedConnections.length > 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-medium text-blue-800">Inputs:</div>
              <div className="text-blue-600 mt-1">
                {processedConnections.length} connected source(s)
              </div>
              {/* Show individual connection details */}
              {processedConnections.map(([connectionId, connection]) => (
                <div key={connectionId} className="text-blue-500 mt-1 text-xs">
                  • {connection.sourceNodeId}
                  {connection.meta?.lastProcessed && (
                    <span className="text-gray-500 ml-1">
                      ({new Date(connection.meta.lastProcessed).toLocaleTimeString()})
                    </span>
                  )}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="ml-2 text-xs text-gray-500">
                      Type: {typeof connection.processed}, Data: {connection.processed ? '✅' : '❌'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

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