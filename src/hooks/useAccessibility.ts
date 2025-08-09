/**
 * @file useAccessibility.ts
 * @description React hooks for accessibility features and WCAG compliance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FocusManager,
  ScreenReaderUtils,
  KeyboardNavigation,
  MotionUtils,
  AriaUtils,
  HighContrastUtils,
  KEYBOARD_KEYS,
} from '../utils/accessibility';

/**
 * Hook for managing focus trapping in modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      FocusManager.saveFocus();
      cleanupRef.current = FocusManager.trapFocus(containerRef.current);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (isActive) {
        FocusManager.restoreFocus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation in lists and grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    columns?: number;
    onSelect?: (index: number, item: T) => void;
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { orientation = 'vertical', wrap = true, columns = 1, onSelect } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const newIndex = KeyboardNavigation.handleArrowNavigation(
      event,
      items,
      currentIndex,
      { orientation, wrap, columns }
    );

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }

    // Handle selection
    if ((event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) && onSelect) {
      event.preventDefault();
      onSelect(currentIndex, items[currentIndex]);
    }
  }, [items, currentIndex, orientation, wrap, columns, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderUtils.announce(message, priority);
  }, []);

  const announcePageStructure = useCallback(() => {
    ScreenReaderUtils.announcePageStructure();
  }, []);

  return {
    announce,
    announcePageStructure,
  };
}

/**
 * Hook for managing ARIA attributes and relationships
 */
export function useAriaAttributes() {
  const [ids] = useState(() => ({
    describedBy: AriaUtils.generateId('desc'),
    labelledBy: AriaUtils.generateId('label'),
    controls: AriaUtils.generateId('controls'),
  }));

  const createDescribedBy = useCallback((element: HTMLElement, description: string) => {
    return AriaUtils.createDescribedBy(element, description);
  }, []);

  return {
    ids,
    createDescribedBy,
  };
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handler = KeyboardNavigation.createShortcutHandler(shortcuts);
    document.addEventListener('keydown', handler);
    
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

/**
 * Hook for motion preferences
 */
export function useMotionPreferences() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => MotionUtils.prefersReducedMotion()
  );

  useEffect(() => {
    const cleanup = MotionUtils.onMotionPreferenceChange(setPrefersReducedMotion);
    return cleanup;
  }, []);

  const getAnimationDuration = useCallback((defaultDuration: number) => {
    return MotionUtils.getAnimationDuration(defaultDuration);
  }, []);

  return {
    prefersReducedMotion,
    getAnimationDuration,
  };
}

/**
 * Hook for high contrast mode detection
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(
    () => HighContrastUtils.isHighContrastMode()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handler = () => setIsHighContrast(HighContrastUtils.isHighContrastMode());
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isHighContrast) {
      HighContrastUtils.applyHighContrastStyles();
    }
  }, [isHighContrast]);

  return isHighContrast;
}

/**
 * Hook for managing live regions
 */
export function useLiveRegion(regionId?: string) {
  const [liveRegionId] = useState(() => regionId || AriaUtils.generateId('live'));

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!document.getElementById(liveRegionId)) {
      const liveRegion = document.createElement('div');
      liveRegion.id = liveRegionId;
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    return () => {
      const region = document.getElementById(liveRegionId);
      if (region) {
        region.remove();
      }
    };
  }, [liveRegionId]);

  const updateLiveRegion = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    AriaUtils.updateLiveRegion(liveRegionId, message, priority);
  }, [liveRegionId]);

  return {
    liveRegionId,
    updateLiveRegion,
  };
}

/**
 * Hook for accessible drag and drop
 */
export function useAccessibleDragDrop<T>(
  items: T[],
  onReorder: (fromIndex: number, toIndex: number) => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent, index: number) => {
    switch (event.key) {
      case KEYBOARD_KEYS.SPACE:
      case KEYBOARD_KEYS.ENTER:
        event.preventDefault();
        if (draggedIndex === null) {
          setDraggedIndex(index);
          setKeyboardMode(true);
          ScreenReaderUtils.announce(`Picked up item at position ${index + 1}. Use arrow keys to move, space to drop.`);
        } else {
          // Drop the item
          if (draggedIndex !== index) {
            onReorder(draggedIndex, index);
            ScreenReaderUtils.announce(`Moved item from position ${draggedIndex + 1} to position ${index + 1}`);
          }
          setDraggedIndex(null);
          setKeyboardMode(false);
        }
        break;

      case KEYBOARD_KEYS.ESCAPE:
        if (draggedIndex !== null) {
          event.preventDefault();
          setDraggedIndex(null);
          setKeyboardMode(false);
          ScreenReaderUtils.announce('Move cancelled');
        }
        break;

      case KEYBOARD_KEYS.ARROW_UP:
      case KEYBOARD_KEYS.ARROW_DOWN:
        if (keyboardMode && draggedIndex !== null) {
          event.preventDefault();
          const direction = event.key === KEYBOARD_KEYS.ARROW_UP ? -1 : 1;
          const newIndex = Math.max(0, Math.min(items.length - 1, index + direction));
          
          if (newIndex !== index) {
            // Move focus to new position
            const targetElement = document.querySelector(`[data-drag-index="${newIndex}"]`) as HTMLElement;
            if (targetElement) {
              targetElement.focus();
              ScreenReaderUtils.announce(`Position ${newIndex + 1} of ${items.length}`);
            }
          }
        }
        break;
    }
  }, [draggedIndex, keyboardMode, items.length, onReorder]);

  return {
    draggedIndex,
    keyboardMode,
    handleKeyDown,
    isDragging: draggedIndex !== null,
  };
}

/**
 * Hook for accessible form validation
 */
export function useAccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { announce } = useScreenReader();

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    
    // Announce error to screen readers
    if (error) {
      announce(`Error in ${fieldName}: ${error}`, 'assertive');
    }
  }, [announce]);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = !!errors[fieldName];
    const errorId = hasError ? AriaUtils.generateId(`${fieldName}-error`) : undefined;

    return {
      'aria-invalid': hasError,
      'aria-describedby': errorId,
      errorId,
      error: errors[fieldName],
    };
  }, [errors]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    getFieldProps,
  };
}