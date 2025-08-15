import React, { useState, useRef, useEffect } from 'react';
import Save from '../icons/Save';
import Upload from '../icons/Upload';
import Download from '../icons/Download';
import Reset from '../icons/Reset';
import Play from '../icons/Play';
import Pause from '../icons/Pause';
import { useGlobal } from '../contexts/GlobalContext';
import { useWorkflow } from '../contexts/WorkflowContext';

/**
 * Floating Action Button for workflow operations
 * Positioned at bottom-right corner with expandable menu
 */
function WorkflowFAB({ onSave, onLoad, onExport, onImport, onReset, disabled = false, hasWorkflow = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef(null);
  const { executeWorkflow, toggleExecuteWorkflow } = useGlobal();
  const { getCurrentCanvasStats } = useWorkflow();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isExpanded]);

  const handleToggle = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSave = () => {
    setIsExpanded(false);
    onSave?.();
  };

  const handleLoad = () => {
    setIsExpanded(false);
    onLoad?.();
  };

  const handleExport = () => {
    setIsExpanded(false);
    onExport?.();
  };

  const handleImport = () => {
    setIsExpanded(false);
    onImport?.();
  };

  const handleReset = () => {
    setIsExpanded(false);
    onReset?.();
  };

  const handleExecuteToggle = () => {
    setIsExpanded(false);
    toggleExecuteWorkflow();
  };

  // Get current canvas stats for conditional rendering
  const canvasStats = getCurrentCanvasStats();

  return (
    <div 
      ref={fabRef}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          {/* Execute/Pause Toggle Button */}
          <button
            onClick={handleExecuteToggle}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              ${executeWorkflow
                ? 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-xl transform hover:scale-105'
                : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-xl transform hover:scale-105'
              }
              min-w-[180px] justify-start
            `}
            title={executeWorkflow ? "Pause workflow execution" : "Resume workflow execution"}
          >
            {executeWorkflow ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span className="font-medium whitespace-nowrap">
              {executeWorkflow ? 'Pause Execution' : 'Resume Execution'}
            </span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!hasWorkflow}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              ${hasWorkflow
                ? 'bg-green-500 hover:bg-green-600 text-white hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
              min-w-[180px] justify-start
            `}
            title={hasWorkflow ? "Save current workflow" : "No connected workflow to save"}
          >
            <Save className="w-5 h-5" />
            <span className="font-medium whitespace-nowrap">Save Workflow</span>
          </button>

          {/* Load Button */}
          <button
            onClick={handleLoad}
            className="
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              bg-blue-500 hover:bg-blue-600 text-white hover:shadow-xl transform hover:scale-105
              min-w-[180px] justify-start
            "
            title="Load saved workflow"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium whitespace-nowrap">Load Workflow</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!hasWorkflow}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              ${hasWorkflow
                ? 'bg-purple-500 hover:bg-purple-600 text-white hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
              min-w-[180px] justify-start
            `}
            title={hasWorkflow ? "Export current workflow" : "No workflow to export"}
          >
            <Download className="w-5 h-5" />
            <span className="font-medium whitespace-nowrap">Export Workflow</span>
          </button>

          {/* Import Button */}
          <button
            onClick={handleImport}
            className="
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-xl transform hover:scale-105
              min-w-[180px] justify-start
            "
            title="Import workflow from file"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium whitespace-nowrap">Import Workflow</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={!canvasStats.hasWorkflow}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              ${canvasStats.hasWorkflow
                ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
              min-w-[180px] justify-start
            `}
            title={canvasStats.hasWorkflow ? "Reset current workflow" : "No workflow to reset"}
          >
            <Reset className="w-5 h-5" />
            <span className="font-medium whitespace-nowrap">Reset Workflow</span>
          </button>
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-xl transform hover:scale-110'
          }
          ${isExpanded ? 'rotate-45' : 'rotate-0'}
        `}
        title="Workflow Management"
      >
        {/* FAB Icon - Changes based on state */}
        <div className="relative">
          {isExpanded ? (
            // Close icon (X)
            <div className="w-6 h-6 relative">
              <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
              <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2 -rotate-45"></div>
            </div>
          ) : (
            // Workflow icon
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-workflow-icon lucide-workflow"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>
          )}
        </div>
      </button>

      {/* Workflow Status Indicator */}
      {hasWorkflow && !isExpanded && (
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
          executeWorkflow ? 'bg-green-400 animate-pulse' : 'bg-orange-400'
        }`}></div>
      )}
    </div>
  );
}

export default WorkflowFAB;

