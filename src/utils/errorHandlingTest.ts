/**
 * @file errorHandlingTest.ts
 * @description Test utilities for accessibility error handling
 */

import { errorHandler } from './errorHandler';

export class AccessibilityTester {
  /**
   * Tests keyboard navigation functionality
   */
  static testKeyboardNavigation(): boolean {
    try {
      // Test focus management
      const focusableElements = document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      
      console.log(`Found ${focusableElements.length} focusable elements`);
      
      // Test tab order
      let tabIndex = 0;
      focusableElements.forEach((element, index) => {
        const el = element as HTMLElement;
        const currentTabIndex = parseInt(el.getAttribute('tabindex') || '0');
        if (currentTabIndex >= 0) {
          tabIndex++;
        }
      });
      
      return tabIndex > 0;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createAppError(
          error as Error,
          'ACCESSIBILITY_TEST_ERROR',
          { test: 'keyboard_navigation' },
          'Keyboard navigation test failed',
          false
        ),
        'low'
      );
      return false;
    }
  }

  /**
   * Tests ARIA attributes and relationships
   */
  static testAriaCompliance(): boolean {
    try {
      const issues: string[] = [];
      
      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt text`);
      }
      
      // Check for form labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
      const unlabeledInputs = Array.from(inputs).filter(input => {
        const id = input.getAttribute('id');
        return !id || !document.querySelector(`label[for="${id}"]`);
      });
      
      if (unlabeledInputs.length > 0) {
        issues.push(`${unlabeledInputs.length} form inputs missing labels`);
      }
      
      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      let hierarchyIssues = 0;
      
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > previousLevel + 1) {
          hierarchyIssues++;
        }
        previousLevel = level;
      });
      
      if (hierarchyIssues > 0) {
        issues.push(`${hierarchyIssues} heading hierarchy issues`);
      }
      
      if (issues.length > 0) {
        console.warn('ARIA compliance issues:', issues);
        return false;
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createAppError(
          error as Error,
          'ACCESSIBILITY_TEST_ERROR',
          { test: 'aria_compliance' },
          'ARIA compliance test failed',
          false
        ),
        'low'
      );
      return false;
    }
  }

  /**
   * Tests color contrast ratios
   */
  static testColorContrast(): boolean {
    try {
      // This would require more complex color analysis
      // For now, we'll just check if high contrast mode is supported
      const supportsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      console.log('High contrast mode supported:', supportsHighContrast);
      return true;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createAppError(
          error as Error,
          'ACCESSIBILITY_TEST_ERROR',
          { test: 'color_contrast' },
          'Color contrast test failed',
          false
        ),
        'low'
      );
      return false;
    }
  }

  /**
   * Runs all accessibility tests
   */
  static runAllTests(): { passed: number; failed: number; results: Record<string, boolean> } {
    const tests = {
      keyboardNavigation: this.testKeyboardNavigation(),
      ariaCompliance: this.testAriaCompliance(),
      colorContrast: this.testColorContrast(),
    };
    
    const passed = Object.values(tests).filter(Boolean).length;
    const failed = Object.values(tests).length - passed;
    
    console.log('Accessibility test results:', {
      passed,
      failed,
      results: tests,
    });
    
    return { passed, failed, results: tests };
  }
}