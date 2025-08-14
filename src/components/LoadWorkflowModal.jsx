import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { formatFormDataForDisplay } from '../utils/helpers';

/**
 * Modal for loading saved workflows with list, preview, and search
 */
function LoadWorkflowModal({ 
  isOpen, 
  onClose, 
  onLoad, 
  onDelete,
  workflows = [],
  isLoading = false,
  error = null 
}) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt', 'name', 'nodeCount'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // Filter and sort workflows
  useEffect(() => {
    let filtered = workflows;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = workflows.filter(workflow => 
        workflow.name.toLowerCase().includes(term) ||
        (workflow.description && workflow.description.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'nodeCount':
          aValue = a.metadata?.nodeCount || 0;
          bValue = b.metadata?.nodeCount || 0;
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredWorkflows(filtered);
  }, [workflows, searchTerm, sortBy, sortOrder]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWorkflow(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleWorkflowSelect = (workflow) => {
    setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow);
  };

  const handleLoad = () => {
    if (selectedWorkflow) {
      onLoad(selectedWorkflow);
      onClose();
    }
  };

  const handleDelete = async (workflow, event) => {
    event.stopPropagation(); // Prevent workflow selection
    
    if (window.confirm(`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`)) {
      try {
        await onDelete(workflow.id);
        
        // Clear selection if deleted workflow was selected
        if (selectedWorkflow?.id === workflow.id) {
          setSelectedWorkflow(null);
        }
      } catch (error) {
        alert(`Failed to delete workflow: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNodeTypeIcon = (nodeType) => {
    const icons = {
      templateFormNode: '📝',
      formNode: '📋',
      fetchNode: '🌐',
      processNode: '⚙️',
      markdownNode: '📄',
      leafNode: '🍃'
    };
    return icons[nodeType] || '🔧';
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Load Workflow"
      size="large"
    >
      <div className="flex h-[600px]">
        {/* Workflow List Panel */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* Search and Sort Controls */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* Search Input */}
            <div>
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="updatedAt">Last Modified</option>
                <option value="name">Name</option>
                <option value="nodeCount">Node Count</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Workflow List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">
                <p>Error loading workflows:</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No workflows match your search' : 'No saved workflows found'}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onClick={() => handleWorkflowSelect(workflow)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors border
                      ${selectedWorkflow?.id === workflow.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {workflow.name}
                        </h4>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{workflow.metadata?.nodeCount || 0} nodes</span>
                          <span>{workflow.metadata?.edgeCount || 0} connections</span>
                          <span>{formatDate(workflow.updatedAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(workflow, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete workflow"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 flex flex-col">
          {selectedWorkflow ? (
            <>
              {/* Preview Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedWorkflow.name}
                </h3>
                {selectedWorkflow.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedWorkflow.description}
                  </p>
                )}
                
                {/* Workflow Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Nodes:</span>
                    <span className="ml-2 text-gray-600">{selectedWorkflow.metadata?.nodeCount || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Connections:</span>
                    <span className="ml-2 text-gray-600">{selectedWorkflow.metadata?.edgeCount || 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedWorkflow.createdAt)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Modified:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedWorkflow.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Node Types */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Node Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedWorkflow.metadata?.nodeTypes || []).map((nodeType) => (
                      <span
                        key={nodeType}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        <span>{getNodeTypeIcon(nodeType)}</span>
                        {nodeType}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Node Details */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Nodes ({selectedWorkflow.workflow?.nodes?.length || 0})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(selectedWorkflow.workflow?.nodes || []).map((node) => (
                      <div key={node.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{node.data?.emoji || getNodeTypeIcon(node.type)}</span>
                          <span className="font-medium">{node.data?.label || node.id}</span>
                          <span className="text-xs text-gray-500">({node.type})</span>
                        </div>
                        {node.data?.function && (
                          <div className="text-xs text-gray-600 ml-6">
                            {node.data.function}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Load Button */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleLoad}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Load This Workflow
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Select a workflow to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default LoadWorkflowModal;