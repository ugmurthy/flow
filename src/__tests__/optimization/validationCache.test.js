/**
 * Tests for ValidationCache
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ValidationCache } from '../../utils/validationCache.js';

describe('ValidationCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ValidationCache(5, 1000); // Small cache for testing
  });

  test('should cache validation results', () => {
    const nodes = [
      { id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges = [];
    const result = { valid: true, nodeCount: 1 };

    cache.set(nodes, edges, result);
    const cached = cache.get(nodes, edges);

    expect(cached).toEqual(result);
  });

  test('should return null for cache miss', () => {
    const nodes = [
      { id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges = [];

    const cached = cache.get(nodes, edges);
    expect(cached).toBeNull();
  });

  test('should invalidate expired entries', async () => {
    const shortTtlCache = new ValidationCache(5, 100); // 100ms TTL
    const nodes = [
      { id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges = [];
    const result = { valid: true };

    shortTtlCache.set(nodes, edges, result);

    // Should be cached initially
    expect(shortTtlCache.get(nodes, edges)).toEqual(result);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be expired
    expect(shortTtlCache.get(nodes, edges)).toBeNull();
  });

  test('should evict oldest entries when cache is full', () => {
    const nodes1 = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const nodes2 = [{ id: '2', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const nodes3 = [{ id: '3', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const edges = [];

    // Fill cache to capacity
    for (let i = 0; i < 5; i++) {
      const nodes = [{ id: `${i}`, type: 'test', position: { x: 0, y: 0 }, data: {} }];
      cache.set(nodes, edges, { valid: true, id: i });
    }

    // Access first entry to make it recently used
    cache.get([{ id: '0', type: 'test', position: { x: 0, y: 0 }, data: {} }], edges);

    // Add one more entry (should evict least recently used)
    cache.set(nodes1, edges, { valid: true, id: 'new' });

    // First entry should still be there (recently accessed)
    expect(cache.get([{ id: '0', type: 'test', position: { x: 0, y: 0 }, data: {} }], edges)).toBeTruthy();

    // Cache should still be at max size
    expect(cache.cache.size).toBe(5);
  });

  test('should invalidate by dependencies', () => {
    const nodes1 = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const nodes2 = [{ id: '2', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const edges = [];

    cache.set(nodes1, edges, { valid: true });
    cache.set(nodes2, edges, { valid: true });

    // Both should be cached
    expect(cache.get(nodes1, edges)).toBeTruthy();
    expect(cache.get(nodes2, edges)).toBeTruthy();

    // Invalidate entries with node '1'
    cache.invalidateByDependencies(['1'], []);

    // Node 1 entry should be invalidated
    expect(cache.get(nodes1, edges)).toBeNull();
    // Node 2 entry should still be cached
    expect(cache.get(nodes2, edges)).toBeTruthy();
  });

  test('should generate consistent cache keys', () => {
    const nodes1 = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: { value: 'a' } }];
    const nodes2 = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: { value: 'a' } }];
    const nodes3 = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: { value: 'b' } }];
    const edges = [];

    const key1 = cache.generateCacheKey(nodes1, edges);
    const key2 = cache.generateCacheKey(nodes2, edges);
    const key3 = cache.generateCacheKey(nodes3, edges);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });

  test('should extract dependencies correctly', () => {
    const nodes = [
      { id: '1', type: 'fetchNode' },
      { id: '2', type: 'processNode' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
    ];

    const deps = cache.extractDependencies(nodes, edges);

    expect(deps.nodeIds).toEqual(['1', '2']);
    expect(deps.edgeIds).toEqual(['e1']);
    expect(deps.nodeTypes).toEqual(['fetchNode', 'processNode']);
  });

  test('should provide cache statistics', () => {
    const nodes = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const edges = [];

    // Cache miss
    cache.get(nodes, edges);
    
    // Cache set
    cache.set(nodes, edges, { valid: true });
    
    // Cache hit
    cache.get(nodes, edges);

    const stats = cache.getStats();

    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(5);
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  test('should clear entire cache', () => {
    const nodes = [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }];
    const edges = [];

    cache.set(nodes, edges, { valid: true });
    expect(cache.cache.size).toBe(1);

    cache.clear();
    expect(cache.cache.size).toBe(0);
    expect(cache.getStats().hitCount).toBe(0);
    expect(cache.getStats().missCount).toBe(0);
  });

  test('should update configuration', () => {
    const newConfig = {
      maxSize: 10,
      ttl: 2000,
    };

    cache.updateConfig(newConfig);

    expect(cache.maxSize).toBe(10);
    expect(cache.ttl).toBe(2000);
  });

  test('should evict entries when max size is reduced', () => {
    const edges = [];

    // Fill cache
    for (let i = 0; i < 5; i++) {
      const nodes = [{ id: `${i}`, type: 'test', position: { x: 0, y: 0 }, data: {} }];
      cache.set(nodes, edges, { valid: true });
    }

    expect(cache.cache.size).toBe(5);

    // Reduce max size
    cache.updateConfig({ maxSize: 3 });

    expect(cache.cache.size).toBe(3);
  });

  test('should hash objects consistently', () => {
    const obj1 = { a: 1, b: 2, c: { d: 3 } };
    const obj2 = { c: { d: 3 }, b: 2, a: 1 }; // Different order
    const obj3 = { a: 1, b: 2, c: { d: 4 } }; // Different value

    const hash1 = cache.hashObject(obj1);
    const hash2 = cache.hashObject(obj2);
    const hash3 = cache.hashObject(obj3);

    expect(hash1).toBe(hash2); // Same content, different order
    expect(hash1).not.toBe(hash3); // Different content
  });
});