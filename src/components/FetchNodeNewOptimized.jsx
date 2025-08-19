/**
 * Optimized Fetch Node Component
 * Uses the new FlowStateContext and synchronization system
 * Eliminates synchronization issues and improves performance
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { ProcessNodeData } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import ViewButton from '../components/ViewButton';
import ButtonPanel from './ButtonPanel';

function FetchNodeNewOptimized({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  
  // Use FlowState hooks for optimized subscriptions
  const flowState = useFlowState();
  const nodeData = useFlowStateNode(currentNodeId);
  const processingNodes = useFlowStateProcessing();
  
  // Local state for UI-specific data
  const [fetchResult, setFetchResult] = useState(null);
  const [localProcessingStatus, setLocalProcessingStatus] = useState('idle');

  // Derived state
  const isProcessing = processingNodes.has(currentNodeId);
  const processingStatus = isProcessing ? 'processing' : 
    (nodeData?.output?.meta?.status || localProcessingStatus);

  // Initialize node with new schema
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
              label: data.label || 'API Fetch',
              function: data.function || 'HTTP Request',
              emoji: data.emoji || '🌐',
              description: 'Performs HTTP requests to external APIs'
            },
            input: {
              config: {
                url: data.formData?.url || 'https://jsonplaceholder.typicode.com/posts',
                method: data.formData?.method || 'GET',
                headers: {},
                timeout: 30000,
                retries: 3
              }
            },
            output: {
              data: {
                result: data.formData?.result || null,
                status: data.formData?.status || 'idle',
                error: data.formData?.error || null,
                responseTime: null,
                statusCode: null
              }
            },
            plugin: {
              name: 'http-fetcher',
              config: {
                followRedirects: true,
                validateStatus: true
              }
            }
          });
        }

        // Update FlowState with new node data
        flowState.updateNode(currentNodeId, {
          id: currentNodeId,
          type: 'fetchNodeNew',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });

        // Initialize fetch result from node data
        const initialResult = newNodeData.output?.data?.result || null;
        setFetchResult(initialResult);
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');

        console.log(`[Optimized] Node ${currentNodeId} initialized with result:`, !!initialResult);

        // Register with node data manager with optimized callback
        const safeUpdateNodeData = (nodeId, updates) => {
          // Only update React Flow if the update is not coming from our own component
          if (nodeId === currentNodeId && updates.data) {
            updateNodeData(nodeId, updates);
          }
        };
        
        nodeDataManager.registerNode(currentNodeId, newNodeData, safeUpdateNodeData);
        
        performanceMonitor.endMeasurement(measurement);
      } catch (error) {
        performanceMonitor.endMeasurement(measurement);
        console.error('Error initializing optimized node:', error);
      }
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(currentNodeId);
    };
  }, [currentNodeId, updateNodeData, flowState]);

  // Listen to node data events (reduced event handling)
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;
        console.log(`[Optimized][${currentNodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        const newResult = updatedNodeData.output?.data?.result || null;
        
        setLocalProcessingStatus(newStatus);
        setFetchResult(newResult);
        
        console.log(`[Optimized][${currentNodeId}] Local state updated - Status: ${newStatus}, Has Result: ${!!newResult}`);
      }
    };

    // Only listen to essential events
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);

    return () => {
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    };
  }, [currentNodeId]);

  // Optimized fetch function with performance monitoring
  const performFetch = useCallback(async () => {
    if (!nodeData) return;

    const measurement = performanceMonitor.startMeasurement('fetchOperation');
    const config = nodeData.input.config;
    const startTime = Date.now();

    try {
      // Set processing status through FlowState
      flowState.setNodeProcessing(currentNodeId, true);
      
      // Update node data with processing status
      await nodeDataManager.updateNodeData(currentNodeId, {
        output: {
          meta: {
            status: 'processing',
            timestamp: new Date().toISOString()
          }
        }
      });

      // Build request options
      const requestOptions = {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      };

      // Add body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
        requestOptions.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body);
      }

      // Perform fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

      const response = await fetch(config.url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      let result;

      // Parse response based on content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      console.log(`[Optimized][${currentNodeId}] Fetch completed successfully. Result:`, result);
      
      // Update node data with successful result
      const updateData = {
        output: {
          data: {
            result,
            status: 'success',
            error: null,
            responseTime,
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries())
          },
          meta: {
            status: 'success',
            timestamp: new Date().toISOString(),
            processingTime: responseTime,
            dataSize: JSON.stringify(result).length
          }
        }
      };
      
      await nodeDataManager.updateNodeData(currentNodeId, updateData, true);
      
      // Update local state immediately for better UX
      setFetchResult(result);
      setLocalProcessingStatus('success');
      
      performanceMonitor.endMeasurement(measurement);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.error(`[Optimized][${currentNodeId}] Fetch error:`, error);
      
      // Update node data with error
      await nodeDataManager.updateNodeData(currentNodeId, {
        output: {
          data: {
            result: null,
            status: 'error',
            error: error.message,
            responseTime,
            statusCode: null
          },
          meta: {
            status: 'error',
            timestamp: new Date().toISOString(),
            processingTime: responseTime
          }
        },
        error: {
          hasError: true,
          errors: [{
            code: 'FETCH_ERROR',
            message: error.message,
            source: 'processing',
            timestamp: new Date().toISOString(),
            details: {
              url: config.url,
              method: config.method,
              responseTime
            }
          }]
        }
      });
      
      setLocalProcessingStatus('error');
      performanceMonitor.endMeasurement(measurement);
    } finally {
      // Clear processing status
      flowState.setNodeProcessing(currentNodeId, false);
    }
  }, [currentNodeId, nodeData, flowState]);

  // Auto-fetch logic (optimized) - Using connection-level processed data
  useEffect(() => {
    if (nodeData && nodeData.input.config.url) {
      // Check for processed data in individual connections
      const connections = nodeData.input.connections || {};
      const hasProcessedInputs = Object.values(connections).some(connection => connection.processed);
      const hasNotFetchedYet = !nodeData.output.data.result && processingStatus === 'idle';
      const shouldAutoFetch = nodeData.input.config.autoFetch !== false;
      const isStandaloneNode = Object.keys(connections).length === 0;
      
      // Allow auto-fetch for standalone nodes OR nodes with processed inputs
      if ((hasProcessedInputs || isStandaloneNode) && hasNotFetchedYet && shouldAutoFetch) {
        console.log(`[Optimized] Auto-fetching for node ${currentNodeId} - Standalone: ${isStandaloneNode}, HasInputs: ${hasProcessedInputs}`);
        performFetch();
      }
    }
  }, [nodeData?.input.connections, nodeData?.input.config.url, performFetch, processingStatus]);

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
      <div className="px-4 py-3 shadow-md rounded-lg border-2 border-gray-300 bg-gray-100 min-w-[250px]">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Hover Buttons */}
      <ButtonPanel>
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(nodeData, null, 2)}\`\`\``}
          title="Node Data (Optimized)"
          className="hover:bg-gray-50"
        />
        <button
          onClick={performFetch}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
          title="Perform Fetch"
          disabled={processingStatus === 'processing'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </ButtonPanel>

      {/* Main Node Container */}
      <div className={`px-4 py-3 shadow-md rounded-lg border-2 min-w-[250px] max-w-[400px] relative transition-all duration-200 ${getStatusColor()}`}>
        
        {/* Status Indicator */}
        {getStatusIndicator()}
        
        {/* Node Content */}
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100 flex-shrink-0">
            <span className="text-xl">{nodeData.meta.emoji}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{nodeData.meta.label}</div>
            <div className="text-sm text-gray-500 truncate">{nodeData.meta.function}</div>
            
            {/* Request Info */}
            <div className="text-xs text-blue-600 truncate mt-1">
              {nodeData.input.config.method} {nodeData.input.config.url}
            </div>
            
            {/* Status Info */}
            <div className="text-xs text-gray-400 mt-1">
              Status: {processingStatus} {isProcessing && '(Processing)'}
              {nodeData.output.data.responseTime && (
                <span className="ml-2">({nodeData.output.data.responseTime}ms)</span>
              )}
              {nodeData.output.data.statusCode && (
                <span className="ml-2">HTTP {nodeData.output.data.statusCode}</span>
              )}
            </div>
          </div>
        </div>

        {/* Result Display */}
        {(fetchResult || nodeData.output.data.result) && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <div className="font-medium text-green-800">Response:</div>
            <div className="text-green-600 mt-1 max-h-20 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {(() => {
                  const result = fetchResult || nodeData.output.data.result;
                  return typeof result === 'string'
                    ? result.substring(0, 200) + (result.length > 200 ? '...' : '')
                    : JSON.stringify(result, null, 2).substring(0, 200) + '...';
                })()}
              </pre>
            </div>
          </div>
        )}

        {/* Performance Info - Development only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-1 bg-blue-100 border rounded text-xs">
            <div>Optimized: ✅ FlowState, Debounced Validation, Performance Monitoring</div>
            <div>Processing: {isProcessing ? 'Active' : 'Idle'}, Status: {processingStatus}</div>
            <div>Result: {fetchResult ? 'Cached' : 'From NodeData'}</div>
          </div>
        )}

        {/* Error Display */}
        {nodeData.error.hasError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800">Error:</div>
            {nodeData.error.errors.map((error, index) => (
              <div key={index} className="text-red-600 mt-1">
                {error.code}: {error.message}
              </div>
            ))}
          </div>
        )}

        {/* Input Summary - Using connection-level processed data */}
        {(() => {
          const connections = nodeData.input.connections || {};
          const processedConnections = Object.values(connections).filter(conn => conn.processed);
          return processedConnections.length > 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-medium text-blue-800">Connected Inputs:</div>
              <div className="text-blue-600 mt-1">
                {processedConnections.length} source(s) connected
              </div>
              {/* Show individual connection details */}
              {processedConnections.map((connection, index) => (
                <div key={index} className="text-blue-500 mt-1 text-xs">
                  • {connection.sourceNodeId} ({connection.meta?.lastProcessed ?
                    new Date(connection.meta.lastProcessed).toLocaleTimeString() : 'N/A'})
                </div>
              ))}
            </div>
          );
        })()}

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

export default memo(FetchNodeNewOptimized);