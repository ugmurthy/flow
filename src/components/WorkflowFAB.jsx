import React, { useState, useRef, useEffect } from 'react';
import Save from '../icons/Save';
import Upload from '../icons/Upload';

/**
 * Floating Action Button for workflow save/load operations
 * Positioned at bottom-right corner with expandable menu
 */
function WorkflowFAB({ onSave, onLoad, disabled = false, hasWorkflow = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef(null);

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

  return (
    <div 
      ref={fabRef}
      className="fixed bottom-6 right-6 z-50"
    >
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
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
              min-w-[140px] justify-start
            `}
            title={hasWorkflow ? "Save current workflow" : "No connected workflow to save"}
          >
            <Save className="w-5 h-5" />
            <span className="font-medium">Save Workflow</span>
          </button>

          {/* Load Button */}
          <button
            onClick={handleLoad}
            className="
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-200
              bg-blue-500 hover:bg-blue-600 text-white hover:shadow-xl transform hover:scale-105
              min-w-[140px] justify-start
            "
            title="Load saved workflow"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Load Workflow</span>
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
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          )}
        </div>
      </button>

      {/* Workflow Status Indicator */}
      {hasWorkflow && !isExpanded && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      )}
    </div>
  );
}

export default WorkflowFAB;