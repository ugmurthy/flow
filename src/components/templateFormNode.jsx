import React, { memo, useCallback, useState, useEffect, useRef, Component } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from '@xyflow/react';
import { InputNodeData, NodeVisualState, HandleConfiguration } from '../types/nodeSchema.js';
import nodeDataManager, { NodeDataEvents } from '../services/nodeDataManager.js';
import { DirectiveProcessor } from '../services/directiveProcessor.js';
import { globalStyleManager } from '../styles/nodeStyleManager.js';
import { useFlowState, useFlowStateNode, useFlowStateProcessing } from '../contexts/FlowStateContext.jsx';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { formatFormDataForDisplay } from '../utils/helpers';
import Edit from '../icons/Edit';

import ViewButton from '../components/ViewButton';
import DeleteButton from './DeleteButton';
import ResetButton from './ResetButton'
import { useModal, MODAL_TYPES } from '../contexts/ModalContext';
import { useGlobal } from '../contexts/GlobalContext';
import EditButton from './EditButton';
import ButtonPanel from './ButtonPanel';

/**
 * Enhanced Error Boundary for TemplateFormNode
 * Provides comprehensive error handling with recovery mechanisms
 */
class TemplateFormNodeErrorBoundary extends Component {
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
    console.error('[TemplateFormNode] Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report to performance monitor
    if (this.props.nodeId) {
      performanceMonitor.recordError(`templateFormNode-${this.props.nodeId}`, error.message, {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
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
      console.log(`[TemplateFormNode] Retrying component (${this.state.retryCount + 1}/${this.maxRetries})`);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-4 py-3 shadow-md rounded-lg border-2 border-red-400 bg-red-50 min-w-[200px]">
          <div className="text-red-800 font-bold text-sm">⚠️ Component Error</div>
          <div className="text-red-600 text-xs mt-1">
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
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

// Component to show connection count as a badge
function ConnectionBadge({ connectionCount }) {
  if (!connectionCount) return null;

  return (
    <div className='absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10'>
      {connectionCount}
    </div>
  );
}

function TemplateFormNode({ data }) {
  const { openModal } = useModal();
  const { executeWorkflow } = useGlobal();
  const { updateNodeData } = useReactFlow();
  const nodeId = useNodeId();
  
  // Use FlowState hooks for optimized subscriptions
  const flowState = useFlowState();
  const nodeData = useFlowStateNode(nodeId);
  const processingNodes = useFlowStateProcessing();
  
  // Local state for UI-specific data
  const [connectionCount, setConnectionCount] = useState(0);
  const [localProcessingStatus, setLocalProcessingStatus] = useState('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Enhanced state for new features
  const [currentVisualState, setCurrentVisualState] = useState('default');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    updateCount: 0,
    errorCount: 0,
    lastUpdate: null
  });
  const [directiveProcessingStatus, setDirectiveProcessingStatus] = useState({
    processing: false,
    lastProcessed: null,
    totalProcessed: 0,
    errors: []
  });

  // Refs for performance tracking
  const renderStartTime = useRef(performance.now());
  const directiveProcessorRef = useRef(null);
  const styleManagerRef = useRef(globalStyleManager);

  // Derived state
  const isProcessing = processingNodes.has(nodeId);
  const processingStatus = isProcessing ? 'processing' :
    (nodeData?.output?.meta?.status || localProcessingStatus);

  // Get computed styles from NodeStyleManager
  const computedStyles = styleManagerRef.current.getNodeStyle(
    nodeData || {},
    currentVisualState,
    { selected: data?.selected }
  );

  // Get handle styles
  const handleStyles = styleManagerRef.current.getHandleStyle(
    nodeData || {},
    'output',
    'form-data-out'
  );

  // Enhanced Performance monitoring effect - FIXED: Added dependency array to prevent infinite loops
  useEffect(() => {
    console.log(`[DEBUG][${nodeId}] Performance monitoring effect triggered`);
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime,
      updateCount: prev.updateCount + 1,
      lastUpdate: new Date().toISOString()
    }));

    // Track performance metrics
    performanceMonitor.recordMetric(`templateFormNode-${nodeId}`, 'renderTime', renderTime);
    performanceMonitor.recordMetric(`templateFormNode-${nodeId}`, 'updateCount', performanceMetrics.updateCount + 1);
    
    // Reset render start time for next render
    renderStartTime.current = performance.now();
  }, [nodeId]); // FIXED: Added nodeId as dependency to prevent infinite re-runs

  // Initialize node with enhanced schema and directive processing - FIXED: Added initialization guard
  useEffect(() => {
    console.log(`[DEBUG][${nodeId}] Initialization effect triggered`);
    
    // FIXED: Add initialization guard to prevent re-initialization
    if (nodeData && nodeData.meta && nodeData.meta.version) {
      console.log(`[DEBUG][${nodeId}] Node already initialized, skipping`);
      return;
    }

    const initializeNode = async () => {
      console.log(`[DEBUG][${nodeId}] Starting node initialization`);
      const measurement = performanceMonitor.startMeasurement('nodeInitialization');
      
      try {
        // Ensure node data manager is initialized
        await nodeDataManager.initialize();

        // Initialize directive processor
        directiveProcessorRef.current = new DirectiveProcessor(nodeDataManager);

        // Convert old data format to new schema if needed
        let newNodeData;
        if (data.meta && data.input && data.output && data.error) {
          // Already in new format, but ensure it has styling configuration and formFields
          newNodeData = {
            ...data,
            // Ensure formFields are preserved in the correct location
            input: {
              ...data.input,
              formFields: data.input?.formFields || data.formFields || [],
              config: {
                ...data.input?.config,
                formFields: data.input?.config?.formFields || data.input?.formFields || data.formFields || []
              }
            },
            // Also keep formFields at root level for backward compatibility
            formFields: data.input?.formFields || data.formFields || [],
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
                filled: NodeVisualState.create({
                  container: { borderColor: '#3b82f6', backgroundColor: '#dbeafe' }
                })
              },
              handles: {
                output: [
                  HandleConfiguration.create({
                    id: 'form-data-out',
                    type: 'source',
                    position: 'right',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          };
        } else {
          // Convert from old format
          newNodeData = InputNodeData.create({
            meta: {
              label: data.label || 'Template Form Node',
              function: data.function || 'Dynamic Form Template',
              emoji: data.emoji || '📝',
              description: 'Template form node for collecting user input with enhanced directive processing',
              category: 'input',
              capabilities: ['form-collection', 'validation', 'directive-generation'],
              tags: ['user-input', 'forms', 'enhanced'],
              version: '2.0.0'
            },
            formFields: data.formFields || [],
            input: {
              config: {
                validation: {},
                allowExternalData: true,
                formFields: data.formFields || []
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
                filled: NodeVisualState.create({
                  container: { borderColor: '#3b82f6', backgroundColor: '#dbeafe' }
                })
              },
              handles: {
                output: [
                  HandleConfiguration.create({
                    id: 'form-data-out',
                    type: 'source',
                    position: 'right',
                    behavior: {
                      allowMultipleConnections: true,
                      acceptedDataTypes: ['object', 'string']
                    }
                  })
                ]
              },
              theme: 'default'
            }
          });
        }

        // FIXED: Use more cautious update approach to prevent circular updates
        console.log(`[DEBUG][${nodeId}] Updating FlowState with new node data`);
        
        // Register with node data manager first (without triggering updates)
        nodeDataManager.registerNode(nodeId, newNodeData, null);
        
        // Update FlowState with new node data
        flowState.updateNode(nodeId, {
          id: nodeId,
          type: 'templateFormNode',
          position: { x: 0, y: 0 }, // Will be updated by React Flow
          data: newNodeData,
        });

        // Initialize local state
        setLocalProcessingStatus(newNodeData.output?.meta?.status || 'idle');
        setCurrentVisualState(
          Object.keys(newNodeData.output?.data || {}).length > 0 ? 'filled' : 'default'
        );

        console.log(`[DEBUG][${nodeId}] Node initialized with enhanced schema and directive processing`);
        
        performanceMonitor.endMeasurement(measurement);
      } catch (error) {
        performanceMonitor.endMeasurement(measurement);
        console.error(`[DEBUG][${nodeId}] Error initializing enhanced form node:`, error);
        setPerformanceMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
      }
    };

    initializeNode();

    // Cleanup on unmount
    return () => {
      console.log(`[DEBUG][${nodeId}] Cleaning up node`);
      nodeDataManager.unregisterNode(nodeId);
      if (directiveProcessorRef.current) {
        directiveProcessorRef.current.cleanup();
      }
    };
  }, [nodeId]); // FIXED: Removed circular dependencies that were causing re-initialization

  // Reset function to clear form data (moved up to avoid hoisting issues)
  const resetFormData = useCallback(async () => {
    if (!nodeData) return;

    try {
      await nodeDataManager.updateNodeData(nodeId, {
        output: {
          data: {},
          meta: {
            timestamp: new Date().toISOString(),
            status: 'idle'
          }
        },
        error: {
          hasError: false,
          errors: []
        }
      }, true); // Trigger processing of connected nodes
    } catch (error) {
      console.error("Failed to reset form data:", error);
    }
  }, [nodeId, nodeData]);

  // Enhanced event listeners with directive processing - FIXED: Removed problematic dependencies
  useEffect(() => {
    console.log(`[DEBUG][${nodeId}] Event listeners effect triggered`);
    
    const handleNodeDataUpdate = (event) => {
      if (event.detail.nodeId === nodeId) {
        const updatedNodeData = event.detail.nodeData;
        console.log(`[DEBUG][${nodeId}] Event received - NODE_DATA_UPDATED:`, event.detail);
        
        // Update local state for immediate UI feedback
        const newStatus = updatedNodeData.output?.meta?.status || 'idle';
        setLocalProcessingStatus(newStatus);
        
        // Update visual state based on status and data
        let newVisualState = 'default';
        if (newStatus === 'processing') {
          newVisualState = 'processing';
        } else if (newStatus === 'success') {
          newVisualState = Object.keys(updatedNodeData.output?.data || {}).length > 0 ? 'filled' : 'success';
        } else if (newStatus === 'error') {
          newVisualState = 'error';
        } else if (Object.keys(updatedNodeData.output?.data || {}).length > 0) {
          newVisualState = 'filled';
        }
        
        setCurrentVisualState(newVisualState);
        
        // Process any incoming directives
        if (updatedNodeData.output?.directives && directiveProcessorRef.current) {
          processDirectives(updatedNodeData.output.directives);
        }
        
        console.log(`[DEBUG][${nodeId}] Local state updated - Status: ${newStatus}, Visual: ${newVisualState}`);
      }
    };

    const handleConnectionAdded = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => {
          const newCount = prev + 1;
          console.log(`[DEBUG][${nodeId}] Connection added, count: ${newCount}`);
          return newCount;
        });
      }
    };

    const handleConnectionRemoved = (event) => {
      if (event.detail.targetNodeId === nodeId) {
        setConnectionCount(prev => {
          const newCount = Math.max(0, prev - 1);
          console.log(`[DEBUG][${nodeId}] Connection removed, count: ${newCount}`);
          
          // Reset form data when all connections are removed
          if (newCount === 0) {
            // Use callback to get current resetFormData function
            setTimeout(() => {
              resetFormData();
              setCurrentVisualState('default');
            }, 0);
          }
          
          return newCount;
        });
      }
    };

    // Add event listeners (reduced to essential events)
    nodeDataManager.addEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
    nodeDataManager.addEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);

    return () => {
      console.log(`[DEBUG][${nodeId}] Removing event listeners`);
      // Remove event listeners
      nodeDataManager.removeEventListener(NodeDataEvents.NODE_DATA_UPDATED, handleNodeDataUpdate);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_ADDED, handleConnectionAdded);
      nodeDataManager.removeEventListener(NodeDataEvents.CONNECTION_REMOVED, handleConnectionRemoved);
    };
  }, [nodeId]); // FIXED: Removed connectionCount and resetFormData dependencies that were causing infinite loops

  // Directive processing function
  const processDirectives = useCallback(async (directives) => {
    if (!directiveProcessorRef.current || !directives || Object.keys(directives).length === 0) {
      return;
    }

    setDirectiveProcessingStatus(prev => ({ ...prev, processing: true }));
    
    try {
      // Process directives using the directive processor
      const results = await directiveProcessorRef.current.processDirectives(nodeId, { [nodeId]: Object.values(directives) });
      
      setDirectiveProcessingStatus(prev => ({
        ...prev,
        processing: false,
        lastProcessed: new Date().toISOString(),
        totalProcessed: prev.totalProcessed + results.totalDirectives,
        errors: results.failed > 0 ? [...prev.errors, `${results.failed} directives failed`] : prev.errors
      }));

      console.log(`[Form Node][${nodeId}] Processed ${results.totalDirectives} directives:`, results);
    } catch (error) {
      console.error(`[Form Node][${nodeId}] Directive processing failed:`, error);
      
      setDirectiveProcessingStatus(prev => ({
        ...prev,
        processing: false,
        errors: [...prev.errors, error.message]
      }));
    }
  }, [nodeId]);

  // Generate directives for connected nodes based on form data
  const generateDirectives = useCallback((formData) => {
    if (!nodeData?.input?.connections || Object.keys(nodeData.input.connections).length === 0) {
      return {};
    }

    const directives = {};
    
    // For each connected target node, generate appropriate directives
    Object.values(nodeData.input.connections).forEach((connection) => {
      const targetNodeId = connection.targetNodeId;
      if (!targetNodeId) return;

      // Generate configuration directive for process nodes
      directives[`config-${targetNodeId}-${Date.now()}`] = {
        type: 'update-config',
        target: {
          section: 'input',
          path: 'config.userData',
          operation: 'merge'
        },
        payload: formData,
        processing: {
          immediate: true,
          priority: 3
        },
        meta: {
          source: nodeId,
          timestamp: new Date().toISOString(),
          version: '2.0.0'
        }
      };

      // Generate display directive for markdown nodes
      if (formData.title || formData.description) {
        directives[`display-${targetNodeId}-${Date.now()}`] = {
          type: 'transform-data',
          target: {
            section: 'output',
            path: 'data.content',
            operation: 'set'
          },
          payload: `# ${formData.title || 'Form Data'}\n\n${formData.description || JSON.stringify(formData, null, 2)}`,
          processing: {
            immediate: true,
            priority: 2
          },
          meta: {
            source: nodeId,
            timestamp: new Date().toISOString(),
            version: '2.0.0'
          }
        };
      }
    });

    return directives;
  }, [nodeId, nodeData]);

  const handleOpenModal = useCallback(() => {
    if (!nodeData) return;

    // Try multiple possible locations for formFields to ensure compatibility
    const formFields = nodeData.input?.formFields ||
                      nodeData.input?.config?.formFields ||
                      nodeData.formFields ||
                      [];

    console.log(`[Form Node][${nodeId}] Opening modal with formFields:`, formFields);
    console.log(`[Form Node][${nodeId}] NodeData structure:`, {
      hasInputFormFields: !!nodeData.input?.formFields,
      hasInputConfigFormFields: !!nodeData.input?.config?.formFields,
      hasRootFormFields: !!nodeData.formFields
    });

    openModal(MODAL_TYPES.FORM_EDIT, {
      formFields,
      defaultValues: nodeData.output.data || {},
      isSubmitting,
      onSubmit: async (formData) => {
        const submissionMeasurement = performanceMonitor.startMeasurement('formSubmission');
        setIsSubmitting(true);
        
        try {
          console.log("Enhanced form submitted:", nodeId, formData);
          
          // Set processing status through FlowState
          flowState.setNodeProcessing(nodeId, true);
          setCurrentVisualState('processing');
          
          // Set processing status first
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              meta: {
                timestamp: new Date().toISOString(),
                status: 'processing'
              }
            }
          });
          
          // Generate directives for connected nodes
          const directives = generateDirectives(formData);
          console.log(`[Form Node][${nodeId}] Generated ${Object.keys(directives).length} directives:`, directives);
          
          // Update with actual data and directives
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              data: formData,
              directives,
              meta: {
                timestamp: new Date().toISOString(),
                status: 'success',
                dataSize: JSON.stringify(formData).length,
                directivesGenerated: Object.keys(directives).length,
                processingTime: performance.now() - submissionMeasurement.startTime
              }
            }
          }, true); // Trigger processing of connected nodes
          
          // Process directives if any were generated
          if (Object.keys(directives).length > 0 && directiveProcessorRef.current) {
            await processDirectives(directives);
          }
          
          // Update visual state to filled
          setCurrentVisualState('filled');
          
          performanceMonitor.endMeasurement(submissionMeasurement);
          
        } catch (error) {
          console.error("Enhanced form submission failed:", error);
          
          // Update error metrics
          setPerformanceMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
          
          // Set error status
          await nodeDataManager.updateNodeData(nodeId, {
            output: {
              meta: {
                timestamp: new Date().toISOString(),
                status: 'error',
                processingTime: performance.now() - submissionMeasurement.startTime
              }
            },
            error: {
              hasError: true,
              errors: [{
                code: 'ENHANCED_FORM_SUBMISSION_ERROR',
                message: error.message,
                source: 'enhanced-form-submission',
                timestamp: new Date().toISOString(),
                details: error.stack,
                context: { formData, directiveCount: Object.keys(generateDirectives(formData)).length }
              }]
            }
          });
          
          // Update visual state to error
          setCurrentVisualState('error');
          performanceMonitor.endMeasurement(submissionMeasurement);
          
          throw error; // Re-throw to handle in modal
        } finally {
          setIsSubmitting(false);
          // Clear processing status
          flowState.setNodeProcessing(nodeId, false);
        }
      }
    });
  }, [openModal, nodeData, nodeId, isSubmitting, flowState, generateDirectives, processDirectives]); // FIXED: Removed resetFormData dependency
  //console.log("Form Component ",nodeData)
  if (!nodeData) {
    return (
      <div className="px-4 py-2 shadow-md rounded-md border-2 border-gray-300 bg-gray-100">
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
          className="hover:bg-gray-100"
        />
        <ViewButton
          data={`\`\`\`json\n${JSON.stringify(performanceMetrics, null, 2)}\`\`\``}
          title="Performance Metrics"
          className="hover:bg-blue-50 text-blue-700"
        />
        {directiveProcessingStatus.totalProcessed > 0 && (
          <ViewButton
            data={`\`\`\`json\n${JSON.stringify(directiveProcessingStatus, null, 2)}\`\`\``}
            title="Directive Processing Status"
            className="hover:bg-purple-50 text-purple-700"
          />
        )}
        <DeleteButton
          className="hover:bg-red-50"
          title="Delete Node"
        />
        <ResetButton onReset={resetFormData}/>
        <EditButton onEdit={handleOpenModal}/>
      </ButtonPanel>

      {/* Connection Badge */}
      <ConnectionBadge connectionCount={connectionCount} />

      {/* Main Node Container with Enhanced Styling */}
      <div
        style={{
          ...computedStyles,
          position: 'relative',
          minWidth: '200px'
        }}
        className="shadow-md rounded-lg border-2 transition-all duration-200"
      >
        {/* Processing Status Indicator */}
        {processingStatus === 'processing' && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse">
            <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
          </div>
        )}

        {/* Node Content - Enhanced Layout */}
        <div className="flex items-center gap-3 p-4">
          {/* Icon Section with Enhanced Visual State */}
          <div className={`rounded-full w-12 h-12 flex justify-center items-center flex-shrink-0 transition-all duration-200 ${
            currentVisualState === 'processing' ? 'bg-yellow-100 animate-pulse' :
            currentVisualState === 'success' || currentVisualState === 'filled' ? 'bg-green-100' :
            currentVisualState === 'error' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <span className="text-xl">{nodeData.meta.emoji}</span>
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate" style={{ color: computedStyles.color }}>
              {nodeData.meta.label}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm truncate opacity-75">
                {nodeData.meta.function}
              </div>
              {/* Enhanced Status Indicators */}
              <div
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  processingStatus === 'success' ? 'bg-green-500 shadow-green-200 shadow-md' :
                  processingStatus === 'processing' ? 'bg-yellow-500 shadow-yellow-200 shadow-md animate-pulse' :
                  processingStatus === 'error' ? 'bg-red-500 shadow-red-200 shadow-md' : 'bg-gray-400'
                }`}
                title={`Status: ${processingStatus}`}
              />
              {/* Execution Status Indicator */}
              <div
                className={`w-3 h-3 rounded-full ${executeWorkflow ? 'bg-green-500' : 'bg-red-500'}`}
                title={`Execution: ${executeWorkflow ? 'Enabled' : 'Disabled'}`}
              />
            </div>
            
            {/* Enhanced Connection and Performance Info */}
            {connectionCount > 0 && (
              <div className="text-xs mt-1 opacity-75">
                {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
              </div>
            )}
            
            {/* Performance Metrics Display */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs mt-1 opacity-60">
                Render: {performanceMetrics.renderTime.toFixed(2)}ms |
                Updates: {performanceMetrics.updateCount} |
                Errors: {performanceMetrics.errorCount}
                {directiveProcessingStatus.totalProcessed > 0 && (
                  <span> | Directives: {directiveProcessingStatus.totalProcessed}</span>
                )}
              </div>
            )}
            
            {/* Enhanced Schema Info */}
            <div className="text-xs mt-1 opacity-60">
              {nodeData.meta.category} | v{nodeData.meta.version} | {currentVisualState}
            </div>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {nodeData.error?.hasError && (
          <div className="mx-4 mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800">⚠️ Errors:</div>
            {nodeData.error.errors.map((error, index) => (
              <div key={index} className="text-red-600 mt-1">
                {error.code}: {error.message}
                {error.context && (
                  <div className="text-red-500 text-xs mt-1">
                    Context: {JSON.stringify(error.context)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Directive Processing Status */}
        {directiveProcessingStatus.processing && (
          <div className="mx-4 mb-4 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
            <div className="font-medium text-purple-800">🔄 Processing Directives...</div>
          </div>
        )}

        {/* Enhanced React Flow Handle with Dynamic Styling */}
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...handleStyles,
            backgroundColor: currentVisualState === 'filled' ? '#3b82f6' :
                           currentVisualState === 'processing' ? '#f59e0b' :
                           currentVisualState === 'error' ? '#ef4444' : '#6b7280'
          }}
          className="border-2 border-white"
        />
      </div>
    </div>
  );
}

// Enhanced Template Form Node with Error Boundary
function EnhancedTemplateFormNode(props) {
  return (
    <TemplateFormNodeErrorBoundary nodeId={props.data?.nodeId || 'unknown'}>
      <TemplateFormNode {...props} />
    </TemplateFormNodeErrorBoundary>
  );
}

export default memo(EnhancedTemplateFormNode);

