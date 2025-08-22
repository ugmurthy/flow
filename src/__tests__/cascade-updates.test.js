/**
 * Cascade Updates Test
 * Tests workflow cascade updates with executeWorkflow control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeDataManager } from '../services/nodeDataManager.js';
import { InputNodeData, ProcessNodeData, OutputNodeData } from '../types/nodeSchema.js';

describe('Cascade Updates with ExecuteWorkflow Control', () => {
  let nodeDataManager;
  let mockGlobalContext;
  let mockUpdateCallbacks;

  beforeEach(async () => {
    console.log("**BEFORE EACH TEST** Starts")
    nodeDataManager = new NodeDataManager();
    await nodeDataManager.initialize();
    
    // Mock global context for executeWorkflow control
    mockGlobalContext = {
      executeWorkflow: true
    };
    
    // Mock update callbacks for React Flow integration
    mockUpdateCallbacks = {
      inputNode: vi.fn(),
      processNode: vi.fn(),
      outputNode: vi.fn()
    };

    nodeDataManager.setGlobalContext(mockGlobalContext);
    
    // Setup workflow: Input → Process → Output
    setupWorkflow();
    console.log("**BEFORE EACH TEST** Ends")
  });

  function setupWorkflow() {
    // Create Input Node - start with empty output to allow processing
    console.log("  **SETTING UP WORKFLOW** Starts")
    const inputNode = InputNodeData.create({
      meta: {
        label: 'Input Node',
        emoji: '📝',
        function: 'Collect user input data'
      }
    });

    // Create Process Node
    const processNode = ProcessNodeData.create({
      meta: {
        label: 'Process Node',
        emoji: '⚙️',
        function: 'Transform input data'
      },
      input: {
        config: { allowMultipleConnections: false }
      }
    });

    // Create Output Node
    const outputNode = OutputNodeData.create({
      meta: {
        label: 'Output Node',
        emoji: '📤',
        function: 'Display processed data'
      },
      input: {
        config: { allowMultipleConnections: false }
      }
    
    });

    // Register nodes
    nodeDataManager.registerNode('input-1', inputNode, mockUpdateCallbacks.inputNode);
    nodeDataManager.registerNode('process-1', processNode, mockUpdateCallbacks.processNode);
    nodeDataManager.registerNode('output-1', outputNode, mockUpdateCallbacks.outputNode);

    // Set initial data on input node AFTER registration
    nodeDataManager.updateNodeData('input-1', {
      output: {
        data: { message: 'Initial input data', value: 100 }
      }
    });
    console.log("  **SETTING UP WORKFLOW** Ends")
  }

  function logNodeValues(description, inputNodeData, processNodeData, outputNodeData) {
    console.log(`\n=== ${description} ===`);
    console.log('Input Node Output:', JSON.stringify(inputNodeData?.output.data || {}, null, 2));
    console.log('Process Node Input:', JSON.stringify(processNodeData?.input.connections || {}, null, 2));
    console.log('Process Node Output:', JSON.stringify(processNodeData?.output.data || {}, null, 2));
    console.log('Output Node Input:', JSON.stringify(outputNodeData?.input.connections || {}, null, 2));
    console.log('Output Node Output:', JSON.stringify(outputNodeData?.output.data || {}, null, 2));
    console.log('='.repeat(50));
  }

  const doTest = [false,false,false,false,true]
  doTest[0] && describe('ExecuteWorkflow = true (Cascade Enabled)', () => {
    it('should cascade updates through all connected nodes', async () => {
      // Set executeWorkflow to true
      mockGlobalContext.executeWorkflow = true;
      
      // Get initial state
      const initialInputData = nodeDataManager.getNodeData('input-1');
      const initialProcessData = nodeDataManager.getNodeData('process-1');
      const initialOutputData = nodeDataManager.getNodeData('output-1');

      // Connect nodes: input → process → output
      await nodeDataManager.addConnection('input-1', 'process-1', 'default', 'default', 'input-process-edge');
      await nodeDataManager.addConnection('process-1', 'output-1', 'default', 'default', 'process-output-edge');
      logNodeValues('BEFORE Connection - ExecuteWorkflow = true', initialInputData, initialProcessData, initialOutputData);
      const tmpInputData = nodeDataManager.getNodeData('input-1');
      const tmpProcessData = nodeDataManager.getNodeData('process-1');
      const tmpOutputData = nodeDataManager.getNodeData('output-1');
      logNodeValues('AFTER Connection - ExecuteWorkflow = true', tmpInputData, tmpProcessData, tmpOutputData);
      expect(tmpProcessData.output.data).toBeDefined();
      expect(tmpProcessData.output.data['Input Node_input-1']).toEqual({
        message: "Initial input data",
        value: 100
      });
      
      // Add new input data by creating a fresh input node with new data
      await nodeDataManager.updateNodeData('input-1', {
        output: {
          data: {
            message: 'Updated input data with cascade enabled',
            value: 200,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Manually trigger cascade processing (since input nodes with data don't auto-process)
      await nodeDataManager.processNode('process-1');

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get final state
      const finalInputData = nodeDataManager.getNodeData('input-1');
      const finalProcessData = nodeDataManager.getNodeData('process-1');
      const finalOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('AFTER - ExecuteWorkflow = true', finalInputData, finalProcessData, finalOutputData);

      // Verify input data was updated
      expect(finalInputData.output.data).toEqual({
        message: 'Updated input data with cascade enabled',
        value: 200,
        timestamp: expect.any(String)
      });

      // Verify cascade worked - process node should have processed the updated input
      expect(finalProcessData.input.connections['input-1-process-1-default-default']).toBeDefined();
      expect(finalProcessData.input.connections['input-1-process-1-default-default'].data).toEqual({
        message: 'Updated input data with cascade enabled',
        value: 200,
        timestamp: expect.any(String)
      });

      // Verify process node has output data (aggregated from input)
      expect(finalProcessData.output.data).toBeDefined();
      expect(finalProcessData.output.data['Input Node_input-1']).toEqual({
        message: 'Updated input data with cascade enabled',
        value: 200,
        timestamp: expect.any(String)
      });

      // Verify output node received processed data
      expect(finalOutputData.input.connections['process-1-output-1-default-default']).toBeDefined();
      expect(finalOutputData.input.connections['process-1-output-1-default-default'].data).toBeDefined();
      
      console.log('\n✅ CASCADE ENABLED: Data flowed through all nodes successfully');
    });
  });

  doTest[1] && describe('ExecuteWorkflow = false (Cascade Disabled)', () => {
    it('should NOT cascade updates when executeWorkflow is false', async () => {

      console.log("\n*** STARTING TEST*** ",'ExecuteWorkflow = false (Cascade Disabled)')
      // Set executeWorkflow to false BEFORE making connections
      mockGlobalContext.executeWorkflow = false;
      
      // Track workflow paused events
      const pausedEvents = [];
      nodeDataManager.addEventListener('WORKFLOW_EXECUTION_PAUSED', (event) => {
        pausedEvents.push(event.detail);
        console.log(`⏸️ WORKFLOW PAUSED: ${event.detail.nodeId} - ${event.detail.reason}`);
      });

      // Connect nodes first (this will process but with cascade disabled)
      await nodeDataManager.addConnection('input-1', 'process-1', 'default', 'default', 'input-process-edge');
      await nodeDataManager.addConnection('process-1', 'output-1', 'default', 'default', 'process-output-edge');

      // Get state after initial connections
      const initialInputData = nodeDataManager.getNodeData('input-1');
      const initialProcessData = nodeDataManager.getNodeData('process-1');
      const initialOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('BEFORE - ExecuteWorkflow = false', initialInputData, initialProcessData, initialOutputData);

      // Clear any existing paused events from connection setup
      pausedEvents.length = 0;

      // Now update input data and try to trigger cascade
      await nodeDataManager.updateNodeData('input-1', {
        output: {
          data: {
            message: 'Updated input data with cascade disabled',
            value: 300,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Manually trigger processing of downstream nodes (should be blocked)
      console.log(" Triggering processNonde manually")
      await nodeDataManager.processNode('process-1');

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get final state
      const finalInputData = nodeDataManager.getNodeData('input-1');
      const finalProcessData = nodeDataManager.getNodeData('process-1');
      const finalOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('AFTER - ExecuteWorkflow = false', finalInputData, finalProcessData, finalOutputData);

      // Verify input node was updated
      expect(finalInputData.output.data).toEqual({
        message: 'Updated input data with cascade disabled',
        value: 300,
        timestamp: expect.any(String)
      });

      // The key test: When executeWorkflow=false, downstream processing should be blocked
      // Process node should NOT have been re-processed with the new input data
      // Check that workflow paused events were emitted indicating cascade was blocked
      expect(pausedEvents.length).toBeGreaterThan(0);
      expect(pausedEvents.some(event => event.reason === 'executeWorkflow_disabled')).toBe(true);
      
      console.log('Paused events:', pausedEvents.map(e => `${e.nodeId}: ${e.reason}`));
      console.log('\n⏸️ CASCADE DISABLED: Processing correctly blocked');
      console.log("\n*** ENDING TEST*** ",'ExecuteWorkflow = false (Cascade Disabled)')
    });
  });

  doTest[2] && describe('ExecuteWorkflow Toggle Behavior', () => {
    it('should resume cascade when executeWorkflow is toggled from false to true', async () => {
      console.log("\n*** STARTING TEST*** ",'ExecuteWorkflow Toggle Behavior')
      // Start with cascade disabled
      mockGlobalContext.executeWorkflow = false;
      console.log(" Cascade disabled")
      // Connect nodes - this will process with cascade disabled
      await nodeDataManager.addConnection('input-1', 'process-1', 'default', 'default', 'input-process-edge');
      await nodeDataManager.addConnection('process-1', 'output-1', 'default', 'default', 'process-output-edge');

      console.log(" Clearing inital processing data in process-1, output-1")
      // Clear any initial processing data
      await nodeDataManager.updateNodeData('process-1', {
        output: { data: {} }
      });
      await nodeDataManager.updateNodeData('output-1', {
        output: { data: {} }
      });

      console.log(" update input-1")
      // Update input data with cascade disabled
      await nodeDataManager.updateNodeData('input-1', {
        output: {
          data: {
            message: 'Data updated while cascade was disabled',
            value: 400
          }
        }
      });
      
      console.log(" Trigger processNode process-1")
      // Try processing with cascade disabled
      await nodeDataManager.processNode('process-1');
      await new Promise(resolve => setTimeout(resolve, 50));

      const beforeToggleProcessData = nodeDataManager.getNodeData('process-1');
      const beforeToggleOutputData = nodeDataManager.getNodeData('output-1');
      const beforeToggleInputData = nodeDataManager.getNodeData('input-1')
      logNodeValues('BEFORE Toggle (cascade disabled)',
        beforeToggleInputData, beforeToggleProcessData, beforeToggleOutputData);

      // Now enable cascade
      console.log('\n🔄 TOGGLING executeWorkflow from false to true...');
      mockGlobalContext.executeWorkflow = true;
      console.log(" Manual trigger - processNode process-1")
      // Trigger processing again - should now cascade
      await nodeDataManager.processNode('process-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterToggleInputData = nodeDataManager.getNodeData('input-1');
      const afterToggleProcessData = nodeDataManager.getNodeData('process-1');
      const afterToggleOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('AFTER Toggle (cascade enabled)', afterToggleInputData, afterToggleProcessData, afterToggleOutputData);

      // Verify input data is correct
      expect(afterToggleInputData.output.data).toEqual({
        message: 'Data updated while cascade was disabled',
        value: 400
      });

      // Verify cascade now works - process node should have processed the updated input
      expect(afterToggleProcessData.output.data['Input Node_input-1']).toEqual({
        message: 'Data updated while cascade was disabled',
        value: 400
      });

      // Verify output node received the processed data
      expect(afterToggleOutputData.input.connections['process-1-output-1-default-default'].data).toBeDefined();
      
      console.log('\n✅ TOGGLE SUCCESS: Cascade resumed after enabling executeWorkflow');
      console.log("\n*** ENDING TEST*** ",'ExecuteWorkflow Toggle Behavior')
    });
  });

  doTest[3] && describe('Node Processing Status Tracking', () => {
    it('should track processing status during cascade updates', async () => {
      mockGlobalContext.executeWorkflow = true;
      
      // Track processing events
      const processingEvents = [];
      nodeDataManager.addEventListener('nodeProcessing', (event) => {
        processingEvents.push({ type: 'processing', nodeId: event.detail.nodeId });
        console.log(`🔄 PROCESSING STARTED: ${event.detail.nodeId}`);
      });
      
      nodeDataManager.addEventListener('nodeProcessed', (event) => {
        processingEvents.push({ type: 'processed', nodeId: event.detail.nodeId });
        console.log(`✅ PROCESSING COMPLETED: ${event.detail.nodeId}`);
      });

      // Connect and update
      await nodeDataManager.addConnection('input-1', 'process-1', 'default', 'default', 'edge1');
      await nodeDataManager.addConnection('process-1', 'output-1', 'default', 'default', 'edge2');

      await nodeDataManager.updateNodeData('input-1', {
        output: { data: { test: 'status tracking test', count: 1 } }
      });

      await nodeDataManager.processNode('input-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify events were fired in correct order
      console.log('\nProcessing Events:', processingEvents);
      
      const processEvents = processingEvents.filter(e => e.type === 'processing');
      const completedEvents = processingEvents.filter(e => e.type === 'processed');
      
      expect(processEvents.length).toBeGreaterThan(0);
      expect(completedEvents.length).toBeGreaterThan(0);
      
      console.log('\n📊 STATUS TRACKING: Events captured successfully');
    });
  });

  doTest[4] && describe('ExecuteWorkflow = false (track after 1-toggling and then 2-after input update)', () => {
    it('should cascade input updates when executeWorkflow is toggled', async () => {

      console.log("\n*** STARTING TEST*** ",'ExecuteWorkflow = false (track after 1-toggling and then 2-after input update)')
      // Set executeWorkflow to false BEFORE making connections
      console.log('<test> Cascade DISABLED')
      mockGlobalContext.executeWorkflow = false;
      
      
      console.log('<test> connecting input->process->output')
      // Connect nodes first (this will process but with cascade disabled)
      await nodeDataManager.addConnection('input-1', 'process-1', 'default', 'default', 'input-process-edge');
      await nodeDataManager.addConnection('process-1', 'output-1', 'default', 'default', 'process-output-edge');

      // Get state after initial connections
      const initialInputData = nodeDataManager.getNodeData('input-1');
      const initialProcessData = nodeDataManager.getNodeData('process-1');
      const initialOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('BEFORE - ExecuteWorkflow = false', initialInputData, initialProcessData, initialOutputData);

      
      // ENABLE CASCADE and check node data
      console.log('<test> Cascade ENABLED')
      mockGlobalContext.executeWorkflow = true
      const tmpInputData = nodeDataManager.getNodeData('input-1');
      const tmpProcessData = nodeDataManager.getNodeData('process-1');
      const tmpOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('BEFORE - ExecuteWorkflow = true', tmpInputData, tmpProcessData, tmpOutputData);

      // Now update input data and try to trigger cascade
      await nodeDataManager.updateNodeData('input-1', {
        output: {
          data: {
            message: 'Updated input data with cascade ENABLED',
            value: 600,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Manually trigger processing of downstream nodes (should be blocked)
      console.log("<test> Triggering process  process-1 manually")
     
      await nodeDataManager.processNode('process-1')
      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get final state
      const finalInputData = nodeDataManager.getNodeData('input-1');
      const finalProcessData = nodeDataManager.getNodeData('process-1');
      const finalOutputData = nodeDataManager.getNodeData('output-1');
      
      logNodeValues('AFTER - ExecuteWorkflow = True', finalInputData, finalProcessData, finalOutputData);

      // Verify input node was updated
      // expect(finalOutputData.output.data).toEqual({
      //   message: 'Updated input data with cascade ENABLED',
      //   value: 600,
      //   timestamp: expect.any(String)
      // });

      expect(finalOutputData.output.data).toEqual(expect.objectContaining({
        message: 'Updated input data with cascade ENABLED',
        value: 600,
        timestamp: expect.any(String)
      }));
      console.log("\n*** ENDING TEST*** Execute toggled to True, and input updated,processed")
    });
  });

});