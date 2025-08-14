import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { validateWorkflowName, validateWorkflowDescription } from '../utils/workflowValidation';

/**
 * Modal for saving workflows with name and description input
 */
function SaveWorkflowModal({ 
  isOpen, 
  onClose, 
  onSave, 
  workflowStats = null,
  existingWorkflow = null,
  checkNameExists = null 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameCheckTimeout, setNameCheckTimeout] = useState(null);

  // Initialize form data when modal opens or existing workflow changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: existingWorkflow?.name || '',
        description: existingWorkflow?.description || ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, existingWorkflow]);

  // Debounced name validation
  useEffect(() => {
    if (nameCheckTimeout) {
      clearTimeout(nameCheckTimeout);
    }

    if (formData.name.trim() && checkNameExists) {
      const timeout = setTimeout(async () => {
        try {
          const exists = await checkNameExists(formData.name.trim(), existingWorkflow?.id);
          if (exists) {
            setErrors(prev => ({
              ...prev,
              name: 'A workflow with this name already exists'
            }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              if (newErrors.name === 'A workflow with this name already exists') {
                delete newErrors.name;
              }
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error checking workflow name:', error);
        }
      }, 500);

      setNameCheckTimeout(timeout);
    }

    return () => {
      if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
      }
    };
  }, [formData.name, checkNameExists, existingWorkflow?.id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    const nameValidation = validateWorkflowName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    // Validate description
    const descValidation = validateWorkflowDescription(formData.description);
    if (!descValidation.isValid) {
      newErrors.description = descValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      // Reset form and close modal
      setFormData({ name: '', description: '' });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({
        submit: error.message || 'Failed to save workflow'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', description: '' });
      setErrors({});
      onClose();
    }
  };

  const isFormValid = formData.name.trim().length > 0 && Object.keys(errors).length === 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={existingWorkflow ? "Update Workflow" : "Save Workflow"}>
      <div className="p-6">
        {/* Workflow Statistics */}
        {workflowStats && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Workflow Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <span className="font-medium">Nodes:</span> {workflowStats.nodeCount}
              </div>
              <div>
                <span className="font-medium">Connections:</span> {workflowStats.edgeCount}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Node Types:</span> {workflowStats.nodeTypes.join(', ')}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workflow Name */}
          <div>
            <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700 mb-1">
              Workflow Name *
            </label>
            <input
              id="workflow-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter workflow name..."
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
              `}
              maxLength={100}
              disabled={isSubmitting}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.name.length}/100 characters
            </p>
          </div>

          {/* Workflow Description */}
          <div>
            <label htmlFor="workflow-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="workflow-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={3}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none
                ${errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
              `}
              maxLength={500}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {existingWorkflow ? 'Update Workflow' : 'Save Workflow'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default SaveWorkflowModal;