/**
 * @file utils/dragDropErrorHandler.ts
 * @description Error handling utilities for drag-and-drop operations
 */

import { errorHandler } from './errorHandler';

export interface DragDropError extends Error {
  operation: 'drag' | 'drop' | 'move' | 'reorder';
  sourceId?: string;
  targetId?: string;
  data?: any;
}

export class DragDropErrorHandler {
  private static instance: DragDropErrorHandler;
  private retryQueue: Array<{
    id: string;
    operation: () => Promise<void>;
    retryCount: number;
    maxRetries: number;
  }> = [];

  private constructor() {
    this.setupRetryListener();
  }

  static getInstance(): DragDropErrorHandler {
    if (!DragDropErrorHandler.instance) {
      DragDropErrorHandler.instance = new DragDropErrorHandler();
    }
    return DragDropErrorHandler.instance;
  }

  private setupRetryListener(): void {
    window.addEventListener('error-retry', (event: any) => {
      const { errorId, action } = event.detail;
      if (action && action.includes('drag') || action.includes('drop')) {
        this.retryOperation(errorId);
      }
    });
  }

  /**
   * Wraps a drag-and-drop operation with error handling
   */
  async wrapDragDropOperation<T>(
    operation: () => Promise<T> | T,
    operationType: DragDropError['operation'],
    context: {
      sourceId?: string;
      targetId?: string;
      data?: any;
    } = {}
  ): Promise<T | null> {
    try {
      const result = await Promise.resolve(operation());
      return result;
    } catch (error) {
      return this.handleDragDropError(error as Error, operationType, context);
    }
  }

  /**
   * Handles drag-and-drop specific errors
   */
  private handleDragDropError(
    error: Error,
    operation: DragDropError['operation'],
    context: {
      sourceId?: string;
      targetId?: string;
      data?: any;
    }
  ): null {
    const dragDropError: DragDropError = Object.assign(error, {
      operation,
      sourceId: context.sourceId,
      targetId: context.targetId,
      data: context.data
    });

    const errorMessage = this.getDragDropErrorMessage(dragDropError);
    const appError = errorHandler.createAppError(
      dragDropError,
      'DRAG_DROP_ERROR',
      {
        component: 'DragDrop',
        action: `${operation} operation`,
        data: context
      },
      errorMessage,
      true
    );

    errorHandler.handleError(appError, 'low');
    return null;
  }

  private getDragDropErrorMessage(error: DragDropError): string {
    switch (error.operation) {
      case 'drag':
        return 'Failed to start drag operation. Please try clicking and dragging again.';
      case 'drop':
        return 'Failed to complete drop operation. Please try dropping the item again.';
      case 'move':
        return 'Failed to move item. Please try repositioning the item again.';
      case 'reorder':
        return 'Failed to reorder items. Please try rearranging the items again.';
      default:
        return 'Drag and drop operation failed. Please try again.';
    }
  }

  /**
   * Validates drag-and-drop data before operations
   */
  validateDragData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('Drag data is required');
      return { isValid: false, errors };
    }

    if (typeof data !== 'object') {
      errors.push('Drag data must be an object');
      return { isValid: false, errors };
    }

    // Check for required properties
    if (!data.id && !data.key) {
      errors.push('Drag data must have an id or key property');
    }

    if (!data.type) {
      errors.push('Drag data must have a type property');
    }

    // Validate specific drag types
    if (data.type === 'command') {
      if (!data.label) {
        errors.push('Command drag data must have a label');
      }
      if (!data.category) {
        errors.push('Command drag data must have a category');
      }
    }

    if (data.type === 'modifier') {
      if (!data.label) {
        errors.push('Modifier drag data must have a label');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates drop target before operations
   */
  validateDropTarget(target: any, dragData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!target) {
      errors.push('Drop target is required');
      return { isValid: false, errors };
    }

    // Check if target accepts the drag type
    if (dragData.type === 'modifier' && target.type !== 'command') {
      errors.push('Modifiers can only be dropped on commands');
    }

    // Check for circular references
    if (dragData.id === target.id || dragData.key === target.key) {
      errors.push('Cannot drop item on itself');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Safely executes a drag operation with validation and error handling
   */
  async safeDragOperation(
    dragData: any,
    operation: () => Promise<void> | void
  ): Promise<boolean> {
    try {
      // Validate drag data
      const validation = this.validateDragData(dragData);
      if (!validation.isValid) {
        throw new Error(`Invalid drag data: ${validation.errors.join(', ')}`);
      }

      // Execute operation with error handling
      await this.wrapDragDropOperation(
        operation,
        'drag',
        { sourceId: dragData.id || dragData.key, data: dragData }
      );

      return true;
    } catch (error) {
      console.error('Drag operation failed:', error);
      return false;
    }
  }

  /**
   * Safely executes a drop operation with validation and error handling
   */
  async safeDropOperation(
    dragData: any,
    dropTarget: any,
    operation: () => Promise<void> | void
  ): Promise<boolean> {
    try {
      // Validate drag data and drop target
      const dragValidation = this.validateDragData(dragData);
      if (!dragValidation.isValid) {
        throw new Error(`Invalid drag data: ${dragValidation.errors.join(', ')}`);
      }

      const dropValidation = this.validateDropTarget(dropTarget, dragData);
      if (!dropValidation.isValid) {
        throw new Error(`Invalid drop target: ${dropValidation.errors.join(', ')}`);
      }

      // Execute operation with error handling
      await this.wrapDragDropOperation(
        operation,
        'drop',
        {
          sourceId: dragData.id || dragData.key,
          targetId: dropTarget.id || dropTarget.key,
          data: { dragData, dropTarget }
        }
      );

      return true;
    } catch (error) {
      console.error('Drop operation failed:', error);
      return false;
    }
  }

  /**
   * Safely executes a reorder operation with error handling
   */
  async safeReorderOperation(
    items: any[],
    fromIndex: number,
    toIndex: number,
    operation: (from: number, to: number) => Promise<void> | void
  ): Promise<boolean> {
    try {
      // Validate indices
      if (fromIndex < 0 || fromIndex >= items.length) {
        throw new Error(`Invalid source index: ${fromIndex}`);
      }

      if (toIndex < 0 || toIndex >= items.length) {
        throw new Error(`Invalid target index: ${toIndex}`);
      }

      if (fromIndex === toIndex) {
        // No operation needed
        return true;
      }

      // Execute operation with error handling
      await this.wrapDragDropOperation(
        () => operation(fromIndex, toIndex),
        'reorder',
        {
          sourceId: String(fromIndex),
          targetId: String(toIndex),
          data: { items, fromIndex, toIndex }
        }
      );

      return true;
    } catch (error) {
      console.error('Reorder operation failed:', error);
      return false;
    }
  }

  /**
   * Adds an operation to the retry queue
   */
  addToRetryQueue(
    id: string,
    operation: () => Promise<void>,
    maxRetries: number = 3
  ): void {
    this.retryQueue.push({
      id,
      operation,
      retryCount: 0,
      maxRetries
    });
  }

  /**
   * Retries a failed operation
   */
  private async retryOperation(errorId: string): Promise<void> {
    const queueItem = this.retryQueue.find(item => item.id === errorId);
    if (!queueItem) return;

    if (queueItem.retryCount >= queueItem.maxRetries) {
      // Remove from queue if max retries exceeded
      this.retryQueue = this.retryQueue.filter(item => item.id !== errorId);
      return;
    }

    try {
      queueItem.retryCount++;
      await queueItem.operation();
      
      // Remove from queue on success
      this.retryQueue = this.retryQueue.filter(item => item.id !== errorId);
    } catch (error) {
      console.error(`Retry ${queueItem.retryCount} failed for operation ${errorId}:`, error);
      
      if (queueItem.retryCount >= queueItem.maxRetries) {
        this.retryQueue = this.retryQueue.filter(item => item.id !== errorId);
      }
    }
  }

  /**
   * Clears the retry queue
   */
  clearRetryQueue(): void {
    this.retryQueue = [];
  }

  /**
   * Gets the current retry queue status
   */
  getRetryQueueStatus(): Array<{
    id: string;
    retryCount: number;
    maxRetries: number;
  }> {
    return this.retryQueue.map(item => ({
      id: item.id,
      retryCount: item.retryCount,
      maxRetries: item.maxRetries
    }));
  }
}

// Export singleton instance
export const dragDropErrorHandler = DragDropErrorHandler.getInstance();

// Convenience functions for common drag-and-drop operations
export function safeDrag(dragData: any, operation: () => Promise<void> | void): Promise<boolean> {
  return dragDropErrorHandler.safeDragOperation(dragData, operation);
}

export function safeDrop(
  dragData: any,
  dropTarget: any,
  operation: () => Promise<void> | void
): Promise<boolean> {
  return dragDropErrorHandler.safeDropOperation(dragData, dropTarget, operation);
}

export function safeReorder(
  items: any[],
  fromIndex: number,
  toIndex: number,
  operation: (from: number, to: number) => Promise<void> | void
): Promise<boolean> {
  return dragDropErrorHandler.safeReorderOperation(items, fromIndex, toIndex, operation);
}