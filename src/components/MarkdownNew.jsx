/**
 * Markdown Node Component - Updated for New Schema
 * Uses the new NodeData schema and event-driven updates
 */

import React, { memo, useEffect, useState, useCallback, useRef, Component } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from '@xyflow/react';
import { OutputNodeData, NodeVisualState, HandleConfiguration } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import { DirectiveProcessor } from '../services/directiveProcessor.js';
import { globalStyleManager } from '../styles/nodeStyleManager.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import MarkdownRenderer from './MarkdownRenderer';
import ViewButton from '../components/ViewButton';
import DownloadFile from './DownloadFile';
import ButtonPanel from './ButtonPanel';
import ConnectionBadge from './ConnectionBadge';
/**
 * Enhanced Error Boundary for MarkdownNew Node
 * Provides comprehensive error handling with recovery mechanisms
 */
class MarkdownNewErrorBoundary extends Component {
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
    console.error('[MarkdownNew] Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report to performance monitor
    if (this.props.nodeId) {
      performanceMonitor.recordError(`markdownNew-${this.props.nodeId}`, error.message, {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        contentLength: this.props.contentLength || 0
      });
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
      console.log(`[MarkdownNew] Retrying component (${this.state.retryCount + 1}/${this.maxRetries})`);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-3 shadow-md rounded-lg border-2 border-red-400 bg-red-50 min-w-[300px]">
          <div className="text-red-800 font-bold text-sm">⚠️ Markdown Node Error</div>
          <div className="text-red-600 text-xs mt-1">
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
          {this.props.contentLength > 0 && (
            <div className="text-red-500 text-xs mt-1">
              Content Length: {this.props.contentLength} characters
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

function MarkdownNew({ data, selected }) {
  const { updateNodeData } = useReactFlow();
  const currentNodeId = useNodeId();
  
  // Use FlowState hooks for optimized subscriptions
  const flowState = useFlowState();
  const nodeData = useFlowStateNode(currentNodeId);
  const processingNodes = useFlowStateProcessing();
  
  // Local state for UI-specific data
  const [localProcessingStatus, setLocalProcessingStatus] = useState('idle');
  const [renderedContent, setRenderedContent] = useState('');
  
  // Enhanced state for new features
  const [currentVisualState, setCurrentVisualState] = useState('default');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    updateCount: 0,
    errorCount: 0,
    lastUpdate: null,
    contentLength: 0,
    renderingTime: 0
  });
  const [directiveProcessingStatus, setDirectiveProcessingStatus] = useState({
    processing: false,
    lastProcessed: null,
    totalProcessed: 0,
    errors: []
  });
  const [contentMetrics, setContentMetrics] = useState({
    wordCount: 0,
    characterCount: 0,
    lineCount: 0,
    lastRendered: null
  });

  // Refs for performance tracking and enhanced functionality
  const renderStartTime = useRef(performance.now());
  const directiveProcessorRef = useRef(null);
  const styleManagerRef = useRef(globalStyleManager);
  const contentRenderStartTime = useRef(null);

  // Derived state
  const isProcessing = processingNodes.has(currentNodeId);
  const processingStatus = isProcessing ? 'processing' :
    (nodeData?.output?.meta?.status || localProcessingStatus);

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
    'content-in'
  );

  // Enhanced Performance monitoring effect - FIXED: Removed circular dependency
  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    
    setPerformanceMetrics(prev => {
      const newUpdateCount = prev.updateCount + 1;
      
      // DIAGNOSTIC: Check for runaway performance monitoring
      if (newUpdateCount > 100) {
        console.error(`[MARKDOWN PERFORMANCE LOOP DETECTED][${currentNodeId}] Update count exceeded 100:`, newUpdateCount);
        console.error('[MARKDOWN PERFORMANCE STACK TRACE]', new Error().stack);
        return prev; // Don't update if we're in a loop
      }
      
      // Track performance metrics (reduce frequency to prevent loops)
      if (newUpdateCount % 5 === 0) {
        performanceMonitor.recordMetric(`markdownNew-${currentNodeId}`, 'renderTime', renderTime);
        performanceMonitor.recordMetric(`markdownNew-${currentNodeId}`, 'contentLength', renderedContent.length);
      }
      
      return {
        ...prev,
        renderTime,
        updateCount: newUpdateCount,
        lastUpdate: new Date().toISOString(),
        contentLength: renderedContent.length
      };
    });
    
    // Reset render start time for next render
    renderStartTime.current = performance.now();
  }, [currentNodeId, renderedContent.length]); // FIXED: Only depend on stable values, not the metrics we're updating

  // Initialize node with enhanced schema and directive processing - FIXED: Added initialization guard
  useEffect(() => {
    console.log(`[MARKDOWN INIT DEBUG][${currentNodeId}] Initialization effect triggered - nodeData exists:`, !!nodeData, 'hasVersion:', !!(nodeData?.meta?.version));
    
    // FIXED: Add initialization guard to prevent re-initialization
    if (nodeData && nodeData.meta && nodeData.meta.version) {
      console.log(`[MARKDOWN INIT DEBUG][${currentNodeId}] Node already initialized with version:`, nodeData.meta.version, '- skipping');
      return;
    }
    
    const initializeNode = async () => {
      console.log(`[MARKDOWN INIT DEBUG][${currentNodeId}] Starting node initialization`);
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
                rendering: NodeVisualState.create({
                  container: { borderColor: '#8b5cf6', backgroundColor: '#f3e8ff' }
                })
              },
              handles: {
                input: [
                  HandleConfiguration.create({
                    id: 'content-in',
                    type: 'target',
                    position: 'left',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['string', 'object']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          };
        } else {
          // Convert from old format
          newNodeData = OutputNodeData.create({
            meta: {
              label: data.label || 'Markdown Display',
              function: data.function || 'Enhanced Markdown Renderer',
              emoji: data.emoji || '📝',
              description: 'Renders markdown content with enhanced directive processing and performance monitoring',
              category: 'output',
              capabilities: ['markdown-rendering', 'content-display', 'directive-processing'],
              tags: ['markdown', 'display', 'enhanced'],
              version: '2.0.0'
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
              },
              processed: {
                aggregated: {},
                byConnection: {},
                strategy: 'latest',
                meta: {
                  lastAggregated: new Date().toISOString(),
                  connectionCount: 0,
                  totalDataSize: 0,
                  aggregationMethod: 'latest'
                }
              }
            },
            output: {
              data: {
                content: data.content || '',
                renderedHtml: '',
                wordCount: 0,
                characterCount: 0,
                lastUpdated: new Date().toISOString()
              },
              directives: {},
              meta: {
                timestamp: new Date().toISOString(),
                status: 'idle'
              }
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
                rendering: NodeVisualState.create({
                  container: { borderColor: '#8b5cf6', backgroundColor: '#f3e8ff' }
                })
              },
              handles: {
                input: [
                  HandleConfiguration.create({
                    id: 'content-in',
                    type: 'target',
                    position: 'left',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['string', 'object']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          });
        }

        // DIAGNOSTIC: Log the update process to detect circular updates
        console.log(`[MARKDOWN CIRCULAR DEBUG][${currentNodeId}] About to update FlowState - current nodeData version:`, nodeData?.meta?.version, 'new version:', newNodeData.meta.version);
        
        // DIAGNOSTIC: Add delay and check before FlowState update
        console.log(`[MARKDOWN CIRCULAR DEBUG][${currentNodeId}] About to call flowState.updateNode`);
        
        // Update FlowState with new node data
        flowState.updateNode(currentNodeId, {
          id: currentNodeId,
          type: 'markdownNew',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });
        
        console.log(`[MARKDOWN CIRCULAR DEBUG][${currentNodeId}] FlowState update completed`);

        // Initialize local state
        const initialContent = newNodeData.output.data.content || '';
        setRenderedContent(initialContent);
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');
        setCurrentVisualState(initialContent ? 'success' : 'default');

        // Initialize content metrics
        setContentMetrics({
          wordCount: initialContent.split(/\s+/).filter(word => word.length > 0).length,
          characterCount: initialContent.length,
          lineCount: initialContent.split('\n').length,
          lastRendered: new Date().toISOString()
        });

        console.log(`[Markdown Node] Node ${currentNodeId} initialized with enhanced schema and directive processing`);

        // Register with node data manager with optimized callback
        const safeUpdateNodeData = (updateNodeId, updates) => {
          // Only update React Flow if the update is not coming from our own component
          if (updateNodeId === currentNodeId && updates.data) {
            updateNodeData(updateNodeId, updates);
          }
        };
        
        nodeDataManager.registerNode(currentNodeId, newNodeData, safeUpdateNodeData);
        
        performanceMonitor.endMeasurement(measurement);
      } catch (error) {
        performanceMonitor.endMeasurement(measurement);
        console.error('Error initializing enhanced markdown node:', error);
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

  // Update rendered content based on input data
  const updateRenderedContent = useCallback(async (updatedNodeData, skipNodeDataUpdate = false) => {
    let content = updatedNodeData.output.data.content || '';
    
    // If we have processed input data from connections, combine it with existing content
    const connections = updatedNodeData.input.connections || {};
    const processedConnections = Object.values(connections).filter(conn => conn.processed);
    
    if (processedConnections.length > 0) {
      // Combine input data from connections into markdown content
      const inputContent = processedConnections
        .map((connection) => {
          const data = connection.processed;
          const sourceId = connection.sourceNodeId;
          
          if (typeof data === 'string') {
            return `## From ${sourceId}\n\n${data}`;
          } else if (typeof data === 'object') {
            // Look for text-like fields
            const textFields = ['content', 'text', 'message', 'response', 'result'];
            for (const field of textFields) {
              if (data[field] && typeof data[field] === 'string') {
                return `## From ${sourceId}\n\n${data[field]}`;
              }
            }
            // Fallback to JSON representation
            return `## From ${sourceId}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
          }
          return `## From ${sourceId}\n\n${String(data)}`;
        })
        .join('\n\n---\n\n');
      
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
      
      // Update the node data in the manager
      // FlowStateContext will be automatically synced via NodeDataManager
      nodeDataManager.nodes.set(currentNodeId, updatedData);
    }
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

      console.log(`[Markdown Node][${currentNodeId}] Processed ${results.totalDirectives} directives:`, results);
    } catch (error) {
      console.error(`[Markdown Node][${currentNodeId}] Directive processing failed:`, error);
      
      setDirectiveProcessingStatus(prev => ({
        ...prev,
        processing: false,
        errors: [...prev.errors, error.message]
      }));
    }
  }, [currentNodeId]);

  // Listen to node data events (optimized)
  useEffect(() => {
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const updatedNodeData = event.detail.nodeData;
        //console.log(`[Markdown Node][${currentNodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        setLocalProcessingStatus(newStatus);
        
        // Update rendered content when input data changes, but skip node data update to prevent recursion
        updateRenderedContent(updatedNodeData, true);
        
        //console.log(`[Markdown Node][${currentNodeId}] Local state updated - Status: ${newStatus}`);
      }
    };

    const handleNodeProcessing = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        setLocalProcessingStatus('processing');
        //console.log(`[Markdown Node][${currentNodeId}] Processing started`);
      }
    };

    const handleNodeProcessed = (event) => {
      if (event.detail.nodeId === currentNodeId) {
        const newStatus = event.detail.success ? 'success' : 'error';
        setLocalProcessingStatus(newStatus);
        //console.log(`[Markdown Node][${currentNodeId}] Processing completed - Status: ${newStatus}`);
      }
    };

    // Add event listeners (reduced to essential events)
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
  //console.log(`[MarkDown] Rendered. id: '${currentNodeId}' nodeData:`, nodeData);
  return (
    <div className="group relative">
      {/* Hover Buttons */}
      <ButtonPanel>
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(nodeData, null, 2)}\`\`\``}
          title="View Data"
          className="hover:bg-gray-50"
        />
        <ViewButton
          data={renderedContent}
          title="View Markdown"
          className="hover:bg-gray-50 text-blue-700"
        />
        <DownloadFile
          content={renderedContent}
          filename={(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            let displayHours = hours % 12 || 12;
             displayHours = String(displayHours).padStart(2,"0");
             const hhmm = `${displayHours}.${minutes}`
            return `markdown-${year}-${month}-${day} at ${hhmm} ${ampm}.md`;
          })()}
          fileExtension="md"
          mimeType="text/markdown"
          title="Download markdown content"
          className="p-1 text-gray-400 hover:text-green-600 transition-colors rounded hover:bg-gray-100"
        />
      </ButtonPanel>
      {/* Connection Badge */}
      <ConnectionBadge />
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

        {/* Input Summary - Using connection-level processed data */}
        {(() => {
          const connections = nodeData.input.connections || {};
          const processedConnections = Object.values(connections).filter(conn => conn.processed);
          return processedConnections.length > 0 && (
            <div className="mx-4 mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="font-medium text-blue-800">Connected Inputs:</div>
              <div className="text-blue-600 mt-1">
                {processedConnections.length} source(s) providing content
              </div>
              {/* Show individual connection details */}
              {processedConnections.map((connection, index) => (
                <div key={index} className="text-blue-500 mt-1 text-xs">
                  • {connection.sourceNodeId}
                  {connection.meta?.lastProcessed && (
                    <span className="text-gray-500 ml-1">
                      ({new Date(connection.meta.lastProcessed).toLocaleTimeString()})
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* React Flow Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !rounded-full !border-2 !border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-400 !rounded-full !border-2 !border-white"
        />
      </div>
    </div>
  );
}

// Enhanced Markdown Node with Error Boundary
function EnhancedMarkdownNew(props) {
  return (
    <MarkdownNewErrorBoundary
      nodeId={props.data?.nodeId || 'unknown'}
      contentLength={props.data?.output?.data?.content?.length || 0}
    >
      <MarkdownNew {...props} />
    </MarkdownNewErrorBoundary>
  );
}

export default memo(EnhancedMarkdownNew);