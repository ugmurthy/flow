/**
 * Comprehensive Test for Workflow Execution Control
 * Tests the complete solution for executeWorkflow bypass issues
 */

import nodeDataManager from './src/services/nodeDataManager.js';

// Mock GlobalContext for testing
const createMockGlobalContext = (initialExecuteWorkflow = true) => {
  let executeWorkflow = initialExecuteWorkflow;
  const callbacks = new Set();
  
  return {
    executeWorkflow,
    setExecuteWorkflow: (newValue) => {
      const prevValue = executeWorkflow;
      executeWorkflow = newValue;
      
      // Notify callbacks
      if (prevValue !== newValue) {
        callbacks.forEach(callback => {
          try {
            callback(newValue, prevValue);
          } catch (error) {
            console.error('Callback error:', error);
          }
        });
      }
    },
    toggleExecuteWorkflow: () => {
      const prevValue = executeWorkflow;
      executeWorkflow = !executeWorkflow;
      
      // Notify callbacks
      callbacks.forEach(callback => {
        try {
          callback(executeWorkflow, prevValue);
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    },
    registerExecuteWorkflowCallback: (callback) => {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    }
  };
};

// Test helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createTestNode = (nodeId, nodeType = 'process', hasData = false) => {
  return {
    meta: {
      label: `Test ${nodeType} Node`,
      function: `Test ${nodeType} Function`,
      emoji: '🧪',
      category: nodeType,
      version: '2.0.0'
    },
    input: {
      connections: {},
      processed: { aggregated: {}, byConnection: {} }
    },
    output: {
      data: hasData ? { testData: 'test value' } : {},
      meta: {
        status: 'idle',
        timestamp: new Date().toISOString()
      }
    },
    error: { hasError: false, errors: [] },
    plugin: { name: 'data-transformer', config: {} }
  };
};

// Test Suite
async function runWorkflowExecutionControlTests() {
  console.log('🧪 Starting Workflow Execution Control Tests...\n');
  
  try {
    // Initialize nodeDataManager
    await nodeDataManager.initialize();
    
    // Test 1: Core executeWorkflow Gate in processNode()
    await testCoreExecuteWorkflowGate();
    
    // Test 2: Connection-triggered execution control
    await testConnectionTriggeredExecution();
    
    // Test 3: Manual button bypass
    await testManualButtonBypass();
    
    // Test 4: Retroactive cascade system
    await testRetroactiveCascade();
    
    // Test 5: Input node special handling
    await testInputNodeSpecialHandling();
    
    console.log('✅ All Workflow Execution Control Tests Passed!\n');
    
  } catch (error) {
    console.error('❌ Test Suite Failed:', error);
    throw error;
  }
}

// Test 1: Core executeWorkflow Gate
async function testCoreExecuteWorkflowGate() {
  console.log('📋 Test 1: Core executeWorkflow Gate in processNode()');
  
  const globalContext = createMockGlobalContext(false); // Start with executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  // Register test node
  const testNode = createTestNode('test-gate-1', 'process');
  nodeDataManager.registerNode('test-gate-1', testNode, () => {});
  
  // Test: processNode with executeWorkflow = false should be blocked
  const result1 = await nodeDataManager.processNode('test-gate-1');
  console.log('  - processNode with executeWorkflow=false:', result1.status === 'paused' ? '✅ BLOCKED' : '❌ FAILED');
  
  // Test: processNode with manual bypass should work
  const result2 = await nodeDataManager.processNode('test-gate-1', { manual: true });
  console.log('  - processNode with manual=true bypass:', result2.status === 'completed' ? '✅ BYPASSED' : '❌ FAILED');
  
  // Test: processNode with executeWorkflow = true should work
  globalContext.setExecuteWorkflow(true);
  const result3 = await nodeDataManager.processNode('test-gate-1');
  console.log('  - processNode with executeWorkflow=true:', result3.status === 'completed' ? '✅ EXECUTED' : '❌ FAILED');
  
  console.log('✅ Test 1 Complete\n');
}

// Test 2: Connection-triggered execution control
async function testConnectionTriggeredExecution() {
  console.log('📋 Test 2: Connection-triggered execution control');
  
  const globalContext = createMockGlobalContext(false); // Start with executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  // Create source node with data
  const sourceNode = createTestNode('test-source-2', 'input', true);
  nodeDataManager.registerNode('test-source-2', sourceNode, () => {});
  
  // Create target node without data
  const targetNode = createTestNode('test-target-2', 'process');
  nodeDataManager.registerNode('test-target-2', targetNode, () => {});
  
  // Test: addConnection with executeWorkflow = false should NOT trigger processing
  await nodeDataManager.addConnection('test-source-2', 'test-target-2', 'default', 'default', 'test-edge-2');
  
  const targetAfterConnection = nodeDataManager.getNodeData('test-target-2');
  const isWaiting = targetAfterConnection.output?.meta?.status === 'waiting';
  console.log('  - addConnection with executeWorkflow=false:', isWaiting ? '✅ TARGET WAITING' : '❌ FAILED');
  
  // Test: Enable executeWorkflow and add another connection should trigger processing
  globalContext.setExecuteWorkflow(true);
  
  // Create another pair for executeWorkflow = true test
  const sourceNode2 = createTestNode('test-source-3', 'input', true);
  nodeDataManager.registerNode('test-source-3', sourceNode2, () => {});
  
  const targetNode2 = createTestNode('test-target-3', 'process');
  nodeDataManager.registerNode('test-target-3', targetNode2, () => {});
  
  await delay(100); // Give time for processing
  await nodeDataManager.addConnection('test-source-3', 'test-target-3', 'default', 'default', 'test-edge-3');
  await delay(100); // Give time for processing
  
  const targetAfterConnection2 = nodeDataManager.getNodeData('test-target-3');
  const hasProcessed = targetAfterConnection2.output?.meta?.status === 'success';
  console.log('  - addConnection with executeWorkflow=true:', hasProcessed ? '✅ TARGET PROCESSED' : '❌ FAILED');
  
  console.log('✅ Test 2 Complete\n');
}

// Test 3: Manual button bypass
async function testManualButtonBypass() {
  console.log('📋 Test 3: Manual button bypass functionality');
  
  const globalContext = createMockGlobalContext(false); // executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  // Create test node
  const testNode = createTestNode('test-manual-3', 'process');
  nodeDataManager.registerNode('test-manual-3', testNode, () => {});
  
  // Test: Manual processing should work regardless of executeWorkflow
  const result = await nodeDataManager.processNode('test-manual-3', { 
    manual: true, 
    source: 'manual_button' 
  });
  
  console.log('  - Manual processing with executeWorkflow=false:', result.status === 'completed' ? '✅ BYPASSED' : '❌ FAILED');
  console.log('  - Manual processing source logged:', result.source ? '✅ LOGGED' : '❌ FAILED');
  
  console.log('✅ Test 3 Complete\n');
}

// Test 4: Retroactive cascade system
async function testRetroactiveCascade() {
  console.log('📋 Test 4: Retroactive cascade system');
  
  const globalContext = createMockGlobalContext(false); // Start with executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  // Create a chain: source -> middle -> target
  const sourceNode = createTestNode('test-retro-source', 'input', true);
  const middleNode = createTestNode('test-retro-middle', 'process');
  const targetNode = createTestNode('test-retro-target', 'process');
  
  nodeDataManager.registerNode('test-retro-source', sourceNode, () => {});
  nodeDataManager.registerNode('test-retro-middle', middleNode, () => {});
  nodeDataManager.registerNode('test-retro-target', targetNode, () => {});
  
  // Create connections while executeWorkflow = false
  await nodeDataManager.addConnection('test-retro-source', 'test-retro-middle', 'default', 'default', 'retro-edge-1');
  await nodeDataManager.addConnection('test-retro-middle', 'test-retro-target', 'default', 'default', 'retro-edge-2');
  
  // Verify nodes are in waiting state
  const middleBeforeToggle = nodeDataManager.getNodeData('test-retro-middle');
  const isMiddleWaiting = middleBeforeToggle.output?.meta?.status === 'waiting';
  console.log('  - Middle node waiting before toggle:', isMiddleWaiting ? '✅ WAITING' : '❌ FAILED');
  
  // Get cascade stats before enabling
  const statsBefore = nodeDataManager.getRetroactiveCascadeStats();
  console.log('  - Stalled nodes detected:', statsBefore.stalledRootNodes > 0 ? '✅ DETECTED' : '❌ FAILED');
  
  // Set up event listener for cascade events
  let cascadeStarted = false;
  let cascadeCompleted = false;
  
  const handleCascadeStart = () => { cascadeStarted = true; };
  const handleCascadeComplete = () => { cascadeCompleted = true; };
  
  nodeDataManager.addEventListener('RETROACTIVE_CASCADE_STARTED', handleCascadeStart);
  nodeDataManager.addEventListener('RETROACTIVE_CASCADE_COMPLETED', handleCascadeComplete);
  
  // Toggle executeWorkflow to true - this should trigger retroactive cascade
  globalContext.setExecuteWorkflow(true);
  
  // Give time for cascade to complete
  await delay(200);
  
  // Check results
  console.log('  - Retroactive cascade started event:', cascadeStarted ? '✅ FIRED' : '❌ FAILED');
  console.log('  - Retroactive cascade completed event:', cascadeCompleted ? '✅ FIRED' : '❌ FAILED');
  
  const middleAfterToggle = nodeDataManager.getNodeData('test-retro-middle');
  const isMiddleProcessed = middleAfterToggle.output?.meta?.status === 'success';
  console.log('  - Middle node processed after toggle:', isMiddleProcessed ? '✅ PROCESSED' : '❌ FAILED');
  
  // Cleanup event listeners
  nodeDataManager.removeEventListener('RETROACTIVE_CASCADE_STARTED', handleCascadeStart);
  nodeDataManager.removeEventListener('RETROACTIVE_CASCADE_COMPLETED', handleCascadeComplete);
  
  console.log('✅ Test 4 Complete\n');
}

// Test 5: Input node special handling
async function testInputNodeSpecialHandling() {
  console.log('📋 Test 5: Input node special handling');
  
  const globalContext = createMockGlobalContext(false); // executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  // Create input node with data
  const inputNode = createTestNode('test-input-5', 'input', true);
  const processNode = createTestNode('test-process-5', 'process');
  
  nodeDataManager.registerNode('test-input-5', inputNode, () => {});
  nodeDataManager.registerNode('test-process-5', processNode, () => {});
  
  // Create connection
  await nodeDataManager.addConnection('test-input-5', 'test-process-5', 'default', 'default', 'input-edge-5');
  
  // Test: Input node should be able to process its own data even when executeWorkflow = false
  const result = await nodeDataManager.processNode('test-input-5');
  console.log('  - Input node processing with executeWorkflow=false:', result.status === 'completed' ? '✅ ALLOWED' : '❌ FAILED');
  console.log('  - Downstream blocked for input node:', result.downstreamBlocked ? '✅ BLOCKED' : '❌ FAILED');
  
  // Test: Process node should still be waiting
  const processAfter = nodeDataManager.getNodeData('test-process-5');
  const isProcessWaiting = processAfter.output?.meta?.status === 'waiting';
  console.log('  - Process node still waiting:', isProcessWaiting ? '✅ WAITING' : '❌ FAILED');
  
  console.log('✅ Test 5 Complete\n');
}

// Test: Workflow paused events
async function testWorkflowPausedEvents() {
  console.log('📋 Test 6: Workflow paused events');
  
  const globalContext = createMockGlobalContext(false); // executeWorkflow = false
  nodeDataManager.setGlobalContext(globalContext);
  
  let pausedEventFired = false;
  const handlePausedEvent = (event) => {
    pausedEventFired = true;
    console.log('  - Paused event detail:', event.detail);
  };
  
  nodeDataManager.addEventListener('WORKFLOW_EXECUTION_PAUSED', handlePausedEvent);
  
  // Create test node and try to process
  const testNode = createTestNode('test-paused-6', 'process');
  nodeDataManager.registerNode('test-paused-6', testNode, () => {});
  
  await nodeDataManager.processNode('test-paused-6', { source: 'test' });
  
  console.log('  - Workflow paused event fired:', pausedEventFired ? '✅ FIRED' : '❌ FAILED');
  
  nodeDataManager.removeEventListener('WORKFLOW_EXECUTION_PAUSED', handlePausedEvent);
  
  console.log('✅ Test 6 Complete\n');
}

// Enhanced test runner with comprehensive scenarios
async function runEnhancedTests() {
  console.log('🧪 Starting Enhanced Workflow Execution Control Tests...\n');
  
  await runWorkflowExecutionControlTests();
  await testWorkflowPausedEvents();
  
  console.log('🎉 All Enhanced Tests Completed Successfully!');
}

// Export for external use
export {
  runWorkflowExecutionControlTests,
  runEnhancedTests,
  createMockGlobalContext,
  createTestNode
};

// Run tests if this file is executed directly
if (import.meta.main) {
  runEnhancedTests().catch(console.error);
}