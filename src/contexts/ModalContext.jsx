import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DynamicForm from '../components/DynamicForm';
import MarkdownRenderer from '../components/MarkdownRenderer';

// Create the modal context
const ModalContext = createContext();

// Modal types registry
const MODAL_TYPES = {
  FORM_EDIT: 'form-edit',
  DATA_VIEW: 'data-view'
};

// Modal components mapping
const ModalComponents = {
  [MODAL_TYPES.FORM_EDIT]: ({ data, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal content */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Modal body */}
        <div className="p-6">
          <DynamicForm
            formFields={data.formFields || []}
            defaultValues={data.defaultValues || {}}
            isSubmitting={data.isSubmitting || false}
            onSubmit={async (formData) => {
              try {
                // Call the original onSubmit handler and wait for completion
                if (data.onSubmit) {
                  await data.onSubmit(formData);
                }
                // Close the modal only after successful submission
                onClose();
              } catch (error) {
                // Error is handled in the component, modal stays open
                console.error("Submission failed:", error);
                // Could add error state to show in modal if needed
              }
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  ),
  
  [MODAL_TYPES.DATA_VIEW]: ({ data, onClose }) => {
    // Convert data to markdown format for display
    const formatDataAsMarkdown = (data) => {
      if (!data) return "No data available";
      
      if (typeof data === 'string') {
        return data;
      }
      
      if (typeof data === 'object') {
        let markdown = `# ${data.title || 'Node Data'}\n\n`;
        
        // Handle arrays
        if (Array.isArray(data)) {
          markdown += "## Data Items\n\n";
          data.forEach((item, index) => {
            markdown += `### Item ${index + 1}\n\n`;
            if (typeof item === 'object') {
              markdown += formatObjectAsMarkdown(item);
            } else {
              markdown += `${item}\n\n`;
            }
          });
        } else {
          // Handle objects
          markdown += formatObjectAsMarkdown(data);
        }
        
        return markdown;
      }
      
      return String(data);
    };
    
    const formatObjectAsMarkdown = (obj) => {
      let markdown = "";
      
      Object.entries(obj).forEach(([key, value]) => {
        markdown += `**${key}**: `;
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            markdown += "\n";
            value.forEach((item, index) => {
              markdown += `- ${typeof item === 'object' ? JSON.stringify(item, null, 2) : item}\n`;
            });
            markdown += "\n";
          } else {
            markdown += "\n```json\n" + JSON.stringify(value, null, 2) + "\n```\n\n";
          }
        } else {
          markdown += `${value}\n\n`;
        }
      });
      
      return markdown;
    };

    const markdownContent = formatDataAsMarkdown(data.data);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
        {/* Backdrop with blur */}
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
        
        {/* Modal content */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Modal body */}
          <div className="p-6">
            <div className="w-full">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{data.title}</h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                <MarkdownRenderer
                  content={markdownContent}
                  width="100%"
                  textColor="#374151"
                  fontSize="14px"
                />
              </div>
              
              {/*<div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>*/}
            </div>
          </div>
        </div>
      </div>
    );
  }
};

// Modal Provider Component
export function ModalProvider({ children }) {
  const [currentModal, setCurrentModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [portalContainer, setPortalContainer] = useState(null);

  // Initialize portal container
  React.useEffect(() => {
    const container = document.createElement('div');
    container.id = 'modal-portal';
    container.style.position = 'relative';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && currentModal) {
        closeModal();
      }
    };

    if (currentModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [currentModal]);

  const openModal = useCallback((modalType, data) => {
    if (!MODAL_TYPES[modalType.toUpperCase().replace('-', '_')]) {
      console.error(`Unknown modal type: ${modalType}`);
      return;
    }
    
    setCurrentModal(modalType);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setCurrentModal(null);
    setModalData(null);
  }, []);

  const contextValue = {
    openModal,
    closeModal,
    currentModal,
    modalData,
    MODAL_TYPES
  };

  // Render current modal
  const renderModal = () => {
    if (!currentModal || !modalData || !portalContainer) return null;

    const ModalComponent = ModalComponents[currentModal];
    if (!ModalComponent) {
      console.error(`No component found for modal type: ${currentModal}`);
      return null;
    }

    return createPortal(
      <ModalComponent data={modalData} onClose={closeModal} />,
      portalContainer
    );
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {renderModal()}
    </ModalContext.Provider>
  );
}

// Custom hook to use modal context
export function useModal() {
  const context = useContext(ModalContext);
  
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  
  return context;
}

// Export modal types for convenience
export { MODAL_TYPES };