/**
 * Custom hook for modal management
 * Handles all modal states and operations in a centralized way
 */

import { useState, useCallback } from 'react';

/**
 * Modal types enumeration
 */
export const MODAL_TYPES = {
  SAVE_WORKFLOW: 'saveWorkflow',
  LOAD_WORKFLOW: 'loadWorkflow',
  CONFIRM_DIALOG: 'confirmDialog',
  EXPORT_WORKFLOW: 'exportWorkflow',
  IMPORT_WORKFLOW: 'importWorkflow'
};

/**
 * Custom hook for managing modal states and operations
 * @returns {Object} Modal management utilities
 */
export const useModalManagement = () => {
  // Modal visibility states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal data states
  const [confirmDialogData, setConfirmDialogData] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [importData, setImportData] = useState(null);

  // Generic modal state management
  const [modalStates, setModalStates] = useState({});
  const [modalData, setModalData] = useState({});

  /**
   * Opens a specific modal
   * @param {string} modalType - Type of modal to open
   * @param {any} data - Optional data to pass to the modal
   */
  const openModal = useCallback((modalType, data = null) => {
    switch (modalType) {
      case MODAL_TYPES.SAVE_WORKFLOW:
        setShowSaveModal(true);
        break;
      case MODAL_TYPES.LOAD_WORKFLOW:
        setShowLoadModal(true);
        break;
      case MODAL_TYPES.CONFIRM_DIALOG:
        setShowConfirmDialog(true);
        setConfirmDialogData(data);
        break;
      case MODAL_TYPES.EXPORT_WORKFLOW:
        setShowExportModal(true);
        setExportData(data);
        break;
      case MODAL_TYPES.IMPORT_WORKFLOW:
        setShowImportModal(true);
        setImportData(data);
        break;
      default:
        // Generic modal handling
        setModalStates(prev => ({ ...prev, [modalType]: true }));
        if (data) {
          setModalData(prev => ({ ...prev, [modalType]: data }));
        }
    }
  }, []);

  /**
   * Closes a specific modal
   * @param {string} modalType - Type of modal to close
   */
  const closeModal = useCallback((modalType) => {
    switch (modalType) {
      case MODAL_TYPES.SAVE_WORKFLOW:
        setShowSaveModal(false);
        break;
      case MODAL_TYPES.LOAD_WORKFLOW:
        setShowLoadModal(false);
        break;
      case MODAL_TYPES.CONFIRM_DIALOG:
        setShowConfirmDialog(false);
        setConfirmDialogData(null);
        break;
      case MODAL_TYPES.EXPORT_WORKFLOW:
        setShowExportModal(false);
        setExportData(null);
        break;
      case MODAL_TYPES.IMPORT_WORKFLOW:
        setShowImportModal(false);
        setImportData(null);
        break;
      default:
        // Generic modal handling
        setModalStates(prev => ({ ...prev, [modalType]: false }));
        setModalData(prev => {
          const newData = { ...prev };
          delete newData[modalType];
          return newData;
        });
    }
  }, []);

  /**
   * Closes all modals
   */
  const closeAllModals = useCallback(() => {
    setShowSaveModal(false);
    setShowLoadModal(false);
    setShowConfirmDialog(false);
    setShowExportModal(false);
    setShowImportModal(false);
    setConfirmDialogData(null);
    setExportData(null);
    setImportData(null);
    setModalStates({});
    setModalData({});
  }, []);

  /**
   * Checks if any modal is currently open
   * @returns {boolean} True if any modal is open
   */
  const isAnyModalOpen = useCallback(() => {
    return showSaveModal || 
           showLoadModal || 
           showConfirmDialog || 
           showExportModal || 
           showImportModal ||
           Object.values(modalStates).some(state => state);
  }, [showSaveModal, showLoadModal, showConfirmDialog, showExportModal, showImportModal, modalStates]);

  /**
   * Gets the currently open modals
   * @returns {Array} Array of open modal types
   */
  const getOpenModals = useCallback(() => {
    const openModals = [];
    
    if (showSaveModal) openModals.push(MODAL_TYPES.SAVE_WORKFLOW);
    if (showLoadModal) openModals.push(MODAL_TYPES.LOAD_WORKFLOW);
    if (showConfirmDialog) openModals.push(MODAL_TYPES.CONFIRM_DIALOG);
    if (showExportModal) openModals.push(MODAL_TYPES.EXPORT_WORKFLOW);
    if (showImportModal) openModals.push(MODAL_TYPES.IMPORT_WORKFLOW);
    
    // Add generic modals
    Object.entries(modalStates).forEach(([type, isOpen]) => {
      if (isOpen) openModals.push(type);
    });
    
    return openModals;
  }, [showSaveModal, showLoadModal, showConfirmDialog, showExportModal, showImportModal, modalStates]);

  /**
   * Modal action handlers
   */
  const modalHandlers = {
    // Save modal handlers
    openSaveModal: () => openModal(MODAL_TYPES.SAVE_WORKFLOW),
    closeSaveModal: () => closeModal(MODAL_TYPES.SAVE_WORKFLOW),
    
    // Load modal handlers
    openLoadModal: () => openModal(MODAL_TYPES.LOAD_WORKFLOW),
    closeLoadModal: () => closeModal(MODAL_TYPES.LOAD_WORKFLOW),
    
    // Confirm dialog handlers
    openConfirmDialog: (data) => openModal(MODAL_TYPES.CONFIRM_DIALOG, data),
    closeConfirmDialog: () => closeModal(MODAL_TYPES.CONFIRM_DIALOG),
    
    // Export modal handlers
    openExportModal: (data) => openModal(MODAL_TYPES.EXPORT_WORKFLOW, data),
    closeExportModal: () => closeModal(MODAL_TYPES.EXPORT_WORKFLOW),
    
    // Import modal handlers
    openImportModal: (data) => openModal(MODAL_TYPES.IMPORT_WORKFLOW, data),
    closeImportModal: () => closeModal(MODAL_TYPES.IMPORT_WORKFLOW)
  };

  /**
   * Modal state getters
   */
  const modalState = {
    // Individual modal states
    showSaveModal,
    showLoadModal,
    showConfirmDialog,
    showExportModal,
    showImportModal,
    
    // Modal data
    confirmDialogData,
    exportData,
    importData,
    
    // Generic modal states
    modalStates,
    modalData,
    
    // Utility states
    isAnyModalOpen: isAnyModalOpen(),
    openModals: getOpenModals()
  };

  return {
    // State
    ...modalState,
    
    // Actions
    openModal,
    closeModal,
    closeAllModals,
    
    // Convenience handlers
    ...modalHandlers,
    
    // Utilities
    isAnyModalOpen,
    getOpenModals
  };
};

/**
 * Custom hook specifically for confirmation dialogs
 * @returns {Object} Confirmation dialog utilities
 */
export const useConfirmationDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogData, setDialogData] = useState(null);
  const [onConfirm, setOnConfirm] = useState(null);
  const [onCancel, setOnCancel] = useState(null);

  const showConfirmation = useCallback((data, confirmHandler, cancelHandler = null) => {
    setDialogData(data);
    setOnConfirm(() => confirmHandler);
    setOnCancel(() => cancelHandler);
    setIsOpen(true);
  }, []);

  const hideConfirmation = useCallback(() => {
    setIsOpen(false);
    setDialogData(null);
    setOnConfirm(null);
    setOnCancel(null);
  }, []);

  const handleConfirm = useCallback(async (...args) => {
    if (onConfirm) {
      try {
        await onConfirm(...args);
      } catch (error) {
        console.error('Confirmation handler error:', error);
      }
    }
    hideConfirmation();
  }, [onConfirm, hideConfirmation]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      try {
        onCancel();
      } catch (error) {
        console.error('Cancel handler error:', error);
      }
    }
    hideConfirmation();
  }, [onCancel, hideConfirmation]);

  return {
    isOpen,
    dialogData,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel
  };
};

/**
 * Custom hook for managing modal loading states
 * @returns {Object} Modal loading state utilities
 */
export const useModalLoading = () => {
  const [loadingStates, setLoadingStates] = useState({});

  const setModalLoading = useCallback((modalType, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [modalType]: isLoading
    }));
  }, []);

  const isModalLoading = useCallback((modalType) => {
    return loadingStates[modalType] || false;
  }, [loadingStates]);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    setModalLoading,
    isModalLoading,
    clearAllLoading
  };
};