/**
 * LLM Processor Plugin
 * Processes text inputs using Large Language Models
 * Supports multiple LLM providers (Ollama, OpenAI, etc.)
 */

import { BasePlugin, ProcessingInput, ProcessingOutput, ValidationResult } from '../types/pluginSystem.js';

/**
 * LLM Processor Plugin Implementation
 */
export class LLMProcessorPlugin extends BasePlugin {
  constructor() {
    super(
      'llm-processor',
      '1.0.0',
      'Processes text inputs using Large Language Models with support for multiple providers',
      'JobRunner Team'
    );
    
    this.supportedProviders = ['ollama', 'openai', 'anthropic', 'custom'];
    this.defaultModels = {
      ollama: 'llama3.2',
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-sonnet',
      custom: 'custom-model'
    };
  }

  /**
   * Initialize the LLM processor
   */
  async _doInitialize(config) {
    // Validate provider configuration
    if (config.provider && !this.supportedProviders.includes(config.provider)) {
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    // Set default configuration
    this.config = {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 3,
      ...config
    };

    // Test connection if provider is configured
    if (this.config.provider === 'ollama') {
      await this._testOllamaConnection();
    }

    console.log(`LLM Processor initialized with provider: ${this.config.provider}`);
  }

  /**
   * Process inputs using LLM
   */
  async _doProcess(inputs, config, context) {
    const mergedConfig = { ...this.config, ...config };
    
    // Validate inputs
    if (!inputs || inputs.length === 0) {
      return ProcessingOutput.error('No inputs provided for LLM processing');
    }

    try {
      // Combine and prepare input text
      const combinedInput = this._combineInputs(inputs, mergedConfig);
      
      // Process with LLM
      const result = await this._processWithLLM(combinedInput, mergedConfig);
      
      return ProcessingOutput.success(result, {
        provider: mergedConfig.provider,
        model: mergedConfig.model,
        inputLength: combinedInput.length,
        outputLength: result.response ? result.response.length : 0
      });
      
    } catch (error) {
      return ProcessingOutput.error(error, null, {
        provider: mergedConfig.provider,
        model: mergedConfig.model
      });
    }
  }

  /**
   * Get plugin capabilities
   */
  getCapabilities() {
    return [
      'llm-processing',
      'text-generation',
      'text-completion',
      'conversation',
      'prompt-processing',
      'multi-provider-support'
    ];
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: this.supportedProviders,
          default: 'ollama',
          description: 'LLM provider to use'
        },
        baseUrl: {
          type: 'string',
          default: 'http://localhost:11434',
          description: 'Base URL for the LLM provider API'
        },
        model: {
          type: 'string',
          default: 'llama3.2',
          description: 'Model name to use'
        },
        maxTokens: {
          type: 'number',
          minimum: 1,
          maximum: 32000,
          default: 4096,
          description: 'Maximum number of tokens to generate'
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2,
          default: 0.7,
          description: 'Sampling temperature (0 = deterministic, higher = more random)'
        },
        systemPrompt: {
          type: 'string',
          description: 'System prompt to use for the conversation'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          default: 30000,
          description: 'Request timeout in milliseconds'
        },
        retries: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          default: 3,
          description: 'Number of retries on failure'
        },
        inputCombinationStrategy: {
          type: 'string',
          enum: ['concatenate', 'conversation', 'structured'],
          default: 'concatenate',
          description: 'How to combine multiple inputs'
        }
      },
      required: ['provider', 'model'],
      additionalProperties: false
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
      return ValidationResult.error(['Configuration must be an object']);
    }

    // Validate provider
    if (config.provider && !this.supportedProviders.includes(config.provider)) {
      errors.push(`Unsupported provider: ${config.provider}. Supported: ${this.supportedProviders.join(', ')}`);
    }

    // Validate model
    if (!config.model || typeof config.model !== 'string') {
      errors.push('Model name is required and must be a string');
    }

    // Validate numeric values
    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number' || config.maxTokens < 1) {
        errors.push('maxTokens must be a positive number');
      }
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        errors.push('temperature must be a number between 0 and 2');
      }
    }

    // Validate URLs
    if (config.baseUrl && typeof config.baseUrl !== 'string') {
      errors.push('baseUrl must be a string');
    }

    // Warnings
    if (config.provider === 'ollama' && config.baseUrl === 'http://localhost:11434') {
      warnings.push('Using default Ollama URL. Make sure Ollama is running locally.');
    }

    if (config.maxTokens && config.maxTokens > 8192) {
      warnings.push('High maxTokens value may result in slower processing and higher costs');
    }

    return errors.length === 0 
      ? (warnings.length > 0 ? ValidationResult.warning(warnings) : ValidationResult.success())
      : ValidationResult.error(errors);
  }

  /**
   * Combine multiple inputs into a single prompt
   * @private
   */
  _combineInputs(inputs, config) {
    const strategy = config.inputCombinationStrategy || 'concatenate';
    
    switch (strategy) {
      case 'concatenate':
        return inputs.map(input => this._extractTextFromInput(input)).join('\n\n');
        
      case 'conversation':
        return this._formatAsConversation(inputs);
        
      case 'structured':
        return this._formatAsStructured(inputs);
        
      default:
        return inputs.map(input => this._extractTextFromInput(input)).join('\n\n');
    }
  }

  /**
   * Extract text content from processing input
   * @private
   */
  _extractTextFromInput(input) {
    if (typeof input.data === 'string') {
      return input.data;
    }
    
    if (typeof input.data === 'object' && input.data !== null) {
      // Look for common text fields
      const textFields = ['prompt', 'text', 'content', 'message', 'query'];
      for (const field of textFields) {
        if (input.data[field] && typeof input.data[field] === 'string') {
          return input.data[field];
        }
      }
      
      // Fallback to JSON representation
      return JSON.stringify(input.data, null, 2);
    }
    
    return String(input.data);
  }

  /**
   * Format inputs as a conversation
   * @private
   */
  _formatAsConversation(inputs) {
    const messages = inputs.map((input, index) => {
      const text = this._extractTextFromInput(input);
      const role = index % 2 === 0 ? 'user' : 'assistant';
      return `${role}: ${text}`;
    });
    
    return messages.join('\n\n');
  }

  /**
   * Format inputs as structured data
   * @private
   */
  _formatAsStructured(inputs) {
    const structured = inputs.map((input, index) => ({
      source: input.sourceId || `input_${index}`,
      content: this._extractTextFromInput(input),
      metadata: input.meta || {}
    }));
    
    return JSON.stringify(structured, null, 2);
  }

  /**
   * Process text with LLM
   * @private
   */
  async _processWithLLM(inputText, config) {
    const { provider } = config;
    
    switch (provider) {
      case 'ollama':
        return await this._processWithOllama(inputText, config);
      case 'openai':
        return await this._processWithOpenAI(inputText, config);
      case 'anthropic':
        return await this._processWithAnthropic(inputText, config);
      case 'custom':
        return await this._processWithCustom(inputText, config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Process with Ollama
   * @private
   */
  async _processWithOllama(inputText, config) {
    const { baseUrl, model, maxTokens, temperature, systemPrompt, timeout } = config;
    
    const requestBody = {
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: inputText }
      ],
      stream: false,
      options: {
        num_predict: maxTokens,
        temperature
      }
    };

    const response = await this._makeRequest(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      response: data.message?.content || '',
      model: data.model || model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      metadata: {
        created: data.created_at,
        done: data.done,
        totalDuration: data.total_duration,
        loadDuration: data.load_duration,
        promptEvalDuration: data.prompt_eval_duration,
        evalDuration: data.eval_duration
      }
    };
  }

  /**
   * Process with OpenAI (placeholder implementation)
   * @private
   */
  async _processWithOpenAI(inputText, config) {
    // This would implement OpenAI API integration
    throw new Error('OpenAI provider not yet implemented');
  }

  /**
   * Process with Anthropic (placeholder implementation)
   * @private
   */
  async _processWithAnthropic(inputText, config) {
    // This would implement Anthropic API integration
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Process with custom provider (placeholder implementation)
   * @private
   */
  async _processWithCustom(inputText, config) {
    // This would implement custom provider integration
    throw new Error('Custom provider not yet implemented');
  }

  /**
   * Test Ollama connection
   * @private
   */
  async _testOllamaConnection() {
    try {
      const response = await this._makeRequest(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }
      
      console.log('Ollama connection test successful');
    } catch (error) {
      console.warn('Ollama connection test failed:', error.message);
      // Don't throw here, just warn - the service might not be running yet
    }
  }

  /**
   * Make HTTP request with timeout and retries
   * @private
   */
  async _makeRequest(url, options) {
    const { timeout = 30000, retries = 3 } = this.config;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cleanup resources
   */
  async _doCleanup() {
    // Clean up any persistent connections or resources
    console.log('LLM Processor plugin cleaned up');
  }
}

// Export plugin instance
export default new LLMProcessorPlugin();