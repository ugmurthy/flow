/**
 * Tests for DebouncedValidator
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { DebouncedValidator } from '../../utils/debouncedValidation.js';

describe('DebouncedValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new DebouncedValidator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    validator.clearAll();
    vi.useRealTimers();
  });

  test('should debounce validation calls', async () => {
    const mockValidation = vi.fn().mockResolvedValue({ valid: true });

    // Trigger multiple validations quickly
    const promise1 = validator.debounceValidation('test1', mockValidation,"validation");
    const promise2 = validator.debounceValidation('test1', mockValidation,"validation");
    const promise3 = validator.debounceValidation('test1', mockValidation,"validation");

    // Fast-forward time
    vi.advanceTimersByTime(350);

    await Promise.all([promise1, promise2, promise3]);

    // Should only call validation once due to debouncing
    expect(mockValidation).toHaveBeenCalledTimes(1);
  });

  test('should handle different validation types with different timeouts', async () => {
    const criticalValidation = vi.fn().mockResolvedValue({ valid: true });
    const normalValidation = vi.fn().mockResolvedValue({ valid: true });

    validator.debounceValidation('critical', criticalValidation, 'critical');
    validator.debounceValidation('normal', normalValidation, 'validation');

    // Advance by 60ms (critical should execute at 50ms)
    vi.advanceTimersByTime(60);

    expect(criticalValidation).toHaveBeenCalledTimes(1);
    expect(normalValidation).toHaveBeenCalledTimes(0);

    // Advance by another 250ms (normal should execute at 300ms total)
    vi.advanceTimersByTime(250);

    expect(normalValidation).toHaveBeenCalledTimes(1);
  });

  test('should cancel previous validation when new one is triggered', async () => {
    const validation1 = vi.fn().mockResolvedValue({ valid: true });
    const validation2 = vi.fn().mockResolvedValue({ valid: false });

    validator.debounceValidation('test', validation1);

    // Trigger new validation before first completes
    vi.advanceTimersByTime(100);
    validator.debounceValidation('test', validation2);

    // Complete the debounce period
    vi.advanceTimersByTime(300);

    // Only second validation should execute
    expect(validation1).toHaveBeenCalledTimes(0);
    expect(validation2).toHaveBeenCalledTimes(1);
  });

  test('should track pending validations', () => {
    const mockValidation = vi.fn().mockResolvedValue({ valid: true });

    expect(validator.isPending('test')).toBe(false);

    validator.debounceValidation('test', mockValidation);

    expect(validator.isPending('test')).toBe(true);

    vi.advanceTimersByTime(350);

    expect(validator.isPending('test')).toBe(false);
  });

  test('should cache validation results', async () => {
    const mockValidation = vi.fn().mockResolvedValue({ valid: true, data: 'test' });

    await validator.debounceValidation('test', mockValidation);
    vi.advanceTimersByTime(350);

    const cached = validator.getCached('test');
    expect(cached).toBeTruthy();
    expect(cached.result).toEqual({ valid: true, data: 'test' });
  });

  test('should clear all pending validations', () => {
    const mockValidation = vi.fn().mockResolvedValue({ valid: true });

    validator.debounceValidation('test1', mockValidation);
    validator.debounceValidation('test2', mockValidation);

    expect(validator.getStats().activeTimers).toBe(2);

    validator.clearAll();

    expect(validator.getStats().activeTimers).toBe(0);
    expect(validator.getStats().pendingValidations).toBe(0);
  });

  test('should update configuration', () => {
    const newConfig = {
      validation: 500,
      critical: 25,
    };

    validator.updateConfig(newConfig);

    const stats = validator.getStats();
    expect(stats.config.validation).toBe(500);
    expect(stats.config.critical).toBe(25);
  });

  test('should handle validation errors gracefully', async () => {
    const mockValidation = vi.fn().mockRejectedValue(new Error('Validation failed'));

    const promise = validator.debounceValidation('test', mockValidation);
    vi.advanceTimersByTime(350);

    await expect(promise).rejects.toThrow('Validation failed');
    expect(validator.isPending('test')).toBe(false);
  });

  test('should generate consistent hashes for same content', () => {
    const content1 = { nodes: [{ id: '1' }], edges: [] };
    const content2 = { nodes: [{ id: '1' }], edges: [] };
    const content3 = { nodes: [{ id: '2' }], edges: [] };

    const hash1 = validator.generateHash(content1);
    const hash2 = validator.generateHash(content2);
    const hash3 = validator.generateHash(content3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});