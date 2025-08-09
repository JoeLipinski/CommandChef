/**
 * @file accessibility.ts
 * @description Comprehensive accessibility utilities and helpers for WCAG 2.1 AA compliance
 */

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

// ARIA live region types
export const ARIA_LIVE_REGIONS = {
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  OFF: 'off',
} as const;

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  private static trapStack: (() => void)[] = [];

  /**
   * Saves the currently focused element to restore later
   */
  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  /**
   * Restores the previously saved focus
   */
  static restoreFocus(): void {
    const elementToFocus = this.focusStack.pop();
    if (elementToFocus && elementToFocus.focus) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        elementToFocus.focus();
      }, 0);
    }
  }

  /**
   * Traps focus within a container element
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      return () => {};
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== KEYBOARD_KEYS.TAB) return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus the first element
    firstElement.focus();

    const cleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
    };

    this.trapStack.push(cleanup);
    return cleanup;
  }

  /**
   * Removes the most recent focus trap
   */
  static releaseFocusTrap(): void {
    const cleanup = this.trapStack.pop();
    if (cleanup) {
      cleanup();
    }
  }

  /**
   * Gets all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter((element) => {
        const el = element as HTMLElement;
        return el.offsetParent !== null && !el.hasAttribute('aria-hidden');
      }) as HTMLElement[];
  }

  /**
   * Moves focus to the next/previous focusable element
   */
  static moveFocus(direction: 'next' | 'previous', container?: HTMLElement): void {
    const root = container || document.body;
    const focusableElements = this.getFocusableElements(root);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    focusableElements[nextIndex]?.focus();
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  private static liveRegion: HTMLElement | null = null;

  /**
   * Announces text to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear after announcement to allow repeated announcements
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Creates a live region for screen reader announcements
   */
  private static createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.id = 'accessibility-live-region';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Describes the current page structure for screen readers
   */
  static announcePageStructure(): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    
    const message = `Page loaded with ${headings.length} headings and ${landmarks.length} landmarks. Use heading navigation to explore content.`;
    this.announce(message, 'polite');
  }
}

// Keyboard navigation helpers
export class KeyboardNavigation {
  /**
   * Handles arrow key navigation for lists and grids
   */
  static handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      columns?: number;
    } = {}
  ): number {
    const { orientation = 'vertical', wrap = true, columns = 1 } = options;
    let newIndex = currentIndex;

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_UP:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex - columns;
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
        }
        break;

      case KEYBOARD_KEYS.ARROW_DOWN:
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex + columns;
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
        }
        break;

      case KEYBOARD_KEYS.ARROW_LEFT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0;
          }
        }
        break;

      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = currentIndex + 1;
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1;
          }
        }
        break;

      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;

      case KEYBOARD_KEYS.END:
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }

    return newIndex;
  }

  /**
   * Creates keyboard shortcuts handler
   */
  static createShortcutHandler(shortcuts: Record<string, () => void>) {
    return (event: KeyboardEvent) => {
      const key = this.getShortcutKey(event);
      const handler = shortcuts[key];
      
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
  }

  /**
   * Converts keyboard event to shortcut string
   */
  private static getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }
}

// Color contrast utilities
export class ColorContrastUtils {
  /**
   * Calculates the contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Checks if color combination meets WCAG AA standards
   */
  static meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
  }

  /**
   * Gets the relative luminance of a color
   */
  private static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Converts hex color to RGB
   */
  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }
}

// Motion preferences
export class MotionUtils {
  /**
   * Checks if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Gets appropriate animation duration based on user preferences
   */
  static getAnimationDuration(defaultDuration: number): number {
    return this.prefersReducedMotion() ? 0 : defaultDuration;
  }

  /**
   * Creates a media query listener for motion preferences
   */
  static onMotionPreferenceChange(callback: (prefersReduced: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }
}

// ARIA utilities
export class AriaUtils {
  /**
   * Generates unique IDs for ARIA relationships
   */
  static generateId(prefix = 'aria'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates ARIA describedby relationship
   */
  static createDescribedBy(element: HTMLElement, description: string): string {
    const descriptionId = this.generateId('desc');
    const descriptionElement = document.createElement('div');
    
    descriptionElement.id = descriptionId;
    descriptionElement.className = 'sr-only';
    descriptionElement.textContent = description;
    
    element.parentNode?.insertBefore(descriptionElement, element.nextSibling);
    element.setAttribute('aria-describedby', descriptionId);
    
    return descriptionId;
  }

  /**
   * Updates ARIA live region
   */
  static updateLiveRegion(regionId: string, message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = document.getElementById(regionId);
    if (region) {
      region.setAttribute('aria-live', priority);
      region.textContent = message;
    }
  }
}

// High contrast mode detection
export class HighContrastUtils {
  /**
   * Detects if high contrast mode is enabled
   */
  static isHighContrastMode(): boolean {
    // Check for Windows high contrast mode
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return true;
    }

    // Fallback detection method
    const testElement = document.createElement('div');
    testElement.style.cssText = 'border: 1px solid; border-color: buttontext; position: absolute; top: -999px;';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const isHighContrast = computedStyle.borderTopColor !== 'rgb(0, 0, 0)' && 
                          computedStyle.borderTopColor !== 'rgba(0, 0, 0, 0)';
    
    document.body.removeChild(testElement);
    return isHighContrast;
  }

  /**
   * Applies high contrast styles
   */
  static applyHighContrastStyles(): void {
    if (this.isHighContrastMode()) {
      document.documentElement.classList.add('high-contrast');
    }
  }
}

// All utilities are already exported above with their class/const declarations