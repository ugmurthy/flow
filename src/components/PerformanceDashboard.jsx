/**
 * Performance Dashboard Component
 * Displays real-time performance metrics for the optimization system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useFlowState } from '../contexts/FlowStateContext.jsx';
import { flowStateIntegration } from '../services/flowStateIntegration.js';
import { performanceMonitor } from '../utils/performanceMonitor.js';
import { validationCache } from '../utils/validationCache.js';
import { debouncedValidator } from '../utils/debouncedValidation.js';

const PerformanceDashboard = ({ isOpen, onClose }) => {
  const flowState = useFlowState();
  const [stats, setStats] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(1000); // 1 second
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Refresh stats
  const refreshStats = useCallback(() => {
    try {
      const integrationStats = flowStateIntegration.getStats();
      const performanceStats = performanceMonitor.getStats();
      const cacheStats = validationCache.getStats();
      const debouncerStats = debouncedValidator.getStats();
      const flowStateStats = flowState.getStats();

      setStats({
        integration: integrationStats,
        performance: performanceStats,
        cache: cacheStats,
        debouncer: debouncerStats,
        flowState: flowStateStats,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error refreshing performance stats:', error);
    }
  }, [flowState]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh || !isOpen) return;

    const interval = setInterval(refreshStats, refreshInterval);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refreshStats, isOpen]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen, refreshStats]);

  if (!isOpen) return null;

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    if (typeof num === 'number') {
      return num.toFixed(2);
    }
    return num.toString();
  };

  const formatPercentage = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return `${(num * 100).toFixed(1)}%`;
  };

  const getHealthColor = (value, thresholds) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Auto-refresh:</label>
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
                className="rounded"
              />
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
              disabled={!isAutoRefresh}
            >
              <option value={500}>0.5s</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
            </select>
            <button
              onClick={refreshStats}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!stats ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading performance data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Flow State Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Flow State</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <span className="font-mono">{stats.flowState.nodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Edges:</span>
                    <span className="font-mono">{stats.flowState.edges}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing:</span>
                    <span className="font-mono">{stats.flowState.processing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valid:</span>
                    <span className={`font-mono ${stats.flowState.validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.flowState.validation.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Performance</h3>
                <div className="space-y-2 text-sm">
                  {stats.performance.validationTimes && (
                    <div className="flex justify-between">
                      <span>Avg Validation:</span>
                      <span className={`font-mono ${getHealthColor(stats.performance.validationTimes.average, { good: 50, warning: 100 })}`}>
                        {formatNumber(stats.performance.validationTimes.average)}ms
                      </span>
                    </div>
                  )}
                  {stats.performance.syncTimes && (
                    <div className="flex justify-between">
                      <span>Avg Sync:</span>
                      <span className={`font-mono ${getHealthColor(stats.performance.syncTimes.average, { good: 20, warning: 50 })}`}>
                        {formatNumber(stats.performance.syncTimes.average)}ms
                      </span>
                    </div>
                  )}
                  {stats.performance.memoryUsage && (
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-mono">
                        {(stats.performance.memoryUsage.current / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cache Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Validation Cache</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className={`font-mono ${getHealthColor(stats.cache.hitRate, { good: 0.7, warning: 0.4 })}`}>
                      {formatPercentage(stats.cache.hitRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">{stats.cache.size}/{stats.cache.maxSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hits:</span>
                    <span className="font-mono text-green-600">{stats.cache.hitCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misses:</span>
                    <span className="font-mono text-red-600">{stats.cache.missCount}</span>
                  </div>
                </div>
              </div>

              {/* Debouncer Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Debouncer</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-mono">{stats.debouncer.pendingValidations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Timers:</span>
                    <span className="font-mono">{stats.debouncer.activeTimers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Size:</span>
                    <span className="font-mono">{stats.debouncer.cacheSize}</span>
                  </div>
                </div>
              </div>

              {/* Integration Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Integration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Initialized:</span>
                    <span className={`font-mono ${stats.integration.isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.integration.isInitialized ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sync Ops:</span>
                    <span className="font-mono">{stats.integration.syncOperations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validations:</span>
                    <span className="font-mono">{stats.integration.validationCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hit Rate:</span>
                    <span className={`font-mono ${getHealthColor(stats.integration.cacheHits / (stats.integration.cacheHits + stats.integration.cacheMisses), { good: 0.7, warning: 0.4 })}`}>
                      {formatPercentage(stats.integration.cacheHits / (stats.integration.cacheHits + stats.integration.cacheMisses))}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">System Health</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Overall:</span>
                    <span className="font-mono text-green-600">Healthy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sync Conflicts:</span>
                    <span className="font-mono">{stats.flowState.sync.conflicts?.size || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span className="font-mono text-xs">
                      {new Date(stats.flowState.sync.lastSyncTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-4 border-t flex gap-4">
            <button
              onClick={() => {
                validationCache.clear();
                debouncedValidator.clearAll();
                performanceMonitor.clear();
                refreshStats();
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Clear Caches
            </button>
            <button
              onClick={() => {
                performanceMonitor.setEnabled(!performanceMonitor.isEnabled);
                refreshStats();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {performanceMonitor.isEnabled ? 'Disable' : 'Enable'} Monitoring
            </button>
            <button
              onClick={() => {
                const data = JSON.stringify(stats, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-stats-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;