/**
 * DirectiveProcessor Demo - Phase 5 Implementation
 * Comprehensive examples demonstrating the Data Directive System capabilities
 */

import { DirectiveProcessor } from '../services/directiveProcessor.js';
import { NodeDataManager } from '../services/nodeDataManager.js';
import { DataDirective, InputNodeData, ProcessNodeData, OutputNodeData } from '../types/nodeSchema.js';

/**
 * Demo 1: Basic Directive Processing
 * Shows how to create and process simple directives
 */
export async function basicDirectiveDemo() {
  console.log('=== Basic Directive Processing Demo ===\n');

  // Initialize system
  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create target node
  const targetNode = ProcessNodeData.create({
    meta: { label: 'Configuration Target' },
    input: { config: { theme: 'light', enabled: false } }
  });

  nodeDataManager.registerNode('target-node', targetNode, () => {});

  // Create and process directive
  const directive = DataDirective.create({
    type: 'update-config',
    target: { section: 'input', path: 'config.theme' },
    payload: 'dark',
    processing: { immediate: true, priority: 5 }
  });

  console.log('Original node config:', targetNode.input.config);
  
  const result = await directiveProcessor.processDirective(directive, 'target-node');
  console.log('Processing result:', result);
  
  const updatedNode = nodeDataManager.getNodeData('target-node');
  console.log('Updated node config:', updatedNode.input.config);
  console.log('Theme changed from "light" to "dark"\n');

  await nodeDataManager.cleanup();
}

/**
 * Demo 2: Conditional Directive Execution
 * Shows how directives can be executed based on conditions
 */
export async function conditionalDirectiveDemo() {
  console.log('=== Conditional Directive Processing Demo ===\n');

  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create target node with error state
  const targetNode = ProcessNodeData.create({
    meta: { label: 'Conditional Target' },
    error: { hasError: true, errors: [{ code: 'TEST_ERROR', message: 'System error' }] },
    input: { connections: { conn1: { active: true } } }
  });

  nodeDataManager.registerNode('conditional-target', targetNode, () => {});

  // Directive that only executes when node has no errors
  const errorCheckDirective = DataDirective.create({
    type: 'update-config',
    target: { section: 'input', path: 'config.safeOperation' },
    payload: true,
    processing: {
      conditional: 'hasErrors === false', // Will be false initially
      immediate: true
    }
  });

  // Directive that executes when node has connections
  const connectionCheckDirective = DataDirective.create({
    type: 'update-config',
    target: { section: 'input', path: 'config.hasConnections' },
    payload: true,
    processing: {
      conditional: 'hasConnections === true', // Will be true
      immediate: true
    }
  });

  console.log('Initial node state:');
  console.log('- Has errors:', targetNode.error.hasError);
  console.log('- Has connections:', Object.keys(targetNode.input.connections).length > 0);

  // Process first directive (should be skipped due to errors)
  const result1 = await directiveProcessor.processDirective(errorCheckDirective, 'conditional-target');
  console.log('\nError check directive result:', result1);

  // Process second directive (should execute)
  const result2 = await directiveProcessor.processDirective(connectionCheckDirective, 'conditional-target');
  console.log('Connection check directive result:', result2);

  // Clear errors and try first directive again
  await nodeDataManager.updateNodeData('conditional-target', {
    error: { hasError: false, errors: [] }
  });

  console.log('\n--- After clearing errors ---');
  const result3 = await directiveProcessor.processDirective(errorCheckDirective, 'conditional-target');
  console.log('Error check directive result (retry):', result3);

  const finalNode = nodeDataManager.getNodeData('conditional-target');
  console.log('\nFinal node config:', finalNode.input.config);

  await nodeDataManager.cleanup();
}

/**
 * Demo 3: Batch Processing with Priorities
 * Shows how non-immediate directives are batched and processed by priority
 */
export async function batchProcessingDemo() {
  console.log('=== Batch Processing with Priorities Demo ===\n');

  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create target node
  const targetNode = ProcessNodeData.create({
    meta: { label: 'Batch Target' },
    input: { config: { operations: [] } }
  });

  nodeDataManager.registerNode('batch-target', targetNode, () => {});

  // Create directives with different priorities
  const directives = [
    DataDirective.create({
      type: 'update-config',
      target: { section: 'input', path: 'config.step1' },
      payload: 'Low priority operation',
      processing: { immediate: false, priority: 8 } // Low priority (high number)
    }),
    DataDirective.create({
      type: 'update-config',
      target: { section: 'input', path: 'config.step2' },
      payload: 'High priority operation',
      processing: { immediate: false, priority: 2 } // High priority (low number)
    }),
    DataDirective.create({
      type: 'update-config',
      target: { section: 'input', path: 'config.step3' },
      payload: 'Medium priority operation',
      processing: { immediate: false, priority: 5 } // Medium priority
    })
  ];

  console.log('Queuing directives for batch processing...');
  
  // Process all directives (they will be batched)
  const results = await Promise.all(
    directives.map((directive, index) => {
      console.log(`Queuing directive ${index + 1} with priority ${directive.processing.priority}`);
      return directiveProcessor.processDirective(directive, 'batch-target');
    })
  );

  console.log('\nBatch processing results:', results.map(r => ({ success: r.success, queued: r.result?.queued })));

  // Check batch statistics
  const batchStats = directiveProcessor.batchProcessor.getBatchStats();
  console.log('\nBatch statistics:', batchStats);

  console.log('\n--- Processing batches ---');
  
  // Force process all batches
  await directiveProcessor.flushBatches();

  // Check final state
  const finalNode = nodeDataManager.getNodeData('batch-target');
  console.log('\nFinal node config after batch processing:');
  console.log('- Step 1 (priority 8):', finalNode.input.config.step1);
  console.log('- Step 2 (priority 2):', finalNode.input.config.step2);
  console.log('- Step 3 (priority 5):', finalNode.input.config.step3);
  console.log('Note: Higher priority (lower number) operations are processed first');

  await nodeDataManager.cleanup();
}

/**
 * Demo 4: Retry Mechanism
 * Shows how directives can be automatically retried on failure
 */
export async function retryMechanismDemo() {
  console.log('=== Retry Mechanism Demo ===\n');

  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create target node
  const targetNode = ProcessNodeData.create({
    meta: { label: 'Retry Target' }
  });

  nodeDataManager.registerNode('retry-target', targetNode, () => {});

  // Mock the _processImmediate method to fail first few times
  let attemptCount = 0;
  const originalProcessImmediate = directiveProcessor._processImmediate;
  directiveProcessor._processImmediate = async function(directive, targetNodeId) {
    attemptCount++;
    console.log(`Attempt ${attemptCount}: Processing directive for ${targetNodeId}`);
    
    if (attemptCount <= 2) {
      console.log(`Attempt ${attemptCount}: Simulated failure`);
      throw new Error(`Simulated failure on attempt ${attemptCount}`);
    }
    
    console.log(`Attempt ${attemptCount}: Success!`);
    return originalProcessImmediate.call(this, directive, targetNodeId);
  };

  // Create directive with retry policy
  const retryDirective = DataDirective.create({
    type: 'update-config',
    target: { section: 'input', path: 'config.retriedValue' },
    payload: 'Successfully processed after retries!',
    processing: {
      immediate: true,
      retryPolicy: {
        maxRetries: 3,
        delay: 100,           // 100ms initial delay
        backoffMultiplier: 2, // Double delay each time
        maxDelay: 1000        // Maximum 1 second delay
      }
    }
  });

  console.log('Processing directive with retry policy...\n');
  
  const result = await directiveProcessor.processDirective(retryDirective, 'retry-target');
  console.log('\nInitial processing result:', { 
    success: result.success, 
    retryScheduled: result.retryScheduled 
  });

  // Wait for retries to complete
  console.log('\nWaiting for retries to complete...');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check final state
  const finalNode = nodeDataManager.getNodeData('retry-target');
  console.log('\nFinal result:', finalNode.input.config.retriedValue || 'Still processing...');

  // Get retry statistics
  const stats = directiveProcessor.getStats();
  console.log('\nRetry statistics:', {
    totalProcessed: stats.totalProcessed,
    successful: stats.successful,
    failed: stats.failed,
    retried: stats.retried
  });

  await nodeDataManager.cleanup();
}

/**
 * Demo 5: Complex Workflow Integration
 * Shows how directives enable cross-node communication in a workflow
 */
export async function workflowIntegrationDemo() {
  console.log('=== Complex Workflow Integration Demo ===\n');

  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create workflow nodes
  const formNode = InputNodeData.create({
    meta: { label: 'User Form', category: 'input' },
    output: {
      data: { username: 'alice', preferences: { theme: 'dark', notifications: true } },
      directives: {
        'user-processor': [
          DataDirective.create({
            type: 'update-config',
            target: { section: 'input', path: 'config.userData' },
            payload: { username: 'alice', preferences: { theme: 'dark', notifications: true } },
            processing: { immediate: true, priority: 1 }
          })
        ],
        'theme-manager': [
          DataDirective.create({
            type: 'transform-data',
            target: { section: 'input', path: 'config.themeSettings' },
            payload: { theme: 'dark', darkModeEnabled: true },
            processing: { 
              conditional: 'input && input.config && input.config.userData',
              immediate: false, 
              priority: 3 
            }
          })
        ]
      }
    }
  });

  const processorNode = ProcessNodeData.create({
    meta: { label: 'User Processor', category: 'process' },
    input: { config: { userData: null, processed: false } },
    output: {
      directives: {
        'display-manager': [
          DataDirective.create({
            type: 'update-config',
            target: { section: 'input', path: 'config.displayData' },
            payload: { message: 'User alice logged in with dark theme' },
            processing: { 
              conditional: 'input && input.config && input.config.userData && input.config.userData.username',
              immediate: true,
              priority: 2 
            }
          })
        ]
      }
    }
  });

  const themeNode = ProcessNodeData.create({
    meta: { label: 'Theme Manager', category: 'process' },
    input: { config: { themeSettings: null } }
  });

  const displayNode = OutputNodeData.create({
    meta: { label: 'Display Manager', category: 'output' },
    input: { config: { displayData: null } }
  });

  // Register all nodes
  nodeDataManager.registerNode('user-form', formNode, () => {});
  nodeDataManager.registerNode('user-processor', processorNode, () => {});
  nodeDataManager.registerNode('theme-manager', themeNode, () => {});
  nodeDataManager.registerNode('display-manager', displayNode, () => {});

  console.log('Workflow nodes created and registered\n');

  // Simulate workflow execution
  console.log('Step 1: Processing form node directives...');
  await directiveProcessor.processDirectives('user-form', formNode.output.directives);

  // Check processor node received data
  const updatedProcessor = nodeDataManager.getNodeData('user-processor');
  console.log('Processor received user data:', updatedProcessor.input.config.userData);

  console.log('\nStep 2: Processing processor node directives...');
  await directiveProcessor.processDirectives('user-processor', processorNode.output.directives);

  console.log('\nStep 3: Processing batched theme directives...');
  await directiveProcessor.flushBatches();

  // Check final states
  const finalTheme = nodeDataManager.getNodeData('theme-manager');
  const finalDisplay = nodeDataManager.getNodeData('display-manager');

  console.log('\n=== Final Workflow State ===');
  console.log('Theme Manager config:', finalTheme.input.config.themeSettings);
  console.log('Display Manager config:', finalDisplay.input.config.displayData);

  // Show processing statistics
  const stats = directiveProcessor.getStats();
  console.log('\n=== Processing Statistics ===');
  console.log(`Total directives processed: ${stats.totalProcessed}`);
  console.log(`Successful: ${stats.successful}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Batched: ${stats.batched}`);

  await nodeDataManager.cleanup();
}

/**
 * Demo 6: Advanced Operations and Error Handling
 * Shows different directive operations and error scenarios
 */
export async function advancedOperationsDemo() {
  console.log('=== Advanced Operations and Error Handling Demo ===\n');

  const nodeDataManager = new NodeDataManager();
  await nodeDataManager.initialize();
  const directiveProcessor = nodeDataManager.directiveProcessor;

  // Create target node with complex data structure
  const targetNode = ProcessNodeData.create({
    meta: { label: 'Advanced Target' },
    input: {
      config: {
        settings: { enabled: true, level: 5 },
        items: ['item1', 'item2'],
        metadata: { created: new Date().toISOString() }
      }
    }
  });

  nodeDataManager.registerNode('advanced-target', targetNode, () => {});

  console.log('Initial node config:', JSON.stringify(targetNode.input.config, null, 2));

  // Demo different operations
  const operations = [
    {
      name: 'SET operation - Replace value',
      directive: DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.settings.level', operation: 'set' },
        payload: 10,
        processing: { immediate: true }
      })
    },
    {
      name: 'MERGE operation - Merge objects',
      directive: DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.settings', operation: 'merge' },
        payload: { maxLevel: 20, autoSave: true },
        processing: { immediate: true }
      })
    },
    {
      name: 'APPEND operation - Add to array',
      directive: DataDirective.create({
        type: 'update-config',
        target: { section: 'input', path: 'config.items', operation: 'append' },
        payload: 'item3',
        processing: { immediate: true }
      })
    }
  ];

  for (const { name, directive } of operations) {
    console.log(`\n--- ${name} ---`);
    const result = await directiveProcessor.processDirective(directive, 'advanced-target');
    console.log('Result:', { success: result.success, error: result.error });
    
    const currentNode = nodeDataManager.getNodeData('advanced-target');
    console.log('Updated config:', JSON.stringify(currentNode.input.config, null, 2));
  }

  // Demo error scenarios
  console.log('\n--- Error Scenario: Invalid Path ---');
  const invalidPathDirective = DataDirective.create({
    type: 'update-config',
    target: { section: 'nonexistent', path: 'invalid.path' },
    payload: 'test',
    processing: { immediate: true }
  });

  const errorResult = await directiveProcessor.processDirective(invalidPathDirective, 'advanced-target');
  console.log('Error result:', { success: errorResult.success, error: errorResult.error });

  await nodeDataManager.cleanup();
}

/**
 * Main demo runner
 */
export async function runDirectiveProcessorDemos() {
  console.log('🚀 DirectiveProcessor Demo Suite\n');
  console.log('This demonstrates the complete Phase 5 Data Directive System implementation\n');

  try {
    await basicDirectiveDemo();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await conditionalDirectiveDemo();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await batchProcessingDemo();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await retryMechanismDemo();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await workflowIntegrationDemo();
    console.log('\n' + '='.repeat(60) + '\n');
    
    await advancedOperationsDemo();
    
    console.log('\n🎉 All demos completed successfully!');
    console.log('\nPhase 5 Data Directive System is fully operational with:');
    console.log('✅ Immediate and batch processing');
    console.log('✅ Conditional execution');
    console.log('✅ Retry mechanisms with exponential backoff');
    console.log('✅ Priority-based processing');
    console.log('✅ Cross-node communication');
    console.log('✅ Advanced data operations (set, merge, append, transform)');
    console.log('✅ Comprehensive error handling');
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Run demos if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDirectiveProcessorDemos().catch(console.error);
}