/**
 * Process Node Component - Updated for New Schema with FlowStateContext Integration
 * Uses FlowStateContext for optimized state management while preserving plugin functionality
 */

import React, { memo, useEffect, useState, useCallback, useRef, Component } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { ProcessNodeData, NodeVisualState, HandleConfiguration } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import { DirectiveProcessor } from '../services/directiveProcessor.js';
import { globalStyleManager } from '../styles/nodeStyleManager.js';
import pluginRegistry from '../services/pluginRegistry.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import ViewButton from '../components/ViewButton';
import ConnectionBadge from './ConnectionBadge';
import ButtonPanel from './ButtonPanel';

/**
 * Enhanced Error Boundary for ProcessNew Node
 * Provides comprehensive error handling with recovery mechanisms
 */
class ProcessNewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
    this.maxRetries = 3;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ProcessNew] Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report to performance monitor
    if (this.props.nodeId) {
      console.log(`processNew-${this.props.nodeId}`, error.message)
      // performanceMonitor.recordError(`processNew-${this.props.nodeId}`, error.message, {
      //   componentStack: errorInfo.componentStack,
      //   retryCount: this.state.retryCount,
      //   pluginName: this.props.pluginName || 'unknown'
      // });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
      console.log(`[ProcessNew] Retrying component (${this.state.retryCount + 1}/${this.maxRetries})`);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-3 shadow-md rounded-lg border-2 border-red-400 bg-red-50 min-w-[200px]">
          <div className="text-red-800 font-bold text-sm">⚠️ Process Node Error</div>
          <div className="text-red-600 text-xs mt-1">
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
          {this.props.pluginName && (
            <div className="text-red-500 text-xs mt-1">
              Plugin: {this.props.pluginName}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            {this.state.retryCount < this.maxRetries && (
              <button
                onClick={this.handleRetry}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                Retry ({this.state.retryCount + 1}/{this.maxRetries})
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  
  // Enhanced state for new features
  const [currentVisualState, setCurrentVisualState] = useState('default');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    updateCount: 0,
    errorCount: 0,
    lastUpdate: null,
    pluginExecutionTime: 0,
    totalProcessedInputs: 0
  });
  const [directiveProcessingStatus, setDirectiveProcessingStatus] = useState({
    processing: false,
    lastProcessed: null,
    totalProcessed: 0,
    errors: []
  });
  const [pluginMetrics, setPluginMetrics] = useState({
    lastExecution: null,
    totalExecutions: 0,
    averageExecutionTime: 0,
    errors: []
  });

  // Refs for performance tracking and enhanced functionality
  const renderStartTime = useRef(performance.now());
  const directiveProcessorRef = useRef(null);
  const styleManagerRef = useRef(globalStyleManager);
  const pluginExecutionStartTime = useRef(null);

  // Derived state combining FlowState + local state
  // const isProcessing = processingNodes.has(currentNodeId);
  // const processingStatus = isProcessing ? 'processing' :
  //   (nodeData?.output?.meta?.status || 'idle');
  const processingStatus = nodeData?.output?.meta?.status || 'idle'
  const errorState = nodeData?.error?.hasError ? nodeData.error : localErrorState;

  console.log(`[ProcessNode]: processingStatus ${processingStatus} output.meta.status ${nodeData?.output?.meta?.status}`)
  // Get computed styles from NodeStyleManager
  const computedStyles = styleManagerRef.current.getNodeStyle(
    nodeData || {},
    currentVisualState,
    { selected }
  );

  // Get handle styles
  const inputHandleStyles = styleManagerRef.current.getHandleStyle(
    nodeData || {},
    'input',
    'data-in'
  );
  
  const outputHandleStyles = styleManagerRef.current.getHandleStyle(
    nodeData || {},
    'output',
    'processed-out'
  );

  // Enhanced Performance monitoring effect - FIXED: Removed circular dependency
  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    
    setPerformanceMetrics(prev => {
      const newUpdateCount = prev.updateCount + 1;
      
      // DIAGNOSTIC: Check for runaway performance monitoring
      if (newUpdateCount > 100) {
        console.error(`[PROCESS PERFORMANCE LOOP DETECTED][${currentNodeId}] Update count exceeded 100:`, newUpdateCount);
        console.error('[PROCESS PERFORMANCE STACK TRACE - LINE 180 WAS THE CULPRIT]', new Error().stack);
        return prev; // Don't update if we're in a loop
      }
      
      // Track performance metrics (reduce frequency to prevent loops)
      if (newUpdateCount % 5 === 0) {
        performanceMonitor.recordMetric(`processNew-${currentNodeId}`, 'renderTime', renderTime);
        performanceMonitor.recordMetric(`processNew-${currentNodeId}`, 'updateCount', newUpdateCount);
      }
      
      return {
        ...prev,
        renderTime,
        updateCount: newUpdateCount,
        lastUpdate: new Date().toISOString()
      };
    });
    
    // Reset render start time for next render
    renderStartTime.current = performance.now();
  }, [currentNodeId]); // FIXED: Only depend on stable values, not the metrics we're updating

  // Initialize node with enhanced schema and directive processing - FIXED: Added initialization guard
  useEffect(() => {
    console.log(`[PROCESS INIT DEBUG][${currentNodeId}] Initialization effect triggered - nodeData exists:`, !!nodeData, 'hasVersion:', !!(nodeData?.meta?.version));
    
    // FIXED: Add initialization guard to prevent re-initialization
    if (nodeData && nodeData.meta && nodeData.meta.version) {
      console.log(`[PROCESS INIT DEBUG][${currentNodeId}] Node already initialized with version:`, nodeData.meta.version, '- skipping');
      return;
    }
    
    const initializeNode = async () => {
      console.log(`[PROCESS INIT DEBUG][${currentNodeId}] Starting node initialization`);
      const measurement = performanceMonitor.startMeasurement('nodeInitialization');
      
      try {
        // Ensure node data manager is initialized
        await nodeDataManager.initialize();

        // Initialize directive processor
        directiveProcessorRef.current = new DirectiveProcessor(nodeDataManager);

        // Convert old data format to new schema if needed
        let newNodeData;
        if (data.meta && data.input && data.output && data.error) {
          // Already in new format, but ensure it has styling configuration
          newNodeData = {
            ...data,
            styling: data.styling || {
              states: {
                default: NodeVisualState.create(),
                processing: NodeVisualState.create({
                  container: { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }
                }),
                success: NodeVisualState.create({
                  container: { borderColor: '#10b981', backgroundColor: '#d1fae5' }
                }),
                error: NodeVisualState.create({
                  container: { borderColor: '#ef4444', backgroundColor: '#fee2e2' }
                }),
                idle: NodeVisualState.create({
                  container: { borderColor: '#6b7280', backgroundColor: '#f9fafb' }
                })
              },
              handles: {
                input: [
                  HandleConfiguration.create({
                    id: 'data-in',
                    type: 'target',
                    position: 'left',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string', 'array']
                    }
                  })
                ],
                output: [
                  HandleConfiguration.create({
                    id: 'processed-out',
                    type: 'source',
                    position: 'right',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string', 'array']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          };
        } else {
          // Convert from old format
          newNodeData = ProcessNodeData.create({
            meta: {
              label: data.label || 'Process Node',
              function: data.function || 'Enhanced Data Processing',
              emoji: data.emoji || '⚙️',
              description: 'Processes input data using configured plugins with enhanced directive processing',
              category: 'process',
              capabilities: ['data-processing', 'plugin-execution', 'directive-processing'],
              tags: ['processing', 'plugins', 'enhanced'],
              version: '2.0.0'
            },
            input: {
              config: {
                aggregationStrategy: 'merge',
                requiredInputs: [],
                expectedDataTypes: ['object', 'string', 'array']
              },
              processed: {
                aggregated: {},
                byConnection: {},
                strategy: 'merge',
                meta: {
                  lastAggregated: new Date().toISOString(),
                  connectionCount: 0,
                  totalDataSize: 0,
                  aggregationMethod: 'merge'
                }
              }
            },
            output: {
              data: data.formData || {},
              directives: {},
              meta: {
                timestamp: new Date().toISOString(),
                status: 'idle'
              }
            },
            plugin: data.plugin || {
              name: 'data-transformer',
              config: {
                strategy: 'merge',
                preserveMetadata: true
              },
              version: '1.0.0',
              lastUpdated: new Date().toISOString()
            },
            styling: {
              states: {
                default: NodeVisualState.create(),
                processing: NodeVisualState.create({
                  container: { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }
                }),
                success: NodeVisualState.create({
                  container: { borderColor: '#10b981', backgroundColor: '#d1fae5' }
                }),
                error: NodeVisualState.create({
                  container: { borderColor: '#ef4444', backgroundColor: '#fee2e2' }
                }),
                idle: NodeVisualState.create({
                  container: { borderColor: '#6b7280', backgroundColor: '#f9fafb' }
                })
              },
              handles: {
                input: [
                  HandleConfiguration.create({
                    id: 'data-in',
                    type: 'target',
                    position: 'left',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string', 'array']
                    }
                  })
                ],
                output: [
                  HandleConfiguration.create({
                    id: 'processed-out',
                    type: 'source',
                    position: 'right',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string', 'array']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          });
        }

        // DIAGNOSTIC: Log the update process to detect circular updates
        console.log(`[PROCESS CIRCULAR DEBUG][${currentNodeId}] About to update FlowState - current nodeData version:`, nodeData?.meta?.version, 'new version:', newNodeData.meta.version);
        
        // DIAGNOSTIC: Add delay and check before FlowState update
        console.log(`[PROCESS CIRCULAR DEBUG][${currentNodeId}] About to call updateNode`);
        
        // Update FlowState with new node data
        updateNode(currentNodeId, {
          id: currentNodeId,
          type: 'processNew',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });
        
        console.log(`[PROCESS CIRCULAR DEBUG][${currentNodeId}] FlowState update completed`);

        // Initialize local state
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');
        setLocalErrorState(newNodeData.error?.hasError ? newNodeData.error : null);
        setCurrentVisualState(newNodeData.output?.meta?.status || 'idle');

        console.log(`[Process Node] Node ${currentNodeId} initialized with enhanced schema and directive processing`);

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
        console.error('Error initializing enhanced process node:', error);
        setPerformanceMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
      }
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      nodeDataManager.unregisterNode(currentNodeId);
      if (directiveProcessorRef.current) {
        directiveProcessorRef.current.cleanup();
      }
    };
  }, [currentNodeId]); // FIXED: Removed circular dependencies that were causing re-initialization

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

  // Enhanced event listeners with directive processing
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;
        console.log(`[Process Node][${currentNodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        setLocalProcessingStatus(newStatus);
        
        // Update visual state based on status
        let newVisualState = 'default';
        if (["processing", "error", "idle", "success"].includes(newStatus)) {
            newVisualState = newStatus;
        }
        // if (newStatus === 'processing') {
        //   newVisualState = 'processing';
        // } else if (newStatus === 'success') {
        //   newVisualState = 'success';
        // } else if (newStatus === 'error') {
        //   newVisualState = 'error';
        // } else if (newStatus === 'idle') {
        //   newVisualState = 'idle';
        // }
        
        setCurrentVisualState(newVisualState);
        
        // Handle plugin-specific updates with enhanced metrics
        if (updatedNodeData.plugin) {
          console.log(`[Process Node][${currentNodeId}] Plugin:`, updatedNodeData.plugin);
          
          // Update plugin metrics if execution time is available
          if (updatedNodeData.output?.meta?.processingTime) {
            setPluginMetrics(prev => ({
              ...prev,
              lastExecution: new Date().toISOString(),
              totalExecutions: prev.totalExecutions + 1,
              averageExecutionTime: (prev.averageExecutionTime * prev.totalExecutions + updatedNodeData.output.meta.processingTime) / (prev.totalExecutions + 1)
            }));
          }
        }
        
        // Handle error state
        if (updatedNodeData.error?.hasError) {
          setLocalErrorState(updatedNodeData.error);
          setPluginMetrics(prev => ({
            ...prev,
            errors: [...prev.errors, updatedNodeData.error]
          }));
        }
        
        // Process any incoming directives
        if (updatedNodeData.output?.directives && directiveProcessorRef.current) {
          processDirectives(updatedNodeData.output.directives);
        }
        
        console.log(`[Process Node][${currentNodeId}] Local state updated - Status: ${newStatus}, Visual: ${newVisualState}`);
      }
    };

    const handleNodeProcessing = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setLocalProcessingStatus('processing');
        setCurrentVisualState('processing');
        pluginExecutionStartTime.current = performance.now();
        console.log(`[Process Node][${currentNodeId}] Processing started`);
      }
    };

    const handleNodeProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const newStatus = event.detail.success ? 'success' : 'error';
        setLocalProcessingStatus(newStatus);
        setCurrentVisualState(newStatus);
        
        // Calculate plugin execution time
        if (pluginExecutionStartTime.current) {
          const executionTime = performance.now() - pluginExecutionStartTime.current;
          setPerformanceMetrics(prev => ({
            ...prev,
            pluginExecutionTime: executionTime
          }));
          pluginExecutionStartTime.current = null;
        }
        
        console.log(`[Process Node][${currentNodeId}] Processing completed - Status: ${newStatus}`);
      }
    };

    const handleNodeError = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setLocalErrorState(event.detail.nodeData.error);
        setLocalProcessingStatus('error');
        setCurrentVisualState('error');
        setPerformanceMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
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

  // Directive processing function
  const processDirectives = useCallback(async (directives) => {
    if (!directiveProcessorRef.current || !directives || Object.keys(directives).length === 0) {
      return;
    }

    setDirectiveProcessingStatus(prev => ({ ...prev, processing: true }));
    
    try {
      // Process directives using the directive processor
      const results = await directiveProcessorRef.current.processDirectives(currentNodeId, { [currentNodeId]: Object.values(directives) });
      
      setDirectiveProcessingStatus(prev => ({
        ...prev,
        processing: false,
        lastProcessed: new Date().toISOString(),
        totalProcessed: prev.totalProcessed + results.totalDirectives,
        errors: results.failed > 0 ? [...prev.errors, `${results.failed} directives failed`] : prev.errors
      }));

      console.log(`[Process Node][${currentNodeId}] Processed ${results.totalDirectives} directives:`, results);
    } catch (error) {
      console.error(`[Process Node][${currentNodeId}] Directive processing failed:`, error);
      
      setDirectiveProcessingStatus(prev => ({
        ...prev,
        processing: false,
        errors: [...prev.errors, error.message]
      }));
    }
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
          title="Node Data (Enhanced Schema)"
          className="hover:bg-gray-50"
        />
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(performanceMetrics, null, 2)}\`\`\``}
          title="Performance Metrics"
          className="hover:bg-blue-50 text-blue-700"
        />
        {pluginMetrics.totalExecutions > 0 && (
          <ViewButton
            data={`\`\`\`json\n${JSON.stringify(pluginMetrics, null, 2)}\`\`\``}
            title="Plugin Metrics"
            className="hover:bg-green-50 text-green-700"
          />
        )}
        {directiveProcessingStatus.totalProcessed > 0 && (
          <ViewButton
            data={`\`\`\`json\n${JSON.stringify(directiveProcessingStatus, null, 2)}\`\`\``}
            title="Directive Processing Status"
            className="hover:bg-purple-50 text-purple-700"
          />
        )}
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
          className="!w-3 !h-3 !bg-green-500 !rounded-full !border-2 !border-white"
          title="Output Handle"
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

// Enhanced Process Node with Error Boundary
function EnhancedProcessNew(props) {
  return (
    <ProcessNewErrorBoundary
      nodeId={props.data?.nodeId || 'unknown'}
      pluginName={props.data?.plugin?.name || 'unknown'}
    >
      <ProcessNew {...props} />
    </ProcessNewErrorBoundary>
  );
}

export default memo(EnhancedProcessNew);