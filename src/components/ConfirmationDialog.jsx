import React from 'react';
import Modal from './Modal';

/**
 * Confirmation dialog for workflow load operations
 * Asks user whether to replace or merge with current workflow
 */
function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  workflow = null,
  currentWorkflowStats = null,
  type = 'load' // 'load', 'delete', 'replace'
}) {
  
  const getDialogContent = () => {
    switch (type) {
      case 'load':
        return {
          title: 'Load Workflow',
          message: `You are about to load "${workflow?.name}". What would you like to do with your current canvas?`,
          options: [
            {
              key: 'replace',
              label: 'Replace Current Workflow',
              description: 'Clear the canvas and load the selected workflow',
              className: 'bg-red-600 hover:bg-red-700 text-white',
              icon: '🔄'
            },
            {
              key: 'merge',
              label: 'Merge with Current Workflow',
              description: 'Add the selected workflow to your current canvas',
              className: 'bg-blue-600 hover:bg-blue-700 text-white',
              icon: '➕'
            }
          ]
        };
      
      case 'delete':
        return {
          title: 'Delete Workflow',
          message: `Are you sure you want to delete "${workflow?.name}"? This action cannot be undone.`,
          options: [
            {
              key: 'delete',
              label: 'Delete Workflow',
              description: 'Permanently remove this workflow',
              className: 'bg-red-600 hover:bg-red-700 text-white',
              icon: '🗑️'
            }
          ]
        };
      
      case 'replace':
        return {
          title: 'Replace Workflow',
          message: `You have unsaved changes. Loading "${workflow?.name}" will replace your current work.`,
          options: [
            {
              key: 'replace',
              label: 'Replace Anyway',
              description: 'Discard current changes and load the selected workflow',
              className: 'bg-red-600 hover:bg-red-700 text-white',
              icon: '⚠️'
            }
          ]
        };
      
      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed?',
          options: [
            {
              key: 'confirm',
              label: 'Confirm',
              description: '',
              className: 'bg-blue-600 hover:bg-blue-700 text-white',
              icon: '✓'
            }
          ]
        };
    }
  };

  const handleOptionClick = (optionKey) => {
    onConfirm(optionKey);
    onClose();
  };

  const content = getDialogContent();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={content.title}
      size="medium"
    >
      <div className="p-6">
        {/* Main Message */}
        <div className="mb-6">
          <p className="text-gray-700 text-base leading-relaxed">
            {content.message}
          </p>
        </div>

        {/* Workflow Information */}
        {workflow && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-2">Selected Workflow</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div><span className="font-medium">Name:</span> {workflow.name}</div>
              {workflow.description && (
                <div><span className="font-medium">Description:</span> {workflow.description}</div>
              )}
              <div><span className="font-medium">Nodes:</span> {workflow.metadata?.nodeCount || 0}</div>
              <div><span className="font-medium">Connections:</span> {workflow.metadata?.edgeCount || 0}</div>
              <div>
                <span className="font-medium">Last Modified:</span> {' '}
                {new Date(workflow.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        )}

        {/* Current Workflow Stats (for load operations) */}
        {type === 'load' && currentWorkflowStats && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Current Canvas</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div><span className="font-medium">Nodes:</span> {currentWorkflowStats.nodeCount}</div>
              <div><span className="font-medium">Connections:</span> {currentWorkflowStats.edgeCount}</div>
              {currentWorkflowStats.hasWorkflow && (
                <div className="text-blue-600 font-medium">⚠️ You have unsaved work on the canvas</div>
              )}
            </div>
          </div>
        )}

        {/* Action Options */}
        <div className="space-y-3">
          {content.options.map((option) => (
            <button
              key={option.key}
              onClick={() => handleOptionClick(option.key)}
              className={`
                w-full p-4 rounded-lg border-2 border-transparent transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${option.className}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{option.label}</div>
                  {option.description && (
                    <div className="text-sm opacity-90 mt-1">{option.description}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>

        {/* Warning for destructive actions */}
        {(type === 'delete' || type === 'replace' || content.options.some(opt => opt.key === 'replace')) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 text-sm">⚠️</span>
              <p className="text-sm text-yellow-800">
                {type === 'delete' 
                  ? 'This action cannot be undone. The workflow will be permanently deleted.'
                  : 'This action will discard any unsaved changes on your current canvas.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ConfirmationDialog;