/**
 * Debounced Validation System
 * Provides smart debouncing for different types of operations with configurable timeouts
 */

export class DebouncedValidator {
  constructor() {
    this.timers = new Map();
    this.pendingValidations = new Set();
    this.cache = new Map();
    this.config = {
      validation: 300, // General validation
      nodeUpdate: 150, // Node data updates
      edgeUpdate: 100, // Edge changes
      processing: 500, // Heavy processing operations
      critical: 50, // Error states, immediate feedback
    };
  }

  /**
   * Debounce validation with different timeouts based on operation type
   * @param {string} key - Unique key for the validation
   * @param {Function} validationFn - Function to execute
   * @param {string} type - Type of operation (validation, nodeUpdate, etc.)
   * @returns {Promise} Promise that resolves with validation result
   */
  debounceValidation(key, validationFn, type = "validation") {
    return new Promise((resolve, reject) => {
      // Cancel existing timer
      if (this.timers.has(key)) {
        console.log(`debounceValidation : clearing timer, '${key}','${type}'`)
        clearTimeout(this.timers.get(key));
      }

      // Set new timer
      const timeout = this.config[type] || this.config.validation;
      const timer = setTimeout(async () => {
        this.pendingValidations.add(key);
        try {
          const result = await validationFn();
          console.log(`debounceValidation : setting timer, '${key}' triggering validationFn`)
          this.cache.set(key, {
            result,
            timestamp: Date.now(),
            hash: this.generateHash(result),
          });
          this.pendingValidations.delete(key);
          this.timers.delete(key);
          resolve(result);
        } catch (error) {
          this.pendingValidations.delete(key);
          this.timers.delete(key);
          reject(error);
        }
      }, timeout);

      this.timers.set(key, timer);
    });
  }

  /**
   * Generate content hash for caching
   * @param {any} content - Content to hash
   * @returns {string} Hash string
   */
  generateHash(content) {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if validation is pending
   * @param {string} key - Validation key
   * @returns {boolean} True if pending
   */
  isPending(key) {
    return this.pendingValidations.has(key);
  }

  /**
   * Get cached result
   * @param {string} key - Validation key
   * @returns {Object|null} Cached result or null
   */
  getCached(key) {
    return this.cache.get(key);
  }

  /**
   * Clear all pending validations
   */
  clearAll() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.pendingValidations.clear();
  }

  /**
   * Update debounce configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get statistics about debounced operations
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      pendingValidations: this.pendingValidations.size,
      activeTimers: this.timers.size,
      cacheSize: this.cache.size,
      config: { ...this.config },
    };
  }
}

// Create singleton instance
export const debouncedValidator = new DebouncedValidator();