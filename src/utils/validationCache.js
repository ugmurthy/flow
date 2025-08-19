/**
 * Validation Cache System
 * Provides LRU cache with TTL for validation results
 */

export class ValidationCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.accessOrder = new Map(); // For LRU eviction
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Generate cache key from workflow structure
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {string} Cache key
   */
  generateCacheKey(nodes, edges) {
    const nodeHashes = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      dataHash: this.hashObject(n.data),
    }));

    const edgeHashes = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    return this.hashObject({ nodes: nodeHashes, edges: edgeHashes });
  }

  /**
   * Hash object for consistent cache keys
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached validation result
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object|null} Cached result or null
   */
  get(nodes, edges) {
    const key = this.generateCacheKey(nodes, edges);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.missCount++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    this.hitCount++;
    return entry.result;
  }

  /**
   * Set validation result in cache
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @param {Object} result - Validation result
   */
  set(nodes, edges, result) {
    const key = this.generateCacheKey(nodes, edges);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      dependencies: this.extractDependencies(nodes, edges),
    });

    this.accessOrder.set(key, Date.now());
  }

  /**
   * Extract dependencies for selective invalidation
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Object} Dependencies object
   */
  extractDependencies(nodes, edges) {
    return {
      nodeIds: nodes.map((n) => n.id),
      edgeIds: edges.map((e) => e.id),
      nodeTypes: [...new Set(nodes.map((n) => n.type))],
    };
  }

  /**
   * Invalidate cache entries affected by changes
   * @param {Array} changedNodeIds - Array of changed node IDs
   * @param {Array} changedEdgeIds - Array of changed edge IDs
   */
  invalidateByDependencies(changedNodeIds = [], changedEdgeIds = []) {
    const toDelete = [];

    for (const [key, entry] of this.cache) {
      const deps = entry.dependencies;
      const hasChangedNode = changedNodeIds.some((id) =>
        deps.nodeIds.includes(id)
      );
      const hasChangedEdge = changedEdgeIds.some((id) =>
        deps.edgeIds.includes(id)
      );

      if (hasChangedNode || hasChangedEdge) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
  }

  /**
   * Evict oldest entry (LRU)
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Update cache configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
      // Evict entries if new max size is smaller
      while (this.cache.size > this.maxSize) {
        this.evictOldest();
      }
    }
    if (config.ttl !== undefined) {
      this.ttl = config.ttl;
    }
  }
}

// Create singleton instance
export const validationCache = new ValidationCache();