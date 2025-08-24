/**
 * Comprehensive test suite for modal management hooks
 * Tests useModalManagement, useConfirmationDialog, and useModalLoading hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useModalManagement,
  useConfirmationDialog,
  useModalLoading,
  MODAL_TYPES,
} from '../../hooks/useModalManagement.js';
import { cleanupHelpers } from '../utils/reactTestHelpers.js';

describe('useModalManagement Hook', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with all modals closed', () => {
      const { result } = renderHook(() => useModalManagement());

      expect(result.current.showSaveModal).toBe(false);
      expect(result.current.showLoadModal).toBe(false);
      expect(result.current.showConfirmDialog).toBe(false);
      expect(result.current.showExportModal).toBe(false);
      expect(result.current.showImportModal).toBe(false);
      expect(result.current.isAnyModalOpen).toBe(false);
      expect(result.current.openModals).toEqual([]);
    });

    it('should initialize with empty modal data', () => {
      const { result } = renderHook(() => useModalManagement());

      expect(result.current.confirmDialogData).toBeNull();
      expect(result.current.exportData).toBeNull();
      expect(result.current.importData).toBeNull();
      expect(result.current.modalStates).toEqual({});
      expect(result.current.modalData).toEqual({});
    });
  });

  describe('Opening Modals', () => {
    it('should open save modal', () => {
      const { result } = renderHook(() => useModalManagement());

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
      });

      expect(result.current.showSaveModal).toBe(true);
      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toContain(MODAL_TYPES.SAVE_WORKFLOW);
    });

    it('should open load modal', () => {
      const { result } = renderHook(() => useModalManagement());

      act(() => {
        result.current.openModal(MODAL_TYPES.LOAD_WORKFLOW);
      });

      expect(result.current.showLoadModal).toBe(true);
      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toContain(MODAL_TYPES.LOAD_WORKFLOW);
    });

    it('should open confirm dialog with data', () => {
      const { result } = renderHook(() => useModalManagement());
      const testData = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
      };

      act(() => {
        result.current.openModal(MODAL_TYPES.CONFIRM_DIALOG, testData);
      });

      expect(result.current.showConfirmDialog).toBe(true);
      expect(result.current.confirmDialogData).toEqual(testData);
      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toContain(MODAL_TYPES.CONFIRM_DIALOG);
    });

    it('should open export modal with data', () => {
      const { result } = renderHook(() => useModalManagement());
      const exportData = { format: 'json', data: { nodes: [], edges: [] } };

      act(() => {
        result.current.openModal(MODAL_TYPES.EXPORT_WORKFLOW, exportData);
      });

      expect(result.current.showExportModal).toBe(true);
      expect(result.current.exportData).toEqual(exportData);
      expect(result.current.isAnyModalOpen).toBe(true);
    });

    it('should open import modal with data', () => {
      const { result } = renderHook(() => useModalManagement());
      const importData = { format: 'json' };

      act(() => {
        result.current.openModal(MODAL_TYPES.IMPORT_WORKFLOW, importData);
      });

      expect(result.current.showImportModal).toBe(true);
      expect(result.current.importData).toEqual(importData);
      expect(result.current.isAnyModalOpen).toBe(true);
    });

    it('should handle generic modal types', () => {
      const { result } = renderHook(() => useModalManagement());
      const customModalType = 'custom_modal';
      const customData = { customField: 'value' };

      act(() => {
        result.current.openModal(customModalType, customData);
      });

      expect(result.current.modalStates[customModalType]).toBe(true);
      expect(result.current.modalData[customModalType]).toEqual(customData);
      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toContain(customModalType);
    });

    it('should open multiple modals simultaneously', () => {
      const { result } = renderHook(() => useModalManagement());

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
        result.current.openModal(MODAL_TYPES.LOAD_WORKFLOW);
        result.current.openModal('custom_modal');
      });

      expect(result.current.showSaveModal).toBe(true);
      expect(result.current.showLoadModal).toBe(true);
      expect(result.current.modalStates.custom_modal).toBe(true);
      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toHaveLength(3);
    });
  });

  describe('Closing Modals', () => {
    it('should close save modal', () => {
      const { result } = renderHook(() => useModalManagement());

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
        result.current.closeModal(MODAL_TYPES.SAVE_WORKFLOW);
      });

      expect(result.current.showSaveModal).toBe(false);
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should close confirm dialog and clear data', () => {
      const { result } = renderHook(() => useModalManagement());
      const testData = { title: 'Test' };

      act(() => {
        result.current.openModal(MODAL_TYPES.CONFIRM_DIALOG, testData);
        result.current.closeModal(MODAL_TYPES.CONFIRM_DIALOG);
      });

      expect(result.current.showConfirmDialog).toBe(false);
      expect(result.current.confirmDialogData).toBeNull();
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should close export modal and clear data', () => {
      const { result } = renderHook(() => useModalManagement());
      const exportData = { format: 'json' };

      act(() => {
        result.current.openModal(MODAL_TYPES.EXPORT_WORKFLOW, exportData);
        result.current.closeModal(MODAL_TYPES.EXPORT_WORKFLOW);
      });

      expect(result.current.showExportModal).toBe(false);
      expect(result.current.exportData).toBeNull();
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should close import modal and clear data', () => {
      const { result } = renderHook(() => useModalManagement());
      const importData = { format: 'json' };

      act(() => {
        result.current.openModal(MODAL_TYPES.IMPORT_WORKFLOW, importData);
        result.current.closeModal(MODAL_TYPES.IMPORT_WORKFLOW);
      });

      expect(result.current.showImportModal).toBe(false);
      expect(result.current.importData).toBeNull();
      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should close generic modals and clear data', () => {
      const { result } = renderHook(() => useModalManagement());
      const customModalType = 'custom_modal';
      const customData = { field: 'value' };

      act(() => {
        result.current.openModal(customModalType, customData);
        result.current.closeModal(customModalType);
      });

      expect(result.current.modalStates[customModalType]).toBe(false);
      expect(result.current.modalData[customModalType]).toBeUndefined();
      expect(result.current.isAnyModalOpen).toBe(false);
    });
  });

  describe('Convenience Handlers', () => {
    it('should provide convenience handlers for all modal types', () => {
      const { result } = renderHook(() => useModalManagement());

      // Test save modal handlers
      act(() => {
        result.current.openSaveModal();
      });
      expect(result.current.showSaveModal).toBe(true);

      act(() => {
        result.current.closeSaveModal();
      });
      expect(result.current.showSaveModal).toBe(false);

      // Test load modal handlers
      act(() => {
        result.current.openLoadModal();
      });
      expect(result.current.showLoadModal).toBe(true);

      act(() => {
        result.current.closeLoadModal();
      });
      expect(result.current.showLoadModal).toBe(false);

      // Test confirm dialog handlers
      const confirmData = { title: 'Test' };
      act(() => {
        result.current.openConfirmDialog(confirmData);
      });
      expect(result.current.showConfirmDialog).toBe(true);
      expect(result.current.confirmDialogData).toEqual(confirmData);

      act(() => {
        result.current.closeConfirmDialog();
      });
      expect(result.current.showConfirmDialog).toBe(false);
      expect(result.current.confirmDialogData).toBeNull();
    });
  });

  describe('Close All Modals', () => {
    it('should close all modals at once', () => {
      const { result } = renderHook(() => useModalManagement());

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
        result.current.openModal(MODAL_TYPES.LOAD_WORKFLOW);
        result.current.openModal(MODAL_TYPES.CONFIRM_DIALOG, { title: 'Test' });
        result.current.openModal('custom_modal', { data: 'test' });
      });

      expect(result.current.isAnyModalOpen).toBe(true);
      expect(result.current.openModals).toHaveLength(4);

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.showSaveModal).toBe(false);
      expect(result.current.showLoadModal).toBe(false);
      expect(result.current.showConfirmDialog).toBe(false);
      expect(result.current.confirmDialogData).toBeNull();
      expect(result.current.modalStates).toEqual({});
      expect(result.current.modalData).toEqual({});
      expect(result.current.isAnyModalOpen).toBe(false);
      expect(result.current.openModals).toEqual([]);
    });
  });

  describe('Modal State Utilities', () => {
    it('should correctly detect when any modal is open', () => {
      const { result } = renderHook(() => useModalManagement());

      expect(result.current.isAnyModalOpen).toBe(false);

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
      });

      expect(result.current.isAnyModalOpen).toBe(true);

      act(() => {
        result.current.closeModal(MODAL_TYPES.SAVE_WORKFLOW);
      });

      expect(result.current.isAnyModalOpen).toBe(false);
    });

    it('should return list of currently open modals', () => {
      const { result } = renderHook(() => useModalManagement());

      expect(result.current.openModals).toEqual([]);

      act(() => {
        result.current.openModal(MODAL_TYPES.SAVE_WORKFLOW);
        result.current.openModal(MODAL_TYPES.CONFIRM_DIALOG);
        result.current.openModal('custom_modal');
      });

      expect(result.current.openModals).toEqual([
        MODAL_TYPES.SAVE_WORKFLOW,
        MODAL_TYPES.CONFIRM_DIALOG,
        'custom_modal',
      ]);
    });
  });
});

describe('useConfirmationDialog Hook', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with dialog closed', () => {
      const { result } = renderHook(() => useConfirmationDialog());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.dialogData).toBeNull();
    });
  });

  describe('Show Confirmation', () => {
    it('should show confirmation dialog with data and handlers', () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const dialogData = { title: 'Confirm', message: 'Are you sure?' };
      const confirmHandler = vi.fn();
      const cancelHandler = vi.fn();

      act(() => {
        result.current.showConfirmation(dialogData, confirmHandler, cancelHandler);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.dialogData).toEqual(dialogData);
    });

    it('should work without cancel handler', () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const dialogData = { title: 'Confirm' };
      const confirmHandler = vi.fn();

      act(() => {
        result.current.showConfirmation(dialogData, confirmHandler);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.dialogData).toEqual(dialogData);
    });
  });

  describe('Handle Confirm', () => {
    it('should call confirm handler and hide dialog', async () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const confirmHandler = vi.fn().mockResolvedValue();
      const dialogData = { title: 'Test' };

      act(() => {
        result.current.showConfirmation(dialogData, confirmHandler);
      });

      await act(async () => {
        await result.current.handleConfirm('arg1', 'arg2');
      });

      expect(confirmHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result.current.isOpen).toBe(false);
      expect(result.current.dialogData).toBeNull();
    });

    it('should handle confirm handler errors gracefully', async () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const confirmHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, confirmHandler);
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(confirmHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Confirmation handler error:', expect.any(Error));
      expect(result.current.isOpen).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should hide dialog even without confirm handler', async () => {
      const { result } = renderHook(() => useConfirmationDialog());

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, null);
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Handle Cancel', () => {
    it('should call cancel handler and hide dialog', () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const cancelHandler = vi.fn();
      const confirmHandler = vi.fn();

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, confirmHandler, cancelHandler);
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(cancelHandler).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      expect(result.current.dialogData).toBeNull();
    });

    it('should handle cancel handler errors gracefully', () => {
      const { result } = renderHook(() => useConfirmationDialog());
      const cancelHandler = vi.fn().mockImplementation(() => {
        throw new Error('Cancel error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, vi.fn(), cancelHandler);
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(cancelHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Cancel handler error:', expect.any(Error));
      expect(result.current.isOpen).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should hide dialog even without cancel handler', () => {
      const { result } = renderHook(() => useConfirmationDialog());

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, vi.fn());
      });

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Hide Confirmation', () => {
    it('should hide dialog and clear all data', () => {
      const { result } = renderHook(() => useConfirmationDialog());

      act(() => {
        result.current.showConfirmation({ title: 'Test' }, vi.fn(), vi.fn());
      });

      act(() => {
        result.current.hideConfirmation();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.dialogData).toBeNull();
    });
  });
});

describe('useModalLoading Hook', () => {
  beforeEach(() => {
    cleanupHelpers.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupHelpers.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty loading states', () => {
      const { result } = renderHook(() => useModalLoading());

      expect(result.current.loadingStates).toEqual({});
    });
  });

  describe('Set Modal Loading', () => {
    it('should set loading state for a modal', () => {
      const { result } = renderHook(() => useModalLoading());

      act(() => {
        result.current.setModalLoading(MODAL_TYPES.SAVE_WORKFLOW, true);
      });

      expect(result.current.loadingStates[MODAL_TYPES.SAVE_WORKFLOW]).toBe(true);
      expect(result.current.isModalLoading(MODAL_TYPES.SAVE_WORKFLOW)).toBe(true);
    });

    it('should clear loading state for a modal', () => {
      const { result } = renderHook(() => useModalLoading());

      act(() => {
        result.current.setModalLoading(MODAL_TYPES.SAVE_WORKFLOW, true);
        result.current.setModalLoading(MODAL_TYPES.SAVE_WORKFLOW, false);
      });

      expect(result.current.loadingStates[MODAL_TYPES.SAVE_WORKFLOW]).toBe(false);
      expect(result.current.isModalLoading(MODAL_TYPES.SAVE_WORKFLOW)).toBe(false);
    });

    it('should handle multiple modals loading states', () => {
      const { result } = renderHook(() => useModalLoading());

      act(() => {
        result.current.setModalLoading(MODAL_TYPES.SAVE_WORKFLOW, true);
        result.current.setModalLoading(MODAL_TYPES.LOAD_WORKFLOW, true);
        result.current.setModalLoading('custom_modal', false);
      });

      expect(result.current.isModalLoading(MODAL_TYPES.SAVE_WORKFLOW)).toBe(true);
      expect(result.current.isModalLoading(MODAL_TYPES.LOAD_WORKFLOW)).toBe(true);
      expect(result.current.isModalLoading('custom_modal')).toBe(false);
    });
  });

  describe('Is Modal Loading', () => {
    it('should return false for non-existent modal loading state', () => {
      const { result } = renderHook(() => useModalLoading());

      expect(result.current.isModalLoading('non_existent_modal')).toBe(false);
    });

    it('should return correct loading state', () => {
      const { result } = renderHook(() => useModalLoading());

      act(() => {
        result.current.setModalLoading(MODAL_TYPES.EXPORT_WORKFLOW, true);
      });

      expect(result.current.isModalLoading(MODAL_TYPES.EXPORT_WORKFLOW)).toBe(true);
      expect(result.current.isModalLoading(MODAL_TYPES.IMPORT_WORKFLOW)).toBe(false);
    });
  });

  describe('Clear All Loading', () => {
    it('should clear all loading states', () => {
      const { result } = renderHook(() => useModalLoading());

      act(() => {
        result.current.setModalLoading(MODAL_TYPES.SAVE_WORKFLOW, true);
        result.current.setModalLoading(MODAL_TYPES.LOAD_WORKFLOW, true);
        result.current.setModalLoading('custom_modal', true);
      });

      expect(Object.keys(result.current.loadingStates)).toHaveLength(3);

      act(() => {
        result.current.clearAllLoading();
      });

      expect(result.current.loadingStates).toEqual({});
      expect(result.current.isModalLoading(MODAL_TYPES.SAVE_WORKFLOW)).toBe(false);
      expect(result.current.isModalLoading(MODAL_TYPES.LOAD_WORKFLOW)).toBe(false);
      expect(result.current.isModalLoading('custom_modal')).toBe(false);
    });
  });
});

// Performance tests
describe('Modal Management Hooks Performance', () => {
  it('should handle rapid state changes efficiently', () => {
    const { result } = renderHook(() => useModalManagement());

    const startTime = performance.now();

    // Perform many rapid state changes
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.openModal(`modal_${i}`, { iteration: i });
        result.current.closeModal(`modal_${i}`);
      }
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Should complete in reasonable time (under 100ms)
    expect(executionTime).toBeLessThan(100);
  });

  it('should handle many simultaneous modals efficiently', () => {
    const { result } = renderHook(() => useModalManagement());

    act(() => {
      // Open many modals simultaneously
      for (let i = 0; i < 50; i++) {
        result.current.openModal(`modal_${i}`, { data: `test_${i}` });
      }
    });

    expect(result.current.openModals).toHaveLength(50);
    expect(result.current.isAnyModalOpen).toBe(true);

    act(() => {
      result.current.closeAllModals();
    });

    expect(result.current.openModals).toHaveLength(0);
    expect(result.current.isAnyModalOpen).toBe(false);
  });
});