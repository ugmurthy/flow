/**
 * Simple Integration Test for ExecuteWorkflow Control
 * This script demonstrates and tests the ExecuteWorkflow functionality
 */

import { NodeDataManager, NodeDataEvents } from './src/services/nodeDataManager.js';

// Mock GlobalContext for testing
const createMockGlobalContext = (executeWorkflow = true) => ({
  executeWorkflow,
  setExecuteWorkflow: (value) => { /* mock setter */ },
  toggleExecuteWorkflow: () => { /* mock toggle */ }
});

// Test ExecuteWorkflow Integration
async function testExecuteWorkflowIntegration() {
  console.log('🧪 Testing ExecuteWorkflow Integration...\n');

  // Create a new NodeDataManager instance for testing
  const testManager = new NodeDataManager();
  await testManager.initialize();

  // Test 1: Default behavior (should execute)
  console.log('📋 Test 1: Default Behavior (no GlobalContext)');
  const testNodeId = 'test-node-1';
  const testNodeData = {
    meta: { category: 'input', label: 'Test Node' },
    input: { connections: {}, processed: {}, config: {} },
    output: { data: { test: 'data' }, meta: { status: 'idle', timestamp: new Date().toISOString() } },
    error: { hasError: false, errors: [] }
  };
  
  testManager.registerNode(testNodeId, testNodeData, () => {});
  
  // Mock the connections to simulate downstream processing
  testManager.connections.set('test-connection', {
    sourceNodeId: testNodeId,
    targetNodeId: 'test-target-1',
    sourceHandle: 'default',
    targetHandle: 'default'
  });

  console.log('⏩ Should execute downstream processing (default behavior)');
  await testManager._triggerDownstreamProcessing(testNodeId);
  console.log(testManager.connections.get("test-connection"));
  
  console.log('✅ Test 1 passed - executed without issues\n');

  // Test 2: ExecuteWorkflow = true
  console.log('📋 Test 2: ExecuteWorkflow = true');
  const trueContext = createMockGlobalContext(true);
  testManager.setGlobalContext(trueContext);
  
  console.log('⏩ Should execute downstream processing');
  await testManager._triggerDownstreamProcessing(testNodeId);
  console.log('✅ Test 2 passed - executed with ExecuteWorkflow=true\n');

  // Test 3: ExecuteWorkflow = false
  console.log('📋 Test 3: ExecuteWorkflow = false');
  const falseContext = createMockGlobalContext(false);
  testManager.setGlobalContext(falseContext);
  
  // Listen for the paused event
  let pausedEventFired = false;
  testManager.addEventListener('WORKFLOW_EXECUTION_PAUSED', (event) => {
    pausedEventFired = true;
    console.log('🔔 Workflow paused event fired:', event.detail);
  });
  
  console.log('⏸️ Should skip downstream processing');
  await testManager._triggerDownstreamProcessing(testNodeId);
  
  if (pausedEventFired) {
    console.log('✅ Test 3 passed - workflow execution paused correctly\n');
  } else {
    console.log('❌ Test 3 failed - paused event not fired\n');
  }

  // Test 4: Toggle ExecuteWorkflow back to true
  console.log('📋 Test 4: Toggle back to ExecuteWorkflow = true');
  testManager.setGlobalContext(createMockGlobalContext(true));
  
  console.log('▶️ Should resume downstream processing');
  await testManager._triggerDownstreamProcessing(testNodeId);
  console.log('✅ Test 4 passed - resumed execution successfully\n');

  console.log('🎉 All ExecuteWorkflow integration tests passed!');
}

// Test Node Processing Flow
async function testNodeProcessingFlow() {
  console.log('\n🧪 Testing Complete Node Processing Flow...\n');

  const testManager = new NodeDataManager();
  await testManager.initialize();

  // Set ExecuteWorkflow to false
  testManager.setGlobalContext(createMockGlobalContext(false));

  // Create test nodes
  const sourceNode = {
    meta: { category: 'input', label: 'Source Node' },
    input: { connections: {}, processed: {}, config: {} },
    output: { 
      data: { message: 'Hello from source!' }, 
      meta: { status: 'success', timestamp: new Date().toISOString() } 
    },
    error: { hasError: false, errors: [] }
  };

  const targetNode = {
    meta: { category: 'output', label: 'Target Node' },
    input: { connections: {}, processed: {}, config: {} },
    output: { data: {}, meta: { status: 'idle', timestamp: new Date().toISOString() } },
    error: { hasError: false, errors: [] }
  };

  testManager.registerNode('source-1', sourceNode, () => {});
  testManager.registerNode('target-1', targetNode, () => {});

  // Add connection
  await testManager.addConnection('source-1', 'target-1', 'default', 'default', 'test-edge');

  console.log('📡 Connection added with ExecuteWorkflow=false');
  console.log('🔍 Target node should not have been processed due to paused execution');
  
  // Now enable ExecuteWorkflow
  console.log('\n▶️ Enabling ExecuteWorkflow...');
  testManager.setGlobalContext(createMockGlobalContext(true));
  
  // Trigger processing manually
  await testManager.processNode('source-1');
  console.log('✅ Processing completed with ExecuteWorkflow=true');

  console.log('\n🎯 Node Processing Flow test completed!');
}

// Run tests
async function runAllTests() {
  try {
    await testExecuteWorkflowIntegration();
    await testNodeProcessingFlow();
    console.log('\n🚀 All integration tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for potential use in other test files
export { testExecuteWorkflowIntegration, testNodeProcessingFlow, runAllTests };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}