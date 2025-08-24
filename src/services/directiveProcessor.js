/**
 * Directive Processor - Phase 5 Implementation
 * Data Directive System for cross-node communication
 * 
 * Based on COMPREHENSIVE_IMPLEMENTATION_PLAN.md Phase 5 specifications
 */

import { DirectiveValidator } from '../types/enhancedValidation.js';
import { DataDirective } from '../types/nodeSchema.js';

/**
 * Retry Manager for handling directive processing failures
 */
export class RetryManager {
  constructor() {
    this.retryQueues = new Map(); // directiveId -> retry info
    this.defaultRetryPolicy = {
      maxRetries: 3,
      delay: 1000, // 1 second
      backoffMultiplier: 2,
      maxDelay: 10000 // 10 seconds
    };
  }

  /**
   * Create retry policy with defaults
   * @param {Object} policy - Custom retry policy
   * @returns {Object} Complete retry policy
   */
  createRetryPolicy(policy = {}) {
    return {
      ...this.defaultRetryPolicy,
      ...policy
    };
  }

  /**
   * Schedule a directive for retry
   * @param {string} directiveId - Unique directive ID
   * @param {Object} directive - Directive to retry
   * @param {string} targetNodeId - Target node ID
   * @param {Error} error - Error that caused the failure
   * @param {Function} retryFunction - Function to call for retry
   */
  async scheduleRetry(directiveId, directive, targetNodeId, error, retryFunction) {
    const retryPolicy = this.createRetryPolicy(directive.processing?.retryPolicy);
    
    if (!this.retryQueues.has(directiveId)) {
      this.retryQueues.set(directiveId, {
        directive,
        targetNodeId,
        attempts: 0,
        lastError: null,
        nextRetryAt: null,
        retryPolicy
      });
    }

    const retryInfo = this.retryQueues.get(directiveId);
    retryInfo.attempts += 1;
    retryInfo.lastError = error;

    // Check if we've exceeded max retries
    if (retryInfo.attempts > retryPolicy.maxRetries) {
      console.error(`<directive-processor> Max retries exceeded for directive ${directiveId}:`, error);
      this.retryQueues.delete(directiveId);
      throw new Error(`Directive processing failed after ${retryPolicy.maxRetries} retries: ${error.message}`);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryPolicy.delay * Math.pow(retryPolicy.backoffMultiplier, retryInfo.attempts - 1),
      retryPolicy.maxDelay
    );

    retryInfo.nextRetryAt = new Date(Date.now() + delay);

    console.log(`<directive-processor> Scheduling retry ${retryInfo.attempts}/${retryPolicy.maxRetries} for directive ${directiveId} in ${delay}ms`);

    // Schedule the retry
    setTimeout(async () => {
      try {
        await retryFunction(directive, targetNodeId);
        // Success - remove from retry queue
        this.retryQueues.delete(directiveId);
        console.log(`<directive-processor> Retry successful for directive ${directiveId}`);
      } catch (retryError) {
        console.warn(`<directive-processor> Retry ${retryInfo.attempts} failed for directive ${directiveId}:`, retryError);
        // This will trigger another retry if we haven't exceeded max attempts
        await this.scheduleRetry(directiveId, directive, targetNodeId, retryError, retryFunction);
      }
    }, delay);
  }

  /**
   * Get retry statistics
   */
  getRetryStats() {
    const stats = {
      totalRetrying: this.retryQueues.size,
      byAttempts: {},
      byTargetNode: {}
    };

    for (const [directiveId, retryInfo] of this.retryQueues) {
      const attempts = retryInfo.attempts;
      const targetNodeId = retryInfo.targetNodeId;

      stats.byAttempts[attempts] = (stats.byAttempts[attempts] || 0) + 1;
      stats.byTargetNode[targetNodeId] = (stats.byTargetNode[targetNodeId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear all retry queues
   */
  clearAll() {
    this.retryQueues.clear();
  }
}

/**
 * Batch Processor for handling non-immediate directives
 */
export class BatchProcessor {
  constructor(directiveProcessor) {
    this.directiveProcessor = directiveProcessor;
    this.batchQueues = new Map(); // targetNodeId -> directives[]
    this.batchTimers = new Map(); // targetNodeId -> timer
    this.batchConfig = {
      maxBatchSize: 10,
      maxBatchDelay: 5000, // 5 seconds
      processingInterval: 1000 // 1 second
    };
  }

  /**
   * Add directive to batch queue
   * @param {Object} directive - Directive to queue
   * @param {string} targetNodeId - Target node ID
   */
  addToBatch(directive, targetNodeId) {
    const directiveId = this._generateDirectiveId(directive, targetNodeId);
    
    if (!this.batchQueues.has(targetNodeId)) {
      this.batchQueues.set(targetNodeId, []);
    }

    const batch = this.batchQueues.get(targetNodeId);
    batch.push({
      id: directiveId,
      directive,
      queuedAt: new Date().toISOString(),
      priority: directive.processing?.priority || 5
    });

    // Sort by priority (lower number = higher priority)
    batch.sort((a, b) => a.priority - b.priority);

    console.log(`<directive-processor> Added directive ${directiveId} to batch for ${targetNodeId}. Queue size: ${batch.length}`);

    // Schedule batch processing
    this._scheduleBatchProcessing(targetNodeId);

    // Process immediately if batch is full
    if (batch.length >= this.batchConfig.maxBatchSize) {
      this._processBatch(targetNodeId);
    }
  }

  /**
   * Generate unique directive ID (moved from DirectiveProcessor)
   * @private
   */
  _generateDirectiveId(directive, targetNodeId) {
    const timestamp = Date.now();
    const hash = this._simpleHash(JSON.stringify(directive));
    return `${targetNodeId}-${directive.type}-${hash}-${timestamp}`;
  }

  /**
   * Simple hash function for directive identification
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Schedule batch processing with delay
   * @private
   */
  _scheduleBatchProcessing(targetNodeId) {
    // Clear existing timer if any
    if (this.batchTimers.has(targetNodeId)) {
      clearTimeout(this.batchTimers.get(targetNodeId));
    }

    // Schedule new timer
    const timer = setTimeout(() => {
      this._processBatch(targetNodeId);
    }, this.batchConfig.maxBatchDelay);

    this.batchTimers.set(targetNodeId, timer);
  }

  /**
   * Process batch of directives for a target node
   * @private
   */
  async _processBatch(targetNodeId) {
    const batch = this.batchQueues.get(targetNodeId);
    if (!batch || batch.length === 0) {
      return { totalProcessed: 0, successful: 0, failed: 0 };
    }

    console.log(`<directive-processor> Processing batch of ${batch.length} directives for ${targetNodeId}`);

    // Clear timer
    if (this.batchTimers.has(targetNodeId)) {
      clearTimeout(this.batchTimers.get(targetNodeId));
      this.batchTimers.delete(targetNodeId);
    }

    // Process all directives in batch
    const processingPromises = batch.map(async (item) => {
      try {
        await this.directiveProcessor._processImmediate(item.directive, targetNodeId);
        console.log(`<directive-processor> Batch processed directive ${item.id}`);
        return { success: true, directiveId: item.id };
      } catch (error) {
        console.error(`<directive-processor> Batch processing failed for directive ${item.id}:`, error);
        return { success: false, directiveId: item.id, error };
      }
    });

    const results = await Promise.allSettled(processingPromises);
    
    // Clear processed batch
    this.batchQueues.set(targetNodeId, []);

    // Calculate results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`<directive-processor> Batch completed for ${targetNodeId}: ${successful} successful, ${failed} failed`);
    
    return {
      totalProcessed: batch.length,
      successful,
      failed
    };
  }

  /**
   * Get batch processing statistics
   */
  getBatchStats() {
    const stats = {
      totalQueues: this.batchQueues.size,
      totalPendingDirectives: 0,
      queueSizes: {},
      averageQueueSize: 0
    };

    for (const [targetNodeId, batch] of this.batchQueues) {
      const queueSize = batch.length;
      stats.totalPendingDirectives += queueSize;
      stats.queueSizes[targetNodeId] = queueSize;
    }

    stats.averageQueueSize = stats.totalQueues > 0 
      ? stats.totalPendingDirectives / stats.totalQueues 
      : 0;

    return stats;
  }

  /**
   * Force process all batches
   */
  async processAllBatches() {
    const targetNodeIds = Array.from(this.batchQueues.keys());
    const processingPromises = targetNodeIds.map(targetNodeId =>
      this._processBatch(targetNodeId)
    );
    
    const results = await Promise.all(processingPromises);
    
    // Aggregate results
    const aggregatedResults = results.reduce((acc, result) => ({
      totalProcessed: acc.totalProcessed + result.totalProcessed,
      successful: acc.successful + result.successful,
      failed: acc.failed + result.failed
    }), { totalProcessed: 0, successful: 0, failed: 0 });
    
    return aggregatedResults;
  }

  /**
   * Clear all batch queues
   */
  clearAll() {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.batchQueues.clear();
    this.batchTimers.clear();
  }
}

/**
 * Conditional Expression Evaluator for directive conditions
 */
export class ConditionalEvaluator {
  constructor() {
    this.allowedFunctions = new Set([
      'Math', 'Date', 'JSON', 'String', 'Number', 'Boolean', 'Array'
    ]);
    this.forbiddenPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(/,
      /import\s*\(/,
      /document\./,
      /window\./,
      /process\./,
      /global\./,
      /__/
    ];
  }

  /**
   * Safely evaluate conditional expression
   * @param {string} expression - JavaScript expression to evaluate
   * @param {Object} context - Context variables for evaluation
   * @returns {boolean} Evaluation result
   */
  evaluate(expression, context = {}) {
    if (!expression || typeof expression !== 'string') {
      return true; // No condition = always execute
    }

    // Security check
    if (!this._isExpressionSafe(expression)) {
      throw new Error(`Unsafe conditional expression: ${expression}`);
    }

    try {
      // Create safe evaluation context
      const safeContext = this._createSafeContext(context);
      
      // Create function with safe context
      const evaluationFunction = new Function(
        ...Object.keys(safeContext),
        `"use strict"; return (${expression});`
      );

      // Execute with context values
      const result = evaluationFunction(...Object.values(safeContext));
      
      // Ensure boolean result
      return Boolean(result);
    } catch (error) {
      console.error(`<directive-processor> Conditional evaluation failed for "${expression}":`, error);
      // Default to false on evaluation error
      return false;
    }
  }

  /**
   * Check if expression is safe to evaluate
   * @private
   */
  _isExpressionSafe(expression) {
    // Check for forbidden patterns
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(expression)) {
        console.warn(`<directive-processor> Forbidden pattern detected in expression: ${expression}`);
        return false;
      }
    }

    // Basic length check
    if (expression.length > 500) {
      console.warn(`<directive-processor> Expression too long: ${expression.length} characters`);
      return false;
    }

    return true;
  }

  /**
   * Create safe context for evaluation
   * @private
   */
  _createSafeContext(context) {
    const safeContext = {
      // Safe built-in functions
      Math,
      Date,
      JSON,
      String,
      Number,
      Boolean,
      Array,
      
      // Context variables (sanitized)
      ...this._sanitizeContext(context)
    };

    return safeContext;
  }

  /**
   * Sanitize context variables
   * @private
   */
  _sanitizeContext(context) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(context)) {
      // Skip functions and dangerous objects
      if (typeof value === 'function' || 
          (typeof value === 'object' && value && value.constructor !== Object && value.constructor !== Array)) {
        continue;
      }
      
      // Only allow safe key names
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

/**
 * Main Directive Processor Class
 */
export class DirectiveProcessor {
  constructor(nodeDataManager) {
    this.nodeDataManager = nodeDataManager;
    this.processingQueue = new Map(); // directiveId -> processing info
    this.retryManager = new RetryManager();
    this.batchProcessor = new BatchProcessor(this);
    this.conditionalEvaluator = new ConditionalEvaluator();
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      batched: 0
    };
  }

  /**
   * Process a single directive
   * @param {Object} directive - Directive to process
   * @param {string} targetNodeId - Target node ID
   * @param {string} sourceNodeId - Source node ID (optional, for conditional evaluation)
   * @returns {Object} Processing result
   */
  async processDirective(directive, targetNodeId, sourceNodeId = null) {
    const directiveId = this._generateDirectiveId(directive, targetNodeId);
    
    console.log(`<directive-processor> Processing directive ${directiveId} for ${targetNodeId}`);
    
    try {
      // Validate directive structure
      const validation = DirectiveValidator.validateDirectiveStructure(directive);
      if (!validation.isValid) {
        throw new Error(`Invalid directive: ${validation.errors.map(e => e.message).join(", ")}`);
      }

      // Check conditional execution
      if (!this._shouldExecuteDirective(directive, targetNodeId, sourceNodeId)) {
        console.log(`<directive-processor> Directive ${directiveId} skipped due to condition`);
        this.stats.totalProcessed++;
        this.stats.skipped = (this.stats.skipped || 0) + 1;
        return {
          success: true,
          skipped: true,
          reason: 'conditional_check_failed',
          directiveId,
          timestamp: new Date().toISOString()
        };
      }

      // Apply directive based on processing instructions
      let result;
      let isQueued = false;
      
      if (directive.processing?.immediate !== false) {
        result = await this._processImmediate(directive, targetNodeId);
        this.stats.totalProcessed++;
        this.stats.successful++;
      } else {
        result = await this._queueForBatch(directive, targetNodeId, directiveId);
        isQueued = true;
        this.stats.totalProcessed++;
        this.stats.batched++;
      }
      
      console.log(`<directive-processor> Directive ${directiveId} processed successfully`);
      return {
        success: true,
        result,
        directiveId,
        queued: isQueued,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.stats.totalProcessed++;
      this.stats.failed++;
      
      console.error(`<directive-processor> Directive processing failed for ${directiveId}:`, error);
      
      // Handle retry if configured
      if (directive.processing?.retryPolicy) {
        try {
          this.stats.retried++;
          await this.retryManager.scheduleRetry(
            directiveId,
            directive,
            targetNodeId,
            error,
            (d, t) => this._processImmediate(d, t)
          );
          
          return {
            success: false,
            error: error.message,
            directiveId,
            retryScheduled: true,
            timestamp: new Date().toISOString()
          };
        } catch (retryError) {
          // Max retries exceeded
          return {
            success: false,
            error: retryError.message,
            directiveId,
            retriesExhausted: true,
            timestamp: new Date().toISOString()
          };
        }
      }

      // No retry configured - return error
      return {
        success: false,
        error: error.message,
        directiveId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process multiple directives for a target node
   * @param {string} sourceNodeId - Source node ID
   * @param {Object} directivesMap - Map of targetNodeId -> directives[]
   * @returns {Object} Processing results
   */
  async processDirectives(sourceNodeId, directivesMap) {
    console.log(`<directive-processor> Processing directives from ${sourceNodeId}`, Object.keys(directivesMap));
    
    const results = {
      totalDirectives: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      batched: 0,
      results: {}
    };

    for (const [targetNodeId, nodeDirectives] of Object.entries(directivesMap)) {
      if (Array.isArray(nodeDirectives)) {
        results.results[targetNodeId] = [];
        
        for (const directive of nodeDirectives) {
          results.totalDirectives++;
          const result = await this.processDirective(directive, targetNodeId, sourceNodeId);
          results.results[targetNodeId].push(result);
          
          if (result.success) {
            if (result.skipped) {
              results.skipped++;
            } else if (result.queued) {
              results.batched++;
              results.successful++; // Count batched directives as successful since they're queued for processing
            } else {
              results.successful++;
            }
          } else {
            results.failed++;
          }
        }
      }
    }

    console.log(`<directive-processor> Completed processing directives from ${sourceNodeId}:`,
      `${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped, ${results.batched} batched`);
    
    return results;
  }

  /**
   * Process directive immediately
   * @public for testing and retry functionality
   */
  async _processImmediate(directive, targetNodeId) {
    console.log(`<directive-processor> Processing directive immediately for ${targetNodeId}`);
    
    // Get target node data
    const targetData = this.nodeDataManager.getNodeData(targetNodeId);
    if (!targetData) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    // Validate target path
    const pathValidation = DirectiveValidator.validateTargetPath(directive, targetData);
    if (!pathValidation.isValid) {
      const errors = pathValidation.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid target path: ${errors}`);
    }

    // Apply directive using nodeDataManager's implementation
    return await this.nodeDataManager._applyDirective(targetNodeId, directive);
  }

  /**
   * Queue directive for batch processing
   * @private
   */
  async _queueForBatch(directive, targetNodeId, directiveId) {
    console.log(`<directive-processor> Queueing directive for batch processing: ${directiveId}`);
    
    this.batchProcessor.addToBatch(directive, targetNodeId);
    
    return {
      queued: true,
      batchProcessing: true,
      directiveId
    };
  }

  /**
   * Check if directive should be executed based on conditions
   * @private
   */
  _shouldExecuteDirective(directive, targetNodeId, sourceNodeId = null) {
    // No conditional - always execute
    if (!directive.processing?.conditional) {
      return true;
    }

    // Get target node data for context (always needed)
    const targetData = this.nodeDataManager.getNodeData(targetNodeId);
    if (!targetData) {
      console.warn(`<directive-processor> Target node ${targetNodeId} not found for conditional evaluation`);
      return false;
    }

    // Get source node data if sourceNodeId provided (for conditional evaluation context)
    let sourceData = null;
    if (sourceNodeId) {
      sourceData = this.nodeDataManager.getNodeData(sourceNodeId);
      if (!sourceData) {
        console.warn(`<directive-processor> Source node ${sourceNodeId} not found for conditional evaluation`);
        // Fall back to target node context if source not available
      }
    }

    // Use source node context for evaluation if available, otherwise target node context
    const contextData = sourceData || targetData;
    const contextNodeId = sourceNodeId || targetNodeId;

    // DEBUG: Log the actual error state from node data
    console.log(`<directive-processor> [DEBUG] Using ${sourceData ? 'source' : 'target'} node ${contextNodeId} for conditional evaluation:`, {
      hasErrorField: contextData.error ? 'yes' : 'no',
      hasErrorValue: contextData.error?.hasError,
      fullError: contextData.error
    });

    // Create evaluation context - include nested access for complex expressions
    const context = {
      targetNode: targetData, // Always include target node reference
      sourceNode: sourceData, // Include source node reference if available
      nodeId: contextNodeId,
      nodeData: contextData, // Alias for compatibility - now points to context data
      meta: contextData.meta,
      input: contextData.input,
      output: contextData.output,
      error: contextData.error,
      // Add some useful computed properties
      hasErrors: Boolean(contextData.error && contextData.error.hasError === true),
      hasConnections: Object.keys(contextData.input?.connections || {}).length > 0,
      isProcessing: contextData.output?.meta?.status === 'processing',
      timestamp: new Date().getTime()
    };

    console.log(`<directive-processor> [DEBUG] Evaluating condition "${directive.processing.conditional}" with ${sourceData ? 'SOURCE' : 'TARGET'} context:`, {
      hasErrors: context.hasErrors,
      hasConnections: context.hasConnections,
      nodeId: context.nodeId,
      inputConfig: context.input?.config || 'no config',
      inputConfigUserData: context.input?.config?.userData || 'no userData',
      fullInputStructure: {
        config: context.input?.config,
        connections: Object.keys(context.input?.connections || {}),
        processed: context.input?.processed ? 'has processed' : 'no processed'
      }
    });

    try {
      const result = this.conditionalEvaluator.evaluate(directive.processing.conditional, context);
      console.log(`<directive-processor> [DEBUG] Condition evaluation result: ${result}`);
      return result;
    } catch (error) {
      console.error(`<directive-processor> Conditional evaluation failed:`, error);
      return false; // Default to not execute on evaluation error
    }
  }

  /**
   * Generate unique directive ID
   * @private
   */
  _generateDirectiveId(directive, targetNodeId) {
    const timestamp = Date.now();
    const hash = this._simpleHash(JSON.stringify(directive));
    return `${targetNodeId}-${directive.type}-${hash}-${timestamp}`;
  }

  /**
   * Simple hash function for directive identification
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      retryManager: this.retryManager.getRetryStats(),
      batchProcessor: this.batchProcessor.getBatchStats(),
      processing: {
        activeDirectives: this.processingQueue.size,
        successRate: this.stats.totalProcessed > 0 
          ? this.stats.successful / this.stats.totalProcessed 
          : 0
      }
    };
  }

  /**
   * Force process all pending batches
   */
  async flushBatches() {
    console.log(`<directive-processor> Flushing all pending batches`);
    const batchResults = await this.batchProcessor.processAllBatches();
    
    // Update statistics to include batch results for performance tests
    this.stats.successful += batchResults.successful;
    this.stats.failed += batchResults.failed;
    
    return batchResults;
  }

  /**
   * Clear all processing state
   */
  async cleanup() {
    console.log(`<directive-processor> Cleaning up directive processor`);
    
    // Wait for any active processing to complete
    const activePromises = Array.from(this.processingQueue.values());
    if (activePromises.length > 0) {
      console.log(`<directive-processor> Waiting for ${activePromises.length} active directives to complete`);
      await Promise.allSettled(activePromises);
    }

    // Clear all state
    this.processingQueue.clear();
    this.retryManager.clearAll();
    this.batchProcessor.clearAll();
    
    // Reset stats
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      retried: 0,
      batched: 0
    };

    console.log(`<directive-processor> Cleanup completed`);
  }
}

// Export all classes
export default DirectiveProcessor;